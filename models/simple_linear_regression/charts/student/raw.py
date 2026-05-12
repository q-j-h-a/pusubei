CHART = {
    "id": "raw",
    "page": "student",
    "title": "原始数据",
    "subtitle": "当前特征与目标列的原始关系",
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
