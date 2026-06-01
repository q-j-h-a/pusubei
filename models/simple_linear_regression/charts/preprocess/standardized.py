CHART = {
    "id": "standardized",
    "page": "preprocess",
    "title": "标准散点图",
    "subtitle": "标准化特征与标准化目标值的关系",
    "renderer": "scatter_trend",
    "size": "wide",
    "default": False,
    "order": 20,
}


def build_data(context, state):
    return {
        "x_name": context["standardized"]["feature_name"],
        "y_name": f'{context["target"]}_std',
        "scatter": context["standardized"]["scatter"],
        "trend_line": context["standardized"]["trend_line"],
        "summary": context["standardized"]["summary"],
    }
