(function () {
  const EXPERIMENT_PAGES = new Set(["preprocess", "train_eval", "evaluate", "predict"]);
  const POSITION_KEY = "aiAssistantWidgetPositionV1";
  const widget = document.getElementById("aiAssistantWidget");
  const bubble = document.getElementById("aiAssistantBubble");
  const panel = document.getElementById("aiAssistantPanel");
  const closeBtn = document.getElementById("aiAssistantClose");
  const messagesEl = document.getElementById("aiAssistantMessages");
  const form = document.getElementById("aiAssistantForm");
  const input = document.getElementById("aiAssistantInput");
  const sendBtn = document.getElementById("aiAssistantSend");
  const promptButtons = Array.from(document.querySelectorAll("[data-ai-prompt]"));

  if (!widget || !bubble || !panel || !messagesEl || !form || !input) return;

  const chatHistory = [];
  let dragState = null;
  let isWaiting = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function viewportBoundedPosition(left, top) {
    const rect = widget.getBoundingClientRect();
    const width = rect.width || 64;
    const height = rect.height || 64;
    return {
      left: clamp(left, 8, Math.max(8, window.innerWidth - width - 8)),
      top: clamp(top, 8, Math.max(8, window.innerHeight - height - 8)),
    };
  }

  function saveWidgetPosition() {
    const rect = widget.getBoundingClientRect();
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
    } catch (err) {}
  }

  function restoreWidgetPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return;
      const pos = viewportBoundedPosition(saved.left, saved.top);
      widget.style.left = `${pos.left}px`;
      widget.style.top = `${pos.top}px`;
      widget.style.right = "auto";
      widget.style.bottom = "auto";
    } catch (err) {}
  }

  function updatePanelPlacement() {
    const rect = widget.getBoundingClientRect();
    panel.style.left = "";
    panel.style.right = "";
    panel.style.top = "";
    panel.style.bottom = "";

    if (rect.left < 380) {
      panel.style.left = "0";
    } else {
      panel.style.right = "0";
    }

    if (rect.top < 560) {
      panel.style.top = "76px";
    } else {
      panel.style.bottom = "76px";
    }
  }

  function currentAiContext() {
    const store = typeof viewStateStore !== "undefined" ? viewStateStore : {};
    const testState = store.experimentTestStateV1 || null;
    const trainStep = typeof activeTrainStep !== "undefined"
      ? activeTrainStep
      : store.activeTrainStepV1;
    const trainStates = store.trainFormStateByStepV1 || {};
    const trainFormState = trainStep ? trainStates[trainStep] : null;

    return {
      page: typeof currentPage !== "undefined" ? currentPage : "",
      preprocessStep: typeof activePreprocessStep !== "undefined"
        ? activePreprocessStep
        : store.activePreprocessStepV1,
      trainStep,
      evaluateMetric: store.evaluateMetricModeV1 || "rmse",
      predictForm: store.predictFormStateV1 || null,
      trainFormState,
      testState,
      feature: typeof currentFeature === "function" ? currentFeature() : DEFAULT_FEATURE,
    };
  }

  function shouldShowAssistant() {
    const activeNav = document.querySelector(".nav-btn.active");
    const activeNavPage = activeNav && activeNav.dataset ? activeNav.dataset.page || "" : "";
    const page = typeof currentPage !== "undefined" ? currentPage : activeNavPage;
    const store = typeof viewStateStore !== "undefined" ? viewStateStore : {};
    const testState = store.experimentTestStateV1 || {};
    if (page === "experiment_test") return Boolean(testState.finished);
    if (testState.active && testState.started && !testState.finished) return false;
    return EXPERIMENT_PAGES.has(page) || EXPERIMENT_PAGES.has(activeNavPage);
  }

  function refreshVisibility() {
    const visible = shouldShowAssistant();
    widget.classList.toggle("hidden", !visible);
    if (!visible) panel.hidden = true;
  }

  function addMessage(role, content) {
    const item = document.createElement("div");
    item.className = `ai-message ai-role-${role}`;
    item.textContent = content;
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (role === "user" || role === "assistant") {
      chatHistory.push({ role, content });
      if (chatHistory.length > 12) chatHistory.splice(0, chatHistory.length - 12);
    }
  }

  function setWaiting(next) {
    isWaiting = next;
    sendBtn.disabled = next;
    input.disabled = next;
    promptButtons.forEach(btn => {
      btn.disabled = next;
    });
  }

  async function askAssistant(question) {
    const trimmed = String(question || "").trim();
    if (!trimmed || isWaiting) return;
    if (panel.hidden) openPanel();
    addMessage("user", trimmed);
    input.value = "";
    setWaiting(true);
    const loading = document.createElement("div");
    loading.className = "ai-message ai-role-assistant";
    loading.textContent = "正在结合当前实验步骤思考...";
    messagesEl.appendChild(loading);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const history = chatHistory.slice(0, -1);
      const data = await postJson("/api/ai_assistant", {
        question: trimmed,
        context: currentAiContext(),
        history,
      });
      loading.remove();
      addMessage("assistant", data.answer || "我暂时没有生成有效回答。");
    } catch (err) {
      loading.remove();
      addMessage("assistant", err.message || "AI 助手暂时不可用，请稍后再试。");
    } finally {
      setWaiting(false);
      input.focus();
    }
  }

  function openPanel() {
    updatePanelPlacement();
    panel.hidden = false;
    bubble.setAttribute("aria-label", "收起 AI 学习助手");
    if (!messagesEl.children.length) {
      addMessage("assistant", "你好，我会根据当前实验步骤提醒你应该做什么、观察什么。可以先点下面的快捷问题。");
    }
    window.setTimeout(() => input.focus(), 0);
  }

  function closePanel() {
    panel.hidden = true;
    bubble.setAttribute("aria-label", "打开 AI 学习助手");
  }

  function togglePanel() {
    if (panel.hidden) openPanel();
    else closePanel();
  }

  bubble.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = widget.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    bubble.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  bubble.addEventListener("pointermove", event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) dragState.moved = true;
    if (!dragState.moved) return;
    const pos = viewportBoundedPosition(dragState.left + dx, dragState.top + dy);
    widget.style.left = `${pos.left}px`;
    widget.style.top = `${pos.top}px`;
    widget.style.right = "auto";
    widget.style.bottom = "auto";
    updatePanelPlacement();
  });

  bubble.addEventListener("pointerup", event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    try {
      bubble.releasePointerCapture(event.pointerId);
    } catch (err) {}
    const wasMoved = dragState.moved;
    dragState = null;
    if (wasMoved) {
      saveWidgetPosition();
    } else {
      togglePanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);
  form.addEventListener("submit", event => {
    event.preventDefault();
    askAssistant(input.value);
  });
  input.addEventListener("paste", event => {
    const items = Array.from(event.clipboardData && event.clipboardData.items ? event.clipboardData.items : []);
    if (items.some(item => item.type && item.type.startsWith("image/"))) {
      event.preventDefault();
      if (panel.hidden) openPanel();
      addMessage("assistant", "当前 AI 助手第一版只支持文字问题，还不能直接读取粘贴的图片。你可以把图片中的现象用一句话描述出来，例如“Loss 曲线一直上升”或“散点图里红线偏得很远”。");
    }
  });
  promptButtons.forEach(btn => {
    btn.addEventListener("click", () => askAssistant(btn.dataset.aiPrompt));
  });
  window.addEventListener("resize", () => {
    restoreWidgetPosition();
    updatePanelPlacement();
  });
  window.addEventListener("app-page-change", refreshVisibility);
  window.addEventListener("experiment-test-state-change", refreshVisibility);

  restoreWidgetPosition();
  refreshVisibility();
  window.setInterval(refreshVisibility, 800);
})();
