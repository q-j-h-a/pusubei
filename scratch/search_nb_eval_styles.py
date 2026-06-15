import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"nbEvalStyles", content)
if match:
    start_pos = match.start()
    print(content[start_pos:start_pos+2000])
else:
    print("nbEvalStyles not found")
