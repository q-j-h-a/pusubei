---
name: docker-deploy-packager
description: Use this skill when the user wants to package a normal application for Docker deployment, especially Python Flask/FastAPI web apps for demos, teaching sites, dashboards, or lightweight production display. It generates clean deployment files such as Dockerfile, .dockerignore, dependency updates, and run instructions, without CTF-specific files or challenge-platform conventions.
metadata:
  short-description: Generate clean Docker deployment files for ordinary web apps
---

# Docker Deploy Packager

## Purpose

Package an ordinary application for Docker deployment. Prefer clean, portable deployment artifacts over challenge-platform or CTF conventions.

Use this skill for:
- Flask, FastAPI, Django-lite, Streamlit, static+API, dashboards, demos, teaching apps.
- Projects that need `Dockerfile`, `.dockerignore`, dependency adjustments, and run commands.
- Users who may not have Docker locally but want deployment-ready config files.

Do not use this skill for:
- CTF challenge packaging that requires `/flag`, `/start.sh`, `changeflag.sh`, `challenge.yaml`, AWD/RDG/AWDP contracts.
- Kubernetes, Compose, CI/CD, or cloud-specific deployment unless the user asks.

## Default Workflow

1. Inspect the project structure:
   - List root files.
   - Read dependency files such as `requirements.txt`, `pyproject.toml`, `package.json`, `Pipfile`, or `poetry.lock`.
   - Identify the entrypoint, framework, static assets, templates, datasets, and runtime port.

2. Choose the simplest deployment shape:
   - For Flask: use `gunicorn` and bind `0.0.0.0:5000` unless the project clearly uses another port.
   - For FastAPI: use `uvicorn` or `gunicorn` with uvicorn workers depending on existing deps.
   - For simple scripts or demos: keep one container and one foreground process.

3. Generate only the files needed:
   - `Dockerfile`
   - `.dockerignore`
   - Dependency update if a production server package is missing.
   - Optional `docker-compose.yml` only when the app requires multiple services or the user asks.

4. Validate without overstating:
   - If Docker is installed, run a build and a smoke test when practical.
   - If Docker is not installed, run local static checks such as Python compile/import checks where dependencies allow.
   - Clearly say when Docker build was not executed.

## Python Web App Rules

### Flask

Use this default `CMD` when the app object is `app` in `app.py`:

```dockerfile
CMD ["gunicorn", "-w", "1", "--threads", "4", "-b", "0.0.0.0:5000", "app:app"]
```

If `gunicorn` is missing from `requirements.txt`, add:

```text
gunicorn>=21.2,<23.0
```

Default Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OPENBLAS_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    MKL_NUM_THREADS=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "1", "--threads", "4", "-b", "0.0.0.0:5000", "app:app"]
```

Use the numeric thread environment variables when the app uses `numpy`, `pandas`, `scikit-learn`, or similar scientific Python packages.

### FastAPI

If the entrypoint is `app` in `main.py`, prefer:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Ensure `uvicorn` is present in dependencies.

## .dockerignore Baseline

Start from this and adapt to the project:

```dockerignore
.git/
.vscode/
__pycache__/
*.py[cod]
*$py.class

.venv/
venv/
env/

*.log
.pytest_cache/
.mypy_cache/
.ruff_cache/

Dockerfile
.dockerignore
```

Add project-specific exclusions for large auxiliary folders, local tools, screenshots, notebooks, caches, build outputs, and downloaded archives that are not needed at runtime.

Do not ignore required runtime directories such as:
- `templates/`
- `static/`
- `datasets/` when the app reads local data
- `models/` or `core/` when imported by the app

## User-Facing Summary

When finished, tell the user:
- Which files were created or changed.
- The exact build and run commands.
- Whether Docker was actually used for verification.
- Any known deployment caveats, especially CDN dependencies, missing local dependencies, large datasets, or external services.

Standard commands:

```bash
docker build -t <image-name> .
docker run --rm -p 5000:5000 <image-name>
```

For Flask apps, the browser URL is usually:

```text
http://localhost:5000
```
