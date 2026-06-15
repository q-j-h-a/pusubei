import re
import os

preprocess_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/preprocess_page.js"))

with open(preprocess_path, "r", encoding="utf-8") as f:
    content = f.read()

# find all variables ending with "Completed" or similar
matches = re.findall(r"\b\w*Completed\w*\b", content)
print("Completed-like variables:", set(matches))

# find the definition of caching or status variables in the first 200 lines
lines = content.splitlines()
print("\nFirst 30 lines of preprocess_page.js:")
for idx in range(min(30, len(lines))):
    print(f"Line {idx+1}: {lines[idx]}")
