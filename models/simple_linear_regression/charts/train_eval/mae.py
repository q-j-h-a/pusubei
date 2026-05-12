CHART = {
    "id": "mae",
    "page": "train_eval",
    "title": "MAE",
    "subtitle": "评价指标随训练轮数的变化",
    "renderer": "metric_gauge",
    "metric": "mae",
    "size": "small",
    "default": False,
    "order": 90,
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
