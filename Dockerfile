FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV SCIKIT_LEARN_DATA=/app/sklearn_data

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-cache the real 20 Newsgroups dataset for the Naive Bayes experiment.
# This project should use real data only, with no mock-data fallback.
RUN python - <<'PY'
from sklearn.datasets import fetch_20newsgroups

categories = [
    "sci.space",
    "rec.autos",
    "rec.sport.baseball",
    "sci.med",
]

fetch_20newsgroups(
    subset="train",
    categories=categories,
    remove=(),
    download_if_missing=True
)

print("20 Newsgroups dataset cached.")
PY

EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
