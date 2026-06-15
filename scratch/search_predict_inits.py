import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

predict_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/predict_page.js"))

with open(predict_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for occurrences of nbPredictInputMode or similar variables being initialized
initializations = re.findall(r"window\.nbPredict\w+\s*=[^;\n]+", content)
print("Initializations found:")
for init in initializations:
    print(" ", init)
