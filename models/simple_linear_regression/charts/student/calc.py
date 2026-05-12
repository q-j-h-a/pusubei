CHART = {
    "id": "calc",
    "page": "student",
    "title": "计算过程",
    "subtitle": "训练或预测的计算细节",
    "renderer": "student_calc",
    "size": "wide",
    "default": False,
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
            "model_x": context["model_x"],
            "use_standardized": context["use_standardized"],
            "mean": context["mean"],
            "std": context["std"],
            "w": context["w"],
            "b": context["b"],
            "prediction": context["prediction"],
        }
    return {
        "stage": context.get("stage"),
    }
