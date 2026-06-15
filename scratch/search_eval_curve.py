import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for occurrences of chart_nb_evaluate_curve or related curve rendering code
matches = re.finditer(r"chart_nb_evaluate_curve", content)
for m in matches:
    start = m.start()
    print(content[start-300:start+1200])
    print("="*60)
