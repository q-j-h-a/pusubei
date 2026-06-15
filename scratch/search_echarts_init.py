import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for Echarts initialization in evaluate_page.js
matches = re.finditer(r"echarts\.init|initChart|initEchartsWithFont", content)
for m in matches:
    start = m.start()
    print(content[start-100:start+250])
