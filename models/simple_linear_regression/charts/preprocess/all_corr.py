CHART = {
    "id": "all_corr",
    "page": "preprocess",
    "title": "全特征线性相关系数",
    "subtitle": "全部特征与目标值的相关性排序",
    "renderer": "all_corr",
    "size": "wide",
    "default": False,
    "order": 40,
}


def build_data(context, state):
    return {
        "target": context["target"],
        "current_feature": context["feature"],
        "rows": context["correlations"],
    }
