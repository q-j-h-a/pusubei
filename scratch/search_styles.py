import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

index_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../templates/index.html"))

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# search for CSS styling in templates/index.html
style_match = re.search(r"<style>(.*?)</style>", content, re.DOTALL)
if style_match:
    styles = style_match.group(1)
    # find lines containing .shell, .main, .sidebar, .app
    lines = styles.splitlines()
    for idx, line in enumerate(lines):
        if any(cls in line for cls in [".shell", ".main", ".sidebar", ".app", "grid-template"]):
            print(f"Line {idx+1}: {line.strip()}")
            # print surrounding lines
            for s_idx in range(max(0, idx-2), min(len(lines), idx+10)):
                print(f"  {s_idx+1}: {lines[s_idx]}")
            print("-" * 40)
else:
    print("No style block found in index.html")
