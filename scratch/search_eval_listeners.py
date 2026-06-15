import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js"))

for filename in ["evaluate_page.js", "predict_page.js"]:
    path = os.path.join(js_dir, filename)
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract the Naive Bayes part or search globally
    click_listeners = re.findall(r'\$\("([^"]+)"\)\.addEventListener\("click"', content)
    change_listeners = re.findall(r'\$\("([^"]+)"\)\.addEventListener\("change"', content)
    input_listeners = re.findall(r'\$\("([^"]+)"\)\.addEventListener\("input"', content)
    
    # IDs inside html strings or selectors
    ids = re.findall(r'id=["\']([^"\']+)["\']', content)
    
    print(f"\n=== {filename} ===")
    print("Click listeners:", click_listeners)
    print("Change listeners:", change_listeners)
    print("Input listeners:", input_listeners)
    print("Created element IDs (subset):", set(id for id in ids if id.startswith("nb") or "predict" in id.lower() or "eval" in id.lower()))
