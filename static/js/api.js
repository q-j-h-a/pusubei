const DEFAULT_EXPERIMENT_ID = "simple_linear_regression";

function appBasePath() {
  if (window.APP_BASE_PATH !== undefined) {
    return String(window.APP_BASE_PATH || "").replace(/\/+$/, "");
  }
  const pathname = window.location.pathname || "/";
  if (pathname === "/" || pathname === "") return "";
  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? `/${parts[0]}` : "";
}

function prefixedUrl(path) {
  if (!path) return appBasePath() || "/";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = appBasePath();
  if (base && (cleanPath === base || cleanPath.startsWith(`${base}/`))) return cleanPath;
  return `${base}${cleanPath}`;
}

function apiUrl(path) {
  return prefixedUrl(path);
}

function assetUrl(path) {
  return prefixedUrl(path);
}

function currentExperimentId() {
  return window.currentExperiment || DEFAULT_EXPERIMENT_ID;
}

function experimentQueryParam() {
  return `experiment=${encodeURIComponent(currentExperimentId())}`;
}

function withCurrentExperiment(url, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (!["/api/run_action", "/api/chart_data"].includes(url)) return payload;
  return {
    experiment: currentExperimentId(),
    ...payload,
  };
}

async function postJson(url, payload) {
  const resp = await fetch(apiUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withCurrentExperiment(url, payload))
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function runAction(action, payload = {}) {
  return await postJson("/api/run_action", { action, payload });
}
