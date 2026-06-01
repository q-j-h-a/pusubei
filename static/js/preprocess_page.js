// Preprocess Page.

let activePreprocessStep = viewStateStore.activePreprocessStepV1 || "load";
let preprocessProgressStep = viewStateStore.preprocessProgressStepV1 || activePreprocessStep;
let loadingDataView = false;

const GUIDE_GLOBAL_KEY = "guideGlobalEnabledV1";
const GUIDE_PAGE_KEY = "guidePageStateV1";
const PREPROCESS_LOAD_GUIDE_ID = "preprocess_load";
const PREPROCESS_DETAIL_GUIDE_ID = "preprocess_detail";
const PREPROCESS_RAW_VIZ_GUIDE_ID = "preprocess_raw_viz";
const PREPROCESS_STANDARDIZE_GUIDE_ID = "preprocess_standardize";
const PREPROCESS_STANDARD_VIZ_GUIDE_ID = "preprocess_standard_viz";

function guideReadJson(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return saved ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function guideGlobalEnabled() {
  if (typeof viewStateStore[GUIDE_GLOBAL_KEY] === "boolean") {
    return viewStateStore[GUIDE_GLOBAL_KEY];
  }
  localStorage.removeItem(GUIDE_GLOBAL_KEY);
  return true;
}

function setGuideGlobalEnabled(enabled) {
  viewStateStore[GUIDE_GLOBAL_KEY] = Boolean(enabled);
  localStorage.removeItem(GUIDE_GLOBAL_KEY);
}

function guidePageStates() {
  if (!viewStateStore[GUIDE_PAGE_KEY]) viewStateStore[GUIDE_PAGE_KEY] = {};
  return viewStateStore[GUIDE_PAGE_KEY];
}

function guidePageState(pageId = PREPROCESS_LOAD_GUIDE_ID) {
  const states = guidePageStates();
  return {
    enabled: true,
    completed: false,
    dismissed: false,
    step: "test_button",
    ...(states[pageId] || {}),
  };
}

function setGuidePageState(next, pageId = PREPROCESS_LOAD_GUIDE_ID) {
  const states = guidePageStates();
  states[pageId] = { ...guidePageState(pageId), ...next };
  viewStateStore.guidePageStateV1 = states;
}

function currentGuidePageId() {
  if (currentPage === "preprocess") {
    if (activePreprocessStep === "load") return PREPROCESS_LOAD_GUIDE_ID;
    if (activePreprocessStep === "detail") return PREPROCESS_DETAIL_GUIDE_ID;
    if (activePreprocessStep === "raw_viz") return PREPROCESS_RAW_VIZ_GUIDE_ID;
    if (activePreprocessStep === "standardize") return PREPROCESS_STANDARDIZE_GUIDE_ID;
    if (activePreprocessStep === "standard_viz") return PREPROCESS_STANDARD_VIZ_GUIDE_ID;
    return `preprocess_${activePreprocessStep || "load"}`;
  }
  if (currentPage === "train_eval") return `train_${activeTrainStep || "process"}`;
  if (currentPage === "evaluate") return "evaluate_metrics";
  if (currentPage === "predict") return "predict";
  return PREPROCESS_LOAD_GUIDE_ID;
}

function defaultGuideStepForPage(pageId = currentGuidePageId()) {
  if (pageId === PREPROCESS_DETAIL_GUIDE_ID) return "detail_scale";
  if (pageId === PREPROCESS_RAW_VIZ_GUIDE_ID) return "raw_feature";
  if (pageId === PREPROCESS_STANDARDIZE_GUIDE_ID) return "standardize_feature";
  if (pageId === PREPROCESS_STANDARD_VIZ_GUIDE_ID) return "standard_viz_feature";
  return "test_button";
}

function guideEnabledForPreprocessLoad() {
  const state = guidePageState();
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForPreprocessDetail() {
  const state = guidePageState(PREPROCESS_DETAIL_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForPreprocessRawViz() {
  const state = guidePageState(PREPROCESS_RAW_VIZ_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForPreprocessStandardize() {
  const state = guidePageState(PREPROCESS_STANDARDIZE_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForPreprocessStandardViz() {
  const state = guidePageState(PREPROCESS_STANDARD_VIZ_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function resetPreprocessLoadGuideState(enabled = true) {
  setGuidePageState({
    enabled,
    completed: false,
    dismissed: false,
    step: "test_button",
  });
}

function resetCurrentGuideState(enabled = true) {
  const pageId = currentGuidePageId();
  setGuidePageState({
    enabled,
    completed: false,
    dismissed: false,
    step: defaultGuideStepForPage(pageId),
  }, pageId);
}

const PREPROCESS_STEPS = [
  { id: "load", no: "01", label: "加载原始数据集", needsData: false },
  { id: "detail", no: "02", label: "数据详情", needsData: true },
  { id: "raw_viz", no: "03", label: "原始数据可视化", needsData: true, views: ["raw", "single_corr", "all_corr"] },
  { id: "standardize", no: "04", label: "数据标准化", needsData: true },
  { id: "standard_viz", no: "05", label: "标准数据可视化", needsData: true, views: ["standardized"] },
];

PREPROCESS_STEPS[0].label = "加载原始数据";

const BOSTON_FIELD_MEANINGS = {
  CRIM: "城镇人均犯罪率",
  ZN: "大面积住宅用地比例",
  INDUS: "非零售商业用地比例",
  CHAS: "是否靠近查尔斯河",
  NOX: "一氧化氮浓度",
  RM: "住宅平均房间数",
  AGE: "1940年前建成的自住房比例",
  DIS: "到波士顿就业中心的加权距离",
  RAD: "到放射状高速公路的可达性指数",
  TAX: "每10000美元房产税率",
  PTRATIO: "城镇师生比例",
  B: "历史人口统计相关变量",
  LSTAT: "低收入人口比例",
  MEDV: "房价中位数",
};

function ensurePreprocessTopFlow() {
  const slot = $("pageTopSlot");
  if (!slot) return null;
  slot.classList.add("has-content");
  if (!$("preprocessFlow")) {
    slot.innerHTML = `<div class="preprocess-flow" id="preprocessFlow"></div>`;
  }
  return $("preprocessFlow");
}

function preprocessStepIndex(stepId) {
  const index = PREPROCESS_STEPS.findIndex(step => step.id === stepId);
  return index < 0 ? 0 : index;
}

function markPreprocessProgress(stepId) {
  if (preprocessStepIndex(stepId) <= preprocessStepIndex(preprocessProgressStep)) return;
  preprocessProgressStep = stepId;
  viewStateStore.preprocessProgressStepV1 = preprocessProgressStep;
}

async function renderDataShell() {
  preprocessPageSchema = preprocessPageSchema || await loadPanelSchema("preprocess", {
    title: "鎺у埗闈㈡澘",
    sections: [
      { id: "dataset", controls: [
        { type: "stat", label: "鏍锋湰鎬绘暟", value_id: "sampleCount" },
        { type: "stat", label: "鐗瑰緛鏁伴噺", value_id: "featureCount", default: FEATURE_NAMES.length },
        { type: "select", name: "feature", label: "鐗瑰緛閫夋嫨", element_id: "dataFeature", source: "feature_columns" }
      ] },
      { id: "display", controls: [{ type: "chart_selector", name: "dataViews", label: "鏄剧ず妯″紡", summary_id: "dataModeSummary", options: [
        { label: "原始散点图", value: "raw", default: true },
        { label: "标准化散点图", value: "standardized" },
        { label: "单特征线性相关系数", value: "single_corr" },
        { label: "全特征线性相关系数", value: "all_corr" }
      ] }] }
    ]
  });
  document.querySelector(".shell").classList.remove("theory");
  currentDatasetMeta = currentDatasetMeta || viewStateStore.currentDatasetMetaV1 || null;
  $("main").innerHTML = `<div id="preprocessContent"></div>`;
  ensurePreprocessTopFlow();
  renderPreprocessRightPanel();
  if (currentDatasetMeta) {
    applyDatasetMeta(currentDatasetMeta, { silent: true });
  } else {
    setPreprocessStageReady(false);
  }
  restoreDataFormState();
  bindPreprocessFlow();
  setPreprocessStageReady(Boolean(currentDatasetMeta));
  renderPreprocessFlow();
}

function renderPreprocessLoadPanel() {
  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>加载数据集</h3>
      <div class="guide-select-wrap" id="datasetSourceGuideTarget">
        <select id="datasetSource" aria-label="选择数据集">
          <option value="boston_housing">Boston 原始数据集</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="primary-btn" id="loadDatasetBtn" type="button">加载数据集</button>
      </div>
      <div class="status-line hidden" id="datasetLoadMessage"></div>
      ${preprocessCodeButtonHtml("load")}
    </div>`;
}

function guideSwitchPanelHtml() {
  const globalEnabled = guideGlobalEnabled();
  const pageState = guidePageState(currentGuidePageId());
  return `
    <div class="control-card guide-control-card">
      <h3>界面引导</h3>
      <label class="guide-switch">
        <span>全局引导</span>
        <input id="guideGlobalToggle" type="checkbox" ${globalEnabled ? "checked" : ""}>
      </label>
      <label class="guide-switch ${globalEnabled ? "" : "is-disabled"}">
        <span>当前页面引导</span>
        <input id="guidePageToggle" type="checkbox" ${pageState.enabled && !pageState.dismissed && !pageState.completed ? "checked" : ""} ${globalEnabled ? "" : "disabled"}>
      </label>
    </div>`;
}

function renderStandardizePanel() {
  const datasetLoaded = Boolean(currentDatasetMeta);
  const featureOptions = datasetLoaded ? (currentDatasetMeta?.features || []) : [];
  const selectedFeature = preprocessSelectedFeatureFallback(featureOptions);
  const featureOptionsHtml = featureOptions
    .map(opt => optionHtml(opt, selectedFeature, opt))
    .join("");
  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>数据标准化</h3>
      <div class="control-group" aria-label="特征选择">
        <label class="control-label" for="dataFeature">特征选择</label>
        <select id="dataFeature" ${datasetLoaded ? "" : "disabled"}>${featureOptionsHtml}</select>
      </div>
      ${preprocessCodeButtonHtml("standardize")}
    </div>`;
}

function bindPreprocessControls() {
  restoreDataFormState();
  bindPreprocessCodeButtons();
  if ($("dataFeature")) {
    $("dataFeature").addEventListener("change", async () => {
      if (activePreprocessStep === "raw_viz" || activePreprocessStep === "standard_viz") {
        await loadDataView({ deferRender: true });
        await renderDataCharts();
      } else {
        await loadDataView();
      }
    });
  }
  document.querySelectorAll('input[name="dataViews"]').forEach(el => el.addEventListener("change", async () => {
    saveCheckedValues("dataViews", preprocessDataViewsStorageKey());
    if (activePreprocessStep === "raw_viz" || activePreprocessStep === "standard_viz") {
      if (selectedValues("dataViews").length) {
        if (!dataCache && !loadingDataView) {
          await loadDataView({ deferRender: true });
        }
        await renderDataCharts();
      } else {
        renderChartGridShell();
        renderRawVizPrompt();
        if ($("dataModeSummary")) $("dataModeSummary").textContent = "请选择显示模块";
      }
    }
  }));
}

function preprocessDataViewsStorageKey() {
  if (activePreprocessStep === "raw_viz") return "rawVizSelectedViewsV1";
  if (activePreprocessStep === "standard_viz") return "standardVizSelectedViewsV1";
  return "preprocessSelectedViewsV1";
}

function preprocessFormStateKey() {
  if (activePreprocessStep === "raw_viz") return "rawVizFormStateV1";
  if (activePreprocessStep === "standard_viz") return "standardVizFormStateV1";
  if (activePreprocessStep === "standardize") return "standardizeFormStateV1";
  return "preprocessFormStateV1";
}

function preprocessSavedFeature() {
  const state = viewStateStore[preprocessFormStateKey()] || {};
  return state.feature || "";
}

function preprocessSelectedFeatureFallback(features = currentDatasetMeta?.features || FEATURE_NAMES) {
  const saved = preprocessSavedFeature();
  if (saved && features.includes(saved)) return saved;
  if (activePreprocessStep !== "raw_viz" && activePreprocessStep !== "standard_viz" && dataCache?.feature && features.includes(dataCache.feature)) {
    return dataCache.feature;
  }
  return features[0] || DEFAULT_FEATURE;
}

function dataCacheMatchesSelectedFeature() {
  const selected = $("dataFeature")?.value || preprocessSelectedFeatureFallback();
  return Boolean(dataCache?.feature && selected && dataCache.feature === selected);
}

function rawVizSelectedViews() {
  return ["raw", "all_corr"];
}

function standardVizSelectedViews() {
  return ["raw", "standardized", "all_corr"];
}

function bindPreprocessFlow() {
  const flow = $("preprocessFlow");
  if (!flow || flow.dataset.bound === "1") return;
  flow.dataset.bound = "1";
  flow.addEventListener("click", async event => {
    const btn = event.target.closest("[data-preprocess-step]");
    if (!btn) return;
    await setPreprocessStep(btn.dataset.preprocessStep);
  });
}

function renderPreprocessFlow() {
  const flow = $("preprocessFlow");
  if (!flow) return;
  const loaded = Boolean(currentDatasetMeta);
  const progressIndex = loaded ? preprocessStepIndex(preprocessProgressStep) : preprocessStepIndex(activePreprocessStep);
  flow.innerHTML = PREPROCESS_STEPS.map((step, index) => {
    const ready = !step.needsData || loaded;
    const active = step.id === activePreprocessStep;
    const done = loaded && index <= progressIndex && !active;
    const classes = [
      "flow-step",
      active ? "active" : "",
      done ? "done" : "",
      ready ? "" : "disabled",
    ].filter(Boolean).join(" ");
    return `<button class="${classes}" type="button" data-preprocess-step="${escapeHtml(step.id)}" ${ready ? "" : "aria-disabled=\"true\""}>
      <span>${escapeHtml(step.no)}</span>
      <strong>${escapeHtml(step.label)}</strong>
    </button>`;
  }).join("");
}

async function setPreprocessStep(stepId) {
  const step = PREPROCESS_STEPS.find(item => item.id === stepId) || PREPROCESS_STEPS[0];
  if (step.needsData && !currentDatasetMeta) {
    activePreprocessStep = "load";
    viewStateStore.activePreprocessStepV1 = activePreprocessStep;
    datasetMessage("请先加载数据集，再查看后续流程。", true);
  } else {
    activePreprocessStep = step.id;
    viewStateStore.activePreprocessStepV1 = activePreprocessStep;
    if (step.needsData) markPreprocessProgress(step.id);
    datasetMessage("");
    if (step.needsData && !dataCache && !loadingDataView) {
      await loadDataView({ deferRender: true });
    }
  }
  renderPreprocessFlow();
  renderPreprocessRightPanel();
  await renderPreprocessCurrentStep();
}

async function renderPreprocessCurrentStep() {
  renderPreprocessFlow();
  if (activePreprocessStep === "load") {
    renderChartGridShell();
    if (currentDatasetMeta) {
      renderDataOverview();
    } else {
      renderDatasetEmptyState();
    }
    updatePreprocessLoadGuide();
    return;
  }
  if (!currentDatasetMeta) {
    activePreprocessStep = "load";
    renderPreprocessFlow();
    renderChartGridShell();
    renderDatasetEmptyState();
    updatePreprocessLoadGuide();
    return;
  }
  closePreprocessLoadGuide();
  if (activePreprocessStep !== "detail") closePreprocessDetailGuide();
  if (activePreprocessStep !== "raw_viz") closePreprocessRawVizGuide();
  if (activePreprocessStep !== "standardize") closePreprocessStandardizeGuide();
  if (activePreprocessStep !== "standard_viz") closePreprocessStandardVizGuide();
  if ((!dataCache || !dataCacheMatchesSelectedFeature()) && !loadingDataView) {
    await loadDataView({ deferRender: true });
  }
  if (!dataCache) return;
  if (activePreprocessStep === "detail") {
    renderChartGridShell();
    renderPreprocessDetailGrid();
    updatePreprocessDetailGuide();
    setTimeout(updatePreprocessDetailGuide, 120);
    return;
  }
  if (activePreprocessStep === "standardize") {
    renderChartGridShell();
    renderPreprocessStandardizeGrid();
    updatePreprocessStandardizeGuide();
    setTimeout(updatePreprocessStandardizeGuide, 120);
    return;
  }
  if (activePreprocessStep === "raw_viz") {
    renderChartGridShell();
    if ((!dataCache || !dataCacheMatchesSelectedFeature()) && !loadingDataView) {
      await loadDataView({ deferRender: true });
    }
    await renderDataCharts();
    updatePreprocessRawVizGuide();
    setTimeout(updatePreprocessRawVizGuide, 120);
    return;
  }
  if (activePreprocessStep === "standard_viz") {
    renderChartGridShell();
    if ((!dataCache || !dataCacheMatchesSelectedFeature()) && !loadingDataView) {
      await loadDataView({ deferRender: true });
    }
    await renderDataCharts();
    updatePreprocessStandardVizGuide();
    setTimeout(updatePreprocessStandardVizGuide, 120);
  }
}

function renderChartGridShell() {
  const content = $("preprocessContent");
  if (!content) return;
  content.innerHTML = `<div class="chart-grid" id="chartGrid"></div>`;
}

function setPreprocessSelectedViews(views, storageKey = "preprocessSelectedViewsV1") {
  document.querySelectorAll('input[name="dataViews"]').forEach(el => {
    el.checked = views.includes(el.value);
  });
  saveCheckedValues("dataViews", storageKey);
}

function bindDatasetLoader() {
  const source = $("datasetSource");
  const button = $("loadDatasetBtn");
  bindGuideControls();
  bindPreprocessLoadGuideRuntime();
  if (!source || !button) {
    updateCurrentGuide();
    return;
  }
  source.value = "boston_housing";
  source.addEventListener("change", () => {
    if (activePreprocessStep === "load" && guideEnabledForPreprocessLoad()) {
      setGuidePageState({ step: "load_dataset" });
      updatePreprocessLoadGuide();
    }
  });
  button.addEventListener("click", loadSelectedDataset);
  updateCurrentGuide();
}

function bindGuideControls() {
  const globalToggle = $("guideGlobalToggle");
  const pageToggle = $("guidePageToggle");
  if (globalToggle && globalToggle.dataset.bound !== "1") {
    globalToggle.dataset.bound = "1";
    globalToggle.addEventListener("change", () => {
      setGuideGlobalEnabled(globalToggle.checked);
      if (globalToggle.checked) {
        const state = guidePageState(currentGuidePageId());
        if (!state.enabled) resetCurrentGuideState(true);
      }
      refreshRightPanelGuideCard();
    });
  }
  if (pageToggle && pageToggle.dataset.bound !== "1") {
    pageToggle.dataset.bound = "1";
    pageToggle.addEventListener("change", () => {
      if (pageToggle.checked) {
        resetCurrentGuideState(true);
      } else {
        setGuidePageState({
          enabled: false,
          dismissed: true,
          completed: false,
          step: defaultGuideStepForPage(),
        }, currentGuidePageId());
      }
      updateCurrentGuide();
    });
  }
}

function refreshRightPanelGuideCard() {
  if (currentPage === "preprocess" && typeof renderPreprocessRightPanel === "function") {
    renderPreprocessRightPanel();
  } else if (currentPage === "train_eval" && typeof renderTrainStepPanel === "function") {
    $("rightPanel").innerHTML = renderTrainStepPanel();
    bindGuideControls();
    bindTrainStepPanel?.();
  } else if (currentPage === "evaluate" && typeof evaluatePanelHtml === "function") {
    $("rightPanel").innerHTML = evaluatePanelHtml();
    bindGuideControls();
    bindEvaluateCodeButtons?.();
  } else if (currentPage === "predict" && typeof renderPredictPanel === "function") {
    $("rightPanel").innerHTML = renderPredictPanel();
    bindGuideControls();
    bindPredictCodeButtons?.();
    syncPredictPanelWithTrainModel?.();
  }
  updateCurrentGuide();
}

function updateCurrentGuide() {
  if (currentPage === "preprocess" && activePreprocessStep === "load") {
    updatePreprocessLoadGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "detail") {
    updatePreprocessDetailGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "raw_viz") {
    updatePreprocessRawVizGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "standardize") {
    updatePreprocessStandardizeGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "standard_viz") {
    updatePreprocessStandardVizGuide();
  } else {
    closePreprocessLoadGuide();
  }
}

function bindPreprocessLoadGuideRuntime() {
  if (window.preprocessLoadGuideRuntimeBound) return;
  window.preprocessLoadGuideRuntimeBound = true;
  document.addEventListener("click", event => {
    if (!guideEnabledForPreprocessLoad() || currentPage !== "preprocess" || activePreprocessStep !== "load") return;
    const state = guidePageState();
    if (state.step === "test_button" && event.target.closest("[data-practice-test-open], [data-test-open]")) {
      setGuidePageState({ step: "test_modal" });
      setTimeout(updatePreprocessLoadGuide, 60);
      return;
    }
    if (state.step === "test_close" && event.target.closest("[data-test-close]")) {
      setGuidePageState({ step: "select_dataset" });
      setTimeout(updatePreprocessLoadGuide, 60);
      return;
    }
    if (state.step === "code_button" && event.target.closest("[data-preprocess-code=\"load\"]")) {
      setGuidePageState({ step: "code_drawer" });
      setTimeout(updatePreprocessLoadGuide, 80);
    }
  }, true);
}

function datasetMessage(text, isError = false) {
  const el = $("datasetLoadMessage");
  if (!el) return;
  el.classList.toggle("hidden", !text);
  el.classList.toggle("error", isError);
  el.textContent = text || "";
}

function setPreprocessStageReady(ready) {
  if ($("dataFeature")) $("dataFeature").disabled = !ready;
  document.querySelectorAll('input[name="dataViews"]').forEach(el => {
    el.disabled = !ready;
  });
  if (!ready) {
    if ($("sampleCount")) $("sampleCount").textContent = "--";
    if ($("featureCount")) $("featureCount").textContent = "--";
    if ($("datasetStatusText")) $("datasetStatusText").textContent = "未加载";
    if ($("datasetSampleText")) $("datasetSampleText").textContent = "--";
    if ($("dataModeSummary")) $("dataModeSummary").textContent = "请先加载数据集";
  }
}

function updateFeatureSelectOptions(selectId, features = [], selected = null) {
  const el = $(selectId);
  if (!el) return;
  if (!features.length) {
    el.innerHTML = "";
    el.disabled = true;
    return;
  }
  el.disabled = false;
  const next = selected && features.includes(selected) ? selected : features[0];
  el.innerHTML = features.map(feature => `<option value="${escapeHtml(feature)}"${feature === next ? " selected" : ""}>${escapeHtml(feature)}</option>`).join("");
}

function applyDatasetMeta(meta, options = {}) {
  if (!meta) return;
  currentDatasetMeta = meta;
  viewStateStore.currentDatasetMetaV1 = meta;
  updateFeatureSelectOptions("dataFeature", meta.features || FEATURE_NAMES, dataCache?.feature || meta.features?.[0]);
  updateFeatureSelectOptions("trainFeature", meta.features || FEATURE_NAMES, trainData?.feature || meta.features?.[0]);
  if ($("sampleCount")) $("sampleCount").textContent = meta.row_count ?? "--";
  if ($("featureCount")) $("featureCount").textContent = meta.features?.length ?? FEATURE_NAMES.length;
  if ($("datasetStatusText")) $("datasetStatusText").textContent = "已加载";
  if ($("datasetSampleText")) $("datasetSampleText").textContent = meta.row_count ?? "--";
  setPreprocessStageReady(true);
  renderPreprocessFlow();
  if (!options.silent) datasetMessage(`已加载：${meta.label || meta.dataset_id || "dataset"}`);
}

async function loadSelectedDataset() {
  const source = $("datasetSource")?.value || "boston_housing";
  try {
    const meta = await runAction("load_dataset", { source });
    meta.source = source;
    dataCache = null;
    trainData = null;
    predictData = null;
    applyDatasetMeta(meta);
    renderPreprocessRightPanel();
    renderPreprocessFlow();
    await renderPreprocessCurrentStep();
    if (activePreprocessStep === "load" && guideEnabledForPreprocessLoad()) {
      setGuidePageState({ step: "review_result" });
      updatePreprocessLoadGuide();
    }
  } catch (err) {
    datasetMessage(err.message, true);
    updatePreprocessLoadGuide();
  }
}

function persistDataFormState() {
  if ($("dataFeature")) {
    viewStateStore[preprocessFormStateKey()] = {
      feature: $("dataFeature").value,
      dataset_id: currentDatasetMeta?.dataset_id || "boston_housing",
    };
  }
}

function restoreDataFormState() {
  const state = viewStateStore[preprocessFormStateKey()] || {};
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  if ($("dataFeature") && state.feature && features.includes(state.feature)) {
    $("dataFeature").value = state.feature;
  } else if ($("dataFeature") && activePreprocessStep !== "raw_viz" && activePreprocessStep !== "standard_viz" && dataCache?.feature) {
    $("dataFeature").value = dataCache.feature;
  } else if ($("dataFeature")) {
    $("dataFeature").value = features[0] || DEFAULT_FEATURE;
  }
}

function restoreDataView() {
  restoreDataFormState();
  if ($("sampleCount")) $("sampleCount").textContent = dataCache?.raw?.summary?.sample_count ?? "--";
  if ($("featureCount")) $("featureCount").textContent = dataCache?.correlations?.length ?? FEATURE_NAMES.length;
  if (dataCache?.feature) $("topFeature").textContent = `褰撳墠鐗瑰緛 ${dataCache.feature}`;
  renderPreprocessCurrentStep();
}

async function loadDataView(options = {}) {
  if (!currentDatasetMeta) {
    renderPreprocessCurrentStep();
    return;
  }
  const feature = $("dataFeature")?.value || dataCache?.feature || currentDatasetMeta?.features?.[0] || DEFAULT_FEATURE;
  persistDataFormState();
  $("topFeature").textContent = `褰撳墠鐗瑰緛 ${feature}`;
  loadingDataView = true;
  try {
    dataCache = await runAction("data_view", {
      feature,
      dataset_id: currentDatasetMeta.dataset_id,
    });
    if ($("sampleCount")) $("sampleCount").textContent = dataCache.raw.summary.sample_count;
    if ($("featureCount")) $("featureCount").textContent = dataCache.correlations.length;
    if (!options.deferRender) await renderPreprocessCurrentStep();
  } catch (err) {
    renderError(err.message);
  } finally {
    loadingDataView = false;
    renderPreprocessFlow();
  }
}

function closePreprocessLoadGuide() {
  document.querySelector(".guide-backdrop")?.remove();
  document.querySelector(".guide-popover")?.remove();
  document.querySelector(".guide-focus-ring")?.remove();
  document.querySelectorAll(".guide-highlight").forEach(el => el.classList.remove("guide-highlight", "guide-highlight-large"));
  document.querySelectorAll(".guide-lift").forEach(el => el.classList.remove("guide-lift"));
}

function closePreprocessDetailGuide() {
  closePreprocessLoadGuide();
}

function closePreprocessRawVizGuide() {
  closePreprocessLoadGuide();
}

function closePreprocessStandardizeGuide() {
  closePreprocessLoadGuide();
}

function closePreprocessStandardVizGuide() {
  closePreprocessLoadGuide();
  document.querySelector(".guide-combo-target")?.remove();
}

function preprocessLoadGuideSpec() {
  const state = guidePageState();
  const step = state.step || "test_button";
  if (step === "test_modal") {
    return {
      step,
      target: ".test-modal",
      title: "先读题，不急着作答",
      body: "这里展示的是当前步骤的测试题。先看清楚题目问什么，暂时不用提交答案。接下来回到实验界面，完成加载和观察后再回来作答。",
      action: "我知道了",
    };
  }
  if (step === "test_close") {
    return {
      step,
      target: "[data-test-close]",
      title: "回到实验界面操作",
      body: "现在先关闭题目弹窗。关闭后不会丢失题目，你可以稍后再次点击“查看测试内容”回来作答。",
      action: "",
    };
  }
  if (step === "load_dataset") {
    return {
      step,
      target: "#loadDatasetBtn",
      title: "加载数据进入实验区",
      body: "点击“加载数据集”后，系统会读取这份原始数据。只有加载完成后，中间区域才会显示样本数量、特征数量、目标列和数据预览。",
      action: "",
    };
  }
  if (step === "review_result") {
    return {
      step,
      target: ".preprocess-loaded-card",
      title: "观察加载后的数据结果",
      body: "数据已经加载完成。请重点观察：样本数量是多少、特征数量是多少、目标列是不是 MEDV，以及表格中每一行代表一个房屋样本。",
      action: "下一步",
    };
  }
  if (step === "code_button") {
    return {
      step,
      target: "[data-preprocess-code=\"load\"]",
      title: "查看这一操作背后的代码",
      body: "现在请点击“查看本步骤代码”。接下来会看到这一操作背后的核心代码。",
      action: "",
    };
  }
  if (step === "code_drawer") {
    return {
      step,
      target: ".code-drawer",
      title: "查看这一操作背后的代码",
      body: "这里展示的是当前步骤的核心代码。重点看三件事：读取 CSV、拆分输入特征 X、确定目标值 y。这对应你刚才看到的数据加载结果。",
      action: "完成本页引导",
    };
  }
  if (step === "select_dataset") {
    return {
      step: "select_dataset",
      target: "#datasetSourceGuideTarget",
      title: "选择要加载的数据集",
      body: "这一步先确定实验使用哪份数据。推荐使用 Boston 原始数据集，它包含房价相关特征，目标列是后面要预测的 MEDV。",
      action: "已选择，下一步",
    };
  }
  return {
    step: "select_dataset",
    target: "[data-practice-test-open], [data-test-open]",
    title: "先看本步要解决的问题",
    body: "开始操作前，请点击右侧“查看测试内容”。你会看到这一小步需要回答的问题。带着问题去观察数据，后面的操作会更有目标。",
    action: "",
  };
}

function updatePreprocessLoadGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "load" || !guideEnabledForPreprocessLoad()) {
      closePreprocessLoadGuide();
      return;
    }
    const spec = preprocessLoadGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessLoadGuide();
      return;
    }
    renderPreprocessLoadGuide(spec, target);
  });
}

function renderPreprocessLoadGuide(spec, target) {
  closePreprocessLoadGuide();
  const visualTarget = guideVisualTarget(target);
  visualTarget.classList.add("guide-highlight");
  if (spec.step === "review_result") visualTarget.classList.add("guide-highlight-large");
  const useBackdrop = !["test_modal", "test_close", "code_drawer"].includes(spec.step);
  document.body.insertAdjacentHTML("beforeend", `
    ${useBackdrop ? `<div class="guide-backdrop" aria-hidden="true"></div>` : ""}
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="界面引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = ["review_result", "code_drawer"].includes(spec.step);
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 80);
  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      if (guidePageState().step === "code_drawer") closePreprocessCodeDrawer();
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "test_button" });
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessLoadGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "test_modal") {
      setGuidePageState({ step: "test_close" });
      updatePreprocessLoadGuide();
    } else if (step === "test_close") {
      document.querySelector("[data-test-close]")?.click();
      setGuidePageState({ step: "select_dataset" });
      setTimeout(updatePreprocessLoadGuide, 60);
    } else
    if (step === "select_dataset") {
      setGuidePageState({ step: "load_dataset" });
      updatePreprocessLoadGuide();
    } else if (step === "review_result") {
      setGuidePageState({ step: "code_button" });
      updatePreprocessLoadGuide();
    } else if (step === "code_drawer") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "test_button" });
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessCodeDrawer();
      closePreprocessLoadGuide();
    }
  });
}

function preprocessDetailGuideSpec() {
  const state = guidePageState(PREPROCESS_DETAIL_GUIDE_ID);
  const step = state.step || "detail_scale";
  if (step === "detail_stats") {
    return {
      step,
      target: ".preprocess-detail-stats-guide-target",
      title: "查看统计详情",
      body: "接下来观察数据质量和特征分布：缺失值、重复样本、数值型字段，以及每个特征的最小值、最大值、平均值和标准差。请特别注意不同特征的取值范围差异，这会引出后续的标准化处理。",
      action: "完成本步引导",
    };
  }
  return {
    step: "detail_scale",
    target: ".preprocess-detail-scale-guide-target",
    title: "了解数据规模",
    body: "先观察这份数据集的基本结构：样本数量、特征数量和目标列。再查看字段表，认识各字段名称及中文含义，明确哪些列是输入特征，哪一列是目标变量。本实验就是用 13 个特征预测房价指标 MEDV。",
    action: "下一步",
  };
}

function updatePreprocessDetailGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "detail" || !guideEnabledForPreprocessDetail()) {
      closePreprocessDetailGuide();
      return;
    }
    const spec = preprocessDetailGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessDetailGuide();
      return;
    }
    renderPreprocessDetailGuide(spec, target);
  });
}

function renderPreprocessDetailGuide(spec, target) {
  closePreprocessDetailGuide();
  const visualTarget = guideVisualTarget(target);
  if (spec.step === "detail_scale" || spec.step === "detail_stats") {
    scrollPreprocessDetailTargetIntoView(visualTarget, spec.step);
  }
  visualTarget.classList.add("guide-highlight", "guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="数据详情引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  positionGuideFocusRing(visualTarget, true);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    positionGuideFocusRing(visualTarget, true);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    positionGuideFocusRing(visualTarget, true);
    positionGuidePopover(visualTarget);
  }, 80);
  if (spec.step === "detail_scale" || spec.step === "detail_stats") {
    setTimeout(() => {
      positionGuideFocusRing(visualTarget, true);
      positionGuidePopover(visualTarget);
    }, 220);
  }
  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "detail_scale" }, PREPROCESS_DETAIL_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessDetailGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "detail_scale") {
      setGuidePageState({ step: "detail_stats" }, PREPROCESS_DETAIL_GUIDE_ID);
      updatePreprocessDetailGuide();
    } else if (step === "detail_stats") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "detail_scale" }, PREPROCESS_DETAIL_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessDetailGuide();
    }
  });
}

function scrollPreprocessDetailTargetIntoView(target, step) {
  if (!target) return;
  const block = step === "detail_scale" ? "start" : "center";
  target.scrollIntoView({ block, inline: "nearest", behavior: "auto" });
  const main = $("main");
  if (main && main.scrollHeight > main.clientHeight) {
    const rect = target.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    if (step === "detail_scale") {
      main.scrollTop += rect.top - mainRect.top - 24;
      return;
    }
    const targetBelowFold = rect.bottom > mainRect.bottom - 24;
    const targetAboveFold = rect.top < mainRect.top + 24;
    if (targetBelowFold || targetAboveFold) {
      main.scrollTop += rect.top - mainRect.top - 24;
    }
  }
}

function preprocessRawVizGuideSpec() {
  const state = guidePageState(PREPROCESS_RAW_VIZ_GUIDE_ID);
  const step = state.step || "raw_feature";
  if (step === "raw_scatter") {
    return {
      step,
      target: '[data-chart-card="raw"]',
      title: "观察原始散点图",
      body: "散点图中每个点代表一条房屋样本。横轴是当前选择的特征，纵轴是目标值 MEDV。请观察点云的大致方向和线性趋势线，判断该特征与房价之间是正相关、负相关，还是关系较弱。",
      action: "下一步",
    };
  }
  if (step === "raw_corr") {
    return {
      step,
      target: '[data-chart-card="all_corr"]',
      title: "比较全特征相关性",
      body: "这里展示所有输入特征与 MEDV 的线性相关系数。条形越长，说明线性关系越明显；方向表示正相关或负相关。请比较当前特征和其他特征，找出哪些特征更适合用于后续建模观察。",
      action: "完成本步引导",
    };
  }
  return {
    step: "raw_feature",
    target: "#dataFeature",
    title: "选择观察特征",
    body: "右侧下拉框决定当前要观察的输入特征。切换特征后，原始散点图会展示该特征与目标列 MEDV 的关系，全特征相关系数图也会对应突出当前特征。",
    action: "下一步",
  };
}

function updatePreprocessRawVizGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "raw_viz" || !guideEnabledForPreprocessRawViz()) {
      closePreprocessRawVizGuide();
      return;
    }
    const spec = preprocessRawVizGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessRawVizGuide();
      return;
    }
    renderPreprocessRawVizGuide(spec, target);
  });
}

function renderPreprocessRawVizGuide(spec, target) {
  closePreprocessRawVizGuide();
  const visualTarget = guideVisualTarget(target);
  if (spec.step !== "raw_feature") {
    visualTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  visualTarget.classList.add("guide-highlight");
  if (spec.step !== "raw_feature") visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="原始数据可视化引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step !== "raw_feature";
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 100);
  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "raw_feature" }, PREPROCESS_RAW_VIZ_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessRawVizGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "raw_feature") {
      setGuidePageState({ step: "raw_scatter" }, PREPROCESS_RAW_VIZ_GUIDE_ID);
      updatePreprocessRawVizGuide();
    } else if (step === "raw_scatter") {
      setGuidePageState({ step: "raw_corr" }, PREPROCESS_RAW_VIZ_GUIDE_ID);
      updatePreprocessRawVizGuide();
    } else if (step === "raw_corr") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "raw_feature" }, PREPROCESS_RAW_VIZ_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessRawVizGuide();
    }
  });
}

function preprocessStandardizeGuideSpec() {
  const state = guidePageState(PREPROCESS_STANDARDIZE_GUIDE_ID);
  const step = state.step || "standardize_feature";
  if (step === "standardize_formula") {
    return {
      step,
      target: ".preprocess-standardize-formula-guide-target",
      title: "理解标准化公式",
      body: "标准化使用 z = (x - μ) / σ。减去平均值 μ 可以让数据围绕 0，除以标准差 σ 可以把不同量纲的数据转换到更容易比较的尺度上。",
      action: "下一步",
    };
  }
  if (step === "standardize_preview") {
    return {
      step,
      target: ".preprocess-standardize-preview-guide-target",
      title: "观察标准化后数值",
      body: "这里展示当前特征和目标列标准化后的前 5 行。请观察原始大范围数值经过标准化后，会变成围绕 0 分布的新数值。",
      action: "下一步",
    };
  }
  if (step === "standardize_range") {
    return {
      step,
      target: ".preprocess-standardize-range-guide-target",
      title: "比较标准化范围",
      body: "这里对比标准化前后的最小值和最大值。请关注原始范围与标准化范围的变化，这说明标准化改变的是数值尺度，而不是样本之间的相对关系。",
      action: "完成本步引导",
    };
  }
  return {
    step: "standardize_feature",
    target: "#dataFeature",
    title: "选择标准化特征",
    body: "右侧下拉框决定当前观察哪个特征的标准化结果。切换特征后，中间的公式参数、标准化后前 5 行和范围对比都会随之更新。",
    action: "下一步",
  };
}

function updatePreprocessStandardizeGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "standardize" || !guideEnabledForPreprocessStandardize()) {
      closePreprocessStandardizeGuide();
      return;
    }
    const spec = preprocessStandardizeGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessStandardizeGuide();
      return;
    }
    renderPreprocessStandardizeGuide(spec, target);
  });
}

function renderPreprocessStandardizeGuide(spec, target) {
  closePreprocessStandardizeGuide();
  const visualTarget = guideVisualTarget(target);
  if (spec.step !== "standardize_feature") {
    scrollPreprocessStandardizeTargetIntoView(visualTarget, spec.step);
  }
  visualTarget.classList.add("guide-highlight");
  if (spec.step !== "standardize_feature") visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="数据标准化引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step !== "standardize_feature";
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
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
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "standardize_feature" }, PREPROCESS_STANDARDIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessStandardizeGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "standardize_feature") {
      setGuidePageState({ step: "standardize_formula" }, PREPROCESS_STANDARDIZE_GUIDE_ID);
      updatePreprocessStandardizeGuide();
    } else if (step === "standardize_formula") {
      setGuidePageState({ step: "standardize_preview" }, PREPROCESS_STANDARDIZE_GUIDE_ID);
      updatePreprocessStandardizeGuide();
    } else if (step === "standardize_preview") {
      setGuidePageState({ step: "standardize_range" }, PREPROCESS_STANDARDIZE_GUIDE_ID);
      updatePreprocessStandardizeGuide();
    } else if (step === "standardize_range") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "standardize_feature" }, PREPROCESS_STANDARDIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessStandardizeGuide();
    }
  });
}

function scrollPreprocessStandardizeTargetIntoView(target, step) {
  if (!target) return;
  const block = step === "standardize_formula" ? "start" : "center";
  target.scrollIntoView({ block, inline: "nearest", behavior: "auto" });
  const main = $("main");
  if (main && main.scrollHeight > main.clientHeight) {
    const rect = target.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    if (step === "standardize_formula") {
      main.scrollTop += rect.top - mainRect.top - 24;
      return;
    }
    const targetBelowFold = rect.bottom > mainRect.bottom - 24;
    const targetAboveFold = rect.top < mainRect.top + 24;
    if (targetBelowFold || targetAboveFold) {
      main.scrollTop += rect.top - mainRect.top - 24;
    }
  }
}

function preprocessStandardVizGuideSpec() {
  const state = guidePageState(PREPROCESS_STANDARD_VIZ_GUIDE_ID);
  const step = state.step || "standard_viz_feature";
  if (step === "standard_viz_scatter_compare") {
    return {
      step,
      target: ".guide-combo-target",
      title: "对比原始图和标准图",
      body: "请同时观察上方两个散点图。左侧是原始特征与原始 MEDV，右侧是标准化特征与标准化 MEDV。重点比较点云形状和趋势方向：标准化改变坐标尺度，但不改变样本之间的相对关系。",
      action: "下一步",
    };
  }
  if (step === "standard_viz_corr") {
    return {
      step,
      target: '[data-chart-card="all_corr"]',
      title: "观察相关系数是否变化",
      body: "下方展示所有特征与 MEDV 的线性相关系数。标准化只做平移和缩放，通常不会改变 Pearson 相关系数，因此特征相关性的方向和强弱应保持一致。",
      action: "完成本步引导",
    };
  }
  return {
    step: "standard_viz_feature",
    target: "#dataFeature",
    title: "选择观察特征",
    body: "右侧下拉框决定当前要比较的特征。切换特征后，原始散点图、标准散点图和相关系数图都会围绕该特征更新。",
    action: "下一步",
  };
}

function updatePreprocessStandardVizGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "standard_viz" || !guideEnabledForPreprocessStandardViz()) {
      closePreprocessStandardVizGuide();
      return;
    }
    const spec = preprocessStandardVizGuideSpec();
    const target = spec.step === "standard_viz_scatter_compare"
      ? createStandardVizScatterComboTarget()
      : document.querySelector(spec.target);
    if (!target) {
      closePreprocessStandardVizGuide();
      return;
    }
    renderPreprocessStandardVizGuide(spec, target);
  });
}

function renderPreprocessStandardVizGuide(spec, target) {
  closePreprocessStandardVizGuide();
  if (spec.step === "standard_viz_scatter_compare") {
    scrollStandardVizScatterCardsIntoView();
  }
  const visualTarget = spec.step === "standard_viz_scatter_compare"
    ? createStandardVizScatterComboTarget()
    : guideVisualTarget(target);
  if (!visualTarget) return;
  if (spec.step !== "standard_viz_feature") {
    visualTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  visualTarget.classList.add("guide-highlight");
  if (spec.step !== "standard_viz_feature") visualTarget.classList.add("guide-highlight-large");
  if (spec.step === "standard_viz_scatter_compare") {
    highlightStandardVizScatterCards();
  }
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="标准数据可视化引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step !== "standard_viz_feature";
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    if (spec.step === "standard_viz_scatter_compare") syncStandardVizScatterComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    if (spec.step === "standard_viz_scatter_compare") syncStandardVizScatterComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 120);
  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "standard_viz_feature" }, PREPROCESS_STANDARD_VIZ_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessStandardVizGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "standard_viz_feature") {
      setGuidePageState({ step: "standard_viz_scatter_compare" }, PREPROCESS_STANDARD_VIZ_GUIDE_ID);
      updatePreprocessStandardVizGuide();
    } else if (step === "standard_viz_scatter_compare") {
      setGuidePageState({ step: "standard_viz_corr" }, PREPROCESS_STANDARD_VIZ_GUIDE_ID);
      updatePreprocessStandardVizGuide();
    } else if (step === "standard_viz_corr") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "standard_viz_feature" }, PREPROCESS_STANDARD_VIZ_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessStandardVizGuide();
    }
  });
}

function createStandardVizScatterComboTarget() {
  const raw = document.querySelector('[data-chart-card="raw"]');
  const standardized = document.querySelector('[data-chart-card="standardized"]');
  if (!raw || !standardized) return null;
  let target = document.querySelector(".guide-combo-target");
  if (!target) {
    target = document.createElement("div");
    target.className = "guide-combo-target";
    document.body.appendChild(target);
  }
  syncStandardVizScatterComboTarget(target);
  return target;
}

function highlightStandardVizScatterCards() {
  ["raw", "standardized"].forEach(view => {
    const card = document.querySelector(`[data-chart-card="${view}"]`);
    const item = card?.closest(".grid-stack-item");
    item?.classList.add("guide-lift");
    card?.classList.add("guide-highlight", "guide-highlight-large");
  });
}

function scrollStandardVizScatterCardsIntoView() {
  const raw = document.querySelector('[data-chart-card="raw"]');
  const standardized = document.querySelector('[data-chart-card="standardized"]');
  const main = $("main");
  if (!raw || !standardized || !main) return;
  const rawRect = raw.getBoundingClientRect();
  const stdRect = standardized.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const top = Math.min(rawRect.top, stdRect.top);
  const bottom = Math.max(rawRect.bottom, stdRect.bottom);
  const targetHeight = bottom - top;
  const padding = 24;
  const availableHeight = mainRect.height - padding * 2;
  const targetTop = targetHeight <= availableHeight
    ? mainRect.top + (availableHeight - targetHeight) / 2 + padding
    : mainRect.top + padding;
  main.scrollTop += top - targetTop;
}

function syncStandardVizScatterComboTarget(target) {
  const raw = document.querySelector('[data-chart-card="raw"]');
  const standardized = document.querySelector('[data-chart-card="standardized"]');
  if (!target || !raw || !standardized) return;
  const rawRect = raw.getBoundingClientRect();
  const stdRect = standardized.getBoundingClientRect();
  const left = Math.min(rawRect.left, stdRect.left);
  const top = Math.min(rawRect.top, stdRect.top);
  const right = Math.max(rawRect.right, stdRect.right);
  const bottom = Math.max(rawRect.bottom, stdRect.bottom);
  target.style.position = "fixed";
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  target.style.width = `${right - left}px`;
  target.style.height = `${bottom - top}px`;
  target.style.pointerEvents = "none";
  target.style.borderRadius = "14px";
}

function guideVisualTarget(target) {
  return target?.querySelector?.("select") || target;
}

function positionGuideFocusRing(target, isLarge = false) {
  const ring = document.querySelector(".guide-focus-ring");
  if (!ring || !target) return;
  ring.classList.toggle("is-large", isLarge);
  const rect = target.getBoundingClientRect();
  const pad = isLarge ? 3 : 8;
  ring.style.left = `${rect.left - pad}px`;
  ring.style.top = `${rect.top - pad}px`;
  ring.style.width = `${rect.width + pad * 2}px`;
  ring.style.height = `${rect.height + pad * 2}px`;
  ring.style.borderRadius = `${Math.max(14, Math.min(22, rect.height / 2))}px`;
}

function positionGuidePopover(target) {
  const popover = document.querySelector(".guide-popover");
  if (!popover || !target) return;
  const rect = target.getBoundingClientRect();
  const width = Math.min(330, window.innerWidth - 32);
  popover.style.width = `${width}px`;
  const preferLeft = rect.left > window.innerWidth * 0.55;
  let left = preferLeft ? rect.left - width - 18 : rect.right + 18;
  if (left < 16) left = 16;
  if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
  let top = rect.top + Math.min(24, Math.max(0, rect.height / 2 - 24));
  const maxTop = window.innerHeight - popover.offsetHeight - 16;
  if (top > maxTop) top = Math.max(16, maxTop);
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(16, top)}px`;
}

async function renderDataCharts() {
  if (!dataCache) return;
  destroyDataGrid();
  disposeCharts();
  const fixedViews = activePreprocessStep === "raw_viz"
    ? rawVizSelectedViews()
    : (activePreprocessStep === "standard_viz" ? standardVizSelectedViews() : []);
  await experimentRefreshCharts({
    viewName: "dataViews",
    storageKey: preprocessDataViewsStorageKey(),
    summaryId: "dataModeSummary",
    contextId: dataCache?.context_id,
    page: "preprocess",
    state: {},
    fallbackViews: fixedViews,
    label: "preprocess chart_data",
    beforeRender: ({ grid }) => {
      grid.classList.remove("dashboard-grid", "grid-stack");
    },
    onChartData: chartData => {
      dataChartDataCache = chartData;
    },
    renderDashboard: ({ grid, views }) => {
      renderDataDashboard(grid, views);
    },
    renderFallback: ({ grid, views }) => {
      grid.innerHTML = views.map(view => chartCardHtml(view, chartTitle(view), chartSub(view, dataCache), dataCardSize(view))).join("");
    },
    renderCharts: ({ views }) => {
      views.forEach(view => {
        const ch = initChart(`chart_${view}`);
        const option = preprocessChartOption(preprocessChartMeta(view), dataChartDataCache[view]);
        if (option) ch.setOption(option, true);
      });
    },
  });
  if ((activePreprocessStep === "raw_viz" || activePreprocessStep === "standard_viz") && $("dataModeSummary")) {
    const count = selectedValues("dataViews").length;
    $("dataModeSummary").textContent = count ? `已选择 ${count} 个模块` : "请选择显示模块";
  }
  if (activePreprocessStep === "raw_viz") {
    updatePreprocessRawVizGuide();
  } else if (activePreprocessStep === "standard_viz") {
    updatePreprocessStandardVizGuide();
  }
}

function renderDataOverview() {
  const grid = $("chartGrid");
  if (!grid) return;
  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["loaded_dataset"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 2 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("loaded_dataset", layout),
    htmlForView: () => preprocessLoadedDatasetHtml(),
    minWidthForView: () => 2,
    minHeightForView: () => 1,
  });
}

function metricBlockHtml(items, extraClass = "") {
  return `<div class="preprocess-metrics ${escapeHtml(extraClass)}">${items.map(item => `
    <div class="preprocess-metric">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>`).join("")}</div>`;
}

function summaryRowsHtml(rows = []) {
  if (!rows.length) return `<div class="empty-state">暂无统计摘要。</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>特征</th><th>最小值</th><th>最大值</th><th>平均值</th><th>标准差</th></tr></thead><tbody>${rows.map(row => `
    <tr>
      <td>${escapeHtml(row.feature)}</td>
      <td>${num(row.min, 4)}</td>
      <td>${num(row.max, 4)}</td>
      <td>${num(row.mean, 4)}</td>
      <td>${num(row.std, 4)}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function dataDictionaryHtml(rows = []) {
  if (!rows.length) return `<div class="empty-state">暂无字段说明。</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>字段</th><th>角色</th><th>中文意义</th></tr></thead><tbody>${rows.map(row => `
    <tr>
      <td>${escapeHtml(row.field)}</td>
      <td>${escapeHtml(row.role)}</td>
      <td>${escapeHtml(row.meaning || "")}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function fallbackDataDictionaryRows(features = [], target = "MEDV") {
  const rows = (features || []).map(feature => ({
    field: feature,
    role: "特征",
    meaning: BOSTON_FIELD_MEANINGS[feature] || "",
  }));
  if (target) {
    rows.push({
      field: target,
      role: "目标",
      meaning: BOSTON_FIELD_MEANINGS[target] || "预测目标",
    });
  }
  return rows;
}

function renderPreprocessDetailGrid() {
  const grid = $("chartGrid");
  if (!grid) return;
  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["detail_overview"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 4 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("detail_overview", layout),
    htmlForView: view => preprocessDetailCardHtml(view),
    minWidthForView: () => 2,
    minHeightForView: () => 2,
  });
}

function preprocessInfoCardHtml(title, body, extraClass = "") {
  return `<section class="chart-card wide preprocess-info-card ${escapeHtml(extraClass)}">
    <div class="chart-head"><div><div class="chart-title">${escapeHtml(title)}</div></div></div>
    <div class="info-card-body preprocess-step-body">${body}</div>
  </section>`;
}

function preprocessDetailCardHtml(view) {
  const meta = currentDatasetMeta || {};
  const quality = dataCache?.data_quality || {};
  const features = dataCache?.features || meta.features || [];
  if (view === "detail_overview") {
    return `<section class="chart-card wide preprocess-info-card standardize-overview-card">
      <div class="chart-head" aria-label="拖动卡片"></div>
      <div class="info-card-body preprocess-step-body standardize-overview-body">
        ${preprocessDetailCardHtml("detail_scale")}
        ${preprocessDetailCardHtml("detail_stats")}
      </div>
    </section>`;
  }
  if (view === "detail_scale") {
    return preprocessInfoCardHtml("数据规模", `
      ${metricBlockHtml([
        { label: "样本数量", value: meta.row_count ?? dataCache?.raw?.summary?.sample_count ?? "--" },
        { label: "特征数量", value: features.length || "--" },
        { label: "目标列", value: dataCache?.target || meta.target || "--" },
      ], "metrics-three")}
      ${dataDictionaryHtml(dataCache?.data_dictionary?.length ? dataCache.data_dictionary : fallbackDataDictionaryRows(features, dataCache?.target || meta.target))}
    `, "preprocess-detail-scale-guide-target");
  }
  if (view === "detail_stats") {
    return preprocessInfoCardHtml("统计详情", `
      ${metricBlockHtml([
        { label: "缺失值数量", value: quality.missing_count ?? 0 },
        { label: "重复样本数量", value: quality.duplicate_count ?? 0 },
        { label: "数值型列数量", value: quality.numeric_column_count ?? "--" },
        { label: "非数值型列数量", value: quality.non_numeric_column_count ?? "--" },
      ])}
      ${summaryRowsHtml(dataCache?.statistical_summary || [])}
    `, "preprocess-detail-stats-guide-target");
  }
  if (view === "detail_quality") {
    return preprocessInfoCardHtml("数据质量", metricBlockHtml([
      { label: "缺失值数量", value: quality.missing_count ?? 0 },
      { label: "重复样本数量", value: quality.duplicate_count ?? 0 },
      { label: "数值型列数量", value: quality.numeric_column_count ?? "--" },
      { label: "非数值型列数量", value: quality.non_numeric_column_count ?? "--" },
    ]));
  }
  return preprocessInfoCardHtml("统计摘要", summaryRowsHtml(dataCache?.statistical_summary || []));
}

function preprocessLoadedDatasetHtml() {
  const meta = currentDatasetMeta || {};
  return `<section class="chart-card wide preprocess-info-card preprocess-loaded-card">
    <div class="chart-head">
      <div>
        <div class="chart-title">原始数据集已加载</div>
        <div class="chart-sub">继续点击上方实验流程查看数据详情、标准化过程和可视化结果。</div>
      </div>
    </div>
    <div class="info-card-body preprocess-step-body">
      ${metricBlockHtml([
        { label: "样本数量", value: meta.row_count ?? "--" },
        { label: "特征数量", value: meta.features?.length ?? "--" },
        { label: "目标列", value: meta.target || "--" },
        { label: "数据来源", value: meta.label || meta.dataset_id || "--" },
      ])}
      <p class="teaching-note">数据预处理的第一步是明确数据集是否已经进入实验环境。加载完成后，后面的统计、标准化和图表都会围绕这份数据展开。</p>
      ${previewTableHtml(meta.preview || [], meta.preview_columns || null)}
    </div>
  </section>`;
}

function preprocessDetailHtml() {
  const meta = currentDatasetMeta || {};
  const quality = dataCache?.data_quality || {};
  const features = dataCache?.features || meta.features || [];
  return `<div class="preprocess-step-stack">
    <section class="content-card preprocess-lesson">
      <h2>第一类：数据规模</h2>
      <p>显示：</p>
      ${metricBlockHtml([
        { label: "样本数量", value: meta.row_count ?? dataCache?.raw?.summary?.sample_count ?? "--" },
        { label: "特征数量", value: features.length || "--" },
        { label: "目标列", value: dataCache?.target || meta.target || "--" },
        { label: "当前特征列", value: features.join("、") || "--" },
      ])}
      <div class="teaching-note">让学生知道模型有多少条样本、多少个输入特征，预测目标是哪一列。</div>
    </section>
    <section class="content-card preprocess-lesson">
      <h2>第二类：数据质量</h2>
      <p>显示：</p>
      ${metricBlockHtml([
        { label: "缺失值数量", value: quality.missing_count ?? 0 },
        { label: "重复样本数量", value: quality.duplicate_count ?? 0 },
        { label: "数值型列数量", value: quality.numeric_column_count ?? "--" },
        { label: "非数值型列数量", value: quality.non_numeric_column_count ?? "--" },
      ])}
      <div class="teaching-note">训练模型前要检查数据是否能直接使用。如果有缺失值，需要先处理，否则模型可能无法训练。</div>
    </section>
    <section class="content-card preprocess-lesson">
      <h2>第三类：统计摘要</h2>
      <p>这里显示每个特征的最小值、最大值、平均值和标准差。</p>
      ${summaryRowsHtml(dataCache?.statistical_summary || [])}
    </section>
  </div>`;
}

function preprocessStandardizeHtml() {
  const feature = dataCache?.feature || $("dataFeature")?.value || "";
  const row = (dataCache?.standardize_table || []).find(item => item.feature === feature);
  return `<div class="preprocess-step-stack">
    <section class="content-card preprocess-lesson">
      <h2>数据标准化</h2>
      <p>标准化把不同量纲的特征转换到更容易比较和训练的尺度上。</p>
      ${standardizeFormulaHtml(feature, row)}
      <div class="teaching-note">标准化后，特征均值会接近 0，标准差会接近 1。后续训练可以选择使用标准化特征。</div>
    </section>
    <section class="content-card preprocess-lesson">
      <h2>标准化后前 5 行</h2>
      <p>直接观察原始特征与标准化特征的数值变化。</p>
      ${previewTableHtml(dataCache?.standardized_preview || [])}
    </section>
    <section class="content-card preprocess-lesson">
      <h2>标准化范围对比</h2>
      ${standardizeTableHtml(row ? [row] : dataCache?.standardize_table || [])}
    </section>
  </div>`;
}

function standardizeFormulaHtml(feature, row) {
  return `<div class="math-formula" aria-label="z-score 标准化公式">
    <div class="math-main">
      <span class="math-symbol">z</span>
      <span class="math-equals">=</span>
      <span class="math-fraction">
        <span class="math-numerator">x - μ</span>
        <span class="math-denominator">σ</span>
      </span>
    </div>
    <div class="math-caption">其中，x 为原始特征值，μ 为该特征的平均值，σ 为该特征的标准差。</div>
    <div class="math-values">
      <div><span>当前特征</span><strong>${escapeHtml(feature || "--")}</strong></div>
      <div><span>μ</span><strong>${row ? num(row.mean, 6) : "--"}</strong></div>
      <div><span>σ</span><strong>${row ? num(row.std, 6) : "--"}</strong></div>
    </div>
  </div>`;
}

function renderPreprocessStandardizeGrid() {
  const grid = $("chartGrid");
  if (!grid) return;
  const feature = dataCache?.feature || $("dataFeature")?.value || "";
  const row = (dataCache?.standardize_table || []).find(item => item.feature === feature);
  const views = ["standardize_overview"];
  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views,
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 4 }),
    normalizeLayout: (view, layout) => normalizeDataGridLayout(view, layout),
    htmlForView: () => preprocessStandardizeCardHtml("overview", feature, row),
    minWidthForView: () => 2,
    minHeightForView: () => 2,
  });
}

function preprocessStandardizeCardHtml(kind, feature, row) {
  if (kind === "overview") {
    return `<section class="chart-card wide preprocess-info-card standardize-overview-card">
      <div class="chart-head" aria-label="拖动卡片"></div>
      <div class="info-card-body preprocess-step-body standardize-overview-body">
        ${preprocessStandardizeSectionHtml("formula", feature, row)}
        ${preprocessStandardizeSectionHtml("preview", feature, row)}
        ${preprocessStandardizeSectionHtml("range", feature, row)}
      </div>
    </section>`;
  }
  return preprocessStandardizeSectionHtml(kind, feature, row);
}

function preprocessStandardizeSectionHtml(kind, feature, row) {
  if (kind === "formula") {
    return `<section class="content-card preprocess-lesson preprocess-standardize-formula-guide-target">
        <h2>数据标准化</h2>
        <p>标准化把不同量纲的特征转换到更容易比较和训练的尺度上。</p>
        ${standardizeFormulaHtml(feature, row)}
        <div class="teaching-note">标准化后，特征均值会接近 0，标准差会接近 1。后续训练可以选择使用标准化特征。</div>
      </section>`;
  }
  if (kind === "preview") {
    return `<section class="content-card preprocess-lesson preprocess-standardize-preview-guide-target">
        <h2>标准化后前 5 行</h2>
        <p>直接观察原始特征与标准化特征的数值变化。</p>
        ${previewTableHtml(dataCache?.standardized_preview || [])}
      </section>`;
  }
  return `<section class="content-card preprocess-lesson preprocess-standardize-range-guide-target">
      <h2>标准化范围对比</h2>
      ${standardizeTableHtml(row ? [row] : dataCache?.standardize_table || [])}
    </section>`;
}

function renderDatasetEmptyState() {
  const grid = $("chartGrid");
  if (!grid) return;
  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["load_hint"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 2 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("load_hint", layout),
    htmlForView: () => preprocessLoadHintCardHtml(),
    minWidthForView: () => 2,
  });
  return;
  destroyDataGrid();
  disposeCharts();
  grid.classList.remove("dashboard-grid", "grid-stack");
  grid.innerHTML = preprocessLoadHintCardHtml();
  return;
  grid.innerHTML = `<div class="empty-state">请先在右侧加载数据集。</div>`;
}

function renderRawVizPrompt() {
  const grid = $("chartGrid");
  if (!grid) return;
  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["raw_viz_hint"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 2 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("raw_viz_hint", layout),
    htmlForView: () => `<section class="chart-card wide load-dataset-card">
      <div class="chart-head" aria-label="拖动提示卡片"></div>
      <div class="load-dataset-hint">请在右侧选择特征和显示模块</div>
    </section>`,
    minWidthForView: () => 2,
  });
}

function preprocessLoadHintCardHtml() {
  return `<section class="chart-card wide load-dataset-card">
    <div class="chart-head" aria-label="拖动提示卡片"></div>
    <div class="load-dataset-hint">请先从右侧加载数据集</div>
  </section>`;
}

function preprocessFormatCardHtml() {
  const rawRows = [
    { area: 80, rooms: 2, price: 120 },
    { area: 100, rooms: 3, price: 160 },
    { area: 120, rooms: 3, price: 180 },
  ];
  const bostonRows = [
    { CRIM: 0.00632, RM: 6.575, LSTAT: 4.98, MEDV: 24.0 },
    { CRIM: 0.02731, RM: 6.421, LSTAT: 9.14, MEDV: 21.6 },
    { CRIM: 0.02729, RM: 7.185, LSTAT: 4.03, MEDV: 34.7 },
  ];
  return `<section class="chart-card wide">
    <div class="chart-head">
      <div>
        <div class="chart-title">数据格式</div>
        <div class="chart-sub">请先在右侧加载数据集，加载成功后再选择特征并执行预处理查看。</div>
      </div>
    </div>
    <div class="info-card-body" style="padding:18px">
      <div class="format-intro">
        <p><strong>规则：</strong>系统把最后一列作为目标列 y，其余数值列作为候选特征 x。预处理阶段会按所选特征生成标准化视图，并用于后续训练。</p>
        <p>内置 Boston 会作为原始数据集加载；上传 CSV 需要第一行是列名，至少包含 1 个数值特征列和 1 个数值目标列。</p>
      </div>
      <div class="format-grid">
        <div class="format-column">
          <div class="format-point"><strong>通用 CSV 示例</strong>目标列放在最后，例如 <code>area</code>、<code>rooms</code>、<code>price</code>。</div>
          <p class="sample-caption">原始 CSV 示例</p>
          ${previewTableHtml(rawRows)}
        </div>
        <div class="format-column">
          <div class="format-point"><strong>Boston 原始数据集</strong>目标列为 <code>MEDV</code>，其余数值列可作为特征。</div>
          <p class="sample-caption">Boston 示例</p>
          ${previewTableHtml(bostonRows)}
        </div>
      </div>
      <div class="format-upload-hint">请先在右侧 01 数据集 中加载数据集。</div>
    </div>
  </section>`;
}

function renderDataDashboard(grid, views) {
  dataGridMode = activePreprocessStep === "standard_viz" ? "preprocess_standard_viz" : "preprocess";
  grid.classList.add("dashboard-grid", "grid-stack");
  grid.classList.remove("single");
  const saved = activePreprocessStep === "standard_viz" ? loadStandardVizGridLayout() : loadDataGridLayout();
  grid.innerHTML = views.map(view => dataGridItemHtml(view, normalizeDataGridLayout(view, saved[view] || defaultDataGridLayout(view, views.length)))).join("");
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
  dataGrid.compact();
  dataGrid.on("change dragstop resizestop", () => {
    syncDataGridAttributes();
    saveDataGridLayout();
    requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  });
  syncDataGridAttributes();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
}

function loadStandardVizGridLayout() {
  try {
    return viewStateStore.preprocessStandardVizGridLayoutV1 || {};
  } catch (_err) {
    return {};
  }
}

function defaultDataGridLayout(view, viewCount = 2) {
  if (activePreprocessStep === "standard_viz") {
    return ({
      raw: { x: 0, y: 0, w: 2, h: 2 },
      standardized: { x: 2, y: 0, w: 2, h: 2 },
      all_corr: { x: 0, y: 2, w: 2, h: 2 },
    })[view] || { x: 0, y: 0, w: 2, h: 2 };
  }
  return ({
    load_hint: { x: 0, y: 0, w: 4, h: 1 },
    raw: { x: 0, y: 0, w: 2, h: 2 },
    standardized: { x: 2, y: 0, w: 2, h: 2 },
    single_corr: { x: 0, y: 2, w: 2, h: 2 },
    all_corr: { x: 2, y: 2, w: 2, h: 2 }
  })[view] || { x: 0, y: 0, w: 2, h: 2 };
}

function dataGridMinWidth(view) {
  return 1;
}

function normalizeDataGridLayout(view, layout) {
  const minW = dataGridMinWidth(view);
  const next = { ...defaultDataGridLayout(view), ...layout };
  next.w = Math.max(minW, Math.min(4, Number(next.w) || minW));
  next.h = Math.max(1, Number(next.h) || 1);
  next.x = Math.max(0, Math.min(4 - next.w, Number(next.x) || 0));
  next.y = Math.max(0, Number(next.y) || 0);
  return next;
}

function dataGridItemHtml(view, layout) {
  const minW = dataGridMinWidth(view);
  return `<div class="grid-stack-item" data-view="${view}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="${minW}" gs-min-h="1"><div class="grid-stack-item-content">${chartCardHtml(view, chartTitle(view), chartSub(view, dataCache), dataCardSize(view))}</div></div>`;
}

function preprocessChartOption(meta, chartData = null) {
  if (!meta) return null;
  if (meta.renderer === "scatter_trend") {
    const data = chartData || (() => {
      const fallback = meta.id === "standardized" ? dataCache.standardized : dataCache.raw;
      return {
      scatter: fallback.scatter,
      trend_line: fallback.trend_line,
      x_name: meta.id === "standardized" ? dataCache.standardized.feature_name : dataCache.feature,
      y_name: meta.id === "standardized" ? `${dataCache.target || "MEDV"}_std` : (dataCache.target || "MEDV"),
      };
    })();
    return scatterOption(data.scatter, data.trend_line, data.x_name, meta.title, data.y_name);
  }
  if (meta.renderer === "single_corr") {
    const data = chartData || {
      feature: dataCache.feature,
      corr: dataCache.raw.summary.corr,
    };
    return singleCorrOptionFromData(data);
  }
  if (meta.renderer === "all_corr") {
    const data = chartData || {
      rows: dataCache.correlations,
      current_feature: dataCache.feature,
    };
    return allCorrOption(data.rows, data.current_feature);
  }
  return null;
}

function visualizationPanelHtml({ title }) {
  const datasetLoaded = Boolean(currentDatasetMeta);
  const featureOptions = datasetLoaded ? (currentDatasetMeta?.features || []) : [];
  const selectedFeature = preprocessSelectedFeatureFallback(featureOptions);
  const featureOptionsHtml = featureOptions
    .map(opt => optionHtml(opt, selectedFeature, opt))
    .join("");
  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="control-group" aria-label="特征选择">
        <label class="control-label" for="dataFeature">特征选择</label>
        <select id="dataFeature" ${datasetLoaded ? "" : "disabled"}>${featureOptionsHtml}</select>
      </div>
      ${preprocessCodeButtonHtml(activePreprocessStep)}
    </div>`;
}

function renderRawDataVizPanel() {
  return visualizationPanelHtml({
    title: "原始数据可视化",
  });
}

function renderStandardDataVizPanel() {
  return visualizationPanelHtml({
    title: "标准数据可视化",
  });
}

function preprocessCodeButtonHtml(stepId) {
  return `<button class="secondary-btn code-toggle-btn" type="button" data-preprocess-code="${escapeHtml(stepId || "load")}">查看本步骤代码</button>`;
}

function preprocessCurrentFeature() {
  return $("dataFeature")?.value
    || dataCache?.feature
    || preprocessSavedFeature()
    || currentDatasetMeta?.features?.[0]
    || DEFAULT_FEATURE;
}

function preprocessCurrentTarget() {
  return dataCache?.target || currentDatasetMeta?.target || "MEDV";
}

function preprocessStandardizeRow(feature) {
  return (dataCache?.standardize_table || []).find(item => item.feature === feature) || null;
}

function preprocessCodeSpec(stepId) {
  const feature = preprocessCurrentFeature();
  const target = preprocessCurrentTarget();
  const row = preprocessStandardizeRow(feature);
  const targetRow = preprocessStandardizeRow(target);
  const featureMean = row ? num(row.mean, 6) : "feature_mean";
  const featureStd = row ? num(row.std, 6) : "feature_std";
  const targetMean = targetRow ? num(targetRow.mean, 6) : "target_mean";
  const targetStd = targetRow ? num(targetRow.std, 6) : "target_std";

  const specs = {
    load: {
      title: "加载原始数据",
      operation: "读取数据并拆分输入特征 X 与目标 y",
      code: [
        "import pandas as pd",
        "",
        "data = pd.read_csv(\"datasets/raw/boston_housing.csv\")",
        "",
        "X = data.iloc[:, :-1]",
        "y = data.iloc[:, -1]",
        `target_name = "${target}"`,
      ].join("\n"),
      notes: [
        "读取 CSV 后保留第一行列名。",
        "除最后一列外，其余列作为输入特征 X。",
        `当前实验把 ${target} 作为目标值 y。`,
      ],
    },
    detail: {
      title: "数据详情统计",
      operation: "计算页面中的数据规模、质量与统计摘要",
      code: [
        "sample_count = len(data)",
        "feature_count = X.shape[1]",
        "missing_count = data.isnull().sum().sum()",
        "duplicate_count = data.duplicated().sum()",
        "",
        "summary = data.describe()",
      ].join("\n"),
      notes: [
        "sample_count 对应样本数量。",
        "feature_count 对应输入特征数量。",
        "missing_count 与 duplicate_count 对应数据质量指标。",
        "describe() 生成最小值、最大值、平均值和标准差等统计量。",
      ],
    },
    raw_viz: {
      title: "原始数据可视化",
      operation: "从原始数据中取出当前特征并绘制散点图",
      code: [
        `feature = "${feature}"`,
        `target = "${target}"`,
        "",
        "x = data[feature]",
        "y = data[target]",
        "",
        "plt.scatter(x, y)",
        "plt.xlabel(feature)",
        "plt.ylabel(target)",
      ].join("\n"),
      notes: [
        `当前横轴特征是 ${feature}。`,
        `纵轴目标值是 ${target}。`,
        "这里展示的是取数和绘图逻辑，不展示前端图表配置。",
      ],
    },
    standardize: {
      title: "数据标准化",
      operation: "对特征列和目标列一起做 z-score 标准化",
      code: [
        "columns = feature_columns + [target_column]",
        "scaled_data = data.copy()",
        "",
        "for column in columns:",
        "    mean = data[column].mean()",
        "    std = data[column].std(ddof=0)",
        "    scaled_data[column] = (data[column] - mean) / std",
        "",
        `# 当前特征 ${feature}`,
        `${feature}_scaled = (data["${feature}"] - ${featureMean}) / ${featureStd}`,
        `# 当前目标 ${target}`,
        `${target}_scaled = (data["${target}"] - ${targetMean}) / ${targetStd}`,
      ].join("\n"),
      notes: [
        "本实验会同时标准化输入特征和目标列。",
        "mean 是当前列的平均值，std 是当前列的标准差。",
        "标准化后，不同量纲的数据会进入相近的数值范围。",
      ],
    },
    standard_viz: {
      title: "标准数据可视化",
      operation: "使用标准化后的特征和目标绘制散点图",
      code: [
        `feature = "${feature}"`,
        `target = "${target}"`,
        "",
        "x_scaled = scaled_data[feature]",
        "y_scaled = scaled_data[target]",
        "",
        "plt.scatter(x_scaled, y_scaled)",
        "plt.xlabel(feature + \" standardized\")",
        "plt.ylabel(target + \" standardized\")",
      ].join("\n"),
      notes: [
        `横轴是标准化后的 ${feature}。`,
        `纵轴是标准化后的 ${target}。`,
        "和原始散点图相比，点的相对关系不变，但坐标尺度变了。",
      ],
    },
  };
  return specs[stepId] || specs.load;
}

function preprocessCodeDrawerHtml(spec) {
  const notes = spec.notes.map((note, index) => `<li>${index + 1}. ${escapeHtml(note)}</li>`).join("");
  return `
    <div class="code-drawer-backdrop">
      <aside class="code-drawer" role="dialog" aria-modal="true" aria-label="当前步骤代码">
        <div class="code-drawer-head">
          <div>
            <div class="code-kicker">当前步骤代码</div>
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

function openPreprocessCodeDrawer(stepId) {
  closePreprocessCodeDrawer();
  document.body.insertAdjacentHTML("beforeend", preprocessCodeDrawerHtml(preprocessCodeSpec(stepId)));
  if (stepId === "load" && guideEnabledForPreprocessLoad() && guidePageState().step === "code_drawer") {
    setTimeout(updatePreprocessLoadGuide, 60);
  }
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closePreprocessCodeDrawer();
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

function closePreprocessCodeDrawer() {
  document.querySelector(".code-drawer-backdrop")?.remove();
}

function bindPreprocessCodeButtons() {
  if (window.preprocessCodeButtonsBound) return;
  window.preprocessCodeButtonsBound = true;
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-preprocess-code]");
    if (!button) return;
    openPreprocessCodeDrawer(button.dataset.preprocessCode || activePreprocessStep);
  });
}

function renderPreprocessRightPanel() {
  if (activePreprocessStep === "raw_viz") {
    $("rightPanel").innerHTML = renderRawDataVizPanel();
  } else if (activePreprocessStep === "standard_viz") {
    $("rightPanel").innerHTML = renderStandardDataVizPanel();
  } else if (activePreprocessStep === "standardize") {
    $("rightPanel").innerHTML = renderStandardizePanel();
  } else if (activePreprocessStep === "load") {
    $("rightPanel").innerHTML = renderPreprocessLoadPanel();
  } else {
    $("rightPanel").innerHTML = `
      <div class="right-title">控制面板</div>
      ${guideSwitchPanelHtml()}
      <div class="control-card dataset-load-card">
        <h3>数据详情</h3>
        ${preprocessCodeButtonHtml("detail")}
      </div>`;
  }
  bindDatasetLoader();
  bindPreprocessControls();
}
