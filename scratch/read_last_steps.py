import json
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

log_path = r"C:\Users\乔\.gemini\antigravity-ide\brain\7a984248-c829-4aed-a4d2-8c4ef4e33d3b\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

idx = 3396
if idx < len(lines):
    try:
        obj = json.loads(lines[idx])
        print(f"--- LINE {idx} JSON ---")
        print(json.dumps(obj, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}")
