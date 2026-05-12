CHART = {
    "id": "r2",
    "page": "train_eval",
    "title": "R²",
    "subtitle": "评价指标随训练轮数的变化",
    "renderer": "metric_gauge",
    "metric": "r2",
    "size": "small",
    "default": False,
    "order": 100,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    metric = CHART["metric"]
    frame = frame_at(context, state)
    return {
        "x_name": "epoch",
        "metric": metric,
        "value": frame[metric],
        "data": [[row["epoch"], row[metric]] for row in rows_until(context, state)],
        "frame": frame,
    }
