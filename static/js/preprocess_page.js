// Preprocess Page.

let activePreprocessStep = viewStateStore.activePreprocessStepV1 || "load";
let preprocessProgressStep = viewStateStore.preprocessProgressStepV1 || activePreprocessStep;
let loadingDataView = false;
let tokenizeCache = null;
let tokenizeCompleted = false;
let vectorizeCache = null;
let vectorizeCompleted = false;
let wordFreqCache = null;
let wordFreqCompleted = false;
let loadingWordFreqData = false;
let splitCache = null;
let splitCompleted = false;
let loadingSplitData = false;

const GUIDE_GLOBAL_KEY = "guideGlobalEnabledV1";
const GUIDE_PAGE_KEY = "guidePageStateV1";
const PREPROCESS_LOAD_GUIDE_ID = "preprocess_load";
const PREPROCESS_DETAIL_GUIDE_ID = "preprocess_detail";
const PREPROCESS_RAW_VIZ_GUIDE_ID = "preprocess_raw_viz";
const PREPROCESS_STANDARDIZE_GUIDE_ID = "preprocess_standardize";
const PREPROCESS_STANDARD_VIZ_GUIDE_ID = "preprocess_standard_viz";
const PREPROCESS_TOKENIZE_GUIDE_ID = "preprocess_tokenize";
const PREPROCESS_VECTORIZE_GUIDE_ID = "preprocess_vectorize";
const PREPROCESS_KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css";
const PREPROCESS_KATEX_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js";
const PREPROCESS_KATEX_STYLE_ID = "preprocess-katex-style";
const PREPROCESS_KATEX_SCRIPT_ID = "preprocess-katex-script";

let lastVectorizeMathProbeState = null;

function guideReadJson(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return saved ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function guideGlobalEnabled() {
  if (typeof isExperimentTestActive === "function" && isExperimentTestActive()) return false;
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
    if (activePreprocessStep === "tokenize") return PREPROCESS_TOKENIZE_GUIDE_ID;
    if (activePreprocessStep === "vectorize") return PREPROCESS_VECTORIZE_GUIDE_ID;
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
  if (pageId === "train_process") return "process_feature";
  if (pageId === "train_preprocess_effect") return "effect_feature";
  if (pageId === "train_loss") return "loss_feature";
  if (pageId === "train_optimization") return "optimization_feature";
  if (pageId === "train_custom") return "custom_feature";
  if (pageId === "evaluate_metrics") return "evaluate_fit";
  if (pageId === "predict") return "predict_model";
  if (pageId === PREPROCESS_DETAIL_GUIDE_ID) return "detail_scale";
  if (pageId === PREPROCESS_RAW_VIZ_GUIDE_ID) return "raw_feature";
  if (pageId === PREPROCESS_STANDARDIZE_GUIDE_ID) return "standardize_feature";
  if (pageId === PREPROCESS_STANDARD_VIZ_GUIDE_ID) return "standard_viz_feature";
  if (pageId === PREPROCESS_TOKENIZE_GUIDE_ID) return "tokenize_settings";
  if (pageId === PREPROCESS_VECTORIZE_GUIDE_ID) return "vectorize_settings";
  return "test_button";
}

function guideEnabledForPreprocessLoad() {
  const state = guidePageState();
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForPreprocessTokenize() {
  const state = guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID);
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
  { id: "load", no: "01", label: "加载原始数据", needsData: false },
  { id: "tokenize", no: "02", label: "分词与数据清洗", needsData: true },
  { id: "vectorize", no: "03", label: "特征向量化", needsData: true },
  { id: "word_freq", no: "04", label: "词频特征分析", needsData: true },
  { id: "split", no: "05", label: "划分训练/测试集", needsData: true },
];

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
  const isLoaded = Boolean(currentDatasetMeta);
  const categories = currentDatasetMeta?.categories || ["sci.space", "rec.autos"];
  const maxSamples = currentDatasetMeta?.max_samples || "500";

  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>加载数据集</h3>

      <div class="control-group">
        <label class="control-label" style="font-weight:600;margin-bottom:8px;display:block;">选择分类版块 (可多选)</label>
        <div class="category-checkboxes" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;" id="datasetCategoriesWrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" name="nbCategory" value="sci.space" ${categories.includes("sci.space") ? "checked" : ""}>
            <span>sci.space (太空科学)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" name="nbCategory" value="rec.autos" ${categories.includes("rec.autos") ? "checked" : ""}>
            <span>rec.autos (汽车运动)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" name="nbCategory" value="rec.sport.baseball" ${categories.includes("rec.sport.baseball") ? "checked" : ""}>
            <span>rec.sport.baseball (棒球运动)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" name="nbCategory" value="sci.med" ${categories.includes("sci.med") ? "checked" : ""}>
            <span>sci.med (医学研究)</span>
          </label>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label" for="datasetMaxSamples">样本上限 (防止浏览器卡顿)</label>
        <select id="datasetMaxSamples">
          <option value="200" ${maxSamples === "200" ? "selected" : ""}>200 篇</option>
          <option value="500" ${maxSamples === "500" ? "selected" : ""}>500 篇 (推荐)</option>
          <option value="1000" ${maxSamples === "1000" ? "selected" : ""}>1000 篇</option>
          <option value="All" ${maxSamples === "All" ? "selected" : ""}>全部样本</option>
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
  if (typeof isExperimentTestActive === "function" && isExperimentTestActive()) return "";
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
  const runVecBtn = $("runVectorizeBtn");
  if (runVecBtn) {
    runVecBtn.addEventListener("click", runVectorize);
  }
  const runTokBtn = $("runTokenizeBtn");
  if (runTokBtn) {
    runTokBtn.addEventListener("click", runTokenizeAndClean);
  }
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
  if (!["raw_viz", "standardize", "standard_viz"].includes(activePreprocessStep) && dataCache?.feature && features.includes(dataCache.feature)) {
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
  if (activePreprocessStep !== "tokenize") closePreprocessTokenizeGuide();
  if (activePreprocessStep !== "vectorize") closePreprocessVectorizeGuide();
  if ((!dataCache || !dataCacheMatchesSelectedFeature()) && !loadingDataView) {
    await loadDataView({ deferRender: true });
  }
  if (!dataCache) return;
  if (activePreprocessStep === "tokenize") {
    renderChartGridShell();
    if (!tokenizeCompleted) {
      $("chartGrid").innerHTML = `
        <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">💻</div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">等待分词与清洗执行</h3>
          <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">原始数据已加载。请在右侧面板配置您的文本清洗和降噪参数（如信头过滤、小写转换、英文停用词过滤等），然后点击【执行分词与清洗】。</p>
          <button class="primary-btn" type="button" onclick="triggerTokenizeBtnClick()" style="margin: 0; padding: 8px 20px; font-size: 13px;">去配置并执行</button>
        </section>
      `;
    } else {
      renderTokenizeOverview();
    }
    return;
  }
  if (activePreprocessStep === "vectorize") {
    renderChartGridShell();
    if (!vectorizeCompleted) {
      $("chartGrid").innerHTML = `
        <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">等待特征向量化执行</h3>
          <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">分词清洗已经完毕。请在右侧控制面板选择您的特征表达模型（如推荐的 TF-IDF 模型）和最大词表特征维度，然后点击【执行特征向量化】。</p>
          <button class="primary-btn" type="button" onclick="triggerVectorizeBtnClick()" style="margin: 0; padding: 8px 20px; font-size: 13px;">去配置并执行</button>
        </section>
      `;
    } else {
      renderVectorizeOverview();
    }
    return;
  }
  if (activePreprocessStep === "word_freq") {
    renderChartGridShell();
    if (!vectorizeCompleted) {
      $("chartGrid").innerHTML = `
        <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">等待特征向量化执行</h3>
          <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">当前词频特征分析需要基于已向量化的特征表，请先返回上一步执行 【特征向量化】。</p>
          <button class="primary-btn" type="button" onclick="setPreprocessStep('vectorize')" style="margin: 0; padding: 8px 20px; font-size: 13px;">去执行特征向量化</button>
        </section>
      `;
    } else {
      if (!wordFreqCache && !loadingWordFreqData) {
        loadingWordFreqData = true;
        setTimeout(() => {
          runWordFreqAnalysis().then(() => { loadingWordFreqData = false; });
        }, 0);
      }
      renderWordFreqOverview();
    }
    return;
  }
  if (activePreprocessStep === "split") {
    renderChartGridShell();
    if (!vectorizeCompleted) {
      $("chartGrid").innerHTML = `
        <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">等待特征向量化执行</h3>
          <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">当前划分步骤需要基于已向量化的特征表，请先返回上一步执行 【特征向量化】。</p>
          <button class="primary-btn" type="button" onclick="setPreprocessStep('vectorize')" style="margin: 0; padding: 8px 20px; font-size: 13px;">去执行特征向量化</button>
        </section>
      `;
    } else {
      if (!splitCache && !loadingSplitData) {
        loadingSplitData = true;
        setTimeout(() => {
          runSplitAnalysis().then(() => { loadingSplitData = false; });
        }, 0);
      }
      renderSplitOverview();
    }
    return;
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
  const button = $("loadDatasetBtn");
  bindGuideControls();
  bindPreprocessLoadGuideRuntime();
  if (!button) {
    updateCurrentGuide();
    return;
  }
  button.addEventListener("click", loadSelectedDataset);

  // 绑定分类多选框的变动（给引导用）
  document.querySelectorAll('input[name="nbCategory"]').forEach(el => {
    el.addEventListener("change", () => {
      if (activePreprocessStep === "load" && guideEnabledForPreprocessLoad()) {
        setGuidePageState({ step: "load_dataset" });
        updatePreprocessLoadGuide();
      }
    });
  });
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
  } else if (currentPage === "preprocess" && activePreprocessStep === "tokenize") {
    updatePreprocessTokenizeGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "vectorize") {
    updatePreprocessVectorizeGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "detail") {
    updatePreprocessDetailGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "raw_viz") {
    updatePreprocessRawVizGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "standardize") {
    updatePreprocessStandardizeGuide();
  } else if (currentPage === "preprocess" && activePreprocessStep === "standard_viz") {
    updatePreprocessStandardVizGuide();
  } else if (currentPage === "train_eval" && activeTrainStep === "process" && typeof updateTrainProcessGuide === "function") {
    updateTrainProcessGuide();
  } else if (currentPage === "train_eval" && activeTrainStep === "preprocess_effect" && typeof updateTrainPreprocessEffectGuide === "function") {
    updateTrainPreprocessEffectGuide();
  } else if (currentPage === "train_eval" && activeTrainStep === "loss" && typeof scheduleTrainLossGuideUpdate === "function") {
    scheduleTrainLossGuideUpdate(100);
  } else if (currentPage === "train_eval" && activeTrainStep === "optimization" && typeof scheduleTrainOptimizationGuideUpdate === "function") {
    scheduleTrainOptimizationGuideUpdate(100);
  } else if (currentPage === "train_eval" && activeTrainStep === "custom" && typeof scheduleTrainCustomGuideUpdate === "function") {
    scheduleTrainCustomGuideUpdate(100);
  } else if (currentPage === "evaluate" && typeof scheduleEvaluateGuideUpdate === "function") {
    scheduleEvaluateGuideUpdate(100);
  } else if (currentPage === "predict" && typeof schedulePredictGuideUpdate === "function") {
    schedulePredictGuideUpdate(100);
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
    if (state.step === "test_modal" && event.target.closest("[data-test-close]")) {
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

let loadedPreviewItems = [];

function applyDatasetMeta(meta, options = {}) {
  if (!meta) return;
  currentDatasetMeta = meta;
  viewStateStore.currentDatasetMetaV1 = meta;
  loadedPreviewItems = meta.preview || [];
  if ($("sampleCount")) $("sampleCount").textContent = meta.row_count ?? "--";
  if ($("featureCount")) $("featureCount").textContent = meta.features?.length ?? 1;
  if ($("datasetStatusText")) $("datasetStatusText").textContent = "已加载";
  if ($("datasetSampleText")) $("datasetSampleText").textContent = meta.row_count ?? "--";
  setPreprocessStageReady(true);
  renderPreprocessFlow();
  if (!options.silent) datasetMessage(`已加载：${meta.label || meta.dataset_id || "dataset"}`);
}

async function loadSelectedDataset() {
  const source = "twenty_newsgroups";
  const categories = [];
  document.querySelectorAll('input[name="nbCategory"]:checked').forEach(el => {
    categories.push(el.value);
  });
  if (categories.length < 2) {
    datasetMessage("请至少选择 2 个分类版块！", true);
    return;
  }
  const maxSamples = $("datasetMaxSamples")?.value || "500";

  const btn = $("loadDatasetBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "加载中...";
  }
  datasetMessage("正在从 Scikit-Learn 下载并加载数据集，请稍候...", false);

  try {
    const meta = await runAction("load_dataset", {
      source,
      categories,
      max_samples: maxSamples
    });
    meta.source = source;
    meta.categories = categories;
    meta.max_samples = maxSamples;

    dataCache = null;
    trainData = null;
    predictData = null;
    tokenizeCache = null;
    tokenizeCompleted = false;
    vectorizeCache = null;
    vectorizeCompleted = false;
    wordFreqCache = null;
    wordFreqCompleted = false;
    splitCache = null;
    splitCompleted = false;

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
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "加载数据集";
    }
  }
}

function persistDataFormState() {
  if ($("dataFeature")) {
    viewStateStore[preprocessFormStateKey()] = {
      feature: $("dataFeature").value,
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
    };
  }
}

function restoreDataFormState() {
  const state = viewStateStore[preprocessFormStateKey()] || {};
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  if ($("dataFeature") && state.feature && features.includes(state.feature)) {
    $("dataFeature").value = state.feature;
  } else if ($("dataFeature") && !["raw_viz", "standardize", "standard_viz"].includes(activePreprocessStep) && dataCache?.feature) {
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
    if ($("sampleCount")) $("sampleCount").textContent = dataCache.raw?.summary?.sample_count ?? dataCache.row_count ?? "--";
    if ($("featureCount")) $("featureCount").textContent = dataCache.correlations?.length ?? 1;
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

function closePreprocessTokenizeGuide() {
  closePreprocessLoadGuide();
}

function closePreprocessVectorizeGuide() {
  closePreprocessLoadGuide();
  document.querySelector(".guide-combo-target")?.remove();
}

function preprocessLoadGuideSpec() {
  const state = guidePageState();
  const step = state.step === "test_close" ? "select_dataset" : (state.step || "test_button");
  if (step === "test_modal") {
    return {
      step,
      target: ".test-modal",
      title: "先查看本页任务",
      body: "这里展示的是当前步骤的观察问题和操作目标。先看清楚本页要关注什么，接下来回到实验界面完成加载和观察。",
      action: "我知道了",
    };
  }
  if (step === "test_close") {
    return {
      step,
      target: "[data-test-close]",
      title: "回到实验界面操作",
      body: "现在先关闭任务弹窗。关闭后不会丢失内容，你可以稍后再次点击“查看测试内容”回来确认本页任务。",
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
      title: "观察加载后的文本分布",
      body: "数据已经加载完成。请重点观察：样本总数、各版块类别的数量分布（ECharts 柱状图），以及下方列表显示的原始邮件文本格式。你可以双击列表行或点击【详情】以预览完整的邮件正文。",
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
      title: "查看文本加载核心代码",
      body: "这里展示了 sklearn 中 fetch_20newsgroups 加载数据集的核心代码。重点看：指定分类版块 categories，以及使用 remove 参数过滤邮件信头、签名、回复，这是防止模型根据信头发件域名作弊（过拟合）的关键操作。",
      action: "完成本页引导",
    };
  }
  if (step === "select_dataset") {
    return {
      step: "select_dataset",
      target: "#datasetCategoriesWrap",
      title: "选择感兴趣的新闻组类别",
      body: "在这里挑选你要分类的新闻板块。我们推荐默认勾选太空科学 (sci.space) 和汽车运动 (rec.autos)，两者关键词差异很大，分类效果极好。也可以指定样本量上限并选择是否去除邮件信头等噪声。",
      action: "已选择，下一步",
    };
  }
  return {
    step: "select_dataset",
    target: "[data-practice-test-open], [data-test-open]",
    title: "先看本步要观察什么",
    body: "开始操作前，请点击右侧“查看测试内容”。你会看到这一小步的观察问题和操作目标。带着问题去观察数据，后面的操作会更有目标。",
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
  const useBackdrop = !["test_modal", "code_drawer"].includes(spec.step);
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
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

// ----------------------------------------------------
// Tokenize Step (分词与数据清洗) 专属引导
// ----------------------------------------------------

function preprocessTokenizeGuideSpec() {
  const state = guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID);
  const step = state.step === "test_close" ? "tokenize_settings" : (state.step || "tokenize_settings");
  if (step === "test_modal") {
    return {
      step,
      target: ".test-modal",
      title: "查看本页观察任务",
      body: "在这里了解分词与清洗需要解决的问题和实践目标。先明晰要观察的重点，然后关闭弹窗进行操作。",
      action: "我知道了",
    };
  }
  if (step === "test_close") {
    return {
      step,
      target: "[data-test-close]",
      title: "关闭弹窗，开始操作",
      body: "现在关闭测试弹窗。接下来我们去控制面板中了解和配置清洗参数。",
      action: "",
    };
  }
  if (step === "tokenize_settings") {
    return {
      step,
      target: ".control-card.dataset-load-card",
      title: "设置分词与降噪选项",
      body: "在控制面板中，我们可以配置文本清洗和正则去噪。移除 headers (信头) 可以防止模型偷懒（根据发信域名作弊），英文停用词过滤能剔除 of, the 等高频无信息量单词。确认勾选后即可准备执行。",
      action: "已了解，下一步",
    };
  }
  if (step === "run_tokenize") {
    return {
      step,
      target: "#runTokenizeBtn",
      title: "执行分词与数据清洗",
      body: "点击【执行分词与清洗】按钮，系统会调用后端对加载的数据进行去噪声和分词操作。请点击此按钮继续。",
      action: "",
    };
  }
  if (step === "review_tokenize") {
    return {
      step,
      target: ".preprocess-info-card",
      title: "观察过滤与清洗后的效果",
      body: "清洗成功了！重点关注：词表特征压缩大小（Vocab Size）、前后期平均单词数变化、Top 15 词频分布柱状图。你还可以在下方表格中，点击【对照】详情，直观对比每篇邮件在清洗前后的非结构化文本差异。",
      action: "下一步",
    };
  }
  if (step === "code_button") {
    return {
      step,
      target: "[data-preprocess-code=\"tokenize\"]",
      title: "查看这步处理的代码",
      body: "现在请点击“查看本步骤代码”。接下来我们会看到这一系列复杂的清洗过滤是如何在 Python 后端用正则和过滤规则实现的。",
      action: "",
    };
  }
  if (step === "code_drawer") {
    return {
      step,
      target: ".code-drawer",
      title: "学习分词清洗核心代码",
      body: "这里展示了核心 Python 清洗代码：如何通过 sklearn 提取并剔除 Headers/Footers/Quotes 噪声、如何使用 re.findall 正则提取单词、如何使用 built-in stop words 过滤停用词。这是所有文本挖掘算法必不可少的前置基石。",
      action: "完成本页引导",
    };
  }
  return {
    step: "tokenize_settings",
    target: ".control-card.dataset-load-card",
    title: "设置分词与降噪选项",
    body: "在控制面板中，我们可以配置文本清洗和正则去噪。确认勾选后即可准备执行。",
    action: "已了解，下一步",
  };
}

function updatePreprocessTokenizeGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "tokenize" || !guideEnabledForPreprocessTokenize()) {
      closePreprocessTokenizeGuide();
      return;
    }
    const spec = preprocessTokenizeGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessTokenizeGuide();
      return;
    }
    renderPreprocessTokenizeGuide(spec, target);
  });
}

function renderPreprocessTokenizeGuide(spec, target) {
  closePreprocessTokenizeGuide();
  const visualTarget = guideVisualTarget(target);
  visualTarget.classList.add("guide-highlight");
  if (["review_tokenize", "code_drawer", "test_modal"].includes(spec.step)) visualTarget.classList.add("guide-highlight-large");
  const useBackdrop = !["test_modal", "code_drawer"].includes(spec.step);
  document.body.insertAdjacentHTML("beforeend", `
    ${useBackdrop ? `<div class="guide-backdrop" aria-hidden="true"></div>` : ""}
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="分词与清洗引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = ["review_tokenize", "code_drawer"].includes(spec.step);
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
      if (guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID).step === "code_drawer") closePreprocessCodeDrawer();
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "tokenize_settings" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessTokenizeGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "test_modal") {
      document.querySelector("[data-test-close]")?.click();
      setGuidePageState({ step: "tokenize_settings" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      setTimeout(updatePreprocessTokenizeGuide, 60);
    } else if (step === "tokenize_settings") {
      setGuidePageState({ step: "run_tokenize" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      updatePreprocessTokenizeGuide();
    } else if (step === "review_tokenize") {
      setGuidePageState({ step: "code_button" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      updatePreprocessTokenizeGuide();
    } else if (step === "code_drawer") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "tokenize_settings" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessCodeDrawer();
      closePreprocessTokenizeGuide();
      openCurrentPracticeTestAfterGuide?.();
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
    body: "先观察这份文本数据集的基本结构：样本数量、类别数量、类别分布和文本预览。重点确认当前任务是根据新闻组文本内容预测类别标签。",
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
      openCurrentPracticeTestAfterGuide?.();
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
      body: "这里应关注文本样本被清洗、分词和向量化后的特征形态。重点观察哪些词在某个类别中更集中出现，而不是观察数值散点趋势。",
      action: "下一步",
    };
  }
  if (step === "raw_corr") {
    return {
      step,
      target: '[data-chart-card="all_corr"]',
      title: "比较全特征相关性",
      body: "这里应比较不同词项对类别区分的贡献。某个词在一个类别中越集中、在另一个类别中越少见，通常越适合解释分类结果。",
      action: "完成本步引导",
    };
  }
  return {
    step: "raw_feature",
    target: "#dataFeature",
    title: "选择观察特征",
    body: "右侧控件决定当前要观察的文本处理阶段或词项特征。切换后请关注 token、词频、向量维度和类别分布的变化。",
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
      openCurrentPracticeTestAfterGuide?.();
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
      openCurrentPracticeTestAfterGuide?.();
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
      body: "请对比清洗前文本、分词结果和向量化结果。重点理解文本如何从原始字符串变成可供朴素贝叶斯训练的词袋矩阵。",
      action: "下一步",
    };
  }
  if (step === "standard_viz_corr") {
    return {
      step,
      target: '[data-chart-card="all_corr"]',
      title: "观察相关系数是否变化",
      body: "下方展示的重点应是词项区分类别的能力。请比较高频词、差异词和类别标签之间的关系，判断哪些词更像有效分类线索。",
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
      openCurrentPracticeTestAfterGuide?.();
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
  setTimeout(() => {
    renderNbCategoryDistributionChart();
  }, 60);
}

function renderNbCategoryDistributionChart() {
  const chartEl = $("nbCategoryDistChart");
  if (!chartEl || !currentDatasetMeta || !currentDatasetMeta.class_counts) return;

  const myChart = initEchartsWithFont(chartEl);
  const data = Object.entries(currentDatasetMeta.class_counts).map(([name, val]) => ({
    name,
    value: val
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      top: '12%',
      left: '3%',
      right: '4%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: {
        fontSize: 10,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      name: '样本数 (篇)',
      nameTextStyle: { color: '#666', fontSize: 10 },
      axisLabel: { color: '#666' }
    },
    series: [
      {
        name: '样本数',
        type: 'bar',
        barWidth: '40%',
        data: data.map(d => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#a5d8ff' },
            { offset: 1, color: '#228be6' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#333',
          fontSize: 11
        }
      }
    ]
  };
  myChart.setOption(option);
  charts.set("nbCategoryDistChart", myChart);
  window.addEventListener('resize', () => myChart.resize());
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
  return `<section class="preprocess-dashboard-card preprocess-info-card ${escapeHtml(extraClass)}">
    <div class="chart-head"><div><div class="chart-title">${escapeHtml(title)}</div></div></div>
    <div class="info-card-body preprocess-step-body">${body}</div>
  </section>`;
}

function preprocessDetailSectionHtml(title, body, guideClass = "") {
  return `<div class="detail-section ${escapeHtml(guideClass)}">
    <h2 class="detail-section-title">${escapeHtml(title)}</h2>
    <div class="detail-section-body">${body}</div>
  </div>`;
}

function preprocessDetailCardHtml(view) {
  const meta = currentDatasetMeta || {};
  const quality = dataCache?.data_quality || {};
  const features = dataCache?.features || meta.features || [];
  if (view === "detail_overview") {
    const scaleHtml = preprocessDetailSectionHtml("数据规模", `
      ${metricBlockHtml([
        { label: "样本数量", value: meta.row_count ?? dataCache?.raw?.summary?.sample_count ?? "--" },
        { label: "特征数量", value: features.length || "--" },
        { label: "目标列", value: dataCache?.target || meta.target || "--" },
      ], "metrics-three")}
      ${dataDictionaryHtml(dataCache?.data_dictionary?.length ? dataCache.data_dictionary : fallbackDataDictionaryRows(features, dataCache?.target || meta.target))}
    `, "preprocess-detail-scale-guide-target");
    const statsHtml = preprocessDetailSectionHtml("统计详情", `
      ${metricBlockHtml([
        { label: "缺失值数量", value: quality.missing_count ?? 0 },
        { label: "重复样本数量", value: quality.duplicate_count ?? 0 },
        { label: "数值型列数量", value: quality.numeric_column_count ?? "--" },
        { label: "非数值型列数量", value: quality.non_numeric_column_count ?? "--" },
      ])}
      ${summaryRowsHtml(dataCache?.statistical_summary || [])}
    `, "preprocess-detail-stats-guide-target");
    return `<section class="preprocess-dashboard-card preprocess-info-card">
      <div class="chart-head" aria-label="拖动卡片"></div>
      <div class="info-card-body preprocess-step-body">
        ${scaleHtml}
        ${statsHtml}
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
  const classCountsHtml = Object.entries(meta.class_counts || {})
    .map(([name, count]) => `<li style="margin-bottom:4px;"><span class="category-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#228be6;margin-right:6px;"></span> <strong>${escapeHtml(name)}</strong>: ${count} 篇</li>`)
    .join("");

  return `
    <section class="preprocess-dashboard-card preprocess-info-card preprocess-loaded-card">
      <div class="chart-head">
        <div>
          <div class="chart-title" style="color: #333;">20 Newsgroups 原始文本数据集已加载</div>
          <div class="chart-sub">观察右侧类别统计分布，预览下方原始邮件文本格式。</div>
        </div>
      </div>
      <div class="info-card-body preprocess-step-body" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: 1.25fr 1.75fr; gap: 16px; align-items: start;">
          <div style="background: #f8f9fa; border-radius: 6px; padding: 12px; border: 1px solid #e9ecef;">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">基本统计信息</h4>
            <div class="preprocess-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
              <div class="preprocess-metric" style="background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #dee2e6; text-align:center;">
                <span style="font-size: 11px; color: #868e96; display: block; margin-bottom: 2px;">样本总量</span>
                <strong style="font-size: 16px; color: #212529;">${meta.row_count ?? "--"}</strong>
              </div>
              <div class="preprocess-metric" style="background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #dee2e6; text-align:center;">
                <span style="font-size: 11px; color: #868e96; display: block; margin-bottom: 2px;">版块类别数</span>
                <strong style="font-size: 16px; color: #212529;">${meta.target_names?.length ?? "--"}</strong>
              </div>
            </div>
            <h5 style="margin: 10px 0 6px 0; font-size: 12px; font-weight: 600; color: #495057;">新闻组类别明细：</h5>
            <ul style="margin: 0; padding-left: 14px; font-size: 12px; line-height: 1.5; color: #495057; list-style-type:none;">
              ${classCountsHtml}
            </ul>
          </div>
          <div style="background: #fff; border-radius: 6px; padding: 10px; border: 1px solid #e9ecef;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #495057;">类别数量分布图</h4>
            <div id="nbCategoryDistChart" style="width: 100%; height: 130px;"></div>
          </div>
        </div>

        <div>
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #495057;">原始文本预览表 (仅展示前 10 条)</h4>
          <div class="table-wrap" style="overflow-x: auto; border: 1px solid #dee2e6; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f1f3f5; border-bottom: 1px solid #dee2e6;">
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 50px;">序号</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 130px;">类别标签</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057;">新闻邮件正文摘要 (预览)</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 70px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${nbPreviewRowsHtml(meta.preview || [])}
              </tbody>
            </table>
          </div>
        </div>
        <p class="teaching-note" style="margin: 0; font-size: 12px; color: #666; background: #e9ecef; padding: 8px 12px; border-radius: 4px; line-height: 1.5;">
          <strong>教学提示：</strong> 20 Newsgroups 包含大量电子邮件形式的文本。注意看原始邮件内容，其结构复杂。下一步需要对这些原始文档进行分词、去除停用词和噪声。
        </p>
      </div>
    </section>`;
}

function nbPreviewRowsHtml(rows = []) {
  if (!rows.length) {
    return `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #868e96;">暂无数据预览</td></tr>`;
  }
  const badgeColors = {
    "sci.space": "background: #e7f5ff; color: #1c7ed6; border: 1px solid #a5d8ff;",
    "rec.autos": "background: #fff4e6; color: #d9480f; border: 1px solid #ffd8a8;",
    "rec.sport.baseball": "background: #ebfbee; color: #2b8a3e; border: 1px solid #b2f2bb;",
    "sci.med": "background: #f8f0fc; color: #862e9c; border: 1px solid #eebefa;"
  };
  return rows.map(row => {
    const badgeStyle = badgeColors[row.category] || "background: #f1f3f5; color: #495057; border: 1px solid #ced4da;";
    return `
      <tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 8px; color: #868e96;">${row.id}</td>
        <td style="padding: 8px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; ${badgeStyle}">
            ${escapeHtml(row.category)}
          </span>
        </td>
        <td style="padding: 8px; color: #495057; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;" title="${escapeHtml(row.text_preview)}">
          ${escapeHtml(row.text_preview)}
        </td>
        <td style="padding: 8px; text-align: center;">
          <button class="secondary-btn" style="padding: 2px 6px; font-size: 11px; margin: 0; cursor: pointer;" type="button" onclick="showFullTextModal(${row.id})">
            详情
          </button>
        </td>
      </tr>`;
  }).join("");
}

function showFullTextModal(rowId) {
  const item = loadedPreviewItems.find(d => d.id === rowId);
  if (!item) return;

  const backdrop = document.createElement("div");
  backdrop.className = "test-modal-backdrop";
  backdrop.id = "textDetailModal";
  backdrop.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

  const modal = document.createElement("div");
  modal.className = "test-modal";
  modal.style = "background: #fff; width: 680px; max-width: 90%; max-height: 80%; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden;";

  modal.innerHTML = `
    <div class="test-modal-head" style="background: #f8f9fa; padding: 10px 16px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #333;">
        新闻文本详情 (ID: ${item.id} - 类别: ${escapeHtml(item.category)})
      </h3>
      <button type="button" style="border: none; background: transparent; font-size: 18px; cursor: pointer; color: #868e96; margin: 0; padding: 0;" onclick="document.getElementById('textDetailModal').remove()">&times;</button>
    </div>
    <div style="padding: 12px; overflow-y: auto; flex: 1; background: #fafafa;">
      <pre style="margin: 0; padding: 10px; background: #fff; border: 1px solid #e9ecef; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; color: #333;">${escapeHtml(item.full_text || "(空文本)")}</pre>
    </div>
    <div style="background: #f8f9fa; padding: 10px 16px; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 8px;">
      <button class="primary-btn" style="margin: 0; padding: 4px 12px; font-size: 12px;" type="button" onclick="document.getElementById('textDetailModal').remove()">关闭</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

window.showFullTextModal = showFullTextModal;

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
    return `<section class="preprocess-dashboard-card preprocess-info-card">
      <div class="chart-head" aria-label="拖动卡片"></div>
      <div class="info-card-body preprocess-step-body">
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
    return `<div class="standardize-section preprocess-standardize-formula-guide-target">
        <h2 class="standardize-section-title">数据标准化</h2>
        <p>标准化把不同量纲的特征转换到更容易比较和训练的尺度上。</p>
        ${standardizeFormulaHtml(feature, row)}
        <div class="teaching-note">标准化后，特征均值会接近 0，标准差会接近 1。后续训练可以选择使用标准化特征。</div>
      </div>`;
  }
  if (kind === "preview") {
    return `<div class="standardize-section preprocess-standardize-preview-guide-target">
        <h2 class="standardize-section-title">标准化后前 5 行</h2>
        <p>直接观察原始特征与标准化特征的数值变化。</p>
        ${previewTableHtml(dataCache?.standardized_preview || [])}
      </div>`;
  }
  return `<div class="standardize-section preprocess-standardize-range-guide-target">
      <h2 class="standardize-section-title">标准化范围对比</h2>
      ${standardizeTableHtml(row ? [row] : dataCache?.standardize_table || [])}
    </div>`;
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
    htmlForView: () => `<section class="preprocess-prompt-card load-dataset-card">
      <div class="chart-head" aria-label="拖动提示卡片"></div>
      <div class="load-dataset-hint">请在右侧选择特征和显示模块</div>
    </section>`,
    minWidthForView: () => 2,
  });
}

function preprocessLoadHintCardHtml() {
  return `<section class="preprocess-prompt-card load-dataset-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
    <div class="chart-head" aria-label="拖动提示卡片" style="border: none;"></div>
    <div style="font-size: 40px; margin-bottom: 12px; color: #ced4da;">📧</div>
    <div class="load-dataset-hint" style="font-size: 14px; color: #868e96; font-weight: 500;">请先在右侧选择分类类别并加载数据集</div>
  </section>`;
}

function preprocessFormatCardHtml() {
  const rawRows = [
    { text: "The shuttle mission will launch next week", label: "sci.space" },
    { text: "The engine needs new tires and oil", label: "rec.autos" },
    { text: "NASA released new satellite data", label: "sci.space" },
  ];
  const vectorRows = [
    { token: "space", "sci.space": 0.034, "rec.autos": 0.002 },
    { token: "engine", "sci.space": 0.001, "rec.autos": 0.028 },
    { token: "orbit", "sci.space": 0.019, "rec.autos": 0.001 },
  ];
  return `<section class="preprocess-dashboard-card">
    <div class="chart-head">
      <div>
        <div class="chart-title">数据格式</div>
        <div class="chart-sub">请先在右侧加载 20 Newsgroups 数据集，再依次执行清洗分词、向量化、词频分析和数据集划分。</div>
      </div>
    </div>
    <div class="info-card-body" style="padding:18px">
      <div class="format-intro">
        <p><strong>规则：</strong>系统把每篇新闻组文本作为输入，把新闻组名称作为类别标签。预处理阶段会把原始文本清洗、分词，并转换成词袋或 TF-IDF 特征矩阵。</p>
        <p>内置数据集为 20 Newsgroups；当前实验默认比较 <code>sci.space</code> 与 <code>rec.autos</code> 两类文本。</p>
      </div>
      <div class="format-grid">
        <div class="format-column">
          <div class="format-point"><strong>原始文本样例</strong>每一行包含文本内容和真实类别标签。</div>
          <p class="sample-caption">20 Newsgroups 文本示例</p>
          ${previewTableHtml(rawRows)}
        </div>
        <div class="format-column">
          <div class="format-point"><strong>向量化后特征</strong>词项会变成模型可计算的条件概率或权重。</div>
          <p class="sample-caption">词项条件概率示例</p>
          ${previewTableHtml(vectorRows)}
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
    all_corr: { x: 2, y: 2, w: 2, h: 2 },
    tokenize_dashboard: { x: 0, y: 0, w: 4, h: 5 },
    vectorize_dashboard: { x: 0, y: 0, w: 4, h: 6 },
    word_freq_dashboard: { x: 0, y: 0, w: 4, h: 5 },
    split_dashboard: { x: 0, y: 0, w: 4, h: 5 }
  })[view] || { x: 0, y: 0, w: 2, h: 2 };
}

function dataGridMinWidth(view) {
  if (view === "tokenize_dashboard" || view === "vectorize_dashboard" || view === "word_freq_dashboard" || view === "split_dashboard") return 4;
  return 1;
}

function dataGridMinHeight(view) {
  if (view === "tokenize_dashboard" || view === "vectorize_dashboard" || view === "word_freq_dashboard" || view === "split_dashboard") return 4;
  return 1;
}

function normalizeDataGridLayout(view, layout) {
  const minW = dataGridMinWidth(view);
  const minH = dataGridMinHeight(view);
  const next = { ...defaultDataGridLayout(view), ...layout };
  next.w = Math.max(minW, Math.min(4, Number(next.w) || minW));
  next.h = Math.max(minH, Number(next.h) || minH);
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
  const specs = {
    load: {
      title: "加载原始数据",
      operation: "使用 Scikit-Learn 下载并加载 20 Newsgroups 原始新闻邮件",
      code: [
        "from sklearn.datasets import fetch_20newsgroups",
        "",
        "# 选定要加载的新闻板块分类",
        `categories = ${JSON.stringify(currentDatasetMeta?.categories || ["sci.space", "rec.autos"])}`,
        "",
        "# 剥离邮件信头、签名与引用，防止信息泄漏",
        "remove_targets = []",
        (currentDatasetMeta?.remove_options?.headers ?? true) ? "remove_targets.append('headers')" : "# remove_targets.append('headers')",
        (currentDatasetMeta?.remove_options?.footers ?? true) ? "remove_targets.append('footers')" : "# remove_targets.append('footers')",
        (currentDatasetMeta?.remove_options?.quotes ?? true) ? "remove_targets.append('quotes')" : "# remove_targets.append('quotes')",
        "",
        "newsgroups_train = fetch_20newsgroups(",
        "    subset='train',",
        "    categories=categories,",
        "    remove=tuple(remove_targets)",
        ")",
        "",
        "# 邮件文本内容列表和数字标签",
        "texts = newsgroups_train.data",
        "labels = newsgroups_train.target",
      ].join("\n"),
      notes: [
        "使用 sklearn 提供的 fetch_20newsgroups API 加载数据集（首次加载会自动下载并缓存）。",
        "categories 指定分类列表，只获取指定版块的文本数据。",
        "remove 参数至关重要，剥离 headers/footers/quotes 能防止模型根据信头发件域名等直接特征“作弊”分类（过拟合）。",
      ],
    },
    tokenize: {
      title: "分词与数据清洗",
      operation: "执行信头/签名去噪、英文正则分词、小写化与停用词过滤",
      code: [
        "import re",
        "from sklearn.datasets._twenty_newsgroups import (",
        "    strip_newsgroup_header,",
        "    strip_newsgroup_footer,",
        "    strip_newsgroup_quoting",
        ")",
        "",
        "# 1. 噪声去除",
        `remove_headers = ${$("tokRemoveHeaders")?.checked ?? true}`,
        `remove_footers = ${$("tokRemoveFooters")?.checked ?? true}`,
        `remove_quotes = ${$("tokRemoveQuotes")?.checked ?? true}`,
        "if remove_headers: text = strip_newsgroup_header(text)",
        "if remove_quotes:  text = strip_newsgroup_quoting(text)",
        "if remove_footers: text = strip_newsgroup_footer(text)",
        "",
        "# 2. 正则分词 (去除/保留数字和符号)",
        `remove_numbers = ${$("tokRemoveNumbers")?.checked ?? true}`,
        "if remove_numbers:",
        "    tokens = re.findall(r'\\b[a-zA-Z]+\\b', text)",
        "else:",
        "    tokens = re.findall(r'\\b[a-zA-Z0-9]+\\b', text)",
        "",
        "# 3. 英文小写化",
        `lowercase = ${$("tokLowercase")?.checked ?? true}`,
        "if lowercase:",
        "    tokens = [t.lower() for t in tokens]",
        "",
        "# 4. 停用词过滤",
        `remove_stopwords = ${$("tokRemoveStopwords")?.checked ?? true}`,
        "if remove_stopwords:",
        "    # 过滤 built-in english stop words (例如 the, is, at...)",
        "    tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]",
      ].join("\n"),
      notes: [
        "去噪能够极大防范过拟合。信头含有发件人及版块标签的强暗示信息，直接用于分类会破坏朴素贝叶斯对正文主题的泛化能力。",
        "正则提取 \\b[a-zA-Z]+\\b 能轻松提取纯单词分词，排除了无意义的数字乱码和符号。",
        "停用词是指极高频但几乎没有主题信息量的词汇。过滤停用词能够压缩词表特征空间维度（降维），让计算更高效，并且有效减少非关键特征引入的噪声影响。"
      ]
    },
    vectorize: {
      title: "特征向量化",
      operation: "利用词频模型或 TF-IDF 模型将文本转换为稀疏特征矩阵",
      code: [
        "from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer",
        "",
        "# 1. 获取预处理后的文本序列",
        "corpus = [' '.join(tokens) for tokens in cleaned_tokens_list]",
        "",
        "# 2. 创建并配置向量化模型",
        "vec_type = 'tfidf'  # 可选: 'tfidf' (TF-IDF模型) 或 'count' (词频模型)",
        "if vec_type == 'tfidf':",
        "    vectorizer = TfidfVectorizer(",
        "        tokenizer=lambda x: x.split(),  # 沿用分词清洗阶段的 Token 分隔规则",
        "        lowercase=False,               # 停用重复的小写转换",
        "        ngram_range=(1, 1),            # N-Gram 词组区间",
        "        max_features=1000,             # 限制特征词表的最大维度 (降维)",
        "        min_df=2                       # 过滤极低频单词",
        "    )",
        "else:",
        "    vectorizer = CountVectorizer(",
        "        tokenizer=lambda x: x.split(),",
        "        lowercase=False,",
        "        ngram_range=(1, 1),",
        "        max_features=1000,",
        "        min_df=2",
        "    )",
        "",
        "# 3. fit_transform 拟合词表并转换为稀疏矩阵 X",
        "X = vectorizer.fit_transform(corpus)",
        "",
        "# 矩阵维度 X.shape (样本数, 特征维度)",
        "print('矩阵形状:', X.shape)",
        "print('非零特征项总数:', X.nnz)",
      ].join("\n"),
      notes: [
        "TfidfVectorizer 会综合计算词在文档内的频次 (TF) 以及词在全语料里的罕见度 (IDF)，使得具有特定主题区分度的罕见词权重更高，从而非常契合文本分类。",
        "fit_transform 将词表训练和文本矩阵转换合二为一，得到一个极大但极其稀疏的二维矩阵，它在 Python 内存中由 scipy 稀疏矩阵结构进行高效率存储。",
        "限制 max_features 也是一种提取最核心关键词并做降维保护模型防止过拟合的常规NLP技术。"
      ]
    },
    word_freq: {
      title: "词频与卡方独立性特征分析",
      operation: "统计不同新闻类别的词频并使用卡方检验评估特征区分度",
      code: [
        "# 1. 分别筛选出类别 1 与类别 2 的样本索引",
        "indices_c1 = [i for i, lbl in enumerate(labels) if target_names[lbl] == 'sci.space']",
        "indices_c2 = [i for i, lbl in enumerate(labels) if target_names[lbl] == 'rec.autos']",
        "",
        "# 2. 统计特征词 'space' 在两类别下的文档包含频数 (A 和 B)",
        "A = sum(1 for idx in indices_c1 if 'space' in cleaned_tokens_list[idx])",
        "B = sum(1 for idx in indices_c2 if 'space' in cleaned_tokens_list[idx])",
        "",
        "# 3. 计算不包含该词的样本频数 (C 和 D) 及总样本数 N",
        "C = len(indices_c1) - A",
        "D = len(indices_c2) - B",
        "N = A + B + C + D",
        "",
        "# 4. 应用卡方公式求特征与类别的相关程度",
        "denominator = (A + C) * (B + D) * (A + B) * (C + D)",
        "chi_square = 0.0 if denominator == 0 else N * ((A * D - B * C) ** 2) / denominator",
        "print(f\"'space' 的卡方检验值为: {chi_square:.4f}\")"
      ].join("\n"),
      notes: [
        "卡方检验（Chi-Square Test）通过比较观察到的实际频数与假设彼此独立时的理论频数的偏差，衡量特征词与分类的关联度。",
        "卡方值越高，表示单词在两个类别中的倾斜分布越显著（极具区分力），说明它不是由于偶然因素产生的，越适合选做特征。",
        "在朴素贝叶斯分类器中，我们常常使用卡方过滤器（如 SelectKBest）筛选出高卡方特征子集，起到特征降维、降噪和防止过拟合的作用。"
      ]
    },
    split: {
      title: "划分训练/测试集",
      operation: "将特征矩阵与标签划分为训练集和测试集",
      code: [
        "from sklearn.model_selection import train_test_split",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)",
      ].join("\n"),
      notes: ["合理划分测试集以客观评估朴素贝叶斯分类器在大样本上的真实分类性能。"]
    }
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
  } else if (stepId === "tokenize" && guideEnabledForPreprocessTokenize() && guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID).step === "code_drawer") {
    setTimeout(updatePreprocessTokenizeGuide, 60);
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
    const step = button.dataset.preprocessCode || activePreprocessStep;
    if (step === "load" && activePreprocessStep === "load" && guideEnabledForPreprocessLoad()) {
      const gState = guidePageState();
      if (gState.step === "code_button") {
        setGuidePageState({ step: "code_drawer" });
      }
    } else if (step === "tokenize" && activePreprocessStep === "tokenize" && guideEnabledForPreprocessTokenize()) {
      const gState = guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID);
      if (gState.step === "code_button") {
        setGuidePageState({ step: "code_drawer" }, PREPROCESS_TOKENIZE_GUIDE_ID);
      }
    } else if (step === "vectorize" && activePreprocessStep === "vectorize" && guideEnabledForPreprocessVectorize()) {
      const gState = guidePageState(PREPROCESS_VECTORIZE_GUIDE_ID);
      if (gState.step === "code_button") {
        setGuidePageState({ step: "code_drawer" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      }
    }
    openPreprocessCodeDrawer(step);
  });
}

function renderPreprocessRightPanel() {
  if (activePreprocessStep === "load") {
    $("rightPanel").innerHTML = renderPreprocessLoadPanel();
  } else if (activePreprocessStep === "tokenize") {
    $("rightPanel").innerHTML = renderPreprocessTokenizePanel();
  } else if (activePreprocessStep === "vectorize") {
    $("rightPanel").innerHTML = renderPreprocessVectorizePanel();
  } else if (activePreprocessStep === "word_freq") {
    $("rightPanel").innerHTML = renderPreprocessWordFreqPanel();
  } else if (activePreprocessStep === "split") {
    $("rightPanel").innerHTML = renderPreprocessSplitPanel();
  } else {
    $("rightPanel").innerHTML = `
      <div class="right-title">控制面板</div>
      ${guideSwitchPanelHtml()}
      <div class="control-card dataset-load-card">
        <h3>当前步骤: ${activePreprocessStep}</h3>
        <p style="font-size:12px;color:#868e96;line-height:1.5;margin-bottom:10px;">该步骤模块尚在开发中...</p>
        ${preprocessCodeButtonHtml(activePreprocessStep)}
      </div>`;
  }
  bindDatasetLoader();
  bindPreprocessControls();
}

// ----------------------------------------------------
// 以下为 20 Newsgroups 朴素贝叶斯分类器特定预处理（分词与去噪）的辅助函数
// ----------------------------------------------------

function renderPreprocessTokenizePanel() {
  const isCompleted = tokenizeCompleted;
  const options = tokenizeCache?.tokenization_options || {
    remove_headers: true,
    remove_footers: true,
    remove_quotes: true,
    lowercase: true,
    remove_stopwords: true,
    remove_numbers: true
  };

  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>分词与数据清洗</h3>

      <div class="control-group">
        <label class="control-label">信息噪声去除 (防过拟合作弊)</label>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokRemoveHeaders" ${options.remove_headers ? "checked" : ""}>
            <span>移除信头 (Headers)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokRemoveFooters" ${options.remove_footers ? "checked" : ""}>
            <span>移除签名 (Footers)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokRemoveQuotes" ${options.remove_quotes ? "checked" : ""}>
            <span>移除引用回复 (Quotes)</span>
          </label>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">文本标准化设置</label>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokLowercase" ${options.lowercase ? "checked" : ""}>
            <span>英文转换为小写 (Lowercase)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokRemoveStopwords" ${options.remove_stopwords ? "checked" : ""}>
            <span>过滤英文停用词 (Stop Words)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="tokRemoveNumbers" ${options.remove_numbers ? "checked" : ""}>
            <span>过滤数字与特殊符号</span>
          </label>
        </div>
      </div>

      <div class="btn-row">
        <button class="primary-btn" id="runTokenizeBtn" type="button">${isCompleted ? "重新执行清洗" : "执行分词与清洗"}</button>
      </div>
      <div class="status-line hidden" id="tokenizeStatusMsg"></div>
      ${preprocessCodeButtonHtml("tokenize")}
    </div>`;
}


async function runTokenizeAndClean() {
  const remove_headers = $("tokRemoveHeaders")?.checked ?? true;
  const remove_footers = $("tokRemoveFooters")?.checked ?? true;
  const remove_quotes = $("tokRemoveQuotes")?.checked ?? true;
  const lowercase = $("tokLowercase")?.checked ?? true;
  const remove_stopwords = $("tokRemoveStopwords")?.checked ?? true;
  const remove_numbers = $("tokRemoveNumbers")?.checked ?? true;

  const btn = $("runTokenizeBtn");
  const msgEl = $("tokenizeStatusMsg");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "处理中...";
  }
  if (msgEl) {
    msgEl.classList.remove("hidden", "error");
    msgEl.textContent = "正在进行分词与数据过滤，请稍候...";
  }

  try {
    const res = await runAction("clean_and_tokenize", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      remove_headers,
      remove_footers,
      remove_quotes,
      lowercase,
      remove_stopwords,
      remove_numbers
    });
    tokenizeCache = res;
    tokenizeCompleted = true;
    if (msgEl) {
      msgEl.textContent = "清洗与分词完成！";
      setTimeout(() => { msgEl.classList.add("hidden"); }, 2000);
    }
    renderPreprocessTokenizePanel(); // 刷新控制面板按钮的文字
    await renderPreprocessCurrentStep();
    if (activePreprocessStep === "tokenize" && guideEnabledForPreprocessTokenize()) {
      const gState = guidePageState(PREPROCESS_TOKENIZE_GUIDE_ID);
      if (gState.step === "run_tokenize") {
        setGuidePageState({ step: "review_tokenize" }, PREPROCESS_TOKENIZE_GUIDE_ID);
        updatePreprocessTokenizeGuide();
      }
    }
  } catch (err) {
    if (msgEl) {
      msgEl.classList.add("error");
      msgEl.textContent = "处理失败: " + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "重新执行清洗";
    }
  }
}
window.runTokenizeAndClean = runTokenizeAndClean;

function triggerTokenizeBtnClick() {
  const btn = $("runTokenizeBtn");
  if (btn) {
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.style.boxShadow = "0 0 0 4px rgba(34, 139, 230, 0.4)";
    setTimeout(() => { btn.style.boxShadow = ""; }, 1500);
  }
}
window.triggerTokenizeBtnClick = triggerTokenizeBtnClick;

function renderTokenizeOverview() {
  const grid = $("chartGrid");
  if (!grid) return;

  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["tokenize_dashboard"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 5 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("tokenize_dashboard", layout),
    htmlForView: () => preprocessTokenizeDashboardHtml(),
    minWidthForView: () => 2,
    minHeightForView: () => 2,
  });

  let retryCount = 0;
  function tryRenderTokenize() {
    const probeWrap = $("nbPipelineProbeWrap");
    const chartEl = $("nbTopWordsChart");

    if ((!probeWrap || !chartEl) && retryCount < 20) {
      retryCount++;
      setTimeout(tryRenderTokenize, 50);
      return;
    }

    injectPipelineStyles();
    try {
      renderNbTopWordsChart();
    } catch (e) {
      console.error("renderNbTopWordsChart error", e);
    }
    try {
      if (tokenizeCache?.preview?.length) {
        renderPreprocessingPipelineProbe(tokenizeCache.preview[0]);
      }
    } catch (e) {
      console.error("renderPreprocessingPipelineProbe error", e);
    }
  }
  setTimeout(tryRenderTokenize, 50);
}

function preprocessTokenizeDashboardHtml() {
  const cache = tokenizeCache || {};
  const metrics = [
    { label: "词表特征数 (Vocab Size)", value: cache.vocab_size ?? "--" },
    { label: "词汇总体过滤率 (降维率)", value: `${cache.compression_ratio ?? 0}%` },
    { label: "过滤前均值词数/篇", value: cache.avg_raw_words ?? "--" },
    { label: "过滤后均值词数/篇", value: cache.avg_cleaned_words ?? "--" }
  ];

  return `
    <section class="preprocess-dashboard-card preprocess-info-card preprocess-loaded-card">
      <div class="chart-head">
        <div>
          <div class="chart-title" style="color: #333;">02 分词与数据清洗效果可视化</div>
          <div class="chart-sub">观察去噪与停用词对词汇规模的影响，查看词频分布及清洗对照表。</div>
        </div>
      </div>
      <div class="info-card-body preprocess-step-body" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: 1.25fr 1.75fr; gap: 16px; align-items: start;">
          <div style="background: #f8f9fa; border-radius: 6px; padding: 12px; border: 1px solid #e9ecef; min-height: 180px;">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">清洗前后对比指标</h4>
            <div class="preprocess-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${metrics.map(m => `
                <div class="preprocess-metric" style="background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #dee2e6; text-align:center;">
                  <span style="font-size: 11px; color: #868e96; display: block; margin-bottom: 2px;">${escapeHtml(m.label)}</span>
                  <strong style="font-size: 15px; color: #212529;">${m.value}</strong>
                </div>
              `).join("")}
            </div>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #868e96; line-height: 1.4;">
              💡 剔除停用词与数字特殊符号，结合统一小写，不仅能使模型的特征表示空间（词表维度）显著缩减以加快计算，更能降低朴素贝叶斯的参数方差，防止过拟合。
            </p>
          </div>
          <div style="background: #fff; border-radius: 6px; padding: 10px; border: 1px solid #e9ecef;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #495057;">清洗后高频词排名前 15 位</h4>
            <div id="nbTopWordsChart" style="width: 100%; height: 160px;"></div>
          </div>
        </div>

        <!-- 数据清洗管道式交互探针 -->
        <div id="nbPipelineProbeWrap" style="background: #f8f9fa; border-radius: 6px; padding: 12px; border: 1px solid #e9ecef;">
          <div style="text-align:center; color:#868e96; padding:15px; font-size:12px;">正在加载探针...</div>
        </div>

        <div>
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #495057;">样本分词前后对比表 (仅展示前 10 条，双击行载入上方探针)</h4>
          <div class="table-wrap" style="overflow-x: auto; border: 1px solid #dee2e6; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f1f3f5; border-bottom: 1px solid #dee2e6;">
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 40px;">序号</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 110px;">类别</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 220px;">清洗前正文预览 (Raw)</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057;">清洗分词后 Token 序列 (Tokens)</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 60px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${nbTokenizePreviewRowsHtml(cache.preview || [])}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function nbTokenizePreviewRowsHtml(rows = []) {
  if (!rows.length) {
    return `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #868e96;">暂无对比数据</td></tr>`;
  }
  const badgeColors = {
    "sci.space": "background: #e7f5ff; color: #1c7ed6; border: 1px solid #a5d8ff;",
    "rec.autos": "background: #fff4e6; color: #d9480f; border: 1px solid #ffd8a8;",
    "rec.sport.baseball": "background: #ebfbee; color: #2b8a3e; border: 1px solid #b2f2bb;",
    "sci.med": "background: #f8f0fc; color: #862e9c; border: 1px solid #eebefa;"
  };
  return rows.map(row => {
    const badgeStyle = badgeColors[row.category] || "background: #f1f3f5; color: #495057; border: 1px solid #ced4da;";
    return `
      <tr style="border-bottom: 1px solid #dee2e6; cursor: pointer;" title="双击行以载入探针进行分步观察" ondblclick="loadSampleToPipelineProbe(${row.id})">
        <td style="padding: 8px; color: #868e96;">${row.id}</td>
        <td style="padding: 8px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; ${badgeStyle}">
            ${escapeHtml(row.category)}
          </span>
        </td>
        <td style="padding: 8px; color: #868e96; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;" title="${escapeHtml(row.raw_text_preview)}">
          ${escapeHtml(row.raw_text_preview)}
        </td>
        <td style="padding: 8px; color: #2b8a3e; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;" title="${escapeHtml(row.tokens_preview)}">
          ${escapeHtml(row.tokens_preview)}
        </td>
        <td style="padding: 8px; text-align: center;">
          <button class="secondary-btn" style="padding: 2px 6px; font-size: 11px; margin: 0; cursor: pointer;" type="button" onclick="showTokenizeDetailModal(${row.id})">
            对照
          </button>
        </td>
      </tr>`;
  }).join("");
}

// ----------------------------------------------------
// 分词与去噪数据管道交互式探针的核心驱动代码
// ----------------------------------------------------

let currentPipelineSampleId = 1;
let currentPipelineStageId = "0_raw";

function injectPipelineStyles() {
  if ($("nbPipelineStyles")) return;
  const style = document.createElement("style");
  style.id = "nbPipelineStyles";
  style.innerHTML = `
    .probe-highlight-del {
      background-color: #ffe3e3 !important;
      color: #c92a2a !important;
      text-decoration: line-through !important;
      padding: 0 2px;
      border-radius: 2px;
    }
    .probe-text-pre {
      margin: 0;
      padding: 8px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
      height: 200px;
      overflow-y: auto;
      color: #495057;
      text-align: left;
    }
  `;
  document.head.appendChild(style);
}

function ensurePreprocessMathSupport() {
  injectMathFormulaStyles();
  if (typeof document === "undefined") return;
  if (!document.getElementById(PREPROCESS_KATEX_STYLE_ID)) {
    const link = document.createElement("link");
    link.id = PREPROCESS_KATEX_STYLE_ID;
    link.rel = "stylesheet";
    link.href = PREPROCESS_KATEX_CSS_URL;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
  if (window.katex?.renderToString || document.getElementById(PREPROCESS_KATEX_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = PREPROCESS_KATEX_SCRIPT_ID;
  script.src = PREPROCESS_KATEX_SCRIPT_URL;
  script.defer = true;
  script.crossOrigin = "anonymous";
  script.onload = () => rerenderLastVectorizeMathProbe();
  script.onerror = () => rerenderLastVectorizeMathProbe();
  document.head.appendChild(script);
}

function renderPreprocessLatexToHtml(latex, displayMode = false) {
  const source = String(latex || "").trim();
  if (!source) return "";
  if (window.katex?.renderToString) {
    try {
      return window.katex.renderToString(source, {
        throwOnError: false,
        displayMode,
        strict: "ignore",
      });
    } catch (_err) {}
  }
  return `<span class="preprocess-math-fallback">${escapeHtml(source)}</span>`;
}

function renderPreprocessMathMarkup(html) {
  const source = String(html || "");
  if (!source.includes("$")) return source;
  const pattern = /\$([^$\n]+?)\$/g;
  return source.replace(pattern, (_match, latex) => renderPreprocessLatexToHtml(latex, false));
}

function rerenderLastVectorizeMathProbe() {
  if (!lastVectorizeMathProbeState) return;
  const wrap = $("vectorizeMathProbeWrap");
  if (!wrap) return;
  wrap.innerHTML = buildVectorizeMathProbeHtml(
    lastVectorizeMathProbeState.meta,
    lastVectorizeMathProbeState.sampleId,
    lastVectorizeMathProbeState.category,
  );
}

function loadSampleToPipelineProbe(rowId) {
  const item = tokenizeCache?.preview?.find(d => d.id === rowId);
  if (!item) return;
  renderPreprocessingPipelineProbe(item);
  const wrap = $("nbPipelineProbeWrap");
  if (wrap) {
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    wrap.style.boxShadow = "0 0 0 4px rgba(43, 138, 62, 0.4)";
    setTimeout(() => { wrap.style.boxShadow = ""; }, 1500);
  }
}
window.loadSampleToPipelineProbe = loadSampleToPipelineProbe;

function renderPreprocessingPipelineProbe(item, stageId = currentPipelineStageId) {
  const wrap = $("nbPipelineProbeWrap");
  if (!wrap) return;

  if (!item) {
    wrap.innerHTML = `<div style="text-align:center;color:#868e96;padding:20px;">请双击下方数据行以载入管道探针</div>`;
    return;
  }

  currentPipelineSampleId = item.id;
  currentPipelineStageId = stageId;

  const opts = tokenizeCache?.tokenization_options || {
    remove_headers: true,
    remove_footers: true,
    remove_quotes: true,
    lowercase: true,
    remove_stopwords: true,
    remove_numbers: true
  };

  const stagesConfig = [
    { id: "0_raw", label: "原始文本", enabled: true },
    { id: "1_headers_removed", label: "01 移除信头", enabled: opts.remove_headers },
    { id: "2_quotes_removed", label: "02 移除引用", enabled: opts.remove_quotes },
    { id: "3_footers_removed", label: "03 移除签名", enabled: opts.remove_footers },
    { id: "4_tokens_raw", label: "04 正则分词", enabled: true },
    { id: "5_tokens_lowercase", label: "05 统一小写", enabled: opts.lowercase },
    { id: "6_tokens_no_stopwords", label: "06 过滤停用词", enabled: opts.remove_stopwords }
  ];

  const stagesHtml = stagesConfig.map(s => {
    const isActive = s.id === currentPipelineStageId;
    const isEnabled = s.enabled;
    const statusText = isEnabled ? "" : " (已跳过)";

    let btnStyle = "border: 1px solid #dee2e6; background: #fff; color: #495057; font-weight: 500; cursor: pointer;";
    if (isActive) {
      btnStyle = "border: 1px solid #2b8a3e; background: #ebfbee; color: #2b8a3e; font-weight: bold; box-shadow: 0 0 0 3px rgba(43, 138, 62, 0.15); cursor: pointer;";
    } else if (!isEnabled) {
      btnStyle = "border: 1px solid #e9ecef; background: #f8f9fa; color: #adb5bd; cursor: not-allowed;";
    }

    return `
      <div style="display:flex; align-items:center; gap:4px;">
        <button type="button" class="pipeline-stage-btn" data-stage="${s.id}" style="padding: 4px 10px; font-size:12px; border-radius: 20px; outline:none; transition: all 0.2s; ${btnStyle}" ${isEnabled ? "" : "disabled"}>
          ${s.label}${statusText}
        </button>
        ${s.id !== "6_tokens_no_stopwords" ? `<span style="color:#ced4da; font-size:12px;">➔</span>` : ""}
      </div>
    `;
  }).join("");

  let beforeTitle = "";
  let afterTitle = "";
  let beforeContentHtml = "";
  let afterContentHtml = "";

  const stagesData = item.stages || {};

  if (currentPipelineStageId === "0_raw") {
    beforeTitle = "数据源：邮件原始文本";
    afterTitle = "初始载入视图";
    beforeContentHtml = `<pre class="probe-text-pre" style="color: #868e96; text-align: center; padding-top: 80px;">-- 无 (这是非结构化文本清洗的源头) --</pre>`;
    afterContentHtml = `<pre class="probe-text-pre" style="color: #333;">${escapeHtml(stagesData["0_raw"] || "")}</pre>`;
  } else if (currentPipelineStageId === "1_headers_removed") {
    beforeTitle = "01 信头去除前";
    afterTitle = "01 信头去除后";
    const headerText = stagesData["header_text"] || "";
    const remaining = stagesData["1_headers_removed"] || "";
    beforeContentHtml = `
      <pre class="probe-text-pre"><span class="probe-highlight-del">${escapeHtml(headerText)}</span><span>${escapeHtml(remaining)}</span></pre>
    `;
    afterContentHtml = `<pre class="probe-text-pre" style="color: #212529;">${escapeHtml(remaining)}</pre>`;
  } else if (currentPipelineStageId === "2_quotes_removed") {
    beforeTitle = "02 引用过滤前";
    afterTitle = "02 引用过滤后";
    const originalWithHeadersRemoved = stagesData["1_headers_removed"] || "";
    const quoteLines = stagesData["quote_lines"] || [];
    const lines = originalWithHeadersRemoved.split('\n');
    const highlightedLines = lines.map(line => {
      if (quoteLines.includes(line)) {
        return `<span class="probe-highlight-del">${escapeHtml(line)}</span>`;
      }
      return escapeHtml(line);
    }).join('\n');

    beforeContentHtml = `<pre class="probe-text-pre">${highlightedLines}</pre>`;
    afterContentHtml = `<pre class="probe-text-pre" style="color: #212529;">${escapeHtml(stagesData["2_quotes_removed"] || "")}</pre>`;
  } else if (currentPipelineStageId === "3_footers_removed") {
    beforeTitle = "03 签名去除前";
    afterTitle = "03 签名去除后";
    const remaining = stagesData["3_footers_removed"] || "";
    const footerText = stagesData["footer_text"] || "";

    beforeContentHtml = `
      <pre class="probe-text-pre"><span>${escapeHtml(remaining)}</span><span class="probe-highlight-del">${escapeHtml(footerText)}</span></pre>
    `;
    afterContentHtml = `<pre class="probe-text-pre" style="color: #212529;">${escapeHtml(remaining)}</pre>`;
  } else if (currentPipelineStageId === "4_tokens_raw") {
    beforeTitle = "04 纯净正文文本";
    afterTitle = "04 正则提取的分词单词流 (Tokens)";
    const bodyText = stagesData["3_footers_removed"] || "";
    beforeContentHtml = `<pre class="probe-text-pre" style="color: #495057;">${escapeHtml(bodyText)}</pre>`;

    const tokens = stagesData["4_tokens_raw"] || [];
    afterContentHtml = renderTokenBadges(tokens, () => "border: 1px solid #ced4da; background: #fff; color: #495057;");
  } else if (currentPipelineStageId === "5_tokens_lowercase") {
    beforeTitle = "05 正则提取单词流";
    afterTitle = "05 小写合并后单词流 (转小写)";
    const tokensRaw = stagesData["4_tokens_raw"] || [];
    const tokensLowercase = stagesData["5_tokens_lowercase"] || [];
    const diffFlags = stagesData["lowercase_diff"] || [];

    beforeContentHtml = renderTokenBadges(tokensRaw, (idx) => {
      const isChanged = diffFlags[idx];
      return isChanged
        ? "border: 1px solid #f59f00; background: #fff9db; color: #f59f00;"
        : "border: 1px solid #ced4da; background: #fff; color: #495057;";
    });

    afterContentHtml = renderTokenBadges(tokensLowercase, (idx) => {
      const isChanged = diffFlags[idx];
      return isChanged
        ? "border: 1px solid #2b8a3e; background: #ebfbee; color: #2b8a3e; font-weight:600;"
        : "border: 1px solid #ced4da; background: #fff; color: #495057;";
    });
  } else if (currentPipelineStageId === "6_tokens_no_stopwords") {
    beforeTitle = "06 小写特征单词流 (红色斜线为停用词)";
    afterTitle = "06 最终用于建模的特征 Token 序列";
    const tokensLowercase = stagesData["5_tokens_lowercase"] || [];
    const tokensCleaned = stagesData["6_tokens_no_stopwords"] || [];
    const stopwordFlags = stagesData["stopword_flags"] || [];

    beforeContentHtml = renderTokenBadges(tokensLowercase, (idx) => {
      const isStopword = stopwordFlags[idx];
      return isStopword
        ? "border: 1px dashed #fa5252; background: #fff5f5; color: #fa5252; text-decoration: line-through; opacity: 0.55;"
        : "border: 1px solid #ced4da; background: #fff; color: #495057;";
    });

    afterContentHtml = renderTokenBadges(tokensCleaned, () => "border: 1px solid #1c7ed6; background: #e7f5ff; color: #1c7ed6; font-weight:600;");
  }

  if (currentPipelineStageId === "0_raw") {
    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #dee2e6; padding-bottom:6px;">
        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #333;">数据清洗分词管道交互探针 (样本 ID: ${item.id} - 类别: ${item.category})</h4>
        <span style="font-size: 12px; color: #868e96;">💡 点击流程图节点观察文本在各阶段的物理过滤变化</span>
      </div>

      <!-- 流程节点流 -->
      <div class="pipeline-flow-container" style="display:flex; justify-content:start; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; background:#fff; padding:8px 12px; border-radius:4px; border:1px solid #e9ecef;">
        ${stagesHtml}
      </div>

      <!-- 原始文本单栏展示 -->
      <div style="display:flex; flex-direction:column; min-width:0;">
        <div style="font-size:12px; font-weight:700; color:#1c7ed6; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
          <span>当前状态:</span> <strong>邮件原始载入文本 (未做任何过滤清洗)</strong>
        </div>
        <div style="border:1px solid #dee2e6; border-radius:4px; background:#fff; padding:4px; overflow:hidden;">
          <pre class="probe-text-pre" style="color: #333; height:200px;">${escapeHtml(stagesData["0_raw"] || "")}</pre>
        </div>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #dee2e6; padding-bottom:6px;">
        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #333;">数据清洗分词管道交互探针 (样本 ID: ${item.id} - 类别: ${item.category})</h4>
        <span style="font-size: 12px; color: #868e96;">💡 点击流程图节点观察文本在各阶段的物理过滤变化</span>
      </div>

      <!-- 流程节点流 -->
      <div class="pipeline-flow-container" style="display:flex; justify-content:start; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; background:#fff; padding:8px 12px; border-radius:4px; border:1px solid #e9ecef;">
        ${stagesHtml}
      </div>

      <!-- 左右对比视图 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch;">
        <div style="display:flex; flex-direction:column; min-width:0;">
          <div style="font-size:12px; font-weight:700; color:#e03131; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            <span>Before:</span> <strong>${escapeHtml(beforeTitle)}</strong>
          </div>
          <div style="flex:1; border:1px solid #dee2e6; border-radius:4px; background:#fff; padding:4px; overflow:hidden;">
            ${beforeContentHtml}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; min-width:0;">
          <div style="font-size:12px; font-weight:700; color:#2b8a3e; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            <span>After:</span> <strong>${escapeHtml(afterTitle)}</strong>
          </div>
          <div style="flex:1; border:1px solid #dee2e6; border-radius:4px; background:#fff; padding:4px; overflow:hidden;">
            ${afterContentHtml}
          </div>
        </div>
      </div>
    </div>
  `;
  }

  wrap.querySelectorAll(".pipeline-stage-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const stage = btn.dataset.stage;
      renderPreprocessingPipelineProbe(item, stage);
    });
  });
}
window.renderPreprocessingPipelineProbe = renderPreprocessingPipelineProbe;

function renderVectorizeOverview() {
  const grid = $("chartGrid");
  if (!grid) return;

  const oldLog = $("debugLogBox");
  if (oldLog) oldLog.remove();

  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["vectorize_dashboard"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 5 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("vectorize_dashboard", layout),
    htmlForView: () => preprocessVectorizeDashboardHtml(),
    minWidthForView: () => 4,
    minHeightForView: () => 4,
  });

  let retryCount = 0;
  function tryRenderVectorize() {
    const canvas = $("sparsityCanvas");
    const chartEl = $("nbVectorizeWordsChart");
    const formulaWrap = $("vectorizeMathProbeWrap");

    if ((!canvas || !chartEl || !formulaWrap) && retryCount < 20) {
      retryCount++;
      setTimeout(tryRenderVectorize, 50);
      return;
    }

    injectMathFormulaStyles();
    try {
      renderNbVectorizeWordsChart();
    } catch (e) {
      console.error("renderNbVectorizeWordsChart error", e);
    }
    if (vectorizeCache) {
      try {
        if (canvas && vectorizeCache.matrix_sparse_points) {
          drawMatrixSparsityCanvas(vectorizeCache.matrix_sparse_points);
        }
      } catch (e) {
        console.error("drawMatrixSparsityCanvas error", e);
      }
      try {
        if (formulaWrap && vectorizeCache.preview && vectorizeCache.preview.length > 0) {
          const firstRow = vectorizeCache.preview[0];
          if (firstRow.features && firstRow.features.length > 0) {
            renderVectorizeMathFormula(firstRow.features[0], firstRow.id, firstRow.category);
          }
        }
      } catch (e) {
        console.error("renderVectorizeMathFormula error", e);
      }
    }
  }
  setTimeout(tryRenderVectorize, 50);
}


function renderTokenBadges(tokens = [], getStyle = () => "") {
  if (!tokens.length) {
    return `<div style="color:#868e96; padding:20px; font-size:11px; text-align:center;">(空 Token 序列)</div>`;
  }
  const badges = tokens.map((tok, idx) => {
    const style = getStyle(idx);
    return `<span style="display:inline-block; padding: 2px 6px; font-size:12px; font-family: monospace; border-radius:4px; white-space: nowrap; ${style}">${escapeHtml(tok)}</span>`;
  }).join("");
  return `<div style="display:flex; flex-wrap:wrap; gap:6px; max-height:200px; overflow-y:auto; padding:8px; align-content: flex-start; background:#fafafa;">${badges}</div>`;
}

function showTokenizeDetailModal(rowId) {
  const item = tokenizeCache?.preview?.find(d => d.id === rowId);
  if (!item) return;

  const backdrop = document.createElement("div");
  backdrop.className = "test-modal-backdrop";
  backdrop.id = "tokenizeDetailModal";
  backdrop.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

  const modal = document.createElement("div");
  modal.className = "test-modal";
  modal.style = "background: #fff; width: 900px; max-width: 95%; max-height: 85%; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden;";

  modal.innerHTML = `
    <div class="test-modal-head" style="background: #f8f9fa; padding: 10px 16px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #333;">
        分词与清洗对照视图 (ID: ${item.id} - 类别: ${escapeHtml(item.category)})
      </h3>
      <button type="button" style="border: none; background: transparent; font-size: 18px; cursor: pointer; color: #868e96; margin: 0; padding: 0;" onclick="document.getElementById('tokenizeDetailModal').remove()">&times;</button>
    </div>
    <div style="padding: 16px; overflow-y: auto; flex: 1; background: #fafafa; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h4 style="margin: 0; font-size: 12px; font-weight: 600; color: #495057;">邮件原始文本 (Raw Text):</h4>
        <pre style="margin: 0; padding: 10px; background: #fff; border: 1px solid #e9ecef; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; color: #333; height: 360px; overflow-y: auto;">${escapeHtml(item.full_raw_text || "(空文本)")}</pre>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h4 style="margin: 0; font-size: 12px; font-weight: 600; color: #495057;">分词与清洗后序列 (Cleaned Tokens):</h4>
        <pre style="margin: 0; padding: 10px; background: #fff; border: 1px solid #e9ecef; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; color: #2b8a3e; height: 360px; overflow-y: auto;">${escapeHtml(item.full_cleaned_tokens || "(空分词列表)")}</pre>
      </div>
    </div>
    <div style="background: #f8f9fa; padding: 10px 16px; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 8px;">
      <button class="primary-btn" style="margin: 0; padding: 4px 12px; font-size: 12px;" type="button" onclick="document.getElementById('tokenizeDetailModal').remove()">关闭</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}
window.showTokenizeDetailModal = showTokenizeDetailModal;

function renderNbTopWordsChart() {
  const chartEl = $("nbTopWordsChart");
  if (!chartEl || !tokenizeCache || !tokenizeCache.top_tokens) return;

  const myChart = initEchartsWithFont(chartEl);
  const data = [...tokenizeCache.top_tokens].reverse(); // reverse for horizontal chart

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      top: '5%',
      left: '3%',
      right: '10%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '词频 (次)',
      nameTextStyle: { color: '#666', fontSize: 10 },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.word),
      axisLabel: {
        fontSize: 10,
        color: '#333'
      }
    },
    series: [
      {
        name: '出现次数',
        type: 'bar',
        barWidth: '55%',
        data: data.map(d => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#a8e6cf' },
            { offset: 1, color: '#3b7a57' }
          ])
        },
        label: {
          show: true,
          position: 'right',
          color: '#333',
          fontSize: 10
        }
      }
    ]
  };
  myChart.setOption(option);
  charts.set("nbTopWordsChart", myChart);
  window.addEventListener('resize', () => myChart.resize());
}

// ----------------------------------------------------
// 特征向量化 (Vectorize) 模块的核心逻辑与可视化
// ----------------------------------------------------

function renderPreprocessVectorizePanel() {
  const isCompleted = vectorizeCompleted;
  const options = vectorizeCache?.vectorize_options || {
    vectorizer_type: "tfidf",
    max_features: 1000,
    ngram_min: 1,
    ngram_max: 1,
    min_df: 2
  };

  const tfidfSelected = options.vectorizer_type === "tfidf" ? "selected" : "";
  const countSelected = options.vectorizer_type === "count" ? "selected" : "";

  const max500 = options.max_features === 500 ? "selected" : "";
  const max1000 = (options.max_features === 1000 || !options.max_features) ? "selected" : "";
  const max2000 = options.max_features === 2000 ? "selected" : "";
  const max5000 = options.max_features === 5000 ? "selected" : "";

  const isNgram1 = (options.ngram_min === 1 && options.ngram_max === 1) ? "selected" : "";
  const isNgram2 = (options.ngram_min === 1 && options.ngram_max === 2) ? "selected" : "";

  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>特征向量化</h3>

      <div class="control-group">
        <label class="control-label" for="vecType">特征表达模型</label>
        <select id="vecType">
          <option value="tfidf" ${tfidfSelected}>TF-IDF 模型 (推荐)</option>
          <option value="count" ${countSelected}>词频 (Count) 模型</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label" for="vecMaxFeatures">最大词表特征数 (max_features)</label>
        <select id="vecMaxFeatures">
          <option value="500" ${max500}>500 维</option>
          <option value="1000" ${max1000}>1000 维 (推荐)</option>
          <option value="2000" ${max2000}>2000 维</option>
          <option value="5000" ${max5000}>5000 维</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label" for="vecNgram">N-Gram 区间</label>
        <select id="vecNgram">
          <option value="1-1" ${isNgram1}>1-Gram (纯单字)</option>
          <option value="1-2" ${isNgram2}>1-2 Gram (词组与单字)</option>
        </select>
      </div>

      <div class="btn-row">
        <button class="primary-btn" id="runVectorizeBtn" type="button">${isCompleted ? "重新执行向量化" : "执行特征向量化"}</button>
      </div>
      <div class="status-line hidden" id="vectorizeStatusMsg"></div>
      ${preprocessCodeButtonHtml("vectorize")}
    </div>`;
}

async function runVectorize() {
  const vectorizer_type = $("vecType")?.value || "tfidf";
  const max_features = $("vecMaxFeatures")?.value || "1000";
  const ngram = $("vecNgram")?.value || "1-1";
  const [ngram_min, ngram_max] = ngram.split("-").map(Number);

  const btn = $("runVectorizeBtn");
  const msgEl = $("vectorizeStatusMsg");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "转换中...";
  }
  if (msgEl) {
    msgEl.classList.remove("hidden", "error");
    msgEl.textContent = "正在构建稀疏特征表示矩阵，请稍候...";
  }

  try {
    const res = await runAction("vectorize_dataset", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      vectorizer_type,
      max_features,
      ngram_min,
      ngram_max,
      min_df: 2
    });
    vectorizeCache = res;
    vectorizeCompleted = true;
    if (msgEl) {
      msgEl.textContent = "特征向量化转换成功！";
      setTimeout(() => { msgEl.classList.add("hidden"); }, 2000);
    }
    renderPreprocessVectorizePanel(); // Refresh button text
    await renderPreprocessCurrentStep();
    if (activePreprocessStep === "vectorize" && guideEnabledForPreprocessVectorize()) {
      const gState = guidePageState(PREPROCESS_VECTORIZE_GUIDE_ID);
      if (gState.step === "run_vectorize") {
        setGuidePageState({ step: "review_vectorize" }, PREPROCESS_VECTORIZE_GUIDE_ID);
        updatePreprocessVectorizeGuide();
      }
    }
  } catch (err) {
    if (msgEl) {
      msgEl.classList.add("error");
      msgEl.textContent = "处理失败: " + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "重新执行向量化";
    }
  }
}
window.runVectorize = runVectorize;

function triggerVectorizeBtnClick() {
  const btn = $("runVectorizeBtn");
  if (btn) {
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.style.boxShadow = "0 0 0 4px rgba(34, 139, 230, 0.4)";
    setTimeout(() => { btn.style.boxShadow = ""; }, 1500);
  }
}
window.triggerVectorizeBtnClick = triggerVectorizeBtnClick;



function preprocessVectorizeDashboardHtml() {
  const cache = vectorizeCache || {};
  const metrics = [
    { label: "矩阵维度 (样本数 × 特征数)", value: cache.rows && cache.cols ? `${cache.rows} × ${cache.cols}` : "--" },
    { label: "矩阵稀疏度 (Sparsity)", value: cache.sparsity !== undefined ? `${cache.sparsity}%` : "--" },
    { label: "非零项占比 (Density)", value: cache.density !== undefined ? `${cache.density}%` : "--" },
    { label: "非零特征项总数 (NNZ)", value: cache.nnz ?? "--" }
  ];
  
  const isTfidf = cache.top_15_features && cache.top_15_features.length && typeof cache.top_15_features[0].value === 'number' && !Number.isInteger(cache.top_15_features[0].value);
  const chartTitle = isTfidf ? "IDF 区分度最高特征排名前 15 位" : "特征词频总次数排名前 15 位";

  return `
    <section class="preprocess-dashboard-card preprocess-info-card preprocess-loaded-card">
      <div class="chart-head">
        <div>
          <div class="chart-title" style="color: #333;">03 特征向量化效果可视化</div>
          <div class="chart-sub">观察文本向稀疏数值矩阵的转换，学习词表在高区分特征和稀疏状态下的数学分布。</div>
        </div>
      </div>
      <div class="info-card-body preprocess-step-body" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 16px; align-items: start;">
          <div style="background: #f8f9fa; border-radius: 6px; padding: 12px; border: 1px solid #e9ecef; min-height: 180px;">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">稀疏矩阵物理特征</h4>
            <div class="preprocess-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${metrics.map(m => `
                <div class="preprocess-metric" style="background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #dee2e6; text-align:center;">
                  <span style="font-size: 11px; color: #868e96; display: block; margin-bottom: 2px;">${escapeHtml(m.label)}</span>
                  <strong style="font-size: 13px; color: #212529;">${m.value}</strong>
                </div>
              `).join("")}
            </div>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #868e96; line-height: 1.45;">
              💡 稀疏度反映了零元素占比。高维文本往往极度稀疏，了解本项有助于理解稀疏矩阵存储的必要性。
            </p>
          </div>
          <!-- 稀疏网格 Canvas 星空图 -->
          <div style="background: #0f111a; border-radius: 6px; padding: 10px; border: 1px solid #1f2233; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
            <div style="font-size: 11px; color: #8f9fc2; margin-bottom: 4px; font-family: monospace; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: flex-start;">
              <span style="display:inline-block; width: 6px; height: 6px; border-radius:50%; background: #228be6; box-shadow: 0 0 6px #228be6;"></span>
              稀疏矩阵子区发光点阵图 (100 样本 × 200 特征)
            </div>
            <canvas id="sparsityCanvas" width="340" height="120" style="background: #05060a; border: 1px solid #222533; border-radius: 4px; cursor: crosshair;"></canvas>
            <div id="sparsityHoverInfo" style="font-size: 11.5px; color: #8f9fc2; font-family: monospace; width: 100%; text-align: left; margin-top: 4px; min-height: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
              💡 鼠标悬停在点阵图上可查看具体格点与权重
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; min-height: 280px;">
          <div style="background: #fff; border-radius: 6px; padding: 10px; border: 1px solid #e9ecef; display: flex; flex-direction: column;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #495057; flex: 0 0 auto;">${escapeHtml(chartTitle)}</h4>
            <div id="nbVectorizeWordsChart" style="width: 100%; flex: 1 1 auto; min-height: 260px;"></div>
          </div>
          <!-- 特征权重数学解剖探针 -->
          <div id="vectorizeMathProbeWrap" class="math-formula-box">
            <div class="math-formula-title">
              <div class="math-formula-kicker">特征权重数学解剖</div>
              <div class="math-formula-meta">
                <span class="math-formula-chip"><strong>点击气泡</strong>查看某个词的权重推导</span>
              </div>
            </div>
            <div class="preprocess-math-placeholder">点击下方表格中的特征词气泡，即可在这里查看该词的代入公式、分步计算和最终权重。</div>
          </div>
        </div>
        
        <div>
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #495057;">样本特征稀疏权重向量预览 (展示前 10 条，点击气泡可解剖权重算式)</h4>
          <div class="table-wrap" style="overflow-x: auto; border: 1px solid #dee2e6; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f1f3f5; border-bottom: 1px solid #dee2e6;">
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 40px;">序号</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 110px;">类别</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 220px;">分词与清洗序列 (Tokens)</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057;">Top 8 权重特征向量气泡 (Sparse Vector Badges)</th>
                </tr>
              </thead>
              <tbody>
                ${nbVectorizePreviewRowsHtml(cache.preview || [])}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function getFeatureWeightColor(weight, maxWeight) {
  const ratio = maxWeight > 0 ? (weight / maxWeight) : 0;
  // We use #228be6 (primary blue) as base.
  // alpha from 0.1 to 0.95
  const alpha = 0.1 + 0.85 * ratio;
  return {
    bg: `rgba(34, 139, 230, ${alpha})`,
    text: alpha > 0.55 ? '#fff' : '#1864ab',
    border: `rgba(34, 139, 230, ${Math.min(1, alpha + 0.15)})`
  };
}

function nbVectorizePreviewRowsHtml(rows = []) {
  if (!rows.length) {
    return `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #868e96;">暂无向量化预览数据</td></tr>`;
  }
  const badgeColors = {
    "sci.space": "background: #e7f5ff; color: #1c7ed6; border: 1px solid #a5d8ff;",
    "rec.autos": "background: #fff4e6; color: #d9480f; border: 1px solid #ffd8a8;",
    "rec.sport.baseball": "background: #ebfbee; color: #2b8a3e; border: 1px solid #b2f2bb;",
    "sci.med": "background: #f8f0fc; color: #862e9c; border: 1px solid #eebefa;"
  };

  return rows.map(row => {
    const badgeStyle = badgeColors[row.category] || "background: #f1f3f5; color: #495057; border: 1px solid #ced4da;";

    // Calculate max weight in this row to scale colors
    const maxWeight = row.features && row.features.length ? Math.max(...row.features.map(f => f.weight)) : 0;

    const featureBadgesHtml = (row.features || []).map(f => {
      const colors = getFeatureWeightColor(f.weight, maxWeight);
      const isCount = Number.isInteger(f.weight);
      const weightDisplay = isCount ? `词频: ${f.weight}` : `权重: ${f.weight.toFixed(4)}`;
      return `
        <span style="display:inline-block; padding: 2px 6px; font-size:11px; font-family: monospace; border-radius:4px; font-weight:600; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; cursor: pointer; white-space: nowrap; transition: transform 0.15s;" title="${escapeHtml(f.word)} (${weightDisplay}，点击可解剖计算公式)" onclick="loadWordToMathProbe(${row.id}, '${escapeHtml(f.word)}')">
          ${escapeHtml(f.word)}
        </span>
      `;
    }).join("");

    const displayBadges = featureBadgesHtml || `<span style="color:#868e96; font-style:italic;">(无有效特征词)</span>`;

    return `
      <tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 8px; color: #868e96;">${row.id}</td>
        <td style="padding: 8px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; ${badgeStyle}">
            ${escapeHtml(row.category)}
          </span>
        </td>
        <td style="padding: 8px; color: #868e96; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;" title="${escapeHtml(row.tokens_preview)}">
          ${escapeHtml(row.tokens_preview)}
        </td>
        <td style="padding: 8px;">
          <div style="display:flex; flex-wrap:wrap; gap:5px; max-width:500px;">
            ${displayBadges}
          </div>
        </td>
      </tr>`;
  }).join("");
}

function renderNbVectorizeWordsChart() {
  const chartEl = $("nbVectorizeWordsChart");
  if (!chartEl || !vectorizeCache || !vectorizeCache.top_15_features) return;

  const myChart = initEchartsWithFont(chartEl);
  const data = [...vectorizeCache.top_15_features].reverse(); // reverse for horizontal chart

  const isTfidf = data.length && typeof data[0].value === 'number' && !Number.isInteger(data[0].value);
  const xLabel = isTfidf ? '逆文档频率 (IDF)' : '出现总次数';

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const p = params[0];
        const val = isTfidf ? p.value.toFixed(4) : p.value;
        return `<strong>${p.name}</strong><br/>${isTfidf ? 'IDF 权重' : '词频'}: ${val}`;
      }
    },
    grid: {
      top: '4%',
      left: '6%',
      right: '20%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: xLabel,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: '#94a3b8', fontSize: 10 },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.word),
      axisLabel: {
        fontSize: 11,
        color: '#374151',
        width: 90,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: isTfidf ? 'IDF 权重' : '出现次数',
        type: 'bar',
        barWidth: '60%',
        data: data.map(d => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#bfdbfe' },
            { offset: 1, color: '#2563eb' }
          ]),
          borderRadius: [0, 3, 3, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: '#374151',
          formatter: params => isTfidf ? params.value.toFixed(2) : params.value,
          fontSize: 10.5,
          fontWeight: 600
        }
      }
    ]
  };
  myChart.setOption(option);
  charts.set("nbVectorizeWordsChart", myChart);
  window.addEventListener('resize', () => myChart.resize());
}

function guideEnabledForPreprocessVectorize() {
  const state = guidePageState(PREPROCESS_VECTORIZE_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function preprocessVectorizeGuideSpec() {
  const state = guidePageState(PREPROCESS_VECTORIZE_GUIDE_ID);
  const step = state.step === "test_close" ? "vectorize_settings" : (state.step || "vectorize_settings");
  if (step === "test_modal") {
    return {
      step,
      target: ".test-modal",
      title: "查看本页观察任务",
      body: "在这里了解特征向量化需要解决的问题和实践目标。例如探究稀疏度、为什么文本数据稀疏、TF-IDF与词频模式的差异。关闭弹窗后开始操作。",
      action: "我知道了",
    };
  }
  if (step === "test_close") {
    return {
      step,
      target: "[data-test-close]",
      title: "关闭弹窗，开始操作",
      body: "现在关闭测试弹窗。接下来我们去控制面板中了解和配置特征向量化模型与维度。",
      action: "",
    };
  }
  if (step === "vectorize_settings") {
    return {
      step,
      target: ".control-card.dataset-load-card",
      title: "设置特征向量化选项",
      body: "在控制面板中，我们可以选择表达模型（TF-IDF 或 词频模型），限定特征最大维度（如 1000），以及支持 1-2 Gram 词组。高维文本往往很稀疏，合理设定特征数至关重要。",
      action: "已了解，下一步",
    };
  }
  if (step === "run_vectorize") {
    return {
      step,
      target: "#runVectorizeBtn",
      title: "执行特征向量化",
      body: "点击【执行特征向量化】按钮，系统会调用后端 sklearn 的向量化器将清洗后的文档序列转换为稀疏特征矩阵。请点击此按钮继续。",
      action: "",
    };
  }
  if (step === "review_vectorize") {
    return {
      step,
      target: ".preprocess-info-card",
      title: "观察高区分度特征与稀疏向量表示",
      body: "向量化处理已成功！重点关注：矩阵维度、稀疏度（通常达 98% 以上，这解释了为何我们需要稀疏矩阵存储形式）、IDF/词频横向柱状图（了解罕见高区分度词的分布）。同时在下方预览表中，观察不同行样本中 Top 8 特征词由于权重大小而呈现出的自适应颜色深度气泡徽章 (Sparse Badges)。",
      action: "下一步",
    };
  }
  if (step === "code_button") {
    return {
      step,
      target: '[data-preprocess-code="vectorize"]',
      title: "查看这步处理的代码",
      body: "现在请点击“查看本步骤代码”。接下来我们会看到特征向量化是如何在 Python 后端使用 sklearn 库实现的。",
      action: "",
    };
  }
  if (step === "code_drawer") {
    return {
      step,
      target: ".code-drawer",
      title: "学习特征特征向量化核心代码",
      body: "这里展示了 sklearn 里的 TfidfVectorizer 和 CountVectorizer 的使用方法。观察它们是如何拟合文本序列、生成词表矩阵，并通过 fit_transform 获得稀疏矩阵的。这是将人类语言映射到计算机数值向量的最核心逻辑！",
      action: "完成本页引导",
    };
  }
  return {
    step: "vectorize_settings",
    target: ".control-card.dataset-load-card",
    title: "设置特征向量化选项",
    body: "在控制面板中，我们可以选择表达模型、限定词表维度并选择 N-Gram 区间。确认设置后即可执行向量化。",
    action: "已了解，下一步",
  };
}

function updatePreprocessVectorizeGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "preprocess" || activePreprocessStep !== "vectorize" || !guideEnabledForPreprocessVectorize()) {
      closePreprocessVectorizeGuide();
      return;
    }
    const spec = preprocessVectorizeGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closePreprocessVectorizeGuide();
      return;
    }
    renderPreprocessVectorizeGuide(spec, target);
  });
}

function renderPreprocessVectorizeGuide(spec, target) {
  closePreprocessVectorizeGuide();
  const visualTarget = guideVisualTarget(target);
  visualTarget.classList.add("guide-highlight");
  if (["review_vectorize", "code_drawer", "test_modal"].includes(spec.step)) visualTarget.classList.add("guide-highlight-large");
  const useBackdrop = !["test_modal", "code_drawer"].includes(spec.step);
  document.body.insertAdjacentHTML("beforeend", `
    ${useBackdrop ? `<div class="guide-backdrop" aria-hidden="true"></div>` : ""}
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="特征向量化引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = ["review_vectorize", "code_drawer"].includes(spec.step);
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
      if (guidePageState(PREPROCESS_VECTORIZE_GUIDE_ID).step === "code_drawer") closePreprocessCodeDrawer();
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "vectorize_settings" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessVectorizeGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "test_modal") {
      document.querySelector("[data-test-close]")?.click();
      setGuidePageState({ step: "vectorize_settings" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      setTimeout(updatePreprocessVectorizeGuide, 60);
    } else if (step === "vectorize_settings") {
      setGuidePageState({ step: "run_vectorize" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      updatePreprocessVectorizeGuide();
    } else if (step === "run_vectorize") {
      // Allow manual action or skip
      setGuidePageState({ step: "review_vectorize" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      updatePreprocessVectorizeGuide();
    } else if (step === "review_vectorize") {
      setGuidePageState({ step: "code_button" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      updatePreprocessVectorizeGuide();
    } else if (step === "code_button") {
      setGuidePageState({ step: "code_drawer" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      updatePreprocessVectorizeGuide();
    } else if (step === "code_drawer") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "vectorize_settings" }, PREPROCESS_VECTORIZE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closePreprocessCodeDrawer();
      closePreprocessVectorizeGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}
window.renderNbVectorizeWordsChart = renderNbVectorizeWordsChart;

function injectMathFormulaStyles() {
  if ($("nbMathFormulaStyles")) return;
  const style = document.createElement("style");
  style.id = "nbMathFormulaStyles";
  style.innerHTML = `
    .math-formula-box {
      position: relative;
      min-height: 0;
      color: #0f172a;
      font-family: Inter, "Microsoft YaHei", sans-serif;
    }
    .math-formula-title {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }
    .math-formula-kicker {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(37, 99, 235, 0.08);
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .math-formula-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }
    .math-formula-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 11px;
      white-space: nowrap;
    }
    .math-formula-chip strong {
      color: #0f172a;
      font-weight: 700;
    }
    .formula-latex {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 16px;
      color: #212529;
      margin: 5px 0;
    }
    .formula-katex-display {
      display: block;
      text-align: center;
      margin: 0;
      padding: 7px 10px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .formula-katex-display .katex-display {
      margin: 0;
    }
    .formula-katex-display .katex {
      font-size: 1em;
    }
    .preprocess-math-fallback {
      font-family: 'Times New Roman', Times, serif;
    }
    /* Compact inline stat row */
    .math-formula-summary {
      display: flex;
      gap: 0;
      margin-top: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .math-summary-card {
      flex: 1;
      padding: 5px 8px;
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
      text-align: center;
    }
    .math-summary-card:last-child {
      border-right: none;
    }
    .math-summary-card .label {
      font-size: 10px;
      color: #94a3b8;
      letter-spacing: 0.04em;
      margin-bottom: 1px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .math-summary-card .value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      word-break: break-word;
      font-variant-numeric: tabular-nums;
    }
    /* Flat numbered step list */
    .math-step-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .math-step-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
      background: #fff;
      transition: background .12s ease;
    }
    .math-step-card:last-child {
      border-bottom: none;
    }
    .math-step-card:hover {
      background: #f8fafc;
    }
    .math-step-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0;
    }
    .math-step-index {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      background: #2563eb;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      flex: 0 0 auto;
      margin-top: 1px;
    }
    .math-step-content {
      flex: 1;
      min-width: 0;
    }
    .math-step-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 1px;
    }
    .math-step-body {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
    }
    .math-step-body strong {
      color: #1d4ed8;
    }
    .math-step-body .katex {
      font-size: 1.2em;
    }
    .math-footer-note {
      margin-top: 6px;
      padding: 6px 8px;
      border-radius: 5px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #78350f;
      font-size: 12px;
      line-height: 1.5;
    }
    .math-footer-note strong {
      color: #b45309;
    }
    .preprocess-math-placeholder {
      display: grid;
      place-items: center;
      min-height: 100px;
      color: #94a3b8;
      font-size: 11.5px;
      text-align: center;
      padding: 10px;
    }
    .formula-step-desc strong {
      color: #228be6;
    }
    .formula-badge-highlight {
      background: #e7f5ff;
      color: #1c7ed6;
      border: 1px solid #a5d8ff;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

let sparsityPointsCache = [];
let activeHoverPoint = null;

function updateSparsityHoverInfo(point) {
  const hoverInfo = $("sparsityHoverInfo");
  if (!hoverInfo) return;

  const sampleId = point.r + 1;
  const featureIndex = point.c;

  let valText = "";
  let wordText = "";

  if (vectorizeCache && vectorizeCache.preview) {
    const rowItem = vectorizeCache.preview.find(d => d.id === sampleId);
    if (rowItem && rowItem.features) {
      const f = rowItem.features.find(item => Math.abs(item.weight - point.val) < 0.0001);
      if (f) {
        wordText = ` | 单词: <strong style="color:#fff; background:#228be6; padding:1px 4px; border-radius:2px;">${escapeHtml(f.word)}</strong>`;
      }
    }
  }

  if (point.val > 0) {
    const isCount = Number.isInteger(point.val);
    valText = isCount ? `词频: <strong style="color:#4dabf7; font-weight:700;">${point.val}</strong>` : `权重: <strong style="color:#4dabf7; font-weight:700;">${point.val.toFixed(4)}</strong>`;
    hoverInfo.innerHTML = `<span style="color:#e9ecef; font-weight:600;">🎯 探针 - 样本ID: ${sampleId} | 特征索引: ${featureIndex}${wordText} | ${valText}</span>`;
  } else {
    hoverInfo.innerHTML = `<span style="color:#a6a7ab;">🔍 探针 - 样本ID: ${sampleId} | 特征索引: ${featureIndex} | 权重: 0.0000</span>`;
  }
}

function renderZoomScope(centerRow, centerCol) {
  const scopeWrap = $("sparsityZoomScope");
  const placeholder = $("sparsityZoomPlaceholder");
  if (!scopeWrap) return;

  if (placeholder) placeholder.style.display = "none";

  const numRows = 100;
  const numCols = 200;

  let html = "";
  for (let r = centerRow - 2; r <= centerRow + 3; r++) {
    for (let c = centerCol - 2; c <= centerCol + 3; c++) {
      if (r < 0 || r >= numRows || c < 0 || c >= numCols) {
        html += `<div style="background: #020304; border: 1px solid #111; opacity: 0.3;"></div>`;
        continue;
      }

      const point = sparsityPointsCache.find(([pr, pc]) => pr === r && pc === c);
      const isCenter = r === centerRow && c === centerCol;
      const val = point ? point[2] : 0;

      const word = vectorizeCache?.sub_feature_names?.[c] || `C${c}`;
      const wordShort = word.length > 5 ? word.substring(0, 4) + "." : word;

      let style = "display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-family: monospace; border-radius: 2px; transition: all 0.1s;";
      if (isCenter) {
        style += " border: 1px solid #ff922b; box-shadow: 0 0 4px #ff922b;";
      } else {
        style += " border: 1px solid #2b3040;";
      }

      if (val > 0) {
        const ratio = Math.min(1, val);
        const alpha = 0.25 + 0.7 * ratio;
        const bg = isCenter ? `rgba(255, 146, 43, ${alpha})` : `rgba(34, 139, 230, ${alpha})`;
        const text = alpha > 0.45 ? "#fff" : "#74c0fc";

        html += `
          <div style="${style} background: ${bg}; color: ${text}; font-weight: bold;" title="${escapeHtml(word)}: ${val.toFixed(4)}">
            <span style="font-size: 7px; transform: scale(0.95); line-height: 1;">${escapeHtml(wordShort)}</span>
            <span style="font-size: 6px; opacity: 0.8; transform: scale(0.8);">${val.toFixed(2)}</span>
          </div>`;
      } else {
        const bg = isCenter ? "rgba(255, 146, 43, 0.05)" : "#07080c";
        const text = isCenter ? "#ff922b" : "#495057";
        html += `
          <div style="${style} background: ${bg} !important; color: ${text};">
            <span style="opacity: 0.35;">-</span>
          </div>`;
      }
    }
  }

  scopeWrap.innerHTML = html;
}

function renderSparsityCanvasState(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // 1. 绘制极深色底色，突出对比度
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, width, height);

  const numRows = 100;
  const numCols = 200;
  const cellW = width / numCols;
  const cellH = height / numRows;

  // 2. 绘制微弱的网格线底纹，制造雷达网格物理槽位感 (每 10 行、20 列一条主线，其余为极淡辅助线)
  ctx.strokeStyle = "rgba(34, 139, 230, 0.03)";
  ctx.lineWidth = 0.5;
  for (let r = 1; r < numRows; r++) {
    if (r % 10 === 0) continue;
    const y = r * cellH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  for (let c = 1; c < numCols; c++) {
    if (c % 20 === 0) continue;
    const x = c * cellW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }

  // 绘制 10行、20列 的高对比度主刻度线
  ctx.strokeStyle = "rgba(34, 139, 230, 0.12)";
  ctx.lineWidth = 0.8;
  for (let r = 10; r < numRows; r += 10) {
    const y = r * cellH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  for (let c = 20; c < numCols; c += 20) {
    const x = c * cellW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }

  // 3. 绘制发光非零元 (增强对比度和核心光亮)
  sparsityPointsCache.forEach(([r, c, val]) => {
    if (r >= numRows || c >= numCols) return;
    const x = c * cellW + cellW / 2;
    const y = r * cellH + cellH / 2;

    const ratio = Math.min(1, val);
    const radius = Math.max(1.8, cellW / 2);
    const alpha = 0.65 + 0.35 * ratio;

    // 放射状发光渐变
    const grad = ctx.createRadialGradient(x, y, 0.1, x, y, radius * 2.8);
    grad.addColorStop(0, '#ffffff'); // 中心发白，突出刺眼发光
    grad.addColorStop(0.25, `rgba(77, 171, 247, ${alpha})`); // 浅蓝核心
    grad.addColorStop(0.65, `rgba(34, 139, 230, ${alpha * 0.35})`); // 深蓝发光环
    grad.addColorStop(1, 'rgba(34, 139, 230, 0)'); // 虚化边缘

    ctx.beginPath();
    ctx.arc(x, y, radius * 2.8, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
  });

  // 4. 绘制悬停 Crosshair
  if (activeHoverPoint) {
    const hx = activeHoverPoint.c * cellW + cellW / 2;
    const hy = activeHoverPoint.r * cellH + cellH / 2;

    ctx.strokeStyle = "rgba(34, 139, 230, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);

    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(width, hy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, height); ctx.stroke();
    ctx.setLineDash([]);

    // 单元格十字星准心发光边框
    ctx.strokeStyle = "#4dabf7";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(activeHoverPoint.c * cellW, activeHoverPoint.r * cellH, cellW, cellH);

    // 如果此格有非零值，画个警示光环
    if (activeHoverPoint.val > 0) {
      ctx.beginPath();
      ctx.arc(hx, hy, cellW * 3.5, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(224, 49, 49, 0.6)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

function drawMatrixSparsityCanvas(points = []) {
  const canvas = $("sparsityCanvas");
  if (!canvas) return;

  sparsityPointsCache = points;

  if (canvas.dataset.bound !== "1") {
    canvas.dataset.bound = "1";

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const numRows = 100;
      const numCols = 200;
      const cellW = canvas.width / numCols;
      const cellH = canvas.height / numRows;

      const col = Math.floor(mouseX / cellW);
      const row = Math.floor(mouseY / cellH);

      if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
        const point = sparsityPointsCache.find(([r, c]) => r === row && c === col);
        if (point) {
          activeHoverPoint = { r: point[0], c: point[1], val: point[2] };
        } else {
          activeHoverPoint = { r: row, c: col, val: 0 };
        }
        updateSparsityHoverInfo(activeHoverPoint);
        renderZoomScope(activeHoverPoint.r, activeHoverPoint.c);
      }
      renderSparsityCanvasState(canvas);
    });

    canvas.addEventListener("mouseleave", () => {
      activeHoverPoint = null;
      const hoverInfo = $("sparsityHoverInfo");
      if (hoverInfo) {
        hoverInfo.innerHTML = `💡 在左侧略缩图上移动鼠标，放大观察高稀疏格点`;
      }
      const scopeWrap = $("sparsityZoomScope");
      const placeholder = $("sparsityZoomPlaceholder");
      if (placeholder) placeholder.style.display = "flex";
      if (scopeWrap) scopeWrap.innerHTML = "";
      renderSparsityCanvasState(canvas);
    });
  }

  renderSparsityCanvasState(canvas);
}

function loadWordToMathProbe(sampleId, word) {
  if (!vectorizeCache || !vectorizeCache.preview) return;
  const sample = vectorizeCache.preview.find(d => d.id === sampleId);
  if (!sample || !sample.features) return;
  const wordMeta = sample.features.find(f => f.word === word);
  if (!wordMeta) return;

  renderVectorizeMathFormula(wordMeta, sampleId, sample.category);
}
window.loadWordToMathProbe = loadWordToMathProbe;

function renderVectorizeMathFormula(meta, sampleId, category) {
  const wrap = $("vectorizeMathProbeWrap");
  if (!wrap) return;

  lastVectorizeMathProbeState = { meta, sampleId, category };
  ensurePreprocessMathSupport();

  wrap.innerHTML = buildVectorizeMathProbeModernHtml(meta, sampleId, category);
}

function buildVectorizeMathProbeHtml(meta, sampleId, category) {
  const options = vectorizeCache?.vectorize_options || { vectorizer_type: "tfidf" };
  const isTfidf = options.vectorizer_type === "tfidf";

  let contentHtml = "";
  if (isTfidf) {
    const tfRaw = (meta.tf_in_doc / meta.doc_word_count).toFixed(5);
    contentHtml = `
      <div class="math-formula-title">
        <span>🔍 特征权重数学计算解剖 (单词: <span class="formula-badge-highlight">${escapeHtml(meta.word)}</span>)</span>
        <span style="font-size:12px; color:#868e96; font-weight:normal;">样本 ID: ${sampleId}</span>
      </div>
      <div style="font-size:13px; line-height:1.6; color:#666; margin-bottom:6px;">
        在样本 <strong>ID ${sampleId}</strong> (${escapeHtml(category)}) 中以 <strong>TF-IDF 模型</strong> 进行解剖：
      </div>

      <div class="formula-latex formula-katex-display" style="margin: 4px 0; background:#f1f3f5; padding:6px 8px; border-radius:4px;">
        ${renderPreprocessLatexToHtml(`\\text{TF-IDF} = \\frac{${meta.tf_in_doc}}{${meta.doc_word_count}} \\times \\left[\\ln\\left(\\frac{1 + 500}{1 + ${meta.df_global}}\\right) + 1\\right]`, true)}
      </div>

      <div class="formula-step-desc" style="font-size:13px; color:#495057; line-height: 1.6; margin-top:6px;">
        1. <strong>词频 (TF)</strong>：单词出现 <strong>${meta.tf_in_doc}</strong> 次，邮件总词数 <strong>${meta.doc_word_count}</strong>，$\\text{TF} = ${meta.tf_in_doc} / ${meta.doc_word_count} \\approx ${tfRaw}$。<br/>
        2. <strong>逆文档频率 (IDF)</strong>：全局 <strong>500</strong> 篇邮件中包含该词有 <strong>${meta.df_global}</strong> 篇，$\\text{IDF} = \\ln(501 / ${meta.df_global + 1}) + 1 \\approx ${meta.idf.toFixed(4)}$。<br/>
        3. <strong>相乘 (未归一化)</strong>：$\\text{TF} \\times \\text{IDF} = ${tfRaw} \\times ${meta.idf.toFixed(4)} \\approx ${meta.unnormalized_val.toFixed(4)}$。<br/>
        4. <strong>L2 归一化 (最终值)</strong>：经过全行向量模长归一化后，最终映射为稀疏矩阵中的数值特征值：<strong style="color:#228be6; font-size:12px;">${meta.weight.toFixed(4)}</strong>。
      </div>
    `;
  } else {
    contentHtml = `
      <div class="math-formula-title">
        <span>🔍 特征权重数学计算解剖 (单词: <span class="formula-badge-highlight">${escapeHtml(meta.word)}</span>)</span>
        <span style="font-size:12px; color:#868e96; font-weight:normal;">样本 ID: ${sampleId}</span>
      </div>
      <div style="font-size:13px; line-height:1.6; color:#666; margin-bottom:6px;">
        在样本 <strong>ID ${sampleId}</strong> (${escapeHtml(category)}) 中以 <strong>词频 (Count) 模型</strong> 进行解剖：
      </div>

      <div class="formula-latex formula-katex-display" style="margin: 4px 0; background:#f1f3f5; padding:6px 8px; border-radius:4px;">
        ${renderPreprocessLatexToHtml(`\\text{Count 特征值} = ${meta.tf_in_doc}`, true)}
      </div>

      <div class="formula-step-desc" style="font-size:13px; color:#495057; line-height: 1.6; margin-top:6px;">
        1. <strong>获取词频数</strong>：单词在当前文档中出现了 <strong>${meta.tf_in_doc}</strong> 次。<br/>
        2. <strong>全局文档频率 (DF)</strong>：该词在整个语料库的 <strong>500</strong> 篇邮件中一共在 <strong>${meta.df_global}</strong> 篇里出现过。<br/>
        3. <strong>计算结果</strong>：直接以单词实际出现频次作为特征表达值，即最终权重特征值为 <strong style="color:#228be6; font-size:12px;">${meta.weight}</strong>（词频模型无 IDF 及归一化计算）。
      </div>
    `;
  }

  return renderPreprocessMathMarkup(contentHtml);
}

function buildVectorizeMathProbeModernHtml(meta, sampleId, category) {
  const options = vectorizeCache?.vectorize_options || { vectorizer_type: "tfidf" };
  const isTfidf = options.vectorizer_type === "tfidf";
  const modelLabel = isTfidf ? "TF-IDF 模型" : "词频 Count 模型";
  const tfValue = Number(meta.tf_in_doc / meta.doc_word_count).toFixed(5);
  const summaryCards = isTfidf ? [
    { label: "词频 TF", value: `${meta.tf_in_doc} / ${meta.doc_word_count}` },
    { label: "逆文档频率 IDF", value: meta.idf.toFixed(4) },
    { label: "最终权重", value: meta.weight.toFixed(4) },
  ] : [
    { label: "词频 Count", value: String(meta.tf_in_doc) },
    { label: "文档频率 DF", value: String(meta.df_global) },
    { label: "最终权重", value: String(meta.weight) },
  ];
  const stepCards = isTfidf ? [
    {
      title: "先看词频 TF",
      body: `单词在当前文档里出现了 <strong>${meta.tf_in_doc}</strong> 次，总词数是 <strong>${meta.doc_word_count}</strong>。对应公式是 ${renderPreprocessLatexToHtml(`\\text{TF} = \\frac{${meta.tf_in_doc}}{${meta.doc_word_count}} \\approx ${tfValue}`, false)}。`,
    },
    {
      title: "再看逆文档频率 IDF",
      body: `该词在全局 <strong>500</strong> 篇邮件中出现于 <strong>${meta.df_global}</strong> 篇。对应公式是 ${renderPreprocessLatexToHtml(`\\text{IDF} = \\ln\\left(\\frac{501}{${meta.df_global + 1}}\\right) + 1 \\approx ${meta.idf.toFixed(4)}`, false)}。`,
    },
    {
      title: "把两者相乘",
      body: `${renderPreprocessLatexToHtml(`\\text{TF} \\times \\text{IDF} = ${tfValue} \\times ${meta.idf.toFixed(4)} \\approx ${meta.unnormalized_val.toFixed(4)}`, false)}`,
    },
    {
      title: "最后做 L2 归一化",
      body: `模型会把整行向量缩放到统一长度，所以真正落到稀疏矩阵里的值是 <strong>${meta.weight.toFixed(4)}</strong>。`,
    },
  ] : [
    {
      title: "直接统计出现次数",
      body: `词频模型不再计算 IDF，只看这个词在当前文档里出现了多少次。`,
    },
    {
      title: "得到最终特征值",
      body: `当前样本里，这个词的特征值就是 <strong>${meta.weight}</strong>。`,
    },
  ];
  const introText = isTfidf
    ? `这一步把单词在当前文档里的出现频率、在全语料里的区分度，以及最终的归一化权重拆开看。`
    : `词频模型更直接，它不计算区分度，只统计这个词在当前文档里出现了多少次。`;
  const formulaLatex = isTfidf
    ? `\\text{TF-IDF} = \\frac{${meta.tf_in_doc}}{${meta.doc_word_count}} \\times \\left[\\ln\\left(\\frac{1 + 500}{1 + ${meta.df_global}}\\right) + 1\\right]`
    : `\\text{Count 特征值} = ${meta.tf_in_doc}`;

  return `
    <div class="math-formula-title">
      <div>
        <div class="math-formula-kicker">${escapeHtml(modelLabel)}</div>
        <div style="margin-top:3px; font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.3;">单词 <span class="formula-badge-highlight">${escapeHtml(meta.word)}</span> 的权重推导</div>
      </div>
      <div class="math-formula-meta">
        <span class="math-formula-chip">样本 <strong>ID ${sampleId}</strong></span>
        <span class="math-formula-chip">类别 <strong>${escapeHtml(category)}</strong></span>
      </div>
    </div>
    <div style="font-size:12px; line-height:1.5; color:#475569; margin-bottom:5px;">${introText}</div>

    <div class="formula-latex formula-katex-display">
      ${renderPreprocessLatexToHtml(formulaLatex, true)}
    </div>

    <div class="math-formula-summary">
      ${summaryCards.map(card => `
        <div class="math-summary-card">
          <div class="label">${escapeHtml(card.label)}</div>
          <div class="value">${escapeHtml(card.value)}</div>
        </div>
      `).join("")}
    </div>

    <div class="math-step-list">
      ${stepCards.map((step, index) => `
        <article class="math-step-card">
          <span class="math-step-index">${index + 1}</span>
          <div class="math-step-content">
            <div class="math-step-title">${escapeHtml(step.title)}</div>
            <div class="math-step-body">${step.body}</div>
          </div>
        </article>
      `).join("")}
    </div>

    <div class="math-footer-note">
      <strong>读法：</strong>${isTfidf ? "先看 TF，再看 IDF，最后看归一化后的数值。这个词越能区分当前类别，最终权重通常越大。" : "这类模型就是“数次数”，没有 TF-IDF 那种对罕见词的额外加权。"}
    </div>
  `;
}


// ----------------------------------------------------
// 词频特征分析 (Word Freq & Chi-Square) 模块的核心逻辑与可视化
// ----------------------------------------------------

function renderWordFreqOverview() {
  const grid = $("chartGrid");
  if (!grid) return;

  const oldLog = $("debugLogBox");
  if (oldLog) oldLog.remove();

  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["word_freq_dashboard"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 5 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("word_freq_dashboard", layout),
    htmlForView: () => preprocessWordFreqDashboardHtml(),
    minWidthForView: () => 4,
    minHeightForView: () => 3,
  });

  let retryCount = 0;
  function tryRenderCharts() {
    const chartA = $("nbWordFreqChartA");
    const chartB = $("nbWordFreqChartB");
    if ((!chartA || !chartB) && retryCount < 20) {
      retryCount++;
      setTimeout(tryRenderCharts, 50);
      return;
    }

    injectMathFormulaStyles();
    injectChiSquareTableStyles();
    try {
      renderNbChiSquareRankingChart();
    } catch (e) {
      console.error("renderNbChiSquareRankingChart error", e);
    }
    try {
      renderNbWordFreqCharts();
    } catch (e) {
      console.error("renderNbWordFreqCharts error", e);
    }
    try {
      renderChiSquareMathFormula();
    } catch (e) {
      console.error("renderChiSquareMathFormula error", e);
    }
  }
  setTimeout(tryRenderCharts, 50);
}
window.renderWordFreqOverview = renderWordFreqOverview;

function preprocessWordFreqDashboardHtml() {
  if (!wordFreqCache) {
    return `
      <section class="preprocess-prompt-card" style="display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
          <p style="font-size: 13px; color: #868e96; margin: 0;">正在计算与分析词频卡方数据，请稍候...</p>
        </div>
      </section>
    `;
  }

  const c1 = wordFreqCache.c1_name;
  const c2 = wordFreqCache.c2_name;
  const word = wordFreqCache.target_word;
  const cont = wordFreqCache.contingency_table || { A: 0, B: 0, C: 0, D: 0, N: 0 };

  return `
    <section class="preprocess-dashboard-card preprocess-info-card preprocess-loaded-card">
      <div class="chart-head">
        <div>
          <div class="chart-title" style="color: #333;">04 类别词频分布与卡方检验特征选择</div>
          <div class="chart-sub">对比不同类别下高频词的物理分布，并通过卡方检验定量判断每个单词是否具有类别特异性。</div>
        </div>
      </div>
      <div class="info-card-body preprocess-step-body" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
        
        <!-- 上段：卡方 (��²) 区分度排名 (点击柱子可切换分析目标词) -->
        <div style="background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">
            ✨ 卡方 (��²) 区分度排名 Top 15
            <span style="font-weight: 400; font-size: 11px; color: #868e96; margin-left: 6px;">— 数值越高区分力越强 (点击柱子可切换分析目标词)</span>
          </h4>
          <div id="nbChiSquareRankingChart" style="width: 100%; height: 220px;"></div>
        </div>

        <!-- 中段：ECharts 双类别 Top 15 词频对比 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">类别 A [${escapeHtml(c1)}] 高频词 Top 15</h4>
            <div id="nbWordFreqChartA" style="width: 100%; height: 200px;"></div>
          </div>
          <div style="background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">类别 B [${escapeHtml(c2)}] 高频词 Top 15</h4>
            <div id="nbWordFreqChartB" style="width: 100%; height: 200px;"></div>
          </div>
        </div>
        
        <!-- 下段：卡方 Contingency 表与代入计算 -->
        <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 16px; align-items: stretch;">
          <!-- 2x2 列联表 -->
          <div style="background: #fff; border-radius: 6px; padding: 12px; border: 1px solid #e9ecef; min-height: 270px;">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">
              单词 "<span style="color: #2563eb; font-weight: 700; font-family: monospace;">${escapeHtml(word)}</span>" 的 2 × 2 独立性列联表
            </h4>
            <table class="chi-table">
              <thead>
                <tr>
                  <th style="text-align: left;">单词出现状态</th>
                  <th>类别: ${escapeHtml(c1)}</th>
                  <th>类别: ${escapeHtml(c2)}</th>
                  <th style="background: #f8f9fa;">合计</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: left; font-weight: 600;">包含该词的邮件数</td>
                  <td style="font-family: monospace; color: #1e3a8a; font-weight: bold; background: rgba(37, 99, 235, 0.03);">A = ${cont.A}</td>
                  <td style="font-family: monospace; color: #1e3a8a; font-weight: bold; background: rgba(37, 99, 235, 0.03);">B = ${cont.B}</td>
                  <td style="font-family: monospace; background: #f8f9fa; font-weight: 600;">A+B = ${cont.A + cont.B}</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: 600;">不包含该词的邮件数</td>
                  <td style="font-family: monospace; color: #475569;">C = ${cont.C}</td>
                  <td style="font-family: monospace; color: #475569;">D = ${cont.D}</td>
                  <td style="font-family: monospace; background: #f8f9fa; font-weight: 600;">C+D = ${cont.C + cont.D}</td>
                </tr>
                <tr style="background: #f8f9fa; font-weight: bold;">
                  <td style="text-align: left;">各类别邮件合计</td>
                  <td style="font-family: monospace;">N₁ = A+C = ${cont.A + cont.C}</td>
                  <td style="font-family: monospace;">N₂ = B+D = ${cont.B + cont.D}</td>
                  <td style="font-family: monospace; background: #e9ecef; color: #111;">N = ${cont.N}</td>
                </tr>
              </tbody>
            </table>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.45;">
              💡 <strong>指标含义：</strong><br/>
              A/B 表示该词在类别 A/B 的样本分布量。若 $(AD-BC)^2$ 越大，说明该词对当前两个类别的倾向区分性越强。
            </p>
          </div>
          
          <!-- 数学公式计算推导 -->
          <div id="chiSquareMathProbeWrap" class="math-formula-box" style="min-height: 270px;">
            <!-- Rendered by renderChiSquareMathFormula -->
          </div>
        </div>
        
      </div>
    </section>
  `;
}

function renderNbWordFreqCharts() {
  const chartElA = $("nbWordFreqChartA");
  const chartElB = $("nbWordFreqChartB");
  if (!chartElA || !chartElB || !wordFreqCache) return;

  const dataA = [...wordFreqCache.top_words_c1].reverse();
  const dataB = [...wordFreqCache.top_words_c2].reverse();

  const myChartA = initEchartsWithFont(chartElA);
  const optionA = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const item = dataA[params[0].dataIndex];
        return `<b>${escapeHtml(item.word)}</b><br/>总词频 (TF): ${item.count}<br/>文档频数 (DF): ${item.doc_count}`;
      }
    },
    grid: { top: '5%', left: '3%', right: '12%', bottom: '5%', containLabel: true },
    xAxis: { type: 'value', name: '词频次', nameTextStyle: { color: '#666', fontSize: 10 }, axisLabel: { color: '#666' } },
    yAxis: { type: 'category', data: dataA.map(d => d.word), axisLabel: { fontSize: 10, color: '#333' } },
    series: [{
      name: '词频',
      type: 'bar',
      barWidth: '60%',
      data: dataA.map(d => d.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e0e7ff' },
          { offset: 1, color: '#4f46e5' }
        ])
      },
      label: { show: true, position: 'right', color: '#333', fontSize: 10 }
    }]
  };
  myChartA.setOption(optionA);
  charts.set("nbWordFreqChartA", myChartA);
  // Click bar to trigger chi-square analysis for this word
  myChartA.on('click', (params) => {
    const clicked = dataA[params.dataIndex];
    if (clicked?.word) clickChiWordBadge(clicked.word);
  });

  const myChartB = initEchartsWithFont(chartElB);
  const optionB = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const item = dataB[params[0].dataIndex];
        return `<b>${escapeHtml(item.word)}</b><br/>总词频 (TF): ${item.count}<br/>文档频数 (DF): ${item.doc_count}`;
      }
    },
    grid: { top: '5%', left: '3%', right: '12%', bottom: '5%', containLabel: true },
    xAxis: { type: 'value', name: '词频次', nameTextStyle: { color: '#666', fontSize: 10 }, axisLabel: { color: '#666' } },
    yAxis: { type: 'category', data: dataB.map(d => d.word), axisLabel: { fontSize: 10, color: '#333' } },
    series: [{
      name: '词频',
      type: 'bar',
      barWidth: '60%',
      data: dataB.map(d => d.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#ffedd5' },
          { offset: 1, color: '#ea580c' }
        ])
      },
      label: { show: true, position: 'right', color: '#333', fontSize: 10 }
    }]
  };
  myChartB.setOption(optionB);
  charts.set("nbWordFreqChartB", myChartB);
  // Click bar to trigger chi-square analysis for this word
  myChartB.on('click', (params) => {
    const clicked = dataB[params.dataIndex];
    if (clicked?.word) clickChiWordBadge(clicked.word);
  });

  window.addEventListener('resize', () => {
    myChartA.resize();
    myChartB.resize();
  });
}

function renderNbChiSquareRankingChart() {
  const chartEl = $("nbChiSquareRankingChart");
  if (!chartEl || !wordFreqCache || !wordFreqCache.top_chi_words) return;

  const myChart = initEchartsWithFont(chartEl);
  const data = [...wordFreqCache.top_chi_words].reverse();
  const targetWord = wordFreqCache.target_word;

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const item = data[params[0].dataIndex];
        return `<b>${escapeHtml(item.word)}</b><br/>卡方值 (χ²): ${item.chi_square.toFixed(2)}<br/><span style="color:#dc2626;">🖱️ 点击查看该词分析</span>`;
      }
    },
    grid: { top: '4%', left: '3%', right: '14%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      name: '卡方值 (χ²)',
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: '#94a3b8', fontSize: 10 },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.word),
      axisLabel: { fontSize: 11, color: '#374151', width: 100, overflow: 'truncate' }
    },
    series: [{
      name: '卡方值',
      type: 'bar',
      barWidth: '60%',
      data: data.map(d => {
        const isTarget = d.word === targetWord;
        return {
          value: d.chi_square,
          itemStyle: isTarget
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#fecaca' },
                  { offset: 1, color: '#dc2626' }
                ]),
                borderRadius: [0, 4, 4, 0]
              }
            : {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#e0e7ff' },
                  { offset: 1, color: '#6366f1' }
                ]),
                borderRadius: [0, 3, 3, 0]
              }
        };
      }),
      label: {
        show: true,
        position: 'right',
        color: '#374151',
        formatter: params => params.value.toFixed(1),
        fontSize: 10,
        fontWeight: 600
      }
    }]
  };
  myChart.setOption(option);
  charts.set("nbChiSquareRankingChart", myChart);
  myChart.on('click', (params) => {
    const clicked = data[params.dataIndex];
    if (clicked?.word) clickChiWordBadge(clicked.word);
  });
  window.addEventListener('resize', () => myChart.resize());
}

function renderChiSquareMathFormula() {
  const wrap = $("chiSquareMathProbeWrap");
  if (!wrap || !wordFreqCache) return;

  const w = wordFreqCache.target_word;
  const cont = wordFreqCache.contingency_table || { A: 0, B: 0, C: 0, D: 0, N: 0 };
  const chi = wordFreqCache.chi_square;
  const N = cont.N;
  const A = cont.A;
  const B = cont.B;
  const C = cont.C;
  const D = cont.D;

  ensurePreprocessMathSupport();

  let sigBadgeColor = "#475569";
  let sigBgColor = "#f1f5f9";
  if (wordFreqCache.sig_code === "highly_significant") {
    sigBadgeColor = "#16a34a";
    sigBgColor = "#f0fdf4";
  } else if (wordFreqCache.sig_code === "significant") {
    sigBadgeColor = "#ca8a04";
    sigBgColor = "#fefce8";
  }

  const expr1 = `\\chi^2 = \\frac{N(AD - BC)^2}{(A+C)(B+D)(A+B)(C+D)}`;
  const expr2 = `\\chi^2 = \\frac{${N} \\times (${A} \\times ${D} - ${B} \\times ${C})^2}{(${A}+${C})(${B}+${D})(${A}+${B})(${C}+${D})}`;
  const expr3 = `\\chi^2 = \\frac{${N} \\times (${A * D} - ${B * C})^2}{${A + C} \\times ${B + D} \\times ${A + B} \\times ${C + D}}`;
  const ad_bc_diff = A * D - B * C;
  const expr4 = `\\chi^2 = \\frac{${N} \\times (${ad_bc_diff})^2}{${(A + C) * (B + D) * (A + B) * (C + D)}} \\approx ${chi.toFixed(4)}`;

  wrap.innerHTML = `
    <div class="math-formula-title">
      <div>
        <div class="math-formula-kicker">卡方独立性推导</div>
        <div style="margin-top:3px; font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.3;">单词 <span class="formula-badge-highlight" style="font-family: monospace;">${escapeHtml(w)}</span> 的卡方检验计算</div>
      </div>
      <div class="math-formula-meta">
        <span class="math-formula-chip">样本数 <strong>N = ${N}</strong></span>
      </div>
    </div>
    
    <div class="formula-latex formula-katex-display" style="margin: 5px 0; padding: 7px 10px;">
      ${renderPreprocessLatexToHtml(expr1, true)}
    </div>

    <div class="math-step-list" style="margin-top: 8px;">
      <article class="math-step-card">
        <span class="math-step-index">1</span>
        <div class="math-step-content">
          <div class="math-step-title">代入频数列联表数值</div>
          <div class="math-step-body" style="text-align: center; margin-top: 4px;">
            ${renderPreprocessLatexToHtml(expr2, false)}
          </div>
        </div>
      </article>
      <article class="math-step-card">
        <span class="math-step-index">2</span>
        <div class="math-step-content">
          <div class="math-step-title">计算行列频数乘积</div>
          <div class="math-step-body" style="text-align: center; margin-top: 4px;">
            ${renderPreprocessLatexToHtml(expr3, false)}
          </div>
        </div>
      </article>
      <article class="math-step-card">
        <span class="math-step-index">3</span>
        <div class="math-step-content">
          <div class="math-step-title">求解最终卡方统计量 χ²</div>
          <div class="math-step-body" style="text-align: center; margin-top: 4px;">
            ${renderPreprocessLatexToHtml(expr4, false)}
          </div>
        </div>
      </article>
    </div>

    <div style="margin-top: 12px; padding: 10px; border-radius: 8px; background: ${sigBgColor}; border: 1px solid rgba(148, 163, 184, 0.15); display: flex; flex-direction: column; gap: 4px;">
      <div style="font-size: 12px; font-weight: 700; color: ${sigBadgeColor}; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${sigBadgeColor};"></span>
        类别相关度结论：
      </div>
      <div style="font-size: 13px; color: ${sigBadgeColor}; font-weight: bold; line-height: 1.5;">
        ${escapeHtml(wordFreqCache.significance)}
      </div>
      <div style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 2px;">
        💡 <strong>独立性判断规则</strong>：当计算出的卡方值 $\\chi^2 \\ge 3.841$ (显著性 $\\alpha=0.05$) 时，我们有 95% 把握拒绝原假设（即认为它和类别不独立、存在显著关联）。当 $\\chi^2 \\ge 6.635$ (显著性 $\\alpha=0.01$) 时，把握提高到 99%。卡方值越大，说明特征分类区分性越强。
      </div>
    </div>
  `;
}

function renderPreprocessWordFreqPanel() {
  const word = wordFreqCache?.target_word || "";
  
  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>词频特征与卡方分析</h3>
      <p style="font-size: 11.5px; color: #666; line-height: 1.5; margin-bottom: 12px;">
        对两分类高频特征词进行卡方独立性检验。卡方值代表特征词与类别之间的特异相关度。
      </p>

      <div class="control-group">
        <label class="control-label" for="wordFreqQueryWord">输入查询词 (Query Word)</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="text" id="wordFreqQueryWord" value="${escapeHtml(word)}" placeholder="例如 space, drive, car..." style="flex: 1; width: auto; font-family: monospace;" />
          <button class="primary-btn" id="runWordFreqBtn" onclick="runWordFreqAnalysis()" style="flex-shrink: 0; padding: 6px 14px;">分析</button>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          ✨ 黄金推荐词 (卡方值 Top 15 排行)
        </label>
        <div style="background: #f8f9fa; border-radius: 6px; padding: 8px; border: 1px solid #dee2e6; max-height: 150px; overflow-y: auto;">
          ${topChiWordsBadgesHtml() || '<span style="font-size:11px;color:#868e96;">暂无推荐词</span>'}
        </div>
        <p style="font-size: 11.5px; color: #868e96; line-height: 1.5; margin: 0;">
          💡 点击上方的特征词徽章（带有其卡方关联值），可以直接载入并自动执行分析。
        </p>
      </div>

      ${preprocessCodeButtonHtml("word_freq")}
    </div>
  `;
}

function topChiWordsBadgesHtml() {
  if (!wordFreqCache || !wordFreqCache.top_chi_words) return "";
  return wordFreqCache.top_chi_words.map(w => {
    const isActive = wordFreqCache.target_word === w.word;
    const style = isActive ? "background: #2563eb; color: #fff; border-color: #2563eb;" : "background: #fff; color: #3b82f6; border-color: rgba(59, 130, 246, 0.2);";
    return `<span class="sparse-badge" style="cursor: pointer; margin: 3px; display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; border: 1px solid; ${style}" onclick="clickChiWordBadge('${escapeHtml(w.word)}')">${escapeHtml(w.word)} (${w.chi_square.toFixed(1)})</span>`;
  }).join("");
}

function clickChiWordBadge(word) {
  const input = $("wordFreqQueryWord");
  if (input) input.value = word;
  runWordFreqAnalysis(word);
}
window.clickChiWordBadge = clickChiWordBadge;

async function runWordFreqAnalysis(word = null) {
  const queryWord = word || $("wordFreqQueryWord")?.value || "";
  const btn = $("runWordFreqBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "分析中...";
  }

  try {
    const categories = currentDatasetMeta?.categories || ["sci.space", "rec.autos"];
    const res = await runAction("get_word_freq_analysis", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      categories: categories,
      target_word: queryWord
    });
    
    wordFreqCache = res;
    wordFreqCompleted = true;
    
    // Unlock step 5
    markPreprocessProgress("word_freq");
    
    renderPreprocessRightPanel();
    await renderPreprocessCurrentStep();
  } catch (err) {
    console.error("runWordFreqAnalysis error", err);
    alert("卡方分析失败: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "分析";
    }
  }
}
window.runWordFreqAnalysis = runWordFreqAnalysis;

function injectChiSquareTableStyles() {
  if ($("nbChiSquareTableStyles")) return;
  const style = document.createElement("style");
  style.id = "nbChiSquareTableStyles";
  style.innerHTML = `
    .chi-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    .chi-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 600;
      padding: 6px;
      border: 1px solid #cbd5e1;
      text-align: center;
    }
    .chi-table td {
      font-size: 11.5px;
      padding: 8px 6px;
      border: 1px solid #cbd5e1;
      color: #334155;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}


// ----------------------------------------------------
// 划分训练/测试集 (Train/Test Split) 模块的核心逻辑与可视化
// ----------------------------------------------------

function renderSplitOverview() {
  const grid = $("chartGrid");
  if (!grid) return;

  const oldLog = $("debugLogBox");
  if (oldLog) oldLog.remove();

  experimentRenderGridStack({
    grid,
    mode: "preprocess",
    views: ["split_dashboard"],
    loadLayout: loadDataGridLayout,
    defaultLayout: () => ({ x: 0, y: 0, w: 4, h: 5 }),
    normalizeLayout: (_view, layout) => normalizeDataGridLayout("split_dashboard", layout),
    htmlForView: () => preprocessSplitDashboardHtml(),
    minWidthForView: () => 4,
    minHeightForView: () => 3,
  });

  let retryCount = 0;
  function tryRenderSplitCharts() {
    const chartEl = $("nbSplitClassDistributionChart");
    if (!chartEl && retryCount < 20) {
      retryCount++;
      setTimeout(tryRenderSplitCharts, 50);
      return;
    }

    try {
      renderNbSplitClassDistributionChart();
    } catch (e) {
      console.error("renderNbSplitClassDistributionChart error", e);
    }
  }
  setTimeout(tryRenderSplitCharts, 50);
}
window.renderSplitOverview = renderSplitOverview;

function preprocessSplitDashboardHtml() {
  if (!splitCache) {
    return `
      <section class="preprocess-prompt-card" style="display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
          <p style="font-size: 13px; color: #868e96; margin: 0;">正在执行数据集划分，请稍候...</p>
        </div>
      </section>
    `;
  }

  const cache = splitCache;
  const trainRatio = cache.train_ratio;
  const testRatio = cache.test_ratio;
  const trainCount = cache.train_count;
  const testCount = cache.test_count;
  const totalCount = cache.total_count;

  return `
    <section class="preprocess-dashboard-card preprocess-info-card preprocess-loaded-card">
      <div class="chart-head">
        <div>
          <div class="chart-title" style="color: #333;">05 划分训练/测试集效果可视化</div>
          <div class="chart-sub">观察数据集分割比例及各类别在训练集和测试集中的分层分布，确保评估的科学性与模型泛化能力的可靠测试。</div>
        </div>
      </div>
      <div class="info-card-body preprocess-step-body" style="padding: 16px; display: flex; flex-direction: column; gap: 18px;">
        
        <!-- 顶部：比例能量块 -->
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; border: 1px solid #e9ecef; box-shadow: 0 4px 12px rgba(0,0,0,0.01);">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #495057;">数据集切分比例 (总计: ${totalCount} 样本)</h4>
          <div style="display: flex; height: 32px; border-radius: 6px; overflow: hidden; background: #e9ecef; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); position: relative;">
            <div style="width: ${trainRatio}%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold; transition: width 0.3s ease;">
              训练集 ${trainRatio}% (${trainCount} 样本)
            </div>
            <div style="width: ${testRatio}%; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold; transition: width 0.3s ease;">
              测试集 ${testRatio}% (${testCount} 样本)
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #868e96; line-height: 1.4;">
            💡 <strong>模型训练与评估常识：</strong> 训练集（Train Set）用于拟合模型（求取各个特征下的类条件概率）；测试集（Test Set）完全不参与训练，只用来评估模型的泛化性能，以避免发生过拟合的乐观幻觉。
          </p>
        </div>

        <!-- 中段：ECharts 类别分布对比 -->
        <div style="background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #495057;">训练集 vs 测试集类别分布平衡性检查 (分层抽样 Stratified)</h4>
          <div id="nbSplitClassDistributionChart" style="width: 100%; height: 200px;"></div>
        </div>

        <!-- 下段：指派预览 -->
        <div>
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #495057;">数据集切分指派结果列表预览 (展示前 10 条样本)</h4>
          <div class="table-wrap" style="overflow-x: auto; border: 1px solid #dee2e6; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.01);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #f1f3f5; border-bottom: 1px solid #dee2e6;">
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 50px; text-align: center;">序号</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 110px;">真实类别</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057; width: 100px; text-align: center;">分配指派集合</th>
                  <th style="padding: 8px; font-weight: 600; color: #495057;">文本内容摘要 (Tokens Summary)</th>
                </tr>
              </thead>
              <tbody>
                ${cache.preview.map(row => {
                  const isTrain = row.assignment === "train";
                  const badgeStyle = isTrain 
                    ? "background: rgba(59, 130, 246, 0.1); color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.2);"
                    : "background: rgba(249, 115, 22, 0.1); color: #ea580c; border: 1px solid rgba(249, 115, 22, 0.2);";
                  const setLabel = isTrain ? "训练集" : "测试集";
                  return `
                    <tr style="border-bottom: 1px solid #dee2e6;">
                      <td style="padding: 8px; text-align: center; color: #868e96; font-family: monospace;">${row.id}</td>
                      <td style="padding: 8px; font-weight: bold;">${escapeHtml(row.category)}</td>
                      <td style="padding: 8px; text-align: center;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; ${badgeStyle}">${setLabel}</span>
                      </td>
                      <td style="padding: 8px; color: #495057; font-family: monospace;">${escapeHtml(row.text_preview)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  `;
}

function renderNbSplitClassDistributionChart() {
  const chartEl = $("nbSplitClassDistributionChart");
  if (!chartEl || !splitCache) return;

  const myChart = initEchartsWithFont(chartEl);
  const categories = splitCache.target_names;
  
  const trainData = categories.map(cat => splitCache.class_distribution[cat].train);
  const testData = categories.map(cat => splitCache.class_distribution[cat].test);

  const option = {
    animationDuration: 800,
    animationEasing: 'elasticOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        let html = `<b>${params[0].name}</b><br/>`;
        let total = 0;
        params.forEach(p => {
          html += `${p.marker} ${p.seriesName}: ${p.value} 样本<br/>`;
          total += Number(p.value) || 0;
        });
        html += `<span style="color:#6b7280;">合计: ${total} 样本</span>`;
        return html;
      }
    },
    legend: {
      data: ['训练集 (Train)', '测试集 (Test)'],
      bottom: '0%',
      textStyle: { fontSize: 11 }
    },
    grid: {
      top: '10%',
      left: '3%',
      right: '4%',
      bottom: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '样本数',
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#333', fontSize: 11, fontWeight: 'bold' }
    },
    series: [
      {
        name: '训练集 (Train)',
        type: 'bar',
        stack: 'total',
        label: { show: true, position: 'insideRight', fontSize: 10 },
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#bfdbfe' },
            { offset: 1, color: '#3b82f6' }
          ]),
          borderRadius: [0, 3, 3, 0]
        },
        data: trainData,
        emphasis: {
          itemStyle: { color: '#1d4ed8' }
        }
      },
      {
        name: '测试集 (Test)',
        type: 'bar',
        stack: 'total',
        label: { show: true, position: 'insideRight', fontSize: 10 },
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#fed7aa' },
            { offset: 1, color: '#f97316' }
          ]),
          borderRadius: [0, 3, 3, 0]
        },
        data: testData,
        emphasis: {
          itemStyle: { color: '#ea580c' }
        }
      }
    ]
  };

  myChart.setOption(option);
  charts.set("nbSplitClassDistributionChart", myChart);
  window.addEventListener('resize', () => myChart.resize());
}

function renderPreprocessSplitPanel() {
  const cache = splitCache || {};
  const currentRatio = cache.test_count ? cache.test_count / cache.total_count : 0.2;
  
  const ratio10Selected = Math.abs(currentRatio - 0.1) < 0.05 ? "selected" : "";
  const ratio20Selected = Math.abs(currentRatio - 0.2) < 0.05 ? "selected" : "";
  const ratio30Selected = Math.abs(currentRatio - 0.3) < 0.05 ? "selected" : "";

  const randomStateValue = cache.random_state !== undefined ? cache.random_state : 42;
  const stratifyChecked = cache.stratify !== false ? "checked" : "";

  return `
    <div class="right-title">控制面板</div>
    ${guideSwitchPanelHtml()}
    <div class="control-card dataset-load-card">
      <h3>划分训练与测试集</h3>
      <p style="font-size: 11.5px; color: #666; line-height: 1.5; margin-bottom: 12px;">
        配置数据集切分参数。将经过向量化后的特征矩阵按比例分为模型拟合所用的训练集，和模型评估专用的测试集。
      </p>

      <div class="control-group">
        <label class="control-label" for="splitRatioSelect">切分比例 (Train:Test)</label>
        <select id="splitRatioSelect">
          <option value="0.1" ${ratio10Selected}>90% 训练集 : 10% 测试集</option>
          <option value="0.2" ${ratio20Selected}>80% 训练集 : 20% 测试集 (推荐)</option>
          <option value="0.3" ${ratio30Selected}>70% 训练集 : 30% 测试集</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label" for="splitRandomState">随机数种子 (random_state)</label>
        <input type="number" id="splitRandomState" value="${randomStateValue}" />
      </div>

      <div class="control-group" style="flex-direction: row; align-items: center; gap: 10px; padding: 10px 12px;">
        <input type="checkbox" id="splitStratify" ${stratifyChecked} style="width: auto; height: auto; cursor: pointer; accent-color: var(--purple);" />
        <label for="splitStratify" style="margin: 0; font-size: 13px; color: #374151; font-weight: 600; cursor: pointer; user-select: none;">
          分层比例划分 (Stratify Split)
        </label>
      </div>

      <div class="btn-row">
        <button class="primary-btn" id="runSplitBtn" onclick="runSplitAnalysis()">执行数据集划分</button>
      </div>
      <div class="status-line hidden" id="splitStatusMsg"></div>
      
      <!-- 引导去模型训练提示 -->
      ${splitCompleted ? `
        <div style="background: rgba(37, 99, 235, 0.05); border: 1px dashed rgba(37, 99, 235, 0.3); padding: 10px; border-radius: 6px; margin-top: 14px; text-align: center;">
          <span style="font-size: 12px; font-weight: bold; color: #1d4ed8; display: block; margin-bottom: 4px;">🎉 预处理工作流已全部完成！</span>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 8px 0;">现在，请点击左侧导航栏的【模型训练】模块，进入算法学习阶段。</p>
          <button class="primary-btn" type="button" onclick="setPage('train_eval')" style="margin: 0; padding: 4px 10px; font-size: 11px;">去模型训练</button>
        </div>
      ` : ""}

      ${preprocessCodeButtonHtml("split")}
    </div>
  `;
}

async function runSplitAnalysis() {
  const test_size = parseFloat($("splitRatioSelect")?.value || "0.2");
  const random_state = parseInt($("splitRandomState")?.value || "42");
  const stratify = $("splitStratify")?.checked ?? true;

  const btn = $("runSplitBtn");
  const msgEl = $("splitStatusMsg");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "切分中...";
  }
  if (msgEl) {
    msgEl.classList.remove("hidden", "error");
    msgEl.textContent = "正在调用 sklearn 执行数据集随机划分...";
  }

  try {
    const res = await runAction("split_dataset", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      test_size,
      random_state,
      stratify
    });
    
    splitCache = res;
    splitCompleted = true;

    if (msgEl) {
      msgEl.textContent = "数据集切分成功！";
      setTimeout(() => { msgEl.classList.add("hidden"); }, 2000);
    }
    
    markPreprocessProgress("split");
    renderPreprocessRightPanel();
    await renderPreprocessCurrentStep();
  } catch (err) {
    console.error("runSplitAnalysis error", err);
    if (msgEl) {
      msgEl.classList.add("error");
      msgEl.textContent = "划分失败: " + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "执行数据集划分";
    }
  }
}
window.runSplitAnalysis = runSplitAnalysis;
