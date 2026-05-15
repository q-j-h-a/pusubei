#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PY="$ROOT_DIR/.venv-cosyvoice/bin/python"
SERVER_PY="$ROOT_DIR/.cosyvoice/CosyVoice/runtime/python/fastapi/server.py"
MODEL_DIR="$ROOT_DIR/.cosyvoice/CosyVoice/pretrained_models/CosyVoice-300M-SFT"
PORT="${COSYVOICE_PORT:-50000}"
LOG_FILE="${COSYVOICE_LOG:-/tmp/cosyvoice_50000.log}"
PID_FILE="${COSYVOICE_PID:-/tmp/cosyvoice_50000.pid}"

if [[ ! -x "$VENV_PY" ]]; then
  echo "CosyVoice Python environment not found: $VENV_PY" >&2
  exit 1
fi

if [[ ! -f "$SERVER_PY" ]]; then
  echo "CosyVoice FastAPI server not found: $SERVER_PY" >&2
  exit 1
fi

if [[ ! -d "$MODEL_DIR" ]]; then
  echo "CosyVoice model directory not found: $MODEL_DIR" >&2
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/tmp/cosyvoice_port_"$PORT".txt 2>&1; then
  awk 'NR>1 {print $2}' /tmp/cosyvoice_port_"$PORT".txt | sort -u | while read -r pid; do
    kill "$pid" 2>/dev/null || true
  done
  sleep 1
fi

nohup "$VENV_PY" "$SERVER_PY" --port "$PORT" --model_dir "$MODEL_DIR" > "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"
echo "CosyVoice started on 127.0.0.1:$PORT, pid $(cat "$PID_FILE")"
echo "Log: $LOG_FILE"
