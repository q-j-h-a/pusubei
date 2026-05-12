CHART = {
    "id": "raw",
    "page": "preprocess",
    "title": "原始散点图",
    "subtitle": "原始特征与目标值的关系",
    "renderer": "scatter_trend",
    "size": "wide",
    "default": True,
    "order": 10,
}


def build_data(context, state):
    return {
        "x_name": context["feature"],
        "y_name": context["target"],
        "scatter": context["raw"]["scatter"],
        "trend_line": context["raw"]["trend_line"],
        "summary": context["raw"]["summary"],
    }
