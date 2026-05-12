CHART = {
    "id": "gradient_descent",
    "page": "train_eval",
    "title": "梯度下降图",
    "subtitle": "dw、db 随训练轮数的变化",
    "renderer": "gradient_descent",
    "size": "small",
    "default": False,
    "order": 50,
}


from models.simple_linear_regression.charts.train_eval._helpers import frame_at, rows_until


def build_data(context, state):
    rows = rows_until(context, state)
    return {
        "x_name": "epoch",
        "series": {
            "dw": [[row["epoch"], row["dw"]] for row in rows],
            "db": [[row["epoch"], row["db"]] for row in rows],
        },
        "frame": frame_at(context, state),
    }
