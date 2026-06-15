import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

train_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/train_page.js"))

with open(train_path, "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r"function\s+gridLayoutStorageKey\b", content)
if match:
    start_pos = match.start()
    print(content[start_pos:start_pos+500])
else:
    # search for gridLayoutStorageKey usage
    matches = [m.start() for m in re.finditer(r"gridLayoutStorageKey", content)]
    for m in matches:
        print(content[m-100:m+200])
