CHART = {
    "id": "calc",
    "page": "predict",
    "title": "预测计算过程",
    "subtitle": "标准化转换和线性模型代入",
    "renderer": "predict_calc",
    "size": "wide",
    "default": True,
    "order": 20,
}


def build_data(context, state):
    return {
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
