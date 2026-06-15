import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for function renderNbEvaluateShell
match = re.search(r"async\s+function\s+renderNbEvaluateShell\b", content)
if match:
    start_pos = match.start()
    # find all occurrences of main.innerHTML inside the function
    for idx, m in enumerate(re.finditer(r"\$\(\"main\"\)\.innerHTML\s*=", content[start_pos:])):
        print(f"Occurrence {idx+1} pos: {m.start()}")
        print(content[start_pos + m.start() : start_pos + m.start() + 1500])
        print("="*60)
else:
    print("renderNbEvaluateShell not found")
