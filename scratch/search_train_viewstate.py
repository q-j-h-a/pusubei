import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js"))

for filename in ["preprocess_page.js", "train_page.js", "evaluate_page.js", "predict_page.js"]:
    path = os.path.join(js_dir, filename)
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    matches = re.findall(r"viewStateStore\.(\w+)", content)
    if matches:
        print(f"=== {filename} viewStateStore keys ===")
        for key in sorted(set(matches)):
            print(f"  {key}")
