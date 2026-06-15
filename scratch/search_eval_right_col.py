import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for "右栏：ECharts ROC/PR 曲线" in evaluate_page.js
match = re.search(r"右栏：ECharts ROC/PR 曲线", content)
if match:
    start_pos = match.start()
    print(content[start_pos-100:start_pos+1500])
else:
    print("Not found")
