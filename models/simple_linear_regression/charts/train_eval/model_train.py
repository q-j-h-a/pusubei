CHART = {
    "id": "model_train",
    "page": "train_eval",
    "title": "模型训练",
    "subtitle": "样本点、当前回归线和最优参考线",
    "renderer": "linear_train_scatter",
    "size": "wide",
    "default": True,
    "order": 10,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, line_for_params


def build_data(context, state):
    frame = frame_at(context, state)
    return {
        "x_name": context["x_column"],
        "y_name": context["target"],
        "scatter": [
            [x, y]
            for x, y in zip(context["scatter"]["x"], context["scatter"]["y"])
        ],
        "current_line": line_for_params(context, frame["w"], frame["b"]),
        "best_line": line_for_params(context, context["best"]["w"], context["best"]["b"]),
        "frame": frame,
        "best": context["best"],
    }
