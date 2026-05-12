CHART = {
    "id": "calc",
    "page": "train_eval",
    "title": "本轮计算过程",
    "subtitle": "随当前 epoch 更新",
    "renderer": "calc_detail",
    "size": "wide",
    "default": False,
    "order": 110,
    "kind": "info",
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at


def build_data(context, state):
    return {
        "frame": frame_at(context, state),
        "best": context["best"],
        "learning_rate": context["learning_rate"],
        "sample_count": len(context["scatter"]["x"]),
    }
