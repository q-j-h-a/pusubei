import re
import os

js_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/experiment_test.js"))
print(f"Reading from {js_path}")

with open(js_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

patterns = [
    r"activePreprocessStep",
    r"activeTrainStep",
    r"preprocessProgressStep",
    r"trainProgressStep",
    r"trainData",
    r"predictData",
    r"evaluateChartDataCache",
    r"resetExperimentPagesForTest"
]

for i, line in enumerate(lines):
    for pat in patterns:
        if re.search(pat, line):
            print(f"Line {i+1}: {line.strip()}")
