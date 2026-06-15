import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

train_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/train_page.js"))

with open(train_path, "r", encoding="utf-8") as f:
    content = f.read()

# find all addEventListener or button selectors in the second half of train_page.js
nb_content = content[content.find("朴素贝叶斯"): ]
click_listeners = re.findall(r'\$\("([^"]+)"\)\.addEventListener\("click"', nb_content)
print("Click listeners on elements:", click_listeners)

# find elements created or selected by id or class
selectors = re.findall(r'id=["\']([^"\']+)["\']', nb_content)
print("Created element IDs:", set(selectors))
