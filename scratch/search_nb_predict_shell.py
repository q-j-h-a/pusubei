import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

predict_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/predict_page.js"))

with open(predict_path, "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"async\s+function\s+renderNbPredictShell\b", content)
if match:
    start_pos = match.start()
    print(content[start_pos:start_pos+3000])
else:
    print("renderNbPredictShell not found")
