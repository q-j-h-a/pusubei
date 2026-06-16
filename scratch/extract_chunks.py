import json

log_path = r"C:\Users\乔\.gemini\antigravity-ide\brain\7a984248-c829-4aed-a4d2-8c4ef4e33d3b\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# line index 3396 corresponds to step 3209
obj = json.loads(lines[3396])
tool_call = obj['tool_calls'][0]
args = tool_call['args']

chunks = args['ReplacementChunks']
if isinstance(chunks, str):
    chunks = json.loads(chunks, strict=False)

with open('scratch/chunks.json', 'w', encoding='utf-8') as out:
    json.dump(chunks, out, indent=2, ensure_ascii=False)

print("Successfully wrote chunks to scratch/chunks.json")
