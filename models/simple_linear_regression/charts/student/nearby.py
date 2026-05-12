CHART = {
    "id": "nearby",
    "page": "student",
    "title": "相近样本对比",
    "subtitle": "与输入值最接近的样本",
    "renderer": "predict_nearby",
    "size": "wide",
    "default": False,
    "order": 120,
}


def build_data(context, state):
    return {
        "feature": context["feature"],
        "target": context["target"],
        "nearby": context["nearby"],
    }
