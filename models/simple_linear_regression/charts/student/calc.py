CHART = {
    "id": "calc",
    "page": "student",
    "title": "预测计算过程",
    "subtitle": "输入值、模型输入、当前模型参数和预测输出",
    "renderer": "student_calc",
    "size": "wide",
    "default": True,
    "order": 110,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at


def build_data(context, state):
    if "history" in context:
        return {
            "stage": "train_prepare",
            "frame": frame_at(context, state),
            "best": context["best"],
            "learning_rate": context["learning_rate"],
            "sample_count": len(context["scatter"]["x"]),
        }
    if context.get("stage") == "predict":
        return {
            "stage": "predict",
            "feature": context["feature"],
            "target": context["target"],
            "raw_value": context["raw_value"],
            "input_value": context.get("input_value", context["raw_value"]),
            "input_mode": context.get("input_mode", "raw"),
            "model_x": context["model_x"],
            "use_standardized": context["use_standardized"],
            "mean": context["mean"],
            "std": context["std"],
            "w": context["w"],
            "b": context["b"],
            "model_source": context.get("model_source"),
            "model_state": context.get("model_state"),
            "prediction": context["prediction"],
        }
    return {
        "stage": context.get("stage"),
    }
