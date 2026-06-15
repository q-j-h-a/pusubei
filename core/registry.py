from importlib import import_module
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_ROOT = BASE_DIR / "models"
DEFAULT_MODEL_ID = "naive_bayes"


def _load_module(path: Path, namespace: str, root: Path):
    module_name = namespace + "_" + "_".join(path.relative_to(root).with_suffix("").parts)
    spec = spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module: {path}")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _model_dirs(model: str | None = None):
    if not MODEL_ROOT.exists():
        return []
    dirs = [path for path in sorted(MODEL_ROOT.iterdir()) if path.is_dir()]
    if model:
        dirs = [path for path in dirs if path.name == model]
    return dirs


def _load_model_meta(model_dir: Path):
    module = import_module(f"models.{model_dir.name}")
    meta = getattr(module, "MODEL", None)
    if not isinstance(meta, dict):
        return None
    data = dict(meta)
    data.setdefault("id", model_dir.name)
    return data


def discover_models() -> list[dict]:
    models = []
    for model_dir in _model_dirs():
        meta = _load_model_meta(model_dir)
        if meta is not None:
            models.append(meta)
    models.sort(key=lambda item: item.get("id", ""))
    return models


def get_model(model: str | None = None) -> dict | None:
    model_id = model or DEFAULT_MODEL_ID
    for meta in discover_models():
        if meta.get("id") == model_id:
            return meta
    return None


def _model_chart_roots(model: str | None = None):
    if MODEL_ROOT.exists():
        return [path / "charts" for path in _model_dirs(model)]
    return []


def _chart_paths(model: str | None = None):
    roots = _model_chart_roots(model)
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.py")):
            if path.name.startswith("_") or path.name == "__init__.py":
                continue
            yield root, path


def _control_path(page: str, model: str | None = None):
    model_control_paths = []
    if MODEL_ROOT.exists():
        model_control_paths = [path / "controls" / f"{page}.py" for path in _model_dirs(model)]
    for path in model_control_paths:
        if path.exists():
            return path
    return None


def discover_charts(page: str | None = None, model: str | None = None) -> list[dict]:
    charts = []
    seen = set()
    for root, path in _chart_paths(model):
        module = _load_module(path, "chart_module", root)
        chart = getattr(module, "CHART", None)
        if not isinstance(chart, dict):
            continue
        if page and chart.get("page") != page:
            continue
        key = (chart.get("page"), chart.get("id"))
        if key in seen:
            continue
        seen.add(key)
        charts.append(dict(chart))

    charts.sort(key=lambda item: int(item.get("order", 1000)))
    return charts


def discover_chart_builders(page: str | None = None, model: str | None = None) -> dict[str, dict]:
    builders = {}
    for root, path in _chart_paths(model):
        module = _load_module(path, "chart_module", root)
        chart = getattr(module, "CHART", None)
        build_data = getattr(module, "build_data", None)
        if not isinstance(chart, dict):
            continue
        if page and chart.get("page") != page:
            continue
        if chart["id"] in builders:
            continue
        if callable(build_data):
            builders[chart["id"]] = {
                "meta": dict(chart),
                "build_data": build_data,
            }
    return builders


def get_panel(page: str, model: str | None = None) -> dict | None:
    path = _control_path(page, model)
    if path is None:
        return None

    root = path.parent
    module = _load_module(path, "control_module", root)
    panel = getattr(module, "PANEL", None)
    return dict(panel) if isinstance(panel, dict) else None
