import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app.py"))

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for render_template in app.py
matches = re.finditer(r"render_template\b", content)
for m in matches:
    start = m.start()
    print(content[start-100:start+300])
