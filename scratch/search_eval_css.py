import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js"))

for root, _, files in os.walk(js_dir):
    for file in files:
        if not file.endswith(".js"):
            continue
        path = os.path.join(root, file)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        if "nb-eval-container" in content or "nb-eval-card" in content:
            print(f"=== found in {file} ===")
            matches = re.finditer(r"\.nb-eval-(?:container|card)\b[^{]*\{[^}]*\}", content)
            for m in matches:
                print(m.group(0))
