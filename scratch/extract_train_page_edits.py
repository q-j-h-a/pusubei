import json
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

log_path = r"C:\Users\乔\.gemini\antigravity-ide\brain\7a984248-c829-4aed-a4d2-8c4ef4e33d3b\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx, line in enumerate(lines):
    if "train_page.js" in line:
        try:
            obj = json.loads(line)
            step_idx = obj.get('step_index')
            if step_idx is not None and step_idx < 3500:
                tool_calls = obj.get('tool_calls', [])
                for tc in tool_calls:
                    args = tc.get('args', {})
                    if 'train_page.js' in str(args.get('TargetFile', '')):
                        print(f"Line: {idx}, Step: {step_idx}, Tool: {tc.get('name')}")
                        print(f"  Description: {args.get('Description')}")
                        print(f"  Instruction: {args.get('Instruction')}")
                        rep = args.get('ReplacementContent') or str(args.get('ReplacementChunks', ''))
                        print(f"  Replacement: {rep[:300]}...")
        except Exception as e:
            pass
