CHART = {
    "id": "gradient",
    "page": "train_eval",
    "title": "Loss 等高线图",
    "subtitle": "w-b 参数空间中的 MSE 损失等高线",
    "renderer": "loss_contour",
    "size": "wide",
    "default": False,
    "order": 30,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    return {
        "contour": context["contour"],
        "path": [[row["w"], row["b"]] for row in rows_until(context, state)],
        "frame": frame_at(context, state),
        "best": context["best"],
    }
