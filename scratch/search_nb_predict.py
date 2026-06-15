import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

predict_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/predict_page.js"))

with open(predict_path, "r", encoding="utf-8") as f:
    content = f.read()

# print the first 2500 characters
print(content[:2500])
