CHART = {
    "id": "standardized",
    "page": "student",
    "title": "预处理数据",
    "subtitle": "标准化特征与目标列的关系",
    "renderer": "scatter_trend",
    "size": "wide",
    "default": True,
    "order": 20,
}


def build_data(context, state):
    return {
        "x_name": context["standardized"]["feature_name"],
        "y_name": context["target"],
        "scatter": context["standardized"]["scatter"],
        "trend_line": context["standardized"]["trend_line"],
        "summary": context["standardized"]["summary"],
    }
