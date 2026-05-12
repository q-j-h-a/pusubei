CHART = {
    "id": "table",
    "page": "train_eval",
    "title": "每轮参数表",
    "subtitle": "随当前 epoch 更新",
    "renderer": "training_table",
    "size": "wide",
    "default": False,
    "order": 120,
    "kind": "info",
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    return {
        "rows": rows_until(context, state),
        "frame": frame_at(context, state),
    }
