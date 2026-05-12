CHART = {
    "id": "corr",
    "page": "student",
    "title": "相关系数",
    "subtitle": "已选特征与目标列的相关性",
    "renderer": "all_corr",
    "size": "wide",
    "default": True,
    "order": 30,
}


def build_data(context, state):
    return {
        "target": context["target"],
        "current_feature": context["feature"],
        "rows": context["correlations"],
    }
