// Predict Page.

let predictRawScatterData = null;
let predictRawScatterKey = "";
const PREDICT_GUIDE_ID = "predict";
const PREDICT_GUIDE_STEPS = new Set([
  "predict_model",
  "predict_input",
  "predict_run",
  "predict_charts",
  "predict_calc",
]);

async function renderPredictShell() {
  if (currentExperimentId() === "naive_bayes") {
    await renderNbPredictShell();
    return;
  }
  predictPageSchema = predictPageSchema || await loadPanelSchema("predict", {
    title: "\u6a21\u578b\u9884\u6d4b",
    sections: []
  });
  document.querySelector(".shell").classList.remove("theory");
  predictData = null;
  predictRawScatterData = null;
  predictRawScatterKey = "";
  predictRenderViewsKey = "";
  $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="predictWrap"></div>`;
  $("rightPanel").innerHTML = renderPredictPanel();
  bindGuideControls?.();
  bindPredictCodeButtons();
  syncPredictPanelWithTrainModel();
  $("predictRun")?.addEventListener("click", async () => {
    await loadPrediction();
    advancePredictGuideOnRunClick();
  });
  $("predictInputMode")?.addEventListener("change", persistPredictFormState);
  $("predictInput")?.addEventListener("input", persistPredictFormState);
  $("predictInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") loadPrediction();
  });
  restorePredictFormState();
  await resetPredictionPendingState();
}

function renderPredictPanel() {
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card predict-control-card">
      <h3>\u6a21\u578b\u9884\u6d4b</h3>
      <div class="mini-stats">
        <div class="mini-stat"><span>\u9884\u6d4b MEDV</span><strong id="predictValue">--</strong></div>
        <div class="mini-stat"><span>\u6a21\u578b\u8f93\u5165 x</span><strong id="predictModelX">--</strong></div>
      </div>
      <div class="control-group predict-model-guide-target" aria-label="\u5f53\u524d\u6a21\u578b">
        <label class="control-label">\u5f53\u524d\u6a21\u578b</label>
        <div class="formula-box" id="predictModelStatus">\u8bf7\u5148\u5728\u201c\u6a21\u578b\u8bad\u7ec3\u201d\u9875\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\u3002</div>
      </div>
      <div class="control-group">
        <label class="control-label" for="predictFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="predictFeature" disabled>
          ${(currentDatasetMeta?.features || FEATURE_NAMES).map(item => optionHtml(item, trainData?.feature || DEFAULT_FEATURE, item)).join("")}
        </select>
        <input id="predictStd" type="hidden" value="true">
      </div>
      <div class="control-group predict-input-guide-target" aria-label="\u8f93\u5165\u8bbe\u7f6e">
        <div class="field-grid">
          <label class="control-label" for="predictInputMode">\u8f93\u5165\u7c7b\u578b
            <select id="predictInputMode">
              <option value="raw">\u539f\u59cb\u7279\u5f81\u503c</option>
              <option value="standardized">\u6807\u51c6\u7279\u5f81\u503c</option>
            </select>
          </label>
          <label class="control-label" for="predictInput">\u8f93\u5165\u7279\u5f81\u503c
            <input id="predictInput" type="text" inputmode="decimal" value="6.5" autocomplete="off">
          </label>
        </div>
      </div>
      <div class="predict-actions predict-run-guide-target">
        <button class="primary-btn" id="predictRun" type="button">\u5f00\u59cb\u9884\u6d4b</button>
        ${predictCodeButtonHtml()}
      </div>
    </div>`;
}

function persistPredictFormState() {
  const state = {};
  ["predictInput", "predictInputMode"].forEach(id => {
    const el = $(id);
    if (el) state[id] = el.value;
  });
  viewStateStore.predictFormStateV1 = state;
}

function restorePredictFormState() {
  const state = viewStateStore.predictFormStateV1 || {};
  ["predictInput", "predictInputMode"].forEach(id => {
    const el = $(id);
    if (!el || state[id] == null) return;
    if (el.tagName === "SELECT" && ![...el.options].some(opt => opt.value === state[id])) return;
    el.value = state[id];
  });
  syncPredictPanelWithTrainModel();
}

function guideEnabledForPredict() {
  const state = guidePageState(PREDICT_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function ensurePredictGuideStep() {
  const state = guidePageState(PREDICT_GUIDE_ID);
  if (!PREDICT_GUIDE_STEPS.has(state.step)) {
    setGuidePageState({ step: "predict_model" }, PREDICT_GUIDE_ID);
  }
}

async function resetPredictionPendingState() {
  persistPredictFormState();
  predictData = null;
  predictRawScatterData = null;
  predictRawScatterKey = "";
  predictRenderViewsKey = "";
  if ($("predictValue")) $("predictValue").textContent = "--";
  if ($("predictModelX")) $("predictModelX").textContent = "--";
  syncPredictPanelWithTrainModel();
  if (!currentTrainPredictionState()) {
    predictEmptyState();
    return;
  }
  await renderPredictBaseCharts();
}

function predictGuideSpec() {
  const state = guidePageState(PREDICT_GUIDE_ID);
  const step = state.step || "predict_model";
  if (step === "predict_input") {
    return {
      step,
      target: ".predict-input-guide-target",
      title: "输入待预测特征值",
      body: "这里可以选择原始特征值或标准特征值。选择原始值时，系统会先用训练时的均值和标准差把它换算为模型输入；本次默认使用原始值 6.5。",
      action: "设为原始值 6.5",
    };
  }
  if (step === "predict_run") {
    return {
      step,
      target: "#predictRun",
      title: "开始预测",
      body: "请点击真实的“开始预测”按钮。页面只有在点击按钮或按 Enter 后，才会生成预测点、预测 MEDV 和计算过程。",
      action: "",
    };
  }
  if (step === "predict_charts") {
    return {
      step,
      target: ".predict-chart-combo-target",
      title: "观察预测结果位置",
      body: "同时观察预测可视化和原始散点图。左图展示自定义参数模型在标准化空间中的预测点，右图展示反标准化后预测点落在原始数据空间的位置。",
      action: "下一步",
    };
  }
  if (step === "predict_calc") {
    return {
      step,
      target: "#predictCalcCard",
      title: "查看预测计算过程",
      body: "最后查看输入值如何被标准化、如何代入 y = wx + b，以及预测值如何还原为原始 MEDV。预测结果来自这些明确计算步骤。",
      action: "完成本步引导",
    };
  }
  return {
    step: "predict_model",
    target: ".predict-model-guide-target",
    title: "确认当前模型",
    body: "先确认预测页正在使用哪个模型。这里显示的特征、w 和 b 来自上一节自定义参数训练得到的当前模型。",
    action: "下一步",
  };
}

function updatePredictGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "predict" || !guideEnabledForPredict()) {
      closePredictGuide();
      return;
    }
    ensurePredictGuideStep();
    const spec = predictGuideSpec();
    const target = spec.step === "predict_charts"
      ? createPredictChartComboTarget()
      : document.querySelector(spec.target);
    if (!target) return;
    renderPredictGuide(spec, target);
  });
}

function schedulePredictGuideUpdate(delay = 120) {
  clearTimeout(schedulePredictGuideUpdate.timer);
  schedulePredictGuideUpdate.timer = setTimeout(() => {
    updatePredictGuide();
  }, delay);
}

function createPredictChartComboTarget() {
  const cards = ["predict_standard", "predict_raw"]
    .map(id => document.querySelector(`[data-chart-card="${id}"]`))
    .filter(Boolean);
  if (cards.length !== 2) return null;
  let target = document.querySelector(".predict-chart-combo-target");
  if (!target) {
    target = document.createElement("div");
    target.className = "predict-chart-combo-target";
    document.body.appendChild(target);
  }
  syncPredictChartComboTarget(target, cards);
  return target;
}

function syncPredictChartComboTarget(target, cards) {
  if (!target || !cards?.length) return;
  const rects = cards.map(card => card.getBoundingClientRect());
  const left = Math.min(...rects.map(rect => rect.left));
  const top = Math.min(...rects.map(rect => rect.top));
  const right = Math.max(...rects.map(rect => rect.right));
  const bottom = Math.max(...rects.map(rect => rect.bottom));
  target.style.position = "fixed";
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  target.style.width = `${right - left}px`;
  target.style.height = `${bottom - top}px`;
  target.style.pointerEvents = "none";
  target.style.borderRadius = "14px";
}

function highlightPredictChartCards() {
  ["predict_standard", "predict_raw"].forEach(id => {
    const card = document.querySelector(`[data-chart-card="${id}"]`);
    const item = card?.closest(".grid-stack-item");
    item?.classList.add("guide-lift");
    card?.classList.add("guide-highlight", "guide-highlight-large");
  });
}

function scrollPredictChartsIntoView() {
  const cards = ["predict_standard", "predict_raw"]
    .map(id => document.querySelector(`[data-chart-card="${id}"]`))
    .filter(Boolean);
  const main = $("main");
  if (cards.length !== 2 || !main) return;
  const rects = cards.map(card => card.getBoundingClientRect());
  const mainRect = main.getBoundingClientRect();
  const top = Math.min(...rects.map(rect => rect.top));
  const bottom = Math.max(...rects.map(rect => rect.bottom));
  const targetHeight = bottom - top;
  const padding = 24;
  const availableHeight = mainRect.height - padding * 2;
  const targetTop = targetHeight <= availableHeight
    ? mainRect.top + padding + (availableHeight - targetHeight) / 2
    : mainRect.top + padding;
  main.scrollTop += top - targetTop;
}

function renderPredictGuide(spec, target) {
  closePredictGuide();
  const isChartCombo = spec.step === "predict_charts";
  const visualTarget = isChartCombo ? createPredictChartComboTarget() : target;
  if (!visualTarget) return;
  if (isChartCombo) {
    scrollPredictChartsIntoView();
    highlightPredictChartCards();
    syncPredictChartComboTarget(
      visualTarget,
      ["predict_standard", "predict_raw"].map(id => document.querySelector(`[data-chart-card="${id}"]`)).filter(Boolean)
    );
  } else if (typeof scrollTrainGuideTargetIntoView === "function") {
    scrollTrainGuideTargetIntoView(visualTarget);
  } else {
    visualTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  visualTarget.classList.add("guide-highlight");
  const isLargeTarget = spec.step !== "predict_run";
  if (isLargeTarget) visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" data-predict-guide-step="${escapeHtml(spec.step)}" role="dialog" aria-live="polite" aria-label="模型预测引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    if (isChartCombo) {
      syncPredictChartComboTarget(
        visualTarget,
        ["predict_standard", "predict_raw"].map(id => document.querySelector(`[data-chart-card="${id}"]`)).filter(Boolean)
      );
    }
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 120);

  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "predict_model" }, PREDICT_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePredictGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "predict_model") {
      setGuidePageState({ step: "predict_input" }, PREDICT_GUIDE_ID);
      updatePredictGuide();
    } else if (step === "predict_input") {
      setPredictRawInputDefault();
      setGuidePageState({ step: "predict_run" }, PREDICT_GUIDE_ID);
      schedulePredictGuideUpdate(120);
    } else if (step === "predict_charts") {
      setGuidePageState({ step: "predict_calc" }, PREDICT_GUIDE_ID);
      schedulePredictGuideUpdate(80);
    } else if (step === "predict_calc") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "predict_model" }, PREDICT_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePredictGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function setPredictRawInputDefault() {
  const mode = $("predictInputMode");
  const input = $("predictInput");
  if (mode) mode.value = "raw";
  if (input) input.value = "6.5";
  persistPredictFormState();
}

function advancePredictGuideOnRunClick() {
  if (currentPage !== "predict" || !guideEnabledForPredict()) return;
  const state = guidePageState(PREDICT_GUIDE_ID);
  if (state.step !== "predict_run" || !predictData) return;
  setGuidePageState({ step: "predict_charts" }, PREDICT_GUIDE_ID);
  schedulePredictGuideUpdate(160);
}

function closePredictGuide() {
  clearTimeout(schedulePredictGuideUpdate.timer);
  closePreprocessLoadGuide?.();
  document.querySelector(".predict-chart-combo-target")?.remove();
}

function restorePredictionView() {
  restorePredictFormState();
  if ($("predictValue")) $("predictValue").textContent = Number(predictDisplayPrediction()).toFixed(2);
  if ($("predictModelX")) $("predictModelX").textContent = Number(predictData.model_x).toFixed(3);
  if (predictData?.feature) $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${predictData.feature}`;
  ensurePredictRawScatterData()
    .catch(err => console.warn("Predict raw scatter fallback skipped:", err))
    .finally(() => renderPredictCharts());
}

function predictionMatchesCurrentState() {
  const trainState = currentTrainPredictionState();
  if (!predictData || !trainState) return false;
  const inputValue = Number($("predictInput")?.value || viewStateStore.predictFormStateV1?.predictInput || 0);
  const inputMode = $("predictInputMode")?.value || viewStateStore.predictFormStateV1?.predictInputMode || "raw";
  return predictData.train_context_id === trainState.contextId
    && Number(predictData.train_frame_index) === Number(trainState.frameIndex)
    && Number(predictData.input_value ?? predictData.raw_value) === inputValue
    && (predictData.input_mode || "raw") === inputMode;
}

function currentTrainPredictionState() {
  if (!trainData?.context_id || !Array.isArray(trainData.history) || !trainData.history.length) return null;
  const frameIndex = Math.max(0, Math.min(currentFrame, trainData.history.length - 1));
  const frame = trainData.history[frameIndex];
  return {
    contextId: trainData.context_id,
    frameIndex,
    frame,
    feature: trainData.feature,
    useStandardized: Boolean(trainData.use_standardized),
  };
}

function syncPredictPanelWithTrainModel() {
  const state = currentTrainPredictionState();
  const featureEl = $("predictFeature");
  const runEl = $("predictRun");
  const statusEl = $("predictModelStatus");
  const inputModeEl = $("predictInputMode");
  if (!state) {
    if (featureEl) featureEl.disabled = true;
    if (runEl) runEl.disabled = true;
    if (inputModeEl) inputModeEl.disabled = true;
    if (statusEl) {
      statusEl.className = "model-status-empty";
      statusEl.textContent = "\u6682\u65e0\u53ef\u7528\u8bad\u7ec3\u6a21\u578b\uff0c\u8bf7\u5148\u5b8c\u6210\u6a21\u578b\u8bad\u7ec3\u540e\u518d\u8fdb\u884c\u9884\u6d4b\u3002";
    }
    return;
  }
  if (featureEl) {
    featureEl.value = state.feature;
    featureEl.disabled = true;
  }
  if (inputModeEl) {
    inputModeEl.disabled = false;
    [...inputModeEl.options].forEach(option => {
      option.disabled = option.value === "standardized" && !state.useStandardized;
    });
    if (!state.useStandardized && inputModeEl.value === "standardized") inputModeEl.value = "raw";
  }
  if (runEl) runEl.disabled = false;
  if (statusEl) {
    statusEl.className = "predict-model-plain";
    statusEl.innerHTML = `
      <div><span>\u6765\u6e90\uff1a</span><strong>\u81ea\u5b9a\u4e49\u53c2\u6570\u8bad\u7ec3</strong></div>
      <div><span>\u7279\u5f81\uff1a</span><strong>${escapeHtml(state.feature)}</strong></div>
      <div><span>w = </span><strong>${Number(state.frame.w).toFixed(6)}</strong></div>
      <div><span>b = </span><strong>${Number(state.frame.b).toFixed(6)}</strong></div>`;
  }
}

async function loadPrediction() {
  persistPredictFormState();
  const trainState = currentTrainPredictionState();
  syncPredictPanelWithTrainModel();
  if (!trainState) {
    predictData = null;
    if ($("predictValue")) $("predictValue").textContent = "--";
    if ($("predictModelX")) $("predictModelX").textContent = "--";
    predictEmptyState();
    return;
  }
  const feature = trainState.feature;
  $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${feature}`;
  try {
    predictData = await runAction("predict", {
      value: Number($("predictInput").value || 0),
      input_mode: $("predictInputMode")?.value || "raw",
      train_context_id: trainState.contextId,
      train_frame_index: trainState.frameIndex
    });
    await ensurePredictRawScatterData();
    if ($("predictValue")) $("predictValue").textContent = Number(predictDisplayPrediction()).toFixed(2);
    if ($("predictModelX")) $("predictModelX").textContent = Number(predictData.model_x).toFixed(3);
    renderPredictCharts();
  } catch (err) {
    renderError(err.message);
  }
}

function predictEmptyState() {
  closePredictGuide();
  destroyDataGrid();
  disposeCharts();
  $("main").innerHTML = `
    <div class="empty-state">
      \u8bf7\u5148\u5728\u201c\u6a21\u578b\u8bad\u7ec3\u201d\u9875\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\uff0c\u7136\u540e\u518d\u8fdb\u884c\u6a21\u578b\u9884\u6d4b\u3002
    </div>`;
}

async function ensurePredictRawScatterData() {
  const trainState = currentTrainPredictionState();
  const feature = predictData?.feature || trainState?.feature;
  if (!feature) return null;
  const datasetId = predictData?.dataset_id || currentDatasetMeta?.dataset_id || "boston_housing";
  const key = `${datasetId}|${feature}`;
  if (predictRawScatterData && predictRawScatterKey === key) return predictRawScatterData;
  const raw = await runAction("prepare_train", {
    feature,
    dataset_id: datasetId,
    use_standardized: false,
    learning_rate: 0.03,
    epochs: 1,
    w0: 0,
    b0: 0
  });
  predictRawScatterData = raw;
  predictRawScatterKey = key;
  return raw;
}

async function renderPredictBaseCharts() {
  const trainState = currentTrainPredictionState();
  if (!trainState) {
    predictEmptyState();
    return;
  }
  $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${trainState.feature}`;
  await ensurePredictRawScatterData();
  const grid = ensurePredictGrid();
  const viewsKey = "predict_base_v1";
  if (predictRenderViewsKey !== viewsKey || !charts.get("chart_predict_standard") || !charts.get("chart_predict_raw") || !$("predictCalcCard")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "predict";
    grid.innerHTML = predictGridHtml();
    if (window.GridStack) {
      dataGrid = GridStack.init({
        column: 4,
        cellHeight: 260,
        margin: 8,
        float: true,
        animate: true,
        draggable: { handle: ".chart-head" },
        resizable: { handles: "e, s, se" }
      }, grid);
      grid.setAttribute("gs-column", "4");
      updateDataGridCellHeight();
      dataGrid.on("change dragstop resizestop", () => {
        syncDataGridAttributes();
        saveDataGridLayout();
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    predictRenderViewsKey = viewsKey;
  }

  const standard = charts.get("chart_predict_standard") || initChart("chart_predict_standard");
  standard.setOption(predictStandardBaseOption(), true);

  const raw = charts.get("chart_predict_raw") || initChart("chart_predict_raw");
  raw.setOption(predictRawBaseOption(), true);

  updatePredictCalcCard();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  schedulePredictGuideUpdate(140);
}

function renderPredictCharts() {
  if (!predictData) return;
  const grid = ensurePredictGrid();
  const viewsKey = "predict_fixed_v1";
  if (predictRenderViewsKey !== viewsKey || !charts.get("chart_predict_standard") || !charts.get("chart_predict_raw") || !$("predictCalcCard")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "predict";
    grid.innerHTML = predictGridHtml();
    if (window.GridStack) {
      dataGrid = GridStack.init({
        column: 4,
        cellHeight: 260,
        margin: 8,
        float: true,
        animate: true,
        draggable: { handle: ".chart-head" },
        resizable: { handles: "e, s, se" }
      }, grid);
      grid.setAttribute("gs-column", "4");
      updateDataGridCellHeight();
      dataGrid.on("change dragstop resizestop", () => {
        syncDataGridAttributes();
        saveDataGridLayout();
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    predictRenderViewsKey = viewsKey;
  }

  const standard = charts.get("chart_predict_standard") || initChart("chart_predict_standard");
  standard.setOption(predictStandardOption(), true);

  const raw = charts.get("chart_predict_raw") || initChart("chart_predict_raw");
  raw.setOption(predictRawOption(), true);

  updatePredictCalcCard();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  schedulePredictGuideUpdate(140);
}

function ensurePredictGrid() {
  if (!$("predictWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="predictWrap"></div>`;
    predictRenderViewsKey = "";
  }
  return $("predictWrap");
}

function predictGridHtml() {
  const saved = loadPredictGridLayout();
  const items = [
    { id: "predict_standard", layout: { x: 0, y: 0, w: 2, h: 2 }, html: chartCardHtml("predict_standard", "\u9884\u6d4b\u53ef\u89c6\u5316", "x \u548c y \u5747\u4e3a\u6807\u51c6\u5316\u7a7a\u95f4\uff0c\u663e\u793a\u6a21\u578b\u56de\u5f52\u7ebf\u4e0e\u9884\u6d4b\u70b9", "") },
    { id: "predict_raw", layout: { x: 2, y: 0, w: 2, h: 2 }, html: chartCardHtml("predict_raw", "\u539f\u59cb\u6563\u70b9\u56fe", "\u4ec5\u663e\u793a\u539f\u59cb\u6837\u672c\u70b9\u548c\u53cd\u6807\u51c6\u5316\u540e\u7684\u9884\u6d4b\u70b9", "") },
    { id: "predict_calc", layout: { x: 0, y: 2, w: 4, h: 3 }, html: `<div id="predictCalcCard" style="height:100%"></div>` },
  ];
  return items.map(item => {
    const layout = normalizePredictGridLayout(item.id, saved[item.id] || item.layout);
    return `<div class="grid-stack-item" data-view="${escapeHtml(item.id)}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${item.html}</div></div>`;
  }).join("");
}

function defaultPredictGridLayout(view) {
  return ({
    predict_standard: { x: 0, y: 0, w: 2, h: 2 },
    predict_raw: { x: 2, y: 0, w: 2, h: 2 },
    predict_calc: { x: 0, y: 2, w: 4, h: 3 },
  })[view] || { x: 0, y: 0, w: 2, h: 1 };
}

function normalizePredictGridLayout(view, layout) {
  const next = { ...defaultPredictGridLayout(view), ...layout };
  next.w = Math.max(1, Math.min(4, Number(next.w) || 1));
  next.h = Math.max(1, Number(next.h) || 1);
  next.x = Math.max(0, Math.min(4 - next.w, Number(next.x) || 0));
  next.y = Math.max(0, Number(next.y) || 0);
  return next;
}

function predictStandardOption() {
  const points = predictData.scatter.x.map((x, i) => [x, predictData.scatter.y[i]]);
  const lineData = Array.isArray(predictData.line)
    ? predictData.line
    : predictData.line.x.map((x, i) => [x, predictData.line.y[i]]);
  const inputPoint = [predictData.model_x, predictModelPrediction()];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: predictData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: `${predictData.target || "MEDV"}(std)`, nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineData, showSymbol: false, lineStyle: { color: "#0f9f78", width: 3 } },
      { name: "\u9884\u6d4b\u8f85\u52a9\u7ebf", type: "lines", coordinateSystem: "cartesian2d", data: [{ coords: [[predictData.model_x, 0], inputPoint] }], lineStyle: { color: "#f59e0b", width: 2, type: "dashed" } },
      { name: "\u9884\u6d4b\u70b9", type: "scatter", data: [inputPoint], symbolSize: 15, itemStyle: { color: "#e23b5a", borderColor: "#fff", borderWidth: 3 } }
    ]
  };
}

function predictStandardBaseOption() {
  const trainState = currentTrainPredictionState();
  const frame = trainState?.frame || {};
  const points = trainData.scatter.x.map((x, i) => [x, trainData.scatter.y[i]]);
  const lineData = trainData.line_x.map(x => [x, Number(frame.w) * x + Number(frame.b)]);
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: `${trainData.target || "MEDV"}(std)`, nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineData, showSymbol: false, lineStyle: { color: "#0f9f78", width: 3 } }
    ]
  };
}

function predictRawOption() {
  const raw = predictRawScatterData;
  const points = raw?.scatter?.x?.map((x, i) => [x, raw.scatter.y[i]]) || [];
  const inputPoint = [predictData.raw_value, predictDisplayPrediction()];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: predictData.feature, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: predictData.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u539f\u59cb\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(37,99,235,.58)" } },
      { name: "\u9884\u6d4b\u70b9", type: "scatter", data: [inputPoint], symbolSize: 15, itemStyle: { color: "#e23b5a", borderColor: "#fff", borderWidth: 3 } }
    ]
  };
}

function predictRawBaseOption() {
  const raw = predictRawScatterData;
  const trainState = currentTrainPredictionState();
  const points = raw?.scatter?.x?.map((x, i) => [x, raw.scatter.y[i]]) || [];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainState?.feature || DEFAULT_FEATURE, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: raw?.target || trainData?.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u539f\u59cb\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(37,99,235,.58)" } }
    ]
  };
}

function updatePredictCalcCard() {
  const slot = $("predictCalcCard");
  if (!slot) return;
  slot.innerHTML = predictCalcCardHtml();
}

function predictCalcCardHtml() {
  if (!predictData) {
    return `<section class="chart-card wide">
      <div class="chart-head">
        <div><div class="chart-title">\u9884\u6d4b\u8ba1\u7b97\u8fc7\u7a0b</div><div class="chart-sub">\u8f93\u5165\u503c\u3001\u6807\u51c6\u5316\u6362\u7b97\u3001\u6a21\u578b\u4ee3\u5165\u548c\u9884\u6d4b\u8f93\u51fa</div></div>
      </div>
      <div style="padding:18px">
        <div class="formula">请在右侧输入特征值，然后点击“开始预测”。

点击后这里会展示：
1. 读取输入
2. 换算为模型输入
3. 代入线性回归模型
4. 还原为原始 MEDV
5. 图中预测点对应位置</div>
      </div>
    </section>`;
  }
  const modelType = predictData.use_standardized ? "\u6807\u51c6\u5316\u7279\u5f81" : "\u539f\u59cb\u7279\u5f81";
  const conversion = predictData.use_standardized
    ? `x_std = (x_raw - mean) / std = (${num(predictData.raw_value, 6)} - ${num(predictData.mean, 6)}) / ${num(predictData.std, 6)} = ${num(predictData.model_x, 6)}`
    : `x_model = x_raw = ${num(predictData.model_x, 6)}`;
  const yConversion = predictData.use_standardized
    ? `\u0177_raw = \u0177_std * y_std + y_mean = ${num(predictModelPrediction(), 6)} * ${num(predictData.target_std, 6)} + ${num(predictData.target_mean, 6)} = ${num(predictDisplayPrediction(), 6)}`
    : `\u0177_raw = \u0177 = ${num(predictDisplayPrediction(), 6)}`;
  return `<section class="chart-card wide">
    <div class="chart-head">
      <div><div class="chart-title">\u9884\u6d4b\u8ba1\u7b97\u8fc7\u7a0b</div><div class="chart-sub">\u8f93\u5165\u503c\u3001\u6807\u51c6\u5316\u6362\u7b97\u3001\u6a21\u578b\u4ee3\u5165\u548c\u9884\u6d4b\u8f93\u51fa</div></div>
    </div>
    <div style="padding:18px">
      <div class="formula">1. \u8bfb\u53d6\u8f93\u5165
\u8f93\u5165\u7c7b\u578b = ${predictData.input_mode === "standardized" ? "\u6807\u51c6\u7279\u5f81\u503c" : "\u539f\u59cb\u7279\u5f81\u503c"}
\u8f93\u5165\u503c = ${num(predictData.input_value, 6)}

2. \u6362\u7b97\u4e3a\u6a21\u578b\u8f93\u5165
\u5f53\u524d\u6a21\u578b\u4f7f\u7528\uff1a${modelType}
raw x = ${num(predictData.raw_value, 6)}
model x = ${num(predictData.model_x, 6)}
${conversion}

3. \u4ee3\u5165\u7ebf\u6027\u56de\u5f52\u6a21\u578b
\u0177_std = w * x_std + b
  = ${num(predictData.w, 6)} * ${num(predictData.model_x, 6)} + ${num(predictData.b, 6)}
  = ${num(predictModelPrediction(), 6)}

4. \u8fd8\u539f\u4e3a\u539f\u59cb MEDV
${yConversion}

5. \u56fe\u4e2d\u5bf9\u5e94
\u5de6\u56fe\u5728\u6807\u51c6\u5316\u7a7a\u95f4\u663e\u793a\u9884\u6d4b\u70b9\uff1a(${num(predictData.model_x, 4)}, ${num(predictModelPrediction(), 4)})
\u53f3\u56fe\u5728\u539f\u59cb\u6570\u636e\u7a7a\u95f4\u663e\u793a\u9884\u6d4b\u70b9\uff1a(${num(predictData.raw_value, 4)}, ${num(predictDisplayPrediction(), 4)})</div>
    </div>
  </section>`;
}

function predictModelPrediction() {
  return Number(predictData?.prediction_std ?? predictData?.prediction ?? 0);
}

function predictDisplayPrediction() {
  return Number(predictData?.prediction_raw ?? predictData?.prediction ?? 0);
}

function predictCodeButtonHtml() {
  return `<button class="secondary-btn code-toggle-btn" type="button" data-predict-code="predict">查看预测代码</button>`;
}

function predictCodeSpec() {
  const trainState = currentTrainPredictionState();
  const feature = predictData?.feature || trainState?.feature || trainData?.feature || DEFAULT_FEATURE;
  const target = predictData?.target || trainData?.target || "MEDV";
  const inputMode = $("predictInputMode")?.value || predictData?.input_mode || "raw";
  const inputValue = $("predictInput")?.value || predictData?.input_value || "6.5";
  const frame = trainState?.frame || {};
  const w = predictData?.w ?? frame.w;
  const b = predictData?.b ?? frame.b;
  const mean = predictData?.mean;
  const std = predictData?.std;
  const targetMean = predictData?.target_mean;
  const targetStd = predictData?.target_std;
  const hasPrediction = Boolean(predictData);
  const rawToStd = inputMode === "standardized"
    ? "x_std = x_input"
    : "x_std = (x_input - feature_mean) / feature_std";
  const code = [
    `feature = "${feature}"`,
    `target = "${target}"`,
    `input_mode = "${inputMode}"`,
    `x_input = ${inputValue}`,
    "",
    `w = ${Number.isFinite(Number(w)) ? num(w, 6) : "w"}`,
    `b = ${Number.isFinite(Number(b)) ? num(b, 6) : "b"}`,
    "",
    "# 1. 使用训练时相同的统计量处理新输入",
    `feature_mean = ${Number.isFinite(Number(mean)) ? num(mean, 6) : "training_feature_mean"}`,
    `feature_std = ${Number.isFinite(Number(std)) ? num(std, 6) : "training_feature_std"}`,
    rawToStd,
    "",
    "# 2. 在线性回归模型中预测",
    "y_pred_std = w * x_std + b",
    "",
    "# 3. 如果训练目标也做过标准化，需要反标准化回 MEDV 原始尺度",
    `target_mean = ${Number.isFinite(Number(targetMean)) ? num(targetMean, 6) : "training_target_mean"}`,
    `target_std = ${Number.isFinite(Number(targetStd)) ? num(targetStd, 6) : "training_target_std"}`,
    "y_pred_raw = y_pred_std * target_std + target_mean",
    "",
    ...(hasPrediction ? [
      `# 当前模型输入 x_std = ${num(predictData.model_x, 6)}`,
      `# 当前标准化预测 y_pred_std = ${num(predictModelPrediction(), 6)}`,
      `# 当前原始尺度预测 MEDV = ${num(predictDisplayPrediction(), 6)}`,
    ] : [
      "# 点击“开始预测”后，这里会显示当前预测结果。",
    ]),
  ].join("\n");
  return {
    title: "模型预测",
    operation: `把 ${feature} 的新输入代入当前模型，并还原为 ${target} 原始尺度`,
    code,
    notes: [
      "预测新样本时，必须使用训练阶段保存下来的 mean 和 std。",
      "如果输入是原始特征值，先转换为模型使用的标准化输入 x_std。",
      "模型先输出标准化目标值 y_pred_std。",
      `最后使用 ${target} 的均值和标准差，把预测值还原到原始尺度。`,
    ],
  };
}

function predictCodeDrawerHtml(spec) {
  const notes = spec.notes.map((note, index) => `<li>${index + 1}. ${escapeHtml(note)}</li>`).join("");
  return `
    <div class="code-drawer-backdrop">
      <aside class="code-drawer" role="dialog" aria-modal="true" aria-label="预测代码">
        <div class="code-drawer-head">
          <div>
            <div class="code-kicker">当前预测代码</div>
            <h2>${escapeHtml(spec.title)}</h2>
          </div>
          <button class="icon-btn code-close-btn" type="button" data-code-close="true" aria-label="关闭代码面板">x</button>
        </div>
        <div class="code-operation">
          <span>当前操作</span>
          <strong>${escapeHtml(spec.operation)}</strong>
        </div>
        <div class="code-block-head">
          <span>核心代码</span>
          <button class="secondary-btn code-copy-btn" type="button">复制代码</button>
        </div>
        <pre class="teaching-code"><code>${escapeHtml(spec.code)}</code></pre>
        <div class="code-explain">
          <h3>代码解释</h3>
          <ol>${notes}</ol>
        </div>
      </aside>
    </div>`;
}

function openPredictCodeDrawer() {
  closePredictCodeDrawer();
  document.body.insertAdjacentHTML("beforeend", predictCodeDrawerHtml(predictCodeSpec()));
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closePredictCodeDrawer();
  });
  drawer?.querySelector(".code-copy-btn")?.addEventListener("click", async event => {
    const code = drawer.querySelector(".teaching-code code")?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      event.currentTarget.textContent = "已复制";
      setTimeout(() => { event.currentTarget.textContent = "复制代码"; }, 1200);
    } catch (_err) {
      event.currentTarget.textContent = "复制失败";
    }
  });
}

function closePredictCodeDrawer() {
  document.querySelector(".code-drawer-backdrop")?.remove();
}

function bindPredictCodeButtons() {
  if (window.predictCodeButtonsBound) return;
  window.predictCodeButtonsBound = true;
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-predict-code]")) return;
    openPredictCodeDrawer();
  });
}


// ============================================================================
// 朴素贝叶斯 (Naive Bayes) 模型预测模块
// ============================================================================

async function renderNbPredictShell() {
  document.querySelector(".shell").classList.remove("theory");
  
  // 1. 注入预测模块专用样式
  if (!document.getElementById("nbPredictStyles")) {
    const style = document.createElement("style");
    style.id = "nbPredictStyles";
    style.innerHTML = `
      .nb-predict-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 0;
        box-sizing: border-box;
        background: transparent;
        min-height: 100%;
        overflow-y: auto;
        font-family: inherit;
      }
      .nb-predict-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
        gap: 16px;
      }
      .nb-predict-card {
        position: relative;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 18px;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        box-sizing: border-box;
        transition: border-color .16s ease, box-shadow .16s ease;
      }
      .nb-predict-card:hover {
        box-shadow: var(--shadow);
        border-color: var(--line);
      }
      .nb-predict-card::after {
        content: "";
        position: absolute;
        right: 10px;
        bottom: 10px;
        width: 18px;
        height: 18px;
        opacity: .28;
        pointer-events: none;
        background:
          linear-gradient(135deg, transparent 68%, #9aa3b2 70%, #9aa3b2 76%, transparent 78%);
      }
      .nb-predict-grid .grid-stack-item-content {
        overflow: hidden;
      }
      .nb-predict-card.wide {
        grid-column: 1 / -1;
      }
      .nb-predict-card h3 {
        margin: 0 0 6px 0;
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: grab;
      }
      .nb-predict-card h3:active {
        cursor: grabbing;
      }
      .nb-predict-card h4 {
        margin: 0 0 20px 0;
        font-size: 13px;
        font-weight: 400;
        color: #64748b;
        line-height: 1.5;
      }
      
      /* 拔河决策天平样式 */
      .nb-balance-wrapper {
        position: relative;
        height: clamp(400px, calc(100% - 58px), 460px);
        min-height: 400px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 12px;
        overflow: hidden;
        padding: 48px 16px 18px;
        box-sizing: border-box;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
      }
      
      /* 刻度盘 & 仪表弧 */
      .nb-balance-dial {
        position: absolute;
        top: 54px;
        width: 160px;
        height: 80px;
        border: 2px dashed #cbd5e1;
        border-bottom: none;
        border-radius: 90px 90px 0 0;
        opacity: 0.65;
        pointer-events: none;
      }
      .nb-balance-dial::before {
        content: "";
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #94a3b8;
        border-radius: 50%;
      }
      
      /* 指针 */
      .nb-balance-needle {
        position: absolute;
        top: 64px;
        width: 3px;
        height: 55px;
        background: linear-gradient(to top, #ef4444 70%, transparent 100%);
        transform-origin: bottom center;
        transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        z-index: 3;
        border-radius: 2px;
        box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
      }

      /* 立柱支架 */
      .nb-balance-stand {
        display: none;
      }
      .nb-balance-stand::after {
        content: none;
      }
      .nb-balance-stand-pivot {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 117px; /* 对应立柱顶部 pivot */
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #94a3b8 0%, #475569 70%, #1e293b 100%);
        border: 2px solid #e2e8f0;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        z-index: 4;
      }
      
      /* 横梁悬挂组件 */
      .nb-balance-beam-assembly {
        position: absolute;
        top: 119px;
        width: min(78%, 520px);
        min-width: 340px;
        height: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        transform-origin: center center;
        z-index: 2;
      }
      .nb-balance-beam-bar {
        position: absolute;
        left: 10px;
        right: 10px;
        height: 10px;
        background: linear-gradient(to bottom, #e2e8f0 0%, #94a3b8 50%, #475569 100%);
        border-radius: 6px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        border-top: 1px solid rgba(255,255,255,0.2);
      }
      
      /* 吊盘悬挂组件 */
      .nb-balance-pan-assembly {
        position: absolute;
        top: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 152px;
        transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        transform-origin: top center;
      }
      .nb-balance-pan-assembly.left {
        left: 5px;
      }
      .nb-balance-pan-assembly.right {
        right: 5px;
      }
      .nb-balance-pan-wire {
        width: 70px;
        height: 55px;
        border-left: 2px solid #64748b;
        border-right: 2px solid #64748b;
        border-bottom: 2px solid transparent;
        border-radius: 0 0 20px 20px;
        position: relative;
        box-shadow: inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(255,255,255,0.1);
      }
      .nb-balance-pan-wire::after {
        content: "";
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: radial-gradient(circle at center, #94a3b8 0%, #1e293b 100%);
        border-radius: 50%;
        border: 1px solid #cbd5e1;
      }
      .nb-balance-pan-plate {
        width: 150px;
        min-height: 100px;
        max-height: none;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 10px;
        box-shadow: 0 8px 16px -4px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }
      .nb-balance-pan-plate::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border-radius: 9px;
        border: 1px solid rgba(255,255,255,0.9);
        pointer-events: none;
      }
      .nb-pan-title {
        font-size: 11px;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 8px;
        overflow-wrap: anywhere;
        white-space: normal;
        width: 100%;
        text-align: center;
        text-transform: uppercase;
        border-bottom: 2px solid rgba(226, 232, 240, 0.8);
        padding-bottom: 4px;
        letter-spacing: 0.05em;
      }
      .nb-pan-title .nb-pan-prob {
        display: block;
        margin-top: 3px;
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0;
        text-transform: none;
      }
      .nb-pan-title.winner {
        color: #0f766e;
      }
      .nb-pan-title.winner .nb-pan-prob {
        color: #0f766e;
      }
      .nb-pan-weights {
        display: flex;
        flex-direction: column-reverse;
        gap: 3px;
        width: 100%;
        align-items: center;
        min-height: 40px;
        max-height: none;
        overflow: hidden;
        padding: 1px 2px;
        box-sizing: border-box;
      }
      
      /* 拟真胶囊重物块样式与动画 */
      .nb-weight-block {
        font-size: 9.5px;
        font-weight: 600;
        padding: 3px 6px;
        border-radius: 20px;
        color: #ffffff;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.25);
        min-width: 86px;
        max-width: 100%;
        line-height: 1.25;
        overflow-wrap: anywhere;
        white-space: normal;
        overflow: hidden;
        font-family: 'Outfit', monospace;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(0,0,0,0.05);
        animation: nbWeightDropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        flex: 0 0 auto;
      }
      @keyframes nbWeightDropIn {
        0% {
          opacity: 0;
          transform: translateY(-20px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .nb-weight-block.prior {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border-color: rgba(30, 64, 175, 0.1);
      }
      .nb-weight-block.word {
        background: linear-gradient(135deg, #10b981 0%, #047857 100%);
        border-color: rgba(6, 95, 70, 0.1);
      }
      .nb-weight-block.word.right-pull {
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        border-color: rgba(85, 26, 139, 0.1);
      }
      .nb-weight-block.other {
        background: linear-gradient(135deg, #94a3b8 0%, #475569 100%);
        border-color: rgba(51, 65, 85, 0.1);
      }
      
      /* 重量悬停高亮联动 */
      .nb-weight-block.nb-weight-highlight {
        transform: scale(1.15);
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.8), 0 4px 8px rgba(0,0,0,0.15);
        border-color: #f59e0b;
        z-index: 10;
      }

      .nb-balance-readout {
        position: absolute;
        left: 50%;
        top: 12px;
        transform: translateX(-50%);
        font-size: 12px;
        color: #475569;
        background: rgba(255, 255, 255, 0.96);
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        text-align: center;
        z-index: 8;
        max-width: calc(100% - 32px);
        white-space: normal;
        overflow-wrap: anywhere;
      }
      .nb-log-odds-value {
        font-family: monospace;
        font-size: 13px;
        font-weight: 700;
      }
      
      /* 特征拆解表格样式 */
      .nb-table-container {
        width: 100%;
        overflow-x: auto;
      }
      .nb-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        text-align: left;
        font-size: 13px;
      }
      .nb-table th, .nb-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
        transition: background-color 0.2s ease;
      }
      .nb-table tbody tr {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .nb-table tbody tr:hover td {
        background-color: rgba(241, 245, 249, 0.5);
        cursor: pointer;
      }
      .nb-table tbody tr.nb-row-active td {
        background-color: rgba(245, 158, 11, 0.08);
      }
      .nb-table th {
        background-color: #f8fafc;
        font-weight: 700;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
      }
      .nb-table th:first-child {
        border-top-left-radius: 8px;
      }
      .nb-table th:last-child {
        border-top-right-radius: 8px;
      }
      .nb-badge {
        display: inline-block;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: 700;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .nb-badge.active {
        background-color: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }
      .nb-badge.oov {
        background-color: #f8fafc;
        color: #64748b;
        border: 1px dashed #cbd5e1;
      }
      .nb-pull-bar-container {
        position: relative;
        width: 90px;
        height: 8px;
        background-color: #f1f5f9;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(226, 232, 240, 0.5);
      }
      .nb-pull-bar-container.empty {
        background: transparent;
        width: 100%;
        height: auto;
        overflow: visible;
        border: none;
      }
      .nb-pull-bar {
        height: 100%;
        border-radius: 10px;
        position: absolute;
        transition: width 0.5s ease;
      }
      .nb-pull-bar.pull-left {
        background: linear-gradient(90deg, #34d399, #10b981);
        left: 0;
      }
      .nb-pull-bar.pull-right {
        background: linear-gradient(90deg, #a78bfa, #8b5cf6);
        left: 0;
      }
      
      /* 公式看板样式 */
      .nb-math-board {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .nb-math-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .nb-math-col {
        background-color: rgba(248, 250, 252, 0.7);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);
      }
      .nb-math-title {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 12px;
        border-bottom: 2px solid #cbd5e1;
        padding-bottom: 6px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        letter-spacing: 0.02em;
      }
      .nb-math-steps {
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 12px;
        color: #475569;
        line-height: 1.6;
      }
      .nb-step strong {
        color: #0f172a;
        font-family: monospace;
        font-size: 13px;
      }
      .nb-math-divider {
        height: 1px;
        background: radial-gradient(circle, #cbd5e1 0%, transparent 100%);
      }
      
      .nb-math-softmax {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
      }
      .nb-math-formula-box {
        font-family: monospace;
        font-size: 11px;
        line-height: 1.6;
        background: #0f172a;
        color: #e2e8f0;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #1e293b;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
      }
      .nb-math-formula-box strong {
        color: #f59e0b;
        font-weight: 700;
      }
      .nb-token-positive {
        background: rgba(37, 99, 235, 0.14);
        border-bottom: 2px solid rgba(37, 99, 235, 0.45);
      }
      .nb-token-negative {
        background: rgba(16, 185, 129, 0.14);
        border-bottom: 2px solid rgba(16, 185, 129, 0.45);
      }
      .nb-token-oov {
        color: #64748b;
        border-bottom: 1px dashed #94a3b8;
        cursor: help;
      }
      .nb-token-removed {
        text-decoration: line-through !important;
        opacity: 0.55 !important;
        background: rgba(239, 68, 68, 0.12) !important;
        border-bottom: 2px solid rgba(239, 68, 68, 0.45) !important;
      }
      .nb-tooltip-trigger {
        cursor: help;
        transition: outline 0.1s ease;
      }
    `;
    document.head.appendChild(style);
  }
  
  clearPageTopSlot?.();
  destroyDataGrid?.();
  disposeCharts?.();
  
  // 2. 检查模型是否已训练完成
  if (!nbTrainData) {
    $("rightPanel").innerHTML = `
      <div class="right-title">控制面板</div>
      <div class="control-card">
        <p style="font-size: 13px; color: #868e96; line-height: 1.5; margin: 0;">预测页已锁。您需要先在第一步中点击开始训练以拟合模型，随后才可输入待测试文本进行推理预测。</p>
      </div>
    `;
    $("main").innerHTML = `
      <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px; margin: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">请先训练模型</h3>
        <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">当前步骤依赖已训练的贝叶斯模型。请前往【模型训练与评估】页面，点击【开始训练】按钮，拟合好分类器后再来进行预测。</p>
      </section>
    `;
    return;
  }
  
  // 初始化全局预测相关状态
  if (window.nbPredictInputMode === undefined) window.nbPredictInputMode = "preset";
  if (window.nbPredictSelectedPresetIndex === undefined) window.nbPredictSelectedPresetIndex = 0;
  
  const presets = getNbPresets();
  if (!presets[window.nbPredictSelectedPresetIndex]) {
    window.nbPredictSelectedPresetIndex = 0;
  }
  if (window.nbPredictCustomText === undefined) {
    window.nbPredictCustomText = presets[0]?.text || "";
  }
  nbPredictData = null;
  
  // 3. 渲染右侧面板与主面板基本架构
  $("rightPanel").innerHTML = nbPredictPanelHtml();
  
  $("main").innerHTML = `
    <div class="nb-predict-container">
      <div class="nb-predict-card">
        <h3>待预测文本原文 (Original Text)</h3>
        <h4 id="nbPredictTextSubtitle">展示输入文本的分词与对数拉力高亮，悬浮可查看各词详细条件概率</h4>
        <div id="nbPredictStatusMsg" style="margin-bottom:10px; padding:8px 12px; border-radius:6px; font-size:12px; line-height:1.4; display:none;"></div>
        <div id="nbPredictTextContent" style="font-size: 13px; line-height: 1.8; color: #334155; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; font-family: monospace;"></div>
      </div>
      <div class="nb-predict-card" id="nbPredictComparisonCard">
        <h3>移除关键词后重算 (Recalculate after Removal)</h3>
        <h4 style="margin-bottom:8px;">对比原始预测与临时移除指定词项后的预测结果，观察关键词对分类边界的贡献。</h4>
        <div id="nbPredictComparisonContent">
          <div class="empty-state" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">
            <span style="font-size: 24px; display: block; margin-bottom: 8px;">💡</span>
            <strong>点击下方特征词的“移除后重算”按钮</strong>，可观察单个关键词被移除后，模型分类预测与概率得分的变化，从而直观感受词项贡献的累加特性。
            <div style="font-size: 12px; color: #94a3b8; margin-top: 12px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.5; font-weight: normal;">
              教案提示：朴素贝叶斯在 log 空间中累加每个有效词的条件概率。移除某个关键词后，该词对应的 log 概率贡献会从各类别 score 中消失，因此后验概率可能发生变化。
            </div>
          </div>
        </div>
      </div>
      <div class="nb-predict-card wide">
        <h3>拔河决策天平 (Tug-of-War Decision Scale)</h3>
        <h4 id="nbTugOfWarSubtitle">展示先验对数胜率与特征词对数似然对决策天平的拉力偏转</h4>
        <div id="nbTugOfWar">
            <div class="nb-balance-wrapper">
            <div class="nb-balance-dial"></div>
            <div class="nb-balance-needle" id="nbBalanceNeedle"></div>
            <div class="nb-balance-stand-pivot"></div>
            <div class="nb-balance-beam-assembly" id="nbBeamAssembly">
              <div class="nb-balance-beam-bar"></div>
              
              <!-- 左侧托盘 (对应类别一) -->
              <div class="nb-balance-pan-assembly left" id="nbLeftPanAssembly">
                <div class="nb-balance-pan-wire"></div>
                <div class="nb-balance-pan-plate">
                  <div class="nb-pan-title" id="nbLeftPanTitle"></div>
                  <div class="nb-pan-weights" id="nbLeftPanWeights"></div>
                </div>
              </div>
              
              <!-- 右侧托盘 (对应类别二) -->
              <div class="nb-balance-pan-assembly right" id="nbRightPanAssembly">
                <div class="nb-balance-pan-wire"></div>
                <div class="nb-balance-pan-plate">
                  <div class="nb-pan-title" id="nbRightPanTitle"></div>
                  <div class="nb-pan-weights" id="nbRightPanWeights"></div>
                </div>
              </div>
            </div>
            <div class="nb-balance-readout" id="nbBalanceReadout"></div>
          </div>
        </div>
      </div>
      <div class="nb-predict-row">
        <div class="nb-predict-card">
          <h3>特征词贡献拆解 (Word Contributions)</h3>
          <h4>对输入中出现的特征词（已收录与未收录词）进行概率贡献度拆解</h4>
          <div id="nbWordBreakdown" class="nb-table-container"></div>
        </div>
        <div class="nb-predict-card">
          <h3>公式推导看板 (Mathematical Derivation)</h3>
          <h4>展示联合概率计算步骤与数值代入（及 Softmax 数值平移技巧）</h4>
          <div id="nbMathDerivation"></div>
        </div>
      </div>
    </div>
  `;
  applyNbPredictCardGrid();
  
  // 4. 绑定事件并触发首轮推理
  bindNbPredictControls();
  
  if (window.nbPredictInputMode === "preset") {
    const text = presets[window.nbPredictSelectedPresetIndex]?.text || "";
    await nbPredictLoadPrediction(text);
  } else {
    await nbPredictLoadPrediction(window.nbPredictCustomText);
  }
}

function nbPredictDefaultGridLayout(view) {
  return ({
    nb_predict_text: { x: 0, y: 0, w: 4, h: 1 },
    nb_predict_comparison: { x: 0, y: 1, w: 4, h: 2 },
    nb_predict_scale: { x: 0, y: 3, w: 4, h: 2 },
    nb_predict_words: { x: 0, y: 5, w: 2, h: 2 },
    nb_predict_math: { x: 2, y: 5, w: 2, h: 2 },
  })[view] || { x: 0, y: 0, w: 2, h: 2 };
}

function normalizeNbPredictGridLayout(view, layout = {}) {
  const fallback = nbPredictDefaultGridLayout(view);
  const clean = {
    x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : fallback.x,
    y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : fallback.y,
    w: Number.isFinite(Number(layout.w)) ? Number(layout.w) : fallback.w,
    h: Number.isFinite(Number(layout.h)) ? Number(layout.h) : fallback.h,
  };
  clean.w = Math.max(1, Math.min(4, clean.w));
  clean.h = Math.max(1, clean.h);
  if (view === "nb_predict_scale") {
    clean.h = 2;
  }
  if (view === "nb_predict_text") {
    clean.h = 1;
  }
  if (view === "nb_predict_comparison") {
    clean.h = 2;
  }
  clean.x = Math.max(0, Math.min(4 - clean.w, clean.x));
  clean.y = Math.max(0, clean.y);
  return clean;
}

function loadNbPredictGridLayout() {
  try {
    return viewStateStore[gridLayoutStorageKey("nb_predict_page")] || {};
  } catch (err) {
    return {};
  }
}

function applyNbPredictCardGrid() {
  const container = document.querySelector(".nb-predict-container");
  if (!container) return;
  const cards = Array.from(container.querySelectorAll(".nb-predict-card"));
  if (!cards.length) return;

  const viewIds = ["nb_predict_text", "nb_predict_comparison", "nb_predict_scale", "nb_predict_words", "nb_predict_math"];
  const saved = loadNbPredictGridLayout();
  const grid = document.createElement("div");
  grid.id = "nbPredictPageWrap";
  grid.className = "dashboard-grid grid-stack nb-predict-grid";

  cards.forEach((card, index) => {
    const view = viewIds[index] || `nb_predict_card_${index + 1}`;
    const layout = normalizeNbPredictGridLayout(view, saved[view]);
    card.dataset.chartCard = view;
    card.classList.add("chart-interaction-prototype");

    const item = document.createElement("div");
    item.className = "grid-stack-item";
    item.dataset.view = view;
    item.setAttribute("gs-x", layout.x);
    item.setAttribute("gs-y", layout.y);
    item.setAttribute("gs-w", layout.w);
    item.setAttribute("gs-h", layout.h);
    item.setAttribute("gs-min-w", "1");
    item.setAttribute("gs-min-h", view === "nb_predict_scale" ? "2" : "1");

    const inner = document.createElement("div");
    inner.className = "grid-stack-item-content";
    inner.appendChild(card);
    item.appendChild(inner);
    grid.appendChild(item);
  });

  container.replaceChildren(grid);

  if (!window.GridStack) {
    grid.classList.remove("dashboard-grid", "grid-stack");
    grid.classList.add("chart-grid");
    return;
  }

  dataGridMode = "nb_predict_page";
  dataGrid = GridStack.init({
    column: 4,
    cellHeight: 260,
    margin: 8,
    float: true,
    animate: true,
    draggable: { handle: "h3" },
    resizable: { handles: "e, s, se" }
  }, grid);
  grid.setAttribute("gs-column", "4");
  updateDataGridCellHeight();
  dataGrid.on("change dragstop resizestop", () => {
    syncDataGridAttributes();
    saveDataGridLayout();
  });
  syncDataGridAttributes();
}

function getNbPresets() {
  const targetNames = nbTrainData.target_names || [];
  const presets = [];
  const PRESETS_DICT = {
    "sci.space": [
      { label: "太空: 哈勃望远镜轨道修正 (Hubble Orbit)", text: "The flight dynamics team completed a small thruster burn to raise the orbit of the space telescope. The new orbital parameters are stable. We expect the satellite to remain in space for another decade.", category: "sci.space" },
      { label: "太空: 发现 Kepler 新行星 (New Exoplanet)", text: "We analyzed the transit light curve from Kepler telescope and confirmed a rocky planet orbiting in the habitable zone. The planetary orbit is 130 days. This discovery is a huge step for space search.", category: "sci.space" },
      { label: "太空: 火星车沙尘暴警报 (Mars Rover)", text: "A local dust storm on Mars has partially covered the solar array of the rover. Power levels are low but stable. We are waiting for a wind gust to clear the solar cells so we can resume driving on Martian soil.", category: "sci.space" }
    ],
    "rec.autos": [
      { label: "汽车: Mustang V8发动机改装 (V8 Swap)", text: "I am upgrading the cylinder heads on my Ford Mustang's V8 engine. Does anyone recommend high-flow manifolds? I also need to replace the tires and front brake pads to handle the extra horsepower.", category: "rec.autos" },
      { label: "汽车: 本田 Civic 变速箱测评 (Civic Gearbox)", text: "I just took delivery of my new Honda Civic hatchback. The manual gearbox feels crisp, the steering is sharp, and the fuel economy is superb. The alloy wheels look great too, right out of the dealership.", category: "rec.autos" },
      { label: "汽车: 刹车盘片磨损与更换 (Brake Repair)", text: "If you hear squealing when slowing down, inspect your brake pads. Worn pads will score the rotors, making replacements much more expensive. Don't risk driving with bad brakes.", category: "rec.autos" }
    ],
    "rec.sport.baseball": [
      { label: "体育: 投手投球姿势解析 (Pitching)", text: "We need to focus on leg drive for our starting pitcher. A stable landing foot helps control the fastball and increases velocity. Ensure the glove hand is tucked close to the chest.", category: "rec.sport.baseball" },
      { label: "体育: 击球率与赛季数据 (Batting)", text: "The home run leader has maintained a .315 batting average this season. His statistics show a high success rate against left-handed pitchers, driving in over 80 runs so far.", category: "rec.sport.baseball" },
      { label: "体育: 棒球手套保养与涂油 (Glove Oil)", text: "To break in your new baseball glove, apply a small amount of glove oil and play catch daily. Avoid baking it in the oven as it dries out the leather and weakens the stitching.", category: "rec.sport.baseball" }
    ],
    "sci.med": [
      { label: "医学: 偏头痛新药临床研究 (Migraine)", text: "We completed phase 2 trials of the new peptide inhibitor. Results show a 50 percent reduction in migraine headache frequency compared to placebo, with no major side effects in patients.", category: "sci.med" },
      { label: "医学: 维生素D与钙质吸收 (Vitamin D)", text: "Our research confirms that Vitamin D plays a crucial role in regulating calcium absorption. Patients suffering from bone density loss should monitor their serum Vitamin D levels regularly.", category: "sci.med" },
      { label: "医学: 膝关节术后康复指南 (Rehab)", text: "For patients recovering from knee surgery, early mobility exercises are vital. Quadriceps strengthening helps restore joint stability and allows patients to walk comfortably within weeks.", category: "sci.med" }
    ]
  };
  
  targetNames.forEach(cat => {
    const catPresets = PRESETS_DICT[cat] || [
      { label: `通用: ${cat} 示范样本`, text: `This is a sample post containing typical words for the category ${cat} in the 20 newsgroups dataset. We want to test if the trained Naive Bayes classifier can recognize features of ${cat} effectively.`, category: cat }
    ];
    presets.push(...catPresets);
  });
  return presets;
}

function nbPredictPanelHtml() {
  const presets = getNbPresets();
  if (!presets[window.nbPredictSelectedPresetIndex]) {
    window.nbPredictSelectedPresetIndex = 0;
  }
  const optionsHtml = presets.map((p, idx) => {
    return `<option value="${idx}" ${window.nbPredictSelectedPresetIndex === idx ? "selected" : ""}>${escapeHtml(p.label)}</option>`;
  }).join("");
  
  const isPreset = window.nbPredictInputMode === "preset";
  
  let predName = "--";
  let confidence = "--";
  let badgeStyle = "background-color: #cbd5e1; color: #334155;";
  
  if (nbPredictData) {
    predName = nbPredictData.predicted_label;
    confidence = (nbPredictData.probs[predName] * 100).toFixed(1) + "%";
    
    if (predName.includes("space")) {
      badgeStyle = "background-color: #dbeafe; color: #1e40af;";
      predName = "🚀 " + predName;
    } else if (predName.includes("auto")) {
      badgeStyle = "background-color: #f3e8ff; color: #5b21b6;";
      predName = "🚗 " + predName;
    } else if (predName.includes("baseball")) {
      badgeStyle = "background-color: #fef3c7; color: #92400e;";
      predName = "⚾ " + predName;
    } else if (predName.includes("med")) {
      badgeStyle = "background-color: #d1fae5; color: #065f46;";
      predName = "🏥 " + predName;
    } else {
      badgeStyle = "background-color: #f1f5f9; color: #334155;";
    }
  }
  
  return `
    <div class="right-title">控制面板</div>
    <div class="control-card">
      <h3>实时预测结果</h3>
      <div class="mini-stats" style="margin-bottom: 0;">
        <div class="mini-stat">
          <span>预测类别</span>
          <strong id="nbPredClass" style="font-size: 13px; padding: 4px 8px; border-radius: 12px; margin-top: 4px; display: inline-block; ${badgeStyle}">${predName}</strong>
        </div>
        <div class="mini-stat">
          <span>置信度 P(C|D)</span>
          <strong id="nbPredConf" style="color: #2b5c8f; font-family: monospace;">${confidence}</strong>
        </div>
      </div>
    </div>
    
    <div class="control-card">
      <h3>输入源设置</h3>
      <div class="control-group">
        <label class="control-label">输入模式</label>
        <div class="radio-group" style="display: flex; gap: 12px; margin-top: 6px;">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
            <input type="radio" name="nbInputMode" value="preset" ${isPreset ? "checked" : ""}> 预设测试样本
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
            <input type="radio" name="nbInputMode" value="custom" ${!isPreset ? "checked" : ""}> 自定义输入文本
          </label>
        </div>
      </div>
      
      <div class="control-group" id="nbPresetGroup" style="display: ${isPreset ? "block" : "none"};">
        <label class="control-label" for="nbPresetSelect">选择测试样本</label>
        <select id="nbPresetSelect" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-size:12px;">
          ${optionsHtml}
        </select>
      </div>
      
      <div class="control-group" id="nbCustomGroup" style="display: ${!isPreset ? "block" : "none"};">
        <label class="control-label" for="nbCustomText">输入自定义文本</label>
        <textarea id="nbCustomText" style="width: 100%; height: 110px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; font-family: monospace; resize: vertical;" placeholder="在此输入自定义英文段落，模型将实时清洗并预测其类别...">${escapeHtml(window.nbPredictCustomText)}</textarea>
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">支持输入任意英文，输入框已绑定实时防抖分类推理。</span>
      </div>
    </div>
    
    <div class="control-card">
      <h3>当前分类模型</h3>
      <div class="predict-model-plain" style="font-size:12px; color:#475569; line-height:1.6;">
        <div><span>模型算法：</span><strong>${nbTrainData.model_type}</strong></div>
        <div><span>平滑系数：</span><strong>α = ${nbTrainData.alpha.toFixed(1)}</strong></div>
        <div><span>词典大小：</span><strong>${nbTrainData.n_features} 个特征词</strong></div>
        <div><span>加载样本数：</span><strong>训练集 ${nbTrainData.train_count} 篇 / 测试集 ${nbTrainData.test_count} 篇</strong></div>
      </div>
      <div style="margin-top:12px; display:flex; justify-content:flex-end;">
        <button class="secondary-btn code-toggle-btn" type="button" id="nbCodeDrawerBtn" style="font-size:12px; padding:6px 12px;">查看预测代码</button>
      </div>
    </div>
  `;
}

function bindNbPredictControls() {
  const inputRadios = document.querySelectorAll('input[name="nbInputMode"]');
  inputRadios.forEach(radio => {
    radio.addEventListener("change", async event => {
      window.nbPredictInputMode = event.target.value;
      const isPreset = window.nbPredictInputMode === "preset";
      $("nbPresetGroup").style.display = isPreset ? "block" : "none";
      $("nbCustomGroup").style.display = isPreset ? "none" : "block";
      
      const presets = getNbPresets();
      if (isPreset) {
        const text = presets[window.nbPredictSelectedPresetIndex]?.text || "";
        await nbPredictLoadPrediction(text);
      } else {
        await nbPredictLoadPrediction(window.nbPredictCustomText);
      }
    });
  });
  
  const presetSelect = $("nbPresetSelect");
  if (presetSelect) {
    presetSelect.addEventListener("change", async event => {
      window.nbPredictSelectedPresetIndex = parseInt(event.target.value, 10);
      const presets = getNbPresets();
      const text = presets[window.nbPredictSelectedPresetIndex]?.text || "";
      await nbPredictLoadPrediction(text);
    });
  }
  
  const customTextarea = $("nbCustomText");
  if (customTextarea) {
    customTextarea.addEventListener("input", event => {
      window.nbPredictCustomText = event.target.value;
      clearTimeout(window.nbPredictDebounceTimer);
      window.nbPredictDebounceTimer = setTimeout(async () => {
        if (window.nbPredictInputMode === "custom") {
          await nbPredictLoadPrediction(window.nbPredictCustomText);
        }
      }, 200);
    });
  }
  
  const codeBtn = $("nbCodeDrawerBtn");
  if (codeBtn) {
    codeBtn.addEventListener("click", () => {
      openNbPredictCodeDrawer();
    });
  }
}

async function nbPredictLoadPrediction(text) {
  try {
    const payload = {
      dataset_id: nbTrainData.dataset_id
    };
    payload.text = text;
    
    const res = await runAction("predict", payload);
    
    // 预设模式下重写真实类别以利于教学对比
    if (window.nbPredictInputMode === "preset") {
      const presets = getNbPresets();
      const preset = presets[window.nbPredictSelectedPresetIndex];
      if (preset && preset.category) {
        res.true_label = preset.category;
        res.correct = (res.predicted_label === res.true_label);
      }
    }
    
    nbPredictData = res;
    if (typeof resetNbPredictComparisonCard === "function") {
      resetNbPredictComparisonCard();
    }
    updateNbPredStats();
    renderNbPredictDashboard();
  } catch (err) {
    renderError(err.message);
  }
}

function renderNbPredictDashboard() {
  const data = nbPredictData;
  if (!data) return;
  
  renderNbPredictText(data);
  renderNbTugOfWar(data);
  renderNbWordBreakdown(data);
  renderNbMathDerivation(data);
}

function getBlockStyle(val, maxVal = 6.0) {
  const safeMax = Math.max(0.1, Number(maxVal) || 6.0);
  const ratio = Math.min(1, Math.max(0, Math.abs(val) / safeMax));
  const widthPercent = 34 + ratio * 66;
  const paddingPx = 3 + ratio * 4;
  return `width: ${widthPercent}%; padding-top: ${paddingPx}px; padding-bottom: ${paddingPx}px;`;
}

function renderWeightsList(pullers, priorVal, isRight, maxVal) {
  let html = "";
  
  if (Math.abs(priorVal) > 1e-4) {
    const absPrior = Math.abs(priorVal);
    const priorStyle = getBlockStyle(absPrior, maxVal);
    const sign = isRight ? "-" : "+";
    html += `<div class="nb-weight-block prior" style="${priorStyle}" title="对数先验概率贡献: ${priorVal.toFixed(4)}">先验胜率 (${sign}${absPrior.toFixed(1)})</div>`;
  }
  
  const limit = 4;
  const displayList = pullers.slice(0, limit);
  displayList.forEach(w => {
    const absPull = Math.abs(w.pull);
    const blockStyle = getBlockStyle(absPull, maxVal);
    const sign = isRight ? "-" : "+";
    html += `<div class="nb-weight-block word ${isRight ? 'right-pull' : ''}" data-word="${escapeHtml(w.word)}" style="${blockStyle}" title="特征词对数似然拉力: ${w.pull.toFixed(4)}">${escapeHtml(w.word)} (${sign}${absPull.toFixed(1)})</div>`;
  });
  
  const others = pullers.slice(limit);
  if (others.length > 0) {
    const othersSum = others.reduce((sum, x) => sum + x.pull, 0);
    const absSum = Math.abs(othersSum);
    const blockStyle = getBlockStyle(absSum, maxVal);
    const sign = isRight ? "-" : "+";
    html += `<div class="nb-weight-block other" style="${blockStyle}" title="其他 ${others.length} 个特征词总拉力: ${othersSum.toFixed(4)}">其他 ${others.length}个词 (${sign}${absSum.toFixed(1)})</div>`;
  }
  
  return html || `<div style="font-size:10px; color:#94a3b8; font-style:italic; padding: 10px 0;">(无拉力)</div>`;
}

function getNbPredictionPair(data) {
  const targetNames = nbTrainData.target_names || Object.keys(data.probs || {});
  const sorted = Object.entries(data.probs || {})
    .filter(([name]) => targetNames.includes(name))
    .sort((a, b) => b[1] - a[1]);
  const predicted = data.predicted_label || sorted[0]?.[0] || targetNames[0];
  const opponent = sorted.find(([name]) => name !== predicted)?.[0] || targetNames.find(name => name !== predicted);

  return {
    c1_name: predicted,
    c2_name: opponent || predicted
  };
}

function renderNbTugOfWar(data) {
  const probs = data.probs;
  const { c1_name, c2_name } = getNbPredictionPair(data);
  
  const logOdds = data.raw_scores[c1_name] - data.raw_scores[c2_name];
  const priorPull = data.prior_scores[c1_name] - data.prior_scores[c2_name];
  
  const leftPullers = data.top_words
    .map(w => ({ word: w.word, pull: w.contributions[c1_name] - w.contributions[c2_name] }))
    .filter(w => w.pull > 0)
    .sort((a,b) => b.pull - a.pull);
     
  const rightPullers = data.top_words
    .map(w => ({ word: w.word, pull: w.contributions[c1_name] - w.contributions[c2_name] }))
    .filter(w => w.pull < 0)
    .sort((a,b) => a.pull - b.pull); 

  const leftOthers = leftPullers.slice(4).reduce((sum, x) => sum + x.pull, 0);
  const rightOthers = rightPullers.slice(4).reduce((sum, x) => sum + x.pull, 0);
  const visualMax = Math.max(
    0.1,
    Math.abs(priorPull),
    ...leftPullers.slice(0, 4).map(x => Math.abs(x.pull)),
    ...rightPullers.slice(0, 4).map(x => Math.abs(x.pull)),
    Math.abs(leftOthers),
    Math.abs(rightOthers)
  );
     
  const leftPanHtml = renderWeightsList(leftPullers, priorPull > 0 ? priorPull : 0, false, visualMax);
  const rightPanHtml = renderWeightsList(rightPullers, priorPull < 0 ? priorPull : 0, true, visualMax);
  
  const maxAngle = 18;
  const beamAngle = -Math.tanh(logOdds / 4.0) * maxAngle;
  
  // 增量更新 DOM 属性，完美激发 CSS 过渡动画！
  const beamAssembly = $("nbBeamAssembly");
  const leftPanAssembly = $("nbLeftPanAssembly");
  const rightPanAssembly = $("nbRightPanAssembly");
  const needle = $("nbBalanceNeedle");
  
  if (beamAssembly) beamAssembly.style.transform = `rotate(${beamAngle}deg)`;
  if (leftPanAssembly) leftPanAssembly.style.transform = `rotate(${-beamAngle}deg)`;
  if (rightPanAssembly) rightPanAssembly.style.transform = `rotate(${-beamAngle}deg)`;
  if (needle) needle.style.transform = `rotate(${beamAngle}deg)`;
  
  const leftPanTitle = $("nbLeftPanTitle");
  if (leftPanTitle) {
    leftPanTitle.classList.toggle("winner", logOdds > 0);
    leftPanTitle.innerHTML = `${escapeHtml(c1_name)}<span class="nb-pan-prob">${((probs[c1_name] || 0) * 100).toFixed(1)}%</span>`;
    leftPanTitle.title = c1_name;
  }
  const rightPanTitle = $("nbRightPanTitle");
  if (rightPanTitle) {
    rightPanTitle.classList.toggle("winner", logOdds < 0);
    rightPanTitle.innerHTML = `${escapeHtml(c2_name)}<span class="nb-pan-prob">${((probs[c2_name] || 0) * 100).toFixed(1)}%</span>`;
    rightPanTitle.title = c2_name;
  }
  
  const leftPanWeights = $("nbLeftPanWeights");
  if (leftPanWeights) {
    leftPanWeights.innerHTML = leftPanHtml;
    bindWeightsHoverEvents(leftPanWeights);
  }
  const rightPanWeights = $("nbRightPanWeights");
  if (rightPanWeights) {
    rightPanWeights.innerHTML = rightPanHtml;
    bindWeightsHoverEvents(rightPanWeights);
  }
  
  const balanceReadout = $("nbBalanceReadout");
  if (balanceReadout) {
    const winner = logOdds >= 0 ? c1_name : c2_name;
    const color = logOdds >= 0 ? "#10b981" : "#8b5cf6";
    balanceReadout.innerHTML = `当前偏向：<strong style="color:${color};">${escapeHtml(winner)}</strong> · 对数优势 <strong class="nb-log-odds-value" style="color:${color};">${logOdds > 0 ? "+" : ""}${logOdds.toFixed(3)}</strong>`;
  }
}

function bindWeightsHoverEvents(container) {
  const blocks = container.querySelectorAll(".nb-weight-block[data-word]");
  blocks.forEach(b => {
    const word = b.dataset.word;
    b.addEventListener("mouseenter", () => {
      b.classList.add("nb-weight-highlight");
      const tr = document.querySelector(`.nb-table tbody tr[data-word="${CSS.escape(word)}"]`);
      if (tr) {
        tr.classList.add("nb-row-active");
      }
    });
    b.addEventListener("mouseleave", () => {
      b.classList.remove("nb-weight-highlight");
      const tr = document.querySelector(`.nb-table tbody tr[data-word="${CSS.escape(word)}"]`);
      tr?.classList.remove("nb-row-active");
    });
  });
}

function renderNbWordBreakdown(data) {
  const slot = $("nbWordBreakdown");
  if (!slot) return;
  
  // Set default tab if not set
  if (!window.activePredictTab) {
    window.activePredictTab = "valid";
  }
  
  const { c1_name, c2_name } = getNbPredictionPair(data);
  const validCount = data.top_words?.length || 0;
  const oovCount = data.oov_words?.length || 0;
  const filteredCount = data.filtered_words?.length || 0;
  
  let tabContentHtml = "";
  
  if (window.activePredictTab === "valid") {
    if (validCount === 0) {
      tabContentHtml = `<div style="text-align:center; color:#94a3b8; font-style:italic; padding:20px 0; font-size: 12px;">清洗分词后未匹配到词典内的任何有效词。</div>`;
    } else {
      const posClass = nbTrainData.positive_class;
      const negClass = nbTrainData.negative_class;
      const posWords = data.support_words_by_class[posClass] || [];
      const negWords = data.support_words_by_class[negClass] || [];
      
      const tablePos = renderNbWordGroupTable(posWords, `支持 ${posClass} 的关键词 (Δ(w) > 0)`, negClass, posClass);
      const tableNeg = renderNbWordGroupTable(negWords, `支持 ${negClass} 的关键词 (Δ(w) < 0)`, negClass, posClass);
      
      tabContentHtml = `
        <div style="font-size: 11px; color: #64748b; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.45;">
          贡献词分组展示每个有效词更支持哪个类别。Δ(w) 越大，越支持正类；Δ(w) 越小，越支持负类。
        </div>
        ${tableNeg}
        ${tablePos}
      `;
    }
  } else if (window.activePredictTab === "oov") {
    if (oovCount === 0) {
      tabContentHtml = `<div style="text-align:center; color:#94a3b8; font-style:italic; padding:20px 0; font-size: 12px;">未检测到词表外词。</div>`;
    } else {
      let rowsHtml = "";
      data.oov_words.forEach(w => {
        rowsHtml += `
          <tr>
            <td><strong style="color: #495057; font-family:monospace;">${escapeHtml(w)}</strong></td>
            <td><span class="nb-badge oov" style="background:#fff4e6; color:#d9480f; border:1px solid #ffd8a8; padding:2px 6px; border-radius:3px; font-size:11px;">词表外</span></td>
            <td colspan="4" style="color:#868e96; font-style:italic; font-size:11px;">出现在清洗后词表中，但经过 min_df, max_df, max_features 等规则筛选后未进入模型词表</td>
          </tr>
        `;
      });
      tabContentHtml = `
        <table class="nb-table">
          <thead>
            <tr>
              <th>单词 (Word)</th>
              <th>词典状态</th>
              <th colspan="4">说明</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    }
  } else if (window.activePredictTab === "filtered") {
    if (filteredCount === 0) {
      tabContentHtml = `<div style="text-align:center; color:#94a3b8; font-style:italic; padding:20px 0; font-size: 12px;">未检测到被过滤的词。</div>`;
    } else {
      let rowsHtml = "";
      const reasonMapping = {
        "stopword": "停用词",
        "too_short": "长度过短 (单字符)",
        "number": "数字/特殊字符",
        "special_character": "特殊符号"
      };
      data.filtered_words.forEach(fw => {
        rowsHtml += `
          <tr>
            <td><strong style="color: #868e96; font-family:monospace; text-decoration: line-through;">${escapeHtml(fw.word)}</strong></td>
            <td><span class="nb-badge filtered" style="background:#f1f3f5; color:#868e96; border:1px solid #dee2e6; padding:2px 6px; border-radius:3px; font-size:11px;">已过滤</span></td>
            <td colspan="4" style="color:#868e96; font-size:11px;">原因: <strong>${escapeHtml(reasonMapping[fw.reason] || fw.reason)}</strong></td>
          </tr>
        `;
      });
      tabContentHtml = `
        <table class="nb-table">
          <thead>
            <tr>
              <th>单词 (Word)</th>
              <th>词典状态</th>
              <th colspan="4">原因</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    }
  }
  
  slot.innerHTML = `
    <div style="margin-bottom: 12px;">
      <p style="font-size:12px; color:#555; margin:0 0 10px 0; line-height:1.45;">
        💡 只有有效词会参与朴素贝叶斯后验概率计算。词表外词和被过滤词会在预测时被忽略。
      </p>
      <div style="display:flex; border-bottom:1px solid #e9ecef; gap:8px;">
        <button class="tab-btn ${window.activePredictTab === 'valid' ? 'active' : ''}" style="border:none; background:none; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; color:${window.activePredictTab === 'valid' ? '#228be6' : '#868e96'}; border-bottom:2px solid ${window.activePredictTab === 'valid' ? '#228be6' : 'transparent'};" onclick="window.setPredictTab('valid')">
          有效词 (${validCount})
        </button>
        <button class="tab-btn ${window.activePredictTab === 'oov' ? 'active' : ''}" style="border:none; background:none; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; color:${window.activePredictTab === 'oov' ? '#d9480f' : '#868e96'}; border-bottom:2px solid ${window.activePredictTab === 'oov' ? '#d9480f' : 'transparent'};" onclick="window.setPredictTab('oov')">
          词表外词 (${oovCount})
        </button>
        <button class="tab-btn ${window.activePredictTab === 'filtered' ? 'active' : ''}" style="border:none; background:none; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; color:${window.activePredictTab === 'filtered' ? '#495057' : '#868e96'}; border-bottom:2px solid ${window.activePredictTab === 'filtered' ? '#495057' : 'transparent'};" onclick="window.setPredictTab('filtered')">
          被过滤词 (${filteredCount})
        </button>
      </div>
    </div>
    <div style="min-height: 180px;">
      ${tabContentHtml}
    </div>
  `;
  
  // Set tab click global helper
  window.setPredictTab = function(tabName) {
    window.activePredictTab = tabName;
    renderNbWordBreakdown(data);
  };
  
  // 绑定表格行与天平重物块的悬浮高亮联动
  if (window.activePredictTab === "valid") {
    const trs = slot.querySelectorAll("tbody tr[data-word]");
    trs.forEach(tr => {
      const word = tr.dataset.word;
      tr.addEventListener("mouseenter", () => {
        tr.classList.add("nb-row-active");
        const blocks = document.querySelectorAll(`.nb-weight-block[data-word="${CSS.escape(word)}"]`);
        blocks.forEach(b => b.classList.add("nb-weight-highlight"));
      });
      tr.addEventListener("mouseleave", () => {
        tr.classList.remove("nb-row-active");
        const blocks = document.querySelectorAll(`.nb-weight-block[data-word="${CSS.escape(word)}"]`);
        blocks.forEach(b => b.classList.remove("nb-weight-highlight"));
      });
    });
  }
}

function renderNbMathDerivation(data) {
  const slot = $("nbMathDerivation");
  if (!slot) return;
  
  const probs = data.probs;
  const { c1_name, c2_name } = getNbPredictionPair(data);
  
  const s1 = data.raw_scores[c1_name];
  const s2 = data.raw_scores[c2_name];
  const maxScore = Math.max(s1, s2);
  const s1_shift = s1 - maxScore;
  const s2_shift = s2 - maxScore;
  
  slot.innerHTML = `
    <div class="nb-math-board">
      <div class="nb-math-row">
        <div class="nb-math-col">
          <div class="nb-math-title" title="${c1_name}">${escapeHtml(c1_name)}</div>
          <div class="nb-math-steps">
            <div class="nb-step">对数先验 P(C): <br><strong>${data.prior_scores[c1_name].toFixed(4)}</strong></div>
            <div class="nb-step">似然和 Σlog P(w|C): <br><strong>${data.likelihood_scores[c1_name].toFixed(4)}</strong></div>
            <div class="nb-step" style="border-top:1.5px dashed #cbd5e1; padding-top:6px; margin-top:4px;">
              联合对数得分:<br>
              <span class="font-mono" style="font-size:10px;">${data.prior_scores[c1_name].toFixed(2)} + (${data.likelihood_scores[c1_name].toFixed(2)}) = </span><br>
              <strong style="color: #2563eb; font-size:13px; font-family:monospace;">${s1.toFixed(4)}</strong>
            </div>
          </div>
        </div>
        <div class="nb-math-col">
          <div class="nb-math-title" title="${c2_name}">${escapeHtml(c2_name)}</div>
          <div class="nb-math-steps">
            <div class="nb-step">对数先验 P(C): <br><strong>${data.prior_scores[c2_name].toFixed(4)}</strong></div>
            <div class="nb-step">似然和 Σlog P(w|C): <br><strong>${data.likelihood_scores[c2_name].toFixed(4)}</strong></div>
            <div class="nb-step" style="border-top:1.5px dashed #cbd5e1; padding-top:6px; margin-top:4px;">
              联合对数得分:<br>
              <span class="font-mono" style="font-size:10px;">${data.prior_scores[c2_name].toFixed(2)} + (${data.likelihood_scores[c2_name].toFixed(2)}) = </span><br>
              <strong style="color: #7c3aed; font-size:13px; font-family:monospace;">${s2.toFixed(4)}</strong>
            </div>
          </div>
        </div>
      </div>
      
      <div class="nb-math-divider"></div>
      
      <div class="nb-math-softmax">
        <div class="nb-math-title" style="margin-bottom:4px; font-size:12px;">归一化 Softmax 概率计算</div>
        <p style="font-size:11px; color:#64748b; margin:0 0 6px 0; line-height:1.4;">
          因对数得分较小直接求 $\\exp$ 易产生数值下溢，采用平移因子 M = max(Score) = ${maxScore.toFixed(3)}：
        </p>
        <div class="nb-math-formula-box font-mono" style="font-size:10.5px; line-height:1.6; background:#0f172a; padding:10px; border-radius:6px; border:1px solid #1e293b; color:#e2e8f0;">
          Shift_1 = Score_1 - M = ${s1_shift.toFixed(3)} <br>
          Shift_2 = Score_2 - M = ${s2_shift.toFixed(3)} <br>
          P(${escapeHtml(c1_name)}|D) = e^{${s1_shift.toFixed(2)}} / (e^{${s1_shift.toFixed(2)}} + e^{${s2_shift.toFixed(2)}}) = <strong style="color: #f59e0b;">${(probs[c1_name] * 100).toFixed(2)}%</strong> <br>
          P(${escapeHtml(c2_name)}|D) = e^{${s2_shift.toFixed(2)}} / (e^{${s1_shift.toFixed(2)}} + e^{${s2_shift.toFixed(2)}}) = <strong style="color: #f59e0b;">${(probs[c2_name] * 100).toFixed(2)}%</strong>
        </div>
      </div>
    </div>
  `;
}

function nbPredictCodeSpec(data) {
  const options = nbTrainData.tokenization_options || {};
  const vecOptions = nbTrainData.vectorize_options || {};
  const modelType = nbTrainData.model_type || "MultinomialNB";
  const alpha = nbTrainData.alpha || 1.0;
  
  const textVal = data.full_text || "";
  const escapedText = textVal.replace(/"""/g, '\\"\\"\\"');
  
  const targetNames = nbTrainData.target_names || [];
  const probsText = targetNames.map(name => `"${name}": ${(data.probs[name] * 100).toFixed(2)}%`).join(", ");
  
  const code = [
    `# 1. 待预测文本`,
    `text = """${escapedText}"""`,
    ``,
    `# 2. 管道配置 (必须与训练预处理参数相同)`,
    `remove_headers = ${options.remove_headers ?? true}`,
    `remove_footers = ${options.remove_footers ?? true}`,
    `remove_quotes = ${options.remove_quotes ?? true}`,
    `lowercase = ${options.lowercase ?? true}`,
    `remove_stopwords = ${options.remove_stopwords ?? true}`,
    ``,
    `# 3. 英文文本清洗与分词过滤`,
    `import re`,
    `from sklearn.datasets._twenty_newsgroups import (`,
    `    strip_newsgroup_header,`,
    `    strip_newsgroup_footer,`,
    `    strip_newsgroup_quoting`,
    `)`,
    ``,
    `def safe_strip_text(value, strip_func):`,
    `    stripped = strip_func(value)`,
    `    return stripped if stripped.strip() else value`,
    ``,
    `clean_text = text`,
    `if remove_headers:`,
    `    clean_text = safe_strip_text(clean_text, strip_newsgroup_header)`,
    `if remove_quotes:`,
    `    clean_text = safe_strip_text(clean_text, strip_newsgroup_quoting)`,
    `if remove_footers:`,
    `    clean_text = safe_strip_text(clean_text, strip_newsgroup_footer)`,
    ``,
    `# 提取单词并转换为小写`,
    `tokens = re.findall(r'\\b[a-zA-Z]+\\b', clean_text)`,
    `if lowercase:`,
    `    tokens = [t.lower() for t in tokens]`,
    ``,
    `# 过滤 sklearn 常用英文停用词`,
    `if remove_stopwords:`,
    `    tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]`,
    ``,
    `# 4. 特征向量化转换 (使用训练中拟合好的 Vectorizer)`,
    `# 当前拟合类型: ${vecOptions.vectorizer_type === "tfidf" ? "TfidfVectorizer" : "CountVectorizer"}`,
    `# 词典大小: ${nbTrainData.n_features}`,
    `clean_text_joined = " ".join(tokens)`,
    `x_new = vectorizer.transform([clean_text_joined])`,
    ``,
    `# 5. 模型后验概率推理`,
    `# 拟合好的模型: ${modelType}(alpha=${alpha})`,
    `pred_class_idx = clf.predict(x_new)[0]`,
    `probs = clf.predict_proba(x_new)[0]`,
    ``,
    `# ---- 动态预测结果 ----`,
    `# 预测类别 => ${data.predicted_label}`,
    `# 类别概率 => { ${probsText} }`,
    `# 已激活单词数量 => ${data.top_words.length}`,
    `# 被忽略词汇 (OOV) => ${JSON.stringify(data.oov_words)}`
  ].join("\n");
  
  return {
    title: "朴素贝叶斯文本预测代码",
    operation: "对自定义文本进行清洗、分词、停用词过滤、特征转换，并进行贝叶斯后验概率预测",
    code,
    notes: [
      "文本清洗分词规则在推理预测阶段必须与训练集配置严格保持一致，否则特征词索引会错乱。",
      "推理阶段使用已拟合好的 Vectorizer，只可调用 transform 转换，严禁调用 fit_transform。",
      "未出现在训练词典中的词 (OOV) 将在 transform 时被向量化工具自动忽略，不参与后验概率乘积计算。",
      "后验概率预测在 Softmax 归一化时进行了对数得分平移，防止指数运算中发生浮点数下溢。"
    ]
  };
}

function openNbPredictCodeDrawer() {
  closeNbPredictCodeDrawer();
  const data = nbPredictData;
  if (!data) return;
  
  const spec = nbPredictCodeSpec(data);
  const notesHtml = spec.notes.map((note, idx) => `<li>${idx + 1}. ${escapeHtml(note)}</li>`).join("");
  
  const html = `
    <div class="code-drawer-backdrop" id="nbCodeDrawerBackdrop">
      <aside class="code-drawer" role="dialog" aria-modal="true" aria-label="预测代码">
        <div class="code-drawer-head">
          <div>
            <div class="code-kicker">当前预测代码</div>
            <h2>${escapeHtml(spec.title)}</h2>
          </div>
          <button class="icon-btn code-close-btn" type="button" id="nbCodeCloseBtn" aria-label="关闭代码面板">x</button>
        </div>
        <div class="code-operation">
          <span>当前操作</span>
          <strong>${escapeHtml(spec.operation)}</strong>
        </div>
        <div class="code-block-head">
          <span>核心代码</span>
          <button class="secondary-btn code-copy-btn" type="button" id="nbCodeCopyBtn">复制代码</button>
        </div>
        <pre class="teaching-code"><code>${escapeHtml(spec.code)}</code></pre>
        <div class="code-explain">
          <h3>代码解释</h3>
          <ol>${notesHtml}</ol>
        </div>
      </aside>
    </div>
  `;
  
  document.body.insertAdjacentHTML("beforeend", html);
  
  const drawerBackdrop = $("nbCodeDrawerBackdrop");
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", event => {
      if (event.target === drawerBackdrop || event.target.closest("#nbCodeCloseBtn")) {
        closeNbPredictCodeDrawer();
      }
    });
    
    $("nbCodeCopyBtn")?.addEventListener("click", async event => {
      const code = drawerBackdrop.querySelector(".teaching-code code")?.textContent || "";
      try {
        await navigator.clipboard.writeText(code);
        event.currentTarget.textContent = "已复制";
        setTimeout(() => { event.currentTarget.textContent = "复制代码"; }, 1200);
      } catch (_err) {
        event.currentTarget.textContent = "复制失败";
      }
    });
  }
}

function closeNbPredictCodeDrawer() {
  $("nbCodeDrawerBackdrop")?.remove();
}

function updateNbPredStats() {
  const data = nbPredictData;
  if (!data) return;
  
  const predClassEl = $("nbPredClass");
  const predConfEl = $("nbPredConf");
  
  if (predClassEl && predConfEl) {
    let predName = data.predicted_label;
    const confidence = (data.probs[predName] * 100).toFixed(1) + "%";
    
    let badgeStyle = "background-color: #cbd5e1; color: #334155;";
    if (predName.includes("space")) {
      badgeStyle = "background-color: #dbeafe; color: #1e40af;";
      predName = "🚀 " + predName;
    } else if (predName.includes("auto")) {
      badgeStyle = "background-color: #f3e8ff; color: #5b21b6;";
      predName = "🚗 " + predName;
    } else if (predName.includes("baseball")) {
      badgeStyle = "background-color: #fef3c7; color: #92400e;";
      predName = "⚾ " + predName;
    } else if (predName.includes("med")) {
      badgeStyle = "background-color: #d1fae5; color: #065f46;";
      predName = "🏥 " + predName;
    }
    
    predClassEl.textContent = predName;
    predClassEl.style.cssText = `font-size: 13px; padding: 4px 8px; border-radius: 12px; margin-top: 4px; display: inline-block; ${badgeStyle}`;
    predConfEl.textContent = confidence;
  }
  
  const subtitleEl = $("nbTugOfWarSubtitle");
  if (subtitleEl) {
    if (data.true_label) {
      const statusText = data.correct ? `<span style="color:#059669; font-weight:600;">预测正确 ✓</span>` : `<span style="color:#dc2626; font-weight:600;">预测错误 ✗</span>`;
      subtitleEl.innerHTML = `真实类别：<strong>${data.true_label}</strong> | 预测类别：<strong>${data.predicted_label}</strong> (${statusText})`;
    } else {
      subtitleEl.innerHTML = `自定义文本实时推理预测中`;
    }
  }
  
  // 实时同步更新已展开的代码抽屉内容
  const drawerBackdrop = $("nbCodeDrawerBackdrop");
  if (drawerBackdrop && data) {
    const spec = nbPredictCodeSpec(data);
    const codeEl = drawerBackdrop.querySelector(".teaching-code code");
    if (codeEl) {
      codeEl.textContent = spec.code;
    }
  }
}

function renderNbPredictText(data, removed_word = null) {
  const statusMsgEl = $("nbPredictStatusMsg");
  if (statusMsgEl) {
    const x = data.valid_words ? data.valid_words.length : 0;
    const y = data.oov_words ? data.oov_words.length : 0;
    statusMsgEl.style.display = "block";
    if (x === 0) {
      statusMsgEl.style.background = "#fff9db";
      statusMsgEl.style.border = "1px solid #ffe066";
      statusMsgEl.style.color = "#f59f00";
      statusMsgEl.innerHTML = "⚠️ 当前输入文本中没有词进入模型词表，模型无法根据文本内容形成有效判断。";
    } else {
      statusMsgEl.style.background = "#e6fcf5";
      statusMsgEl.style.border = "1px solid #c3fae8";
      statusMsgEl.style.color = "#099268";
      statusMsgEl.innerHTML = `✓ 预测完成。模型使用 <strong>${x}</strong> 个有效词进行计算，忽略 <strong>${y}</strong> 个词表外词。`;
    }
  }

  const textContentEl = $("nbPredictTextContent");
  if (textContentEl && data.full_text) {
    const raw_text = data.full_text;
    const highlighted_tokens = data.highlighted_tokens || [];
    const positiveClass = nbTrainData.positive_class;
    
    highlighted_tokens.sort((a, b) => a.start - b.start);
    
    let lastIdx = 0;
    let html = "";
    for (let item of highlighted_tokens) {
      if (item.start > lastIdx) {
        html += escapeHtml(raw_text.substring(lastIdx, item.start));
      }
      const tokenText = raw_text.substring(item.start, item.end);
      if (item.status === 'valid') {
        const isRemoved = (removed_word && item.token.toLowerCase() === removed_word.toLowerCase());
        if (isRemoved) {
          const tooltip = `单词：${item.token}\n状态：已临时移除并重新计算\n（移除该词后重新计算了模型分类结果）`;
          html += `<span class="nb-token-removed nb-tooltip-trigger" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
        } else {
          const isPos = item.support_class === positiveClass;
          const className = isPos ? 'nb-token-positive' : 'nb-token-negative';
          
          const opacity = Math.min(0.45, 0.10 + (item.abs_delta / 8.0) * 0.35);
          const borderOpacity = Math.min(0.85, 0.35 + (item.abs_delta / 8.0) * 0.50);
          const colorStyle = isPos ? 
            `background: rgba(37, 99, 235, ${opacity}); border-bottom: 2px solid rgba(37, 99, 235, ${borderOpacity});` :
            `background: rgba(16, 185, 129, ${opacity}); border-bottom: 2px solid rgba(16, 185, 129, ${borderOpacity});`;
          
          const tooltip = `单词：${item.token}\n状态：有效词\n支持类别：${item.support_class}\nΔ(w)：${item.delta > 0 ? '+' : ''}${item.delta.toFixed(4)}\nlog P(w|${nbTrainData.negative_class})：${item.log_prob_negative.toFixed(4)}\nlog P(w|${nbTrainData.positive_class})：${item.log_prob_positive.toFixed(4)}`;
          
          html += `<span class="${className} nb-tooltip-trigger" style="${colorStyle}" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
        }
      } else if (item.status === 'oov') {
        const tooltip = `单词：${item.token}\n状态：词表外词\n说明：该词未进入模型词表，预测时未参与计算。`;
        html += `<span class="nb-token-oov nb-tooltip-trigger" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
      } else {
        html += escapeHtml(tokenText);
      }
      lastIdx = item.end;
    }
    if (lastIdx < raw_text.length) {
      html += escapeHtml(raw_text.substring(lastIdx));
    }
    textContentEl.innerHTML = html;
    
    bindHighlightHoverEvents();
  }
}

function bindHighlightHoverEvents() {
  const triggers = document.querySelectorAll(".nb-tooltip-trigger");
  triggers.forEach(el => {
    const word = el.dataset.word;
    if (!word) return;
    const normalized = word.toLowerCase();
    el.addEventListener("mouseenter", () => {
      el.style.outline = "2px solid #f59e0b";
      el.style.outlineOffset = "1px";
      const tr = document.querySelector(`.nb-table tbody tr[data-word="${CSS.escape(normalized)}"]`);
      if (tr) {
        tr.classList.add("nb-row-active");
      }
      const blocks = document.querySelectorAll(`.nb-weight-block[data-word="${CSS.escape(normalized)}"]`);
      blocks.forEach(b => b.classList.add("nb-weight-highlight"));
    });
    el.addEventListener("mouseleave", () => {
      el.style.outline = "none";
      const tr = document.querySelector(`.nb-table tbody tr[data-word="${CSS.escape(normalized)}"]`);
      tr?.classList.remove("nb-row-active");
      const blocks = document.querySelectorAll(`.nb-weight-block[data-word="${CSS.escape(normalized)}"]`);
      blocks.forEach(b => b.classList.remove("nb-weight-highlight"));
    });
  });
}

function renderNbWordGroupTable(words, title, negativeClass, positiveClass) {
  if (!words || words.length === 0) {
    return `
      <div style="margin-top: 12px; margin-bottom: 16px;">
        <h4 style="font-size: 12.5px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">${escapeHtml(title)}</h4>
        <div style="color:#94a3b8; font-style:italic; padding:10px 0; font-size: 11px;">无有效词</div>
      </div>
    `;
  }
  
  let rowsHtml = "";
  words.forEach(w => {
    const delta = w.delta;
    const logProbNeg = w.log_prob_negative;
    const logProbPos = w.log_prob_positive;
    
    rowsHtml += `
      <tr data-word="${escapeHtml(w.word)}">
        <td><strong style="color: #0f172a; font-family:monospace;">${escapeHtml(w.word)}</strong></td>
        <td class="font-mono">${w.tf}</td>
        <td class="font-mono">${w.feature_value.toFixed(4)}</td>
        <td class="font-mono">${logProbNeg.toFixed(4)}</td>
        <td class="font-mono">${logProbPos.toFixed(4)}</td>
        <td class="font-mono ${delta > 0 ? 'text-green' : 'text-purple'}" style="color:${delta > 0 ? '#10b981' : '#8b5cf6'}; font-weight:bold;">${delta > 0 ? "+" : ""}${delta.toFixed(4)}</td>
        <td>
          <button class="secondary-btn" style="padding: 2px 6px; font-size: 11px; margin: 0;" onclick="runNbPredictWithoutWord('${escapeHtml(w.word)}')">移除后重算</button>
        </td>
      </tr>
    `;
  });
  
  return `
    <div style="margin-top: 12px; margin-bottom: 16px;">
      <h4 style="font-size: 12.5px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${title.includes(positiveClass) ? '#8b5cf6' : '#10b981'};"></span>
        ${escapeHtml(title)}
      </h4>
      <table class="nb-table">
        <thead>
          <tr>
            <th>单词</th>
            <th>词频</th>
            <th>特征权重</th>
            <th title="log P(w|${escapeHtml(negativeClass)})">log P(w|${escapeHtml(negativeClass.split('.').pop())})</th>
            <th title="log P(w|${escapeHtml(positiveClass)})">log P(w|${escapeHtml(positiveClass.split('.').pop())})</th>
            <th>Δ(w)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function runNbPredictWithoutWord(word) {
  const contentEl = $("nbPredictComparisonContent");
  if (!contentEl) return;

  // Show loading state
  contentEl.innerHTML = `
    <div style="padding: 24px; text-align: center; color: #475569; font-size: 13px;">
      <span style="font-size: 24px; display: block; margin-bottom: 8px;" class="loading-spinner">⏳</span>
      正在重新计算，请稍候...
    </div>
  `;

  try {
    const payload = {
      dataset_id: nbTrainData.dataset_id,
      removed_word: word
    };
    if (nbPredictData && typeof nbPredictData.sample_index === "number") {
      payload.sample_index = nbPredictData.sample_index;
    } else {
      payload.text = (nbPredictData ? nbPredictData.full_text : null) || window.nbPredictCustomText;
    }

    const res = await runAction("predict_without_word", payload);

    const classes = Object.keys(res.original.posterior_probs);
    let maxChangeClass = null;
    let maxChangeVal = -1;
    classes.forEach(c => {
      const chg = Math.abs(res.probability_change[c]);
      if (chg > maxChangeVal) {
        maxChangeVal = chg;
        maxChangeClass = c;
      }
    });

    let rowsHtml = "";
    
    // Prediction class change row
    rowsHtml += `
      <tr style="${res.prediction_changed ? 'background-color: rgba(239, 68, 68, 0.04);' : ''}">
        <td><strong>预测类别</strong></td>
        <td style="font-family: monospace;">${escapeHtml(res.original.predicted_label)}</td>
        <td style="font-family: monospace; font-weight: bold; color: ${res.prediction_changed ? '#dc2626' : '#0f172a'};">${escapeHtml(res.after_removal.predicted_label)}</td>
        <td><span class="nb-badge ${res.prediction_changed ? 'active' : 'oov'}" style="${res.prediction_changed ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; text-transform: none;' : 'text-transform: none;'}">${res.prediction_changed ? '已改变' : '未改变'}</span></td>
      </tr>
    `;

    // Probability rows
    classes.forEach(c => {
      const origProb = res.original.posterior_probs[c];
      const afterProb = res.after_removal.posterior_probs[c];
      const probChg = res.probability_change[c];
      const sign = probChg >= 0 ? "+" : "";
      const isMax = (c === maxChangeClass);
      
      rowsHtml += `
        <tr style="${isMax ? 'background-color: rgba(245, 158, 11, 0.05); font-weight: bold; border-left: 3px solid #f59e0b;' : ''}">
          <td>P(${escapeHtml(c)} | doc)</td>
          <td class="font-mono">${(origProb * 100).toFixed(2)}%</td>
          <td class="font-mono">${(afterProb * 100).toFixed(2)}%</td>
          <td class="font-mono" style="color: ${probChg > 0 ? '#10b981' : (probChg < 0 ? '#ef4444' : '#64748b')};">${sign}${(probChg * 100).toFixed(2)}% ${isMax ? '🔥 (变化最大)' : ''}</td>
        </tr>
      `;
    });

    // Score rows
    classes.forEach(c => {
      const origScore = res.original.raw_scores[c];
      const afterScore = res.after_removal.raw_scores[c];
      const scoreChg = res.score_change[c];
      const sign = scoreChg >= 0 ? "+" : "";
      
      rowsHtml += `
        <tr>
          <td>score(${escapeHtml(c)})</td>
          <td class="font-mono">${origScore.toFixed(4)}</td>
          <td class="font-mono">${afterScore.toFixed(4)}</td>
          <td class="font-mono" style="color: ${scoreChg > 0 ? '#10b981' : (scoreChg < 0 ? '#ef4444' : '#64748b')};">${sign}${scoreChg.toFixed(4)}</td>
        </tr>
      `;
    });

    let alertHtml = "";
    if (res.prediction_changed) {
      alertHtml = `
        <div style="background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-weight: bold; font-size: 13px;">
          ⚠️ 预测类别已改变！由 ${escapeHtml(res.original.predicted_label)} 变为 ${escapeHtml(res.after_removal.predicted_label)}。
        </div>
      `;
    } else {
      alertHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 13px;">
          ℹ️ 预测类别未发生改变，但后验概率或对数得分有所浮动。
        </div>
      `;
    }

    contentEl.innerHTML = `
      ${alertHtml}
      <div class="nb-predict-comparison-info" style="display: flex; gap: 24px; font-size: 13px; color: #475569; margin-bottom: 16px;">
        <div>移除词：<strong style="color: #0f172a; font-family: monospace; font-size: 14px;">${escapeHtml(res.removed_word)}</strong></div>
        <div>移除次数：<strong style="color: #0f172a;">${res.removed_count} 次</strong></div>
        <div>预测是否改变：<strong style="color: ${res.prediction_changed ? '#dc2626' : '#64748b'};">${res.prediction_changed ? '是' : '否'}</strong></div>
      </div>

      <table class="nb-table" style="width: 100%; font-size: 13px; border-collapse: separate; border-spacing: 0;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="border-bottom: 2px solid #e2e8f0;">项目</th>
            <th style="border-bottom: 2px solid #e2e8f0;">原始预测</th>
            <th style="border-bottom: 2px solid #e2e8f0;">移除后预测</th>
            <th style="border-bottom: 2px solid #e2e8f0;">变化</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="font-size: 12px; color: #64748b; margin-top: 12px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 10px;">
        💡 说明：该操作不会重新训练模型，只是在当前文本中临时移除指定词，并重新计算后验概率。
      </div>
    `;

    renderNbPredictText(nbPredictData, word);

    const statusMsgEl = $("nbPredictStatusMsg");
    if (statusMsgEl) {
      statusMsgEl.style.display = "block";
      statusMsgEl.style.background = "#e6fcf5";
      statusMsgEl.style.border = "1px solid #c3fae8";
      statusMsgEl.style.color = "#099268";
      const validCountAfter = res.after_removal.support_words_by_class[nbTrainData.negative_class].length + res.after_removal.support_words_by_class[nbTrainData.positive_class].length;
      statusMsgEl.innerHTML = `✓ 重新计算完成（已临时移除关键词 <strong>${escapeHtml(word)}</strong>，共 <strong>${res.removed_count}</strong> 处）。当前参与计算的有效词有 <strong>${validCountAfter}</strong> 个。`;
    }

  } catch (err) {
    contentEl.innerHTML = `
      <div style="padding: 16px; background: #fff5f5; border: 1px solid #ffe3e3; color: #e03131; border-radius: 6px; font-size: 12px; line-height: 1.5;">
        ❌ 重算失败：${escapeHtml(err.message)}
      </div>
    `;
  }
}

function resetNbPredictComparisonCard() {
  const contentEl = $("nbPredictComparisonContent");
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div class="empty-state" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">
      <span style="font-size: 24px; display: block; margin-bottom: 8px;">💡</span>
      <strong>点击下方特征词的“移除后重算”按钮</strong>，可观察单个关键词被移除后，模型分类预测与概率得分的变化，从而直观感受词项贡献的累加特性。
      <div style="font-size: 12px; color: #94a3b8; margin-top: 12px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.5; font-weight: normal;">
        教案提示：朴素贝叶斯在 log 空间中累加每个有效词的条件概率。移除某个关键词后，该词对应的 log 概率贡献会从各类别 score 中消失，因此后验概率可能发生变化。
      </div>
    </div>
  `;
}
