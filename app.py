import json
import os
from pathlib import Path
import urllib.error
import urllib.request

from flask import Flask, render_template, request, jsonify

from core.context_store import get_context
from core.dataset_profile import build_sources_from_dataset_profile, get_experiment_dataset_profile
from core.experiment_registry import (
    DEFAULT_EXPERIMENT_ID,
    discover_experiments,
    resolve_experiment_model,
    get_experiment,
)
from core.chart_registry import discover_experiment_chart_builders, discover_experiment_charts
from core.control_registry import get_experiment_panel
from core.registry import discover_models
from core.schemas import collect_panel_defaults
from importlib import import_module

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.json.sort_keys = False

BASE_DIR = Path(__file__).resolve().parent
THEORY_DECK_OVERRIDES_PATH = BASE_DIR / "static" / "theory_deck_overrides.json"
LOCAL_CONFIG_PATH = BASE_DIR / "config.local.json"


def _read_local_config():
    if not LOCAL_CONFIG_PATH.exists():
        return {}
    try:
        data = json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


LOCAL_CONFIG = _read_local_config()
DEEPSEEK_API_URL = (
    os.getenv("DEEPSEEK_API_URL")
    or LOCAL_CONFIG.get("deepseek_api_url")
    or "https://api.deepseek.com/chat/completions"
)
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL") or LOCAL_CONFIG.get("deepseek_model") or "deepseek-chat"


# Action handlers are resolved dynamically from each model's module


def _read_theory_deck_overrides():
    if not THEORY_DECK_OVERRIDES_PATH.exists():
        return {}
    try:
        data = json.loads(THEORY_DECK_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _write_theory_deck_overrides(overrides):
    THEORY_DECK_OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
    THEORY_DECK_OVERRIDES_PATH.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _json_action_response(handler, payload, experiment_id=None):
    try:
        data = handler(payload)
        if experiment_id and isinstance(data, dict):
            data = dict(data)
            data["experiment"] = experiment_id
        return jsonify(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


def _upload_dataset_response(file, source_type, upload_fn, experiment_id=None):
    try:
        data = upload_fn(file, source_type)
        if experiment_id and isinstance(data, dict):
            data = dict(data)
            data["experiment"] = experiment_id
        return jsonify(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


def _ai_context_text(context):
    if not isinstance(context, dict):
        return "当前页面上下文：暂无。"

    page_labels = {
        "preprocess": "数据预处理",
        "train_eval": "模型训练",
        "evaluate": "模型评估",
        "predict": "模型预测",
        "experiment_test": "实验测试",
    }
    preprocess_labels = {
        "load": "加载原始数据",
        "detail": "数据详情",
        "raw_viz": "原始数据可视化",
        "standardize": "数据标准化",
        "standard_viz": "标准数据可视化",
    }
    train_labels = {
        "process": "熟悉回归过程",
        "preprocess_effect": "熟悉预处理影响",
        "loss": "熟悉损失函数",
        "optimization": "熟悉优化准则",
        "custom": "自定义参数训练",
    }

    page = context.get("page") or ""
    step = ""
    if page == "preprocess":
        step = preprocess_labels.get(context.get("preprocessStep"), context.get("preprocessStep") or "")
    elif page == "train_eval":
        step = train_labels.get(context.get("trainStep"), context.get("trainStep") or "")
    elif page == "evaluate":
        step = "评价指标：" + str(context.get("evaluateMetric") or "RMSE")
    elif page == "predict":
        step = "模型预测"
    elif page == "experiment_test":
        step = "实验测试"

    lines = [
        f"当前页面：{page_labels.get(page, page or '未知')}",
        f"当前步骤：{step or '未知'}",
        f"当前特征：{context.get('feature') or '未知'}",
    ]

    train_state = context.get("trainFormState")
    if isinstance(train_state, dict):
        lines.append(
            "训练参数："
            f"w={train_state.get('w0', train_state.get('w', '未知'))}，"
            f"b={train_state.get('b0', train_state.get('b', '未知'))}，"
            f"学习率={train_state.get('lr', train_state.get('learningRate', '未知'))}，"
            f"周期数={train_state.get('epochs', '未知')}"
        )

    predict_state = context.get("predictForm")
    if isinstance(predict_state, dict):
        lines.append(
            "预测输入："
            f"输入类型={predict_state.get('predictInputMode', '未知')}，"
            f"输入值={predict_state.get('predictInput', '未知')}"
        )

    test_state = context.get("testState")
    if isinstance(test_state, dict) and test_state.get("active"):
        lines.append("当前处于完整实验测试模式。")

    return "\n".join(lines)


def _call_deepseek(messages):
    api_key = (os.getenv("DEEPSEEK_API_KEY") or LOCAL_CONFIG.get("deepseek_api_key") or "").strip()
    if not api_key or api_key.startswith("请在这里填写"):
        raise ValueError("未配置 DeepSeek API Key，请在环境变量 DEEPSEEK_API_KEY 或 config.local.json 中设置。")

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": 0.35,
        "max_tokens": 700,
    }
    req = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result["choices"][0]["message"]["content"].strip()



@app.route('/')
def index():
    experiment = get_experiment(DEFAULT_EXPERIMENT_ID)
    model_id = experiment["model"]
    model_module = import_module(f"models.{model_id}.model")
    load_raw_df = getattr(model_module, "load_raw_df", None)
    if callable(load_raw_df):
        load_raw_df()
    feature_columns = getattr(model_module, "FEATURE_COLUMNS", ["text"])
    if hasattr(model_module, "FEATURE_COLUMNS") and len(model_module.FEATURE_COLUMNS) > 0:
        default_feat = model_module.FEATURE_COLUMNS[0]
    else:
        default_feat = "text"
    return render_template(
        "index.html",
        feature_names=feature_columns,
        default_feature=default_feat,
    )


@app.route("/api/ai_assistant", methods=["POST"])
def api_ai_assistant():
    try:
        body = request.get_json() or {}
        question = str(body.get("question") or "").strip()
        if not question:
            return jsonify({"error": "请输入问题"}), 400

        context = body.get("context") if isinstance(body.get("context"), dict) else {}
        history = body.get("history") if isinstance(body.get("history"), list) else []
        safe_history = []
        for item in history[-8:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = str(item.get("content") or "").strip()
            if role in {"user", "assistant"} and content:
                safe_history.append({"role": role, "content": content[:1200]})

        system_prompt = (
            "你是一个简单线性回归 Web 教学实验的 AI 学习助手。"
            "你的目标是帮助初学者知道当前应该做什么、观察什么、理解什么。"
            "回答必须使用中文，简洁具体，优先贴合当前实验页面和步骤。"
            "不要编造页面上不存在的按钮、数据或图表。"
            "如果学生处于实验测试或询问测试题答案，只能给思路和观察方向，不能直接给最终选项或完整答案。"
            "回答通常控制在 4 到 8 句话。"
        )
        context_prompt = "当前实验上下文：\n" + _ai_context_text(context)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context_prompt},
            *safe_history,
            {"role": "user", "content": question},
        ]
        return jsonify({"answer": _call_deepseek(messages)})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 503
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        return jsonify({"error": f"AI 服务请求失败：{detail or exc.reason}"}), 502
    except urllib.error.URLError as exc:
        return jsonify({"error": f"无法连接 AI 服务：{exc.reason}"}), 502
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500



@app.route('/api/chart_registry', methods=['GET'])
def api_chart_registry():
    page = request.args.get("page")
    experiment_id = request.args.get("experiment")
    model = request.args.get("model")
    try:
        experiment, model_meta = resolve_experiment_model(experiment_id, model)
        return jsonify({
            "experiment": experiment,
            "model": model_meta,
            "charts": discover_experiment_charts(experiment["id"], page),
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/experiments", methods=["GET"])
def api_experiments():
    return jsonify({
        "default_experiment": DEFAULT_EXPERIMENT_ID,
        "experiments": discover_experiments(),
    })


@app.route("/api/dataset_profile", methods=["GET"])
def api_dataset_profile():
    experiment_id = request.args.get("experiment")
    model = request.args.get("model")
    try:
        experiment, _model_meta = resolve_experiment_model(experiment_id, model)
        return jsonify({
            "experiment": experiment,
            "dataset_profile": get_experiment_dataset_profile(experiment),
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/page_schema", methods=["GET"])
def api_page_schema():
    page = request.args.get("page", "train_eval")
    experiment_id = request.args.get("experiment")
    model = request.args.get("model")
    try:
        experiment, model_meta = resolve_experiment_model(experiment_id, model)
        dataset_profile = get_experiment_dataset_profile(experiment)

        panel = get_experiment_panel(page, experiment["id"])
        if panel is None:
            return jsonify({"error": f"Unknown page: {page}"}), 404

        return jsonify({
            "experiment": experiment,
            "model": model_meta,
            "experiments": discover_experiments(),
            "models": discover_models(),
            "page": page,
            "panel": panel,
            "charts": discover_experiment_charts(experiment["id"], page),
            "defaults": collect_panel_defaults(panel),
            "sources": build_sources_from_dataset_profile(dataset_profile),
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/chart_data", methods=["POST"])
def api_chart_data():
    try:
        payload = request.get_json() or {}
        context_id = payload.get("context_id")
        if not context_id:
            return jsonify({"error": "缺少 context_id"}), 400

        context = get_context(context_id)
        page = payload.get("page") or context.get("page", "train_eval")
        context_page = context.get("page")
        allow_evaluate_from_train = page == "evaluate" and context_page == "train_eval"
        if page != context_page and not allow_evaluate_from_train:
            return jsonify({"error": f"上下文页面不匹配：{page}"}), 400

        experiment_id = payload.get("experiment")
        model = payload.get("model")
        experiment, _model_meta = resolve_experiment_model(experiment_id, model)
        context_experiment = context.get("experiment") or DEFAULT_EXPERIMENT_ID
        if context_experiment != experiment["id"]:
            return jsonify({
                "error": (
                    "Context experiment mismatch: "
                    f"{context_experiment} != {experiment['id']}"
                )
            }), 400

        builders = discover_experiment_chart_builders(experiment["id"], page)
        requested = payload.get("charts") or list(builders.keys())
        if not isinstance(requested, list):
            return jsonify({"error": "charts 必须是数组"}), 400

        state = payload.get("state") or {}
        response = {}
        for chart_id in requested:
            builder = builders.get(chart_id)
            if not builder:
                return jsonify({"error": f"未知图表：{chart_id}"}), 400
            response[chart_id] = builder["build_data"](context, state)
        return jsonify(response)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/run_action", methods=["POST"])
def api_run_action():
    try:
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            action = request.form.get("action")
            experiment, model_meta = resolve_experiment_model(
                request.form.get("experiment"),
                request.form.get("model"),
            )
            model_module = import_module(f"models.{model_meta['id']}.model")
            upload_fn = getattr(model_module, "upload_dataset", None)
            if upload_fn is None:
                return jsonify({"error": f"Upload dataset not supported for model: {model_meta['id']}"}), 400
            return _upload_dataset_response(
                request.files.get("file"),
                request.form.get("source_type", "raw"),
                upload_fn,
                experiment["id"],
            )

        body = request.get_json() or {}
        action = body.get("action")
        if not action:
            return jsonify({"error": "缺少 action"}), 400

        experiment, model_meta = resolve_experiment_model(body.get("experiment"), body.get("model"))

        model_module = import_module(f"models.{model_meta['id']}.model")
        actions_dict = getattr(model_module, "JSON_ACTIONS", {})
        handler = actions_dict.get(action)
        if handler is None:
            return jsonify({"error": f"Unknown action: {action}"}), 404

        payload = body.get("payload")
        if payload is None:
            payload = {
                key: value
                for key, value in body.items()
                if key not in {"action", "experiment", "model"}
            }
        if not isinstance(payload, dict):
            return jsonify({"error": "payload 必须是对象"}), 400

        return _json_action_response(handler, payload, experiment["id"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/theory_deck_overrides", methods=["GET"])
def api_theory_deck_overrides():
    try:
        return jsonify({
            "overrides": _read_theory_deck_overrides(),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/theory_deck_overrides", methods=["POST"])
def api_save_theory_deck_override():
    try:
        body = request.get_json() or {}
        page_id = body.get("page_id")
        deck = body.get("deck")
        if not isinstance(page_id, str) or not page_id.strip():
            return jsonify({"error": "缺少 page_id"}), 400
        if not isinstance(deck, dict):
            return jsonify({"error": "deck 必须是对象"}), 400

        overrides = _read_theory_deck_overrides()
        overrides[page_id] = deck
        _write_theory_deck_overrides(overrides)
        return jsonify({
            "page_id": page_id,
            "deck": deck,
            "saved": True,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/save_theory_html", methods=["POST"])
def api_save_theory_html():
    try:
        body = request.get_json() or {}
        page_id = body.get("page_id")
        full_html = body.get("html")
        if not isinstance(page_id, str) or not page_id.strip():
            return jsonify({"error": "缺少 page_id"}), 400
        if not isinstance(full_html, str) or not full_html.strip():
            return jsonify({"error": "html 必须是字符串"}), 400

        safe_page_id = Path(page_id).name
        html_path = BASE_DIR / "static" / "theory-html" / f"{safe_page_id}.html"

        if not html_path.exists():
            return jsonify({"error": f"该页面不存在: {page_id}"}), 404

        if not full_html.lstrip().startswith("<!DOCTYPE"):
            full_html = "<!DOCTYPE html>\n" + full_html

        html_path.write_text(full_html, encoding="utf-8")
        return jsonify({
            "page_id": page_id,
            "saved": True,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

