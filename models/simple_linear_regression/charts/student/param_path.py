CHART = {
    "id": "param_path",
    "page": "student",
    "title": "参数轨迹图",
    "subtitle": "w 与 b 的更新路径",
    "renderer": "student_param_path",
    "size": "wide",
    "default": False,
    "order": 70,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    rows = rows_until(context, state)
    return {
        "x_name": "epoch",
        "series": {
            "w": [[row["epoch"], row["w"]] for row in rows],
            "b": [[row["epoch"], row["b"]] for row in rows],
        },
        "frame": frame_at(context, state),
    }
