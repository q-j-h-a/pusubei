// AI assistant settings page.

const ASSISTANT_VOICE_KEY = "linearRegressionTheoryAssistantVoice";
const ASSISTANT_RATE_KEY = "linearRegressionTheoryAssistantRate";

const ASSISTANT_VOICE_OPTIONS = [
  { value: "zh-CN-XiaoxiaoNeural", label: "晓晓 · 女声 · 温暖" },
  { value: "zh-CN-XiaoyiNeural", label: "小艺 · 女声 · 活泼" },
  { value: "zh-CN-YunxiNeural", label: "云希 · 男声 · 阳光" },
  { value: "zh-CN-YunyangNeural", label: "云扬 · 男声 · 稳重" },
  { value: "zh-CN-YunjianNeural", label: "云健 · 男声 · 有力" },
  { value: "zh-CN-YunxiaNeural", label: "云夏 · 男声 · 年轻" },
  { value: "Tingting", label: "婷婷 · 本机备用" },
];

function readAssistantSetting(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch (err) {
    return "";
  }
}

function writeAssistantSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {}
}

function assistantProviderLabel(provider) {
  if (provider === "ollama") return "仅本地 Ollama";
  if (provider === "external") return "仅外部 API";
  return "本地优先";
}

function assistantVoiceLabel(value) {
  return ASSISTANT_VOICE_OPTIONS.find(item => item.value === value)?.label || value || "未设置";
}

function currentAssistantAudioSettings() {
  const savedVoice = readAssistantSetting(ASSISTANT_VOICE_KEY);
  const voice = ASSISTANT_VOICE_OPTIONS.some(item => item.value === savedVoice)
    ? savedVoice
    : "zh-CN-XiaoxiaoNeural";
  const rateValue = Number(readAssistantSetting(ASSISTANT_RATE_KEY));
  const rate = Number.isFinite(rateValue) && rateValue >= 0.85 && rateValue <= 1.45
    ? rateValue
    : 1.15;
  return { voice, rate };
}

function renderSettingsSide(config, audio) {
  const provider = config?.provider || "ollama_first";
  const apiKeyState = config?.external?.api_key_configured ? "外部 API key 已配置" : "外部 API key 未配置";
  $("rightPanel").innerHTML = `
    <div class="right-title">当前助教配置</div>
    <div class="helper-card">
      <h3>模型模式</h3>
      <p>${escapeHtml(assistantProviderLabel(provider))}</p>
      <div class="settings-badges">
        <span class="settings-badge">Ollama：${escapeHtml(config?.ollama?.model || "-")}</span>
        <span class="settings-badge">外部：${escapeHtml(config?.external?.model || "-")}</span>
      </div>
    </div>
    <div class="helper-card">
      <h3>语音设置</h3>
      <p>${escapeHtml(assistantVoiceLabel(audio.voice))}</p>
      <p>语速：${audio.rate.toFixed(2)}x</p>
    </div>
    <div class="helper-card">
      <h3>外部接口</h3>
      <p>${escapeHtml(apiKeyState)}</p>
      <p>API key 不会在页面里回显。填入新 key 后，只会更新当前后端运行进程。</p>
    </div>
  `;
}

function renderModelButtons(models, activeModel) {
  if (!Array.isArray(models) || !models.length) {
    return `<div class="empty-state" style="min-height:160px">没有读取到模型列表。</div>`;
  }
  return models
    .map(model => `
      <button class="${model === activeModel ? "active" : ""}" type="button" data-ollama-model="${escapeHtml(model)}">
        ${escapeHtml(model)}
      </button>
    `)
    .join("");
}

async function loadAssistantConfig() {
  const resp = await fetch("/api/assistant_config");
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "读取设置失败");
  return data;
}

async function renderSettingsShell() {
  document.querySelector(".shell").classList.remove("theory");
  if (window.TheoryAssistant) window.TheoryAssistant.hide();
  $("main").innerHTML = `
    <div class="settings-layout">
      <section class="settings-card">
        <h2>AI 助教设置</h2>
        <p class="settings-lead">这里统一管理 AI 助教的模型、接口、音色和语速。默认优先使用本机 Ollama，外部 API 保留为可选路径。</p>
        <form class="settings-form" id="assistantSettingsForm">
          <div class="settings-section">
            <h3>模型配置</h3>
            <div class="settings-grid">
              <div class="settings-field wide">
                <label for="assistantProvider">模型模式</label>
                <select id="assistantProvider">
                  <option value="ollama_first">本地优先：Ollama 不可用时再用外部 API</option>
                  <option value="ollama">仅本地 Ollama</option>
                  <option value="external">仅外部 API</option>
                </select>
              </div>
              <div class="settings-field">
                <label for="ollamaBaseUrl">Ollama 接口地址</label>
                <input id="ollamaBaseUrl" type="url" autocomplete="off">
                <p class="settings-hint">当前推荐：<code>http://127.0.0.1:11434/v1</code></p>
              </div>
              <div class="settings-field">
                <label for="ollamaModel">Ollama 模型名</label>
                <input id="ollamaModel" type="text" autocomplete="off">
                <p class="settings-hint">当前推荐：<code>gpt-oss:20b</code></p>
              </div>
              <div class="settings-field">
                <label for="externalBaseUrl">外部 API 地址</label>
                <input id="externalBaseUrl" type="url" autocomplete="off">
              </div>
              <div class="settings-field">
                <label for="externalModel">外部模型名</label>
                <input id="externalModel" type="text" autocomplete="off">
              </div>
              <div class="settings-field wide">
                <label for="externalApiKey">外部 API key</label>
                <input id="externalApiKey" type="password" autocomplete="off" placeholder="不填则保留当前后端配置">
                <p class="settings-hint"><label style="display:inline-flex;gap:8px;align-items:center;margin:8px 0 0;font-weight:800"><input id="clearExternalKey" type="checkbox"> 清空当前后端里的外部 API key</label></p>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>语音配置</h3>
            <div class="settings-grid">
              <div class="settings-field">
                <label for="assistantVoice">音色</label>
                <select id="assistantVoice">
                  ${ASSISTANT_VOICE_OPTIONS.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("")}
                </select>
                <p class="settings-hint">Edge TTS 音色需要网络；“婷婷”走 macOS 本机语音。</p>
              </div>
              <div class="settings-field">
                <div class="settings-label"><span>语速</span><strong id="assistantRateValue">1.15x</strong></div>
                <input id="assistantRate" type="range" min="0.85" max="1.45" step="0.05" value="1.15">
                <p class="settings-hint">这个设置会同步到朗读当前页和 AI 回答朗读。</p>
              </div>
            </div>
          </div>

          <div class="settings-actions">
            <button class="primary" id="saveAssistantSettings" type="submit">保存设置</button>
            <button id="checkOllamaModels" type="button">检测 Ollama 模型</button>
            <span class="settings-status" id="assistantSettingsStatus"></span>
          </div>
        </form>
      </section>

      <section class="settings-card">
        <h3>本机 Ollama 模型</h3>
        <p class="settings-lead">点击模型名可以写入左侧模型配置。</p>
        <div class="settings-model-list" id="ollamaModelList">
          <div class="empty-state" style="min-height:160px">点击“检测 Ollama 模型”后显示。</div>
        </div>
      </section>
    </div>
  `;

  const audio = currentAssistantAudioSettings();
  let config;
  try {
    config = await loadAssistantConfig();
  } catch (err) {
    config = {
      provider: "ollama_first",
      ollama: { base_url: "http://127.0.0.1:11434/v1", model: "gpt-oss:20b" },
      external: { base_url: "https://api.masterjie.eu.cc/v1", model: "JoyAI-1.3T", api_key_configured: false },
    };
    $("assistantSettingsStatus").textContent = err.message;
    $("assistantSettingsStatus").className = "settings-status error";
  }

  const providerEl = $("assistantProvider");
  const ollamaBaseEl = $("ollamaBaseUrl");
  const ollamaModelEl = $("ollamaModel");
  const externalBaseEl = $("externalBaseUrl");
  const externalModelEl = $("externalModel");
  const externalKeyEl = $("externalApiKey");
  const clearKeyEl = $("clearExternalKey");
  const voiceEl = $("assistantVoice");
  const rateEl = $("assistantRate");
  const rateValueEl = $("assistantRateValue");
  const statusEl = $("assistantSettingsStatus");
  const modelListEl = $("ollamaModelList");

  providerEl.value = config.provider || "ollama_first";
  ollamaBaseEl.value = config.ollama?.base_url || "http://127.0.0.1:11434/v1";
  ollamaModelEl.value = config.ollama?.model || "gpt-oss:20b";
  externalBaseEl.value = config.external?.base_url || "https://api.masterjie.eu.cc/v1";
  externalModelEl.value = config.external?.model || "JoyAI-1.3T";
  voiceEl.value = audio.voice;
  rateEl.value = String(audio.rate);
  rateValueEl.textContent = `${audio.rate.toFixed(2)}x`;
  renderSettingsSide(config, audio);

  const setStatus = (text, type = "") => {
    statusEl.textContent = text;
    statusEl.className = `settings-status ${type}`.trim();
  };

  async function refreshModels() {
    setStatus("正在检测 Ollama 模型...");
    const url = `/api/assistant_models?base_url=${encodeURIComponent(ollamaBaseEl.value.trim())}`;
    const resp = await fetch(url);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || "模型列表读取失败");
    modelListEl.innerHTML = renderModelButtons(data.models || [], ollamaModelEl.value.trim());
    modelListEl.querySelectorAll("[data-ollama-model]").forEach(btn => {
      btn.addEventListener("click", () => {
        ollamaModelEl.value = btn.dataset.ollamaModel || "";
        modelListEl.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === btn));
      });
    });
    setStatus(`读取到 ${data.models?.length || 0} 个模型。`, "ready");
  }

  rateEl.addEventListener("input", () => {
    const nextRate = Number(rateEl.value);
    rateValueEl.textContent = `${(Number.isFinite(nextRate) ? nextRate : 1.15).toFixed(2)}x`;
  });

  $("checkOllamaModels").addEventListener("click", async () => {
    try {
      await refreshModels();
    } catch (err) {
      setStatus(err.message, "error");
    }
  });

  $("assistantSettingsForm").addEventListener("submit", async event => {
    event.preventDefault();
    const nextRate = Number(rateEl.value);
    const payload = {
      provider: providerEl.value,
      ollama_base_url: ollamaBaseEl.value.trim(),
      ollama_model: ollamaModelEl.value.trim(),
      external_base_url: externalBaseEl.value.trim(),
      external_model: externalModelEl.value.trim(),
      clear_external_api_key: clearKeyEl.checked,
    };
    const apiKey = externalKeyEl.value.trim();
    if (apiKey) payload.external_api_key = apiKey;
    try {
      setStatus("正在保存...");
      const saved = await postJson("/api/assistant_config", payload);
      writeAssistantSetting(ASSISTANT_VOICE_KEY, voiceEl.value);
      writeAssistantSetting(ASSISTANT_RATE_KEY, String(Number.isFinite(nextRate) ? nextRate : 1.15));
      if (window.TheoryAssistant?.updateAudioSettings) {
        window.TheoryAssistant.updateAudioSettings({
          voiceURI: voiceEl.value,
          rate: Number.isFinite(nextRate) ? nextRate : 1.15,
        });
      }
      externalKeyEl.value = "";
      clearKeyEl.checked = false;
      renderSettingsSide(saved, {
        voice: voiceEl.value,
        rate: Number.isFinite(nextRate) ? nextRate : 1.15,
      });
      setStatus("设置已保存。", "ready");
    } catch (err) {
      setStatus(err.message, "error");
    }
  });
}
