import os

js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js"))

for filename in ["evaluate_page.js", "predict_page.js"]:
    path = os.path.join(js_dir, filename)
    if not os.path.exists(path):
        continue
    print(f"\n=== {filename} ===")
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for idx in range(min(50, len(lines))):
        print(f"Line {idx+1}: {lines[idx].strip()}")
