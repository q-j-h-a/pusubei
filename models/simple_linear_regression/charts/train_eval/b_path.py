CHART = {
    "id": "b_path",
    "page": "train_eval",
    "title": "b 参数轨迹",
    "subtitle": "b 随训练轮数的变化",
    "renderer": "param_path",
    "metric": "b",
    "size": "small",
    "default": False,
    "order": 70,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    metric = CHART["metric"]
    rows = rows_until(context, state)
    return {
        "x_name": "epoch",
        "y_name": metric,
        "series_name": metric,
        "data": [[row["epoch"], row[metric]] for row in rows],
        "metric": metric,
        "frame": frame_at(context, state),
    }
