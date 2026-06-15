import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

index_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../templates/index.html"))

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

style_match = re.search(r"<style>(.*?)</style>", content, re.DOTALL)
if style_match:
    styles = style_match.group(1)
    
    # We want to print the rules for the major layout classes:
    targets = [
        r"\.app\s*\{",
        r"\.shell\s*\{",
        r"\.sidebar\s*\{",
        r"\.main\s*\{",
        r"\.assistant\s*\{",
        r"\.topbar\s*\{"
    ]
    
    lines = styles.splitlines()
    for target in targets:
        for idx, line in enumerate(lines):
            if re.search(target, line):
                print(f"Line {idx+1} matches {target}:")
                # print the block
                block_lines = []
                depth = 0
                for s_idx in range(idx, len(lines)):
                    l = lines[s_idx]
                    block_lines.append(l)
                    depth += l.count("{") - l.count("}")
                    if depth <= 0 and "}" in l:
                        break
                print("\n".join(block_lines))
                print("=" * 50)
else:
    print("No style block found")
