import re
import os

js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js"))
files = ["preprocess_page.js", "train_page.js", "evaluate_page.js", "predict_page.js"]

patterns = [
    r"activePreprocessStep",
    r"activeNbTrainStep",
    r"activeTrainStep",
    r"preprocessProgressStep",
    r"nbTrainProgressStep",
    r"trainProgressStep",
    r"nbTrainData",
    r"nbProbeData",
    r"nbPredictData",
    r"tokenizeCache",
    r"vectorizeCache",
    r"wordFreqCache",
    r"splitCache"
]

for filename in files:
    path = os.path.join(js_dir, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename} (not found)")
        continue
    print(f"\n=== {filename} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    for pat in patterns:
        matches = re.findall(pat + r"\b", content)
        if matches:
            print(f"Variable '{pat}' matches count: {len(matches)}")
            # Find declaration or typical assignment
            lines = content.splitlines()
            found_decl = False
            for idx, line in enumerate(lines):
                if re.search(r"\b(let|var|const)\s+" + pat + r"\b", line) or re.search(pat + r"\s*=", line):
                    print(f"  Line {idx+1}: {line.strip()[:100]}")
                    found_decl = True
                    # print first 5 matches only
                    if idx > 10:
                        break
