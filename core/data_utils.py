def safe_float(value, default):
    try:
        return float(value)
    except Exception:
        return default


def safe_int(value, default, lo=None, hi=None):
    try:
        v = int(value)
    except Exception:
        v = default
    if lo is not None:
        v = max(lo, v)
    if hi is not None:
        v = min(hi, v)
    return v

