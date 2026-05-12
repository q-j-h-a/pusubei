def frame_index(context, state):
    history = context.get("history") or []
    if not history:
        return 0
    try:
        index = int(state.get("frame_index", 0))
    except Exception:
        index = 0
    return max(0, min(index, len(history) - 1))


def frame_at(context, state):
    return context["history"][frame_index(context, state)]


def rows_until(context, state):
    return context["history"][:frame_index(context, state) + 1]


def line_for_params(context, w, b):
    return [[float(x), float(w * x + b)] for x in context["line_x"]]
