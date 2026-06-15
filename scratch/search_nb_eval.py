import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for function renderNbEvaluateShell
match = re.search(r"async\s+function\s+renderNbEvaluateShell\b", content)
if match:
    start_pos = match.start()
    # print the next 3000 characters
    print(content[start_pos:start_pos+3000])
else:
    print("renderNbEvaluateShell not found")
