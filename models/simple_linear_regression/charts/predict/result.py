CHART = {
    "id": "result",
    "page": "predict",
    "title": "预测输入与结果",
    "subtitle": "输入值、模型输入和预测输出",
    "renderer": "predict_result",
    "size": "wide",
    "default": True,
    "order": 10,
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
