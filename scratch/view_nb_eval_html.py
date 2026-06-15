import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"async\s+function\s+renderNbEvaluateShell\b", content)
if match:
    start_pos = match.start()
    main_match = list(re.finditer(r"\$\(\"main\"\)\.innerHTML\s*=", content[start_pos:]))
    if len(main_match) >= 2:
        html_start = start_pos + main_match[1].start()
        print(content[html_start:html_start+3500])
    else:
        print("Only found one or zero main.innerHTML")
