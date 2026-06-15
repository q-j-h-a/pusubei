import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

eval_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/js/evaluate_page.js"))

with open(eval_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's start at char index 25062
start = 25062
# Find the next backtick
end = content.find("`", start + 50)
print("--- HTML Start ---")
print(content[start:end+1])
print("--- HTML End ---")

# Let's count open vs close divs in the string
tmpl = content[start:end+1]
open_divs = tmpl.count("<div")
close_divs = tmpl.count("</div")
open_section = tmpl.count("<section")
close_section = tmpl.count("</section")
print(f"Counts: divs={open_divs}/{close_divs}, sections={open_section}/{close_section}")
