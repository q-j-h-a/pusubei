import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

predict_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/predict_page.js"))

with open(predict_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for listener registration in predict_page.js
matches = re.finditer(r"\.addEventListener\b", content)
for m in matches:
    start = m.start()
    print(content[start-50:start+150])
