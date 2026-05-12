async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function runAction(action, payload = {}) {
  return await postJson("/api/run_action", { action, payload });
}
