CHART = {
    "id": "result",
    "page": "student",
    "title": "预测输入与结果",
    "subtitle": "自主数据上的预测结果",
    "renderer": "predict_result",
    "size": "wide",
    "default": True,
    "order": 90,
}


def build_data(context, state):
    return {
        "feature": context["feature"],
        "target": context["target"],
        "raw_value": context["raw_value"],
        "model_x": context["model_x"],
        "prediction": context["prediction"],
        "w": context["w"],
        "b": context["b"],
    }
