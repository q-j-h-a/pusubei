// Train Page.

let activeTrainStep = viewStateStore.activeTrainStepV1 || "process";
let trainProgressStep = viewStateStore.trainProgressStepV1 || activeTrainStep;
let trainCompareData = null;
let trainCompareViewsKey = "";
let trainCompareEntered = false;
let trainLossViewsKey = "";
let trainOptimizationViewsKey = "";
let trainCustomViewsKey = "";

const TRAIN_DEFAULT_FEATURE = "CRIM";

const TRAIN_STEPS = [
  { id: "process", no: "01", views: ["model_train", "learning"] },
  { id: "preprocess_effect", no: "02", views: ["raw_scatter", "standard_scatter"] },
  { id: "loss", no: "03", views: ["model_train", "learning", "calc"] },
  { id: "optimization", no: "04", views: ["gradient_descent", "gradient", "w_path", "b_path"] },
  { id: "custom", no: "05", views: ["model_train", "learning", "w_path", "b_path", "calc"] },
];

const TRAIN_STEP_DEFAULTS = {
  process: { trainStd: "true", trainFeature: TRAIN_DEFAULT_FEATURE, w0: "0", b0: "0", lr: "0.030", epochs: "120", speed: "90" },
  preprocess_effect: { trainStd: "true", trainFeature: TRAIN_DEFAULT_FEATURE, w0: "0", b0: "0", lr: "0.030", epochs: "120", speed: "90" },
  loss: { trainStd: "true", trainFeature: TRAIN_DEFAULT_FEATURE, w0: "0", b0: "0", lr: "0.030", epochs: "120", speed: "120" },
  optimization: { trainStd: "true", trainFeature: TRAIN_DEFAULT_FEATURE, w0: "0", b0: "0", lr: "0.030", epochs: "120", speed: "120" },
  custom: { trainStd: "true", trainFeature: TRAIN_DEFAULT_FEATURE, w0: "0", b0: "0", lr: "0.030", epochs: "120", speed: "90" },
};

const TRAIN_FORM_IDS = ["trainFeature", "trainStd", "w0", "b0", "lr", "epochs", "speed"];

const TRAIN_COMPARE_VIEWS = [
  { id: "raw_scatter", label: "\u539f\u59cb\u6563\u70b9\u56fe", mode: "raw" },
  { id: "standard_scatter", label: "\u6807\u51c6\u5316\u6563\u70b9\u56fe", mode: "standard" },
];

const TRAIN_LOSS_RESIDUAL_MODES = [
  { id: "single", label: "\u5355\u6837\u672c\u6b8b\u5dee" },
  { id: "random10", label: "\u968f\u673a 10 \u4e2a\u6837\u672c" },
  { id: "top5", label: "\u6700\u5927\u6b8b\u5dee\u524d 5" },
];

const TRAIN_LOSS_OVERALL_VIEWS = [
  { id: "residual_scatter", label: "\u6b8b\u5dee\u6563\u70b9\u56fe" },
  { id: "residual_hist", label: "\u6b8b\u5dee\u76f4\u65b9\u56fe" },
];

const TRAIN_OPT_SLICE_MODES = [
  { id: "w", label: "\u56fa\u5b9a b\uff0c\u770b w" },
  { id: "b", label: "\u56fa\u5b9a w\uff0c\u770b b" },
  { id: "neg_grad", label: "\u6cbf\u8d1f\u68af\u5ea6\u65b9\u5411" },
];

const TRAIN_PROCESS_GUIDE_ID = "train_process";
const TRAIN_PREPROCESS_EFFECT_GUIDE_ID = "train_preprocess_effect";
const TRAIN_LOSS_GUIDE_ID = "train_loss";
const TRAIN_OPTIMIZATION_GUIDE_ID = "train_optimization";
const TRAIN_CUSTOM_GUIDE_ID = "train_custom";
const TRAIN_LOSS_GUIDE_STEPS = new Set([
  "loss_feature",
  "loss_random10",
  "loss_residual_chart",
  "loss_overall",
  "loss_hist",
  "loss_step",
  "loss_after_step_charts",
]);
const TRAIN_OPTIMIZATION_GUIDE_STEPS = new Set([
  "optimization_feature",
  "optimization_params",
  "optimization_step",
  "optimization_surface",
  "optimization_contour",
  "optimization_loss",
]);
const TRAIN_CUSTOM_GUIDE_STEPS = new Set([
  "custom_feature",
  "custom_params",
  "custom_step",
  "custom_scatter_loss",
  "custom_param_paths",
  "custom_calc",
]);

function ensureTrainTopFlow() {
  const slot = $("pageTopSlot");
  if (!slot) return null;
  slot.classList.add("has-content");
  if (!$("trainFlow")) {
    slot.innerHTML = `<div class="preprocess-flow" id="trainFlow"></div>`;
  }
  return $("trainFlow");
}

function trainStepIndex(stepId) {
  const index = TRAIN_STEPS.findIndex(step => step.id === stepId);
  return index < 0 ? 0 : index;
}

function trainStep() {
  return TRAIN_STEPS.find(step => step.id === activeTrainStep) || TRAIN_STEPS[0];
}

function trainStepLabel(stepId = activeTrainStep) {
  return ({
    process: "\u719f\u6089\u56de\u5f52\u8fc7\u7a0b",
    preprocess_effect: "\u719f\u6089\u9884\u5904\u7406\u5f71\u54cd",
    loss: "\u719f\u6089\u635f\u5931\u51fd\u6570",
    optimization: "\u719f\u6089\u4f18\u5316\u51c6\u5219",
    custom: "\u81ea\u5b9a\u4e49\u53c2\u6570\u8bad\u7ec3",
  })[stepId] || "\u719f\u6089\u56de\u5f52\u8fc7\u7a0b";
}

function markTrainProgress(stepId) {
  if (trainStepIndex(stepId) <= trainStepIndex(trainProgressStep)) return;
  trainProgressStep = stepId;
  viewStateStore.trainProgressStepV1 = trainProgressStep;
}

function renderTrainFlow() {
  const flow = ensureTrainTopFlow();
  if (!flow) return;
  const progressIndex = trainStepIndex(trainProgressStep);
  flow.innerHTML = TRAIN_STEPS.map((step, index) => {
    const classes = ["flow-step"];
    if (step.id === activeTrainStep) classes.push("active");
    else if (index <= progressIndex) classes.push("done");
    return `<button class="${classes.join(" ")}" type="button" data-train-step="${escapeHtml(step.id)}"><span>${step.no}</span><strong>${escapeHtml(trainStepLabel(step.id))}</strong></button>`;
  }).join("");
}

function bindTrainFlow() {
  const flow = ensureTrainTopFlow();
  if (!flow || flow.dataset.bound === "true") return;
  flow.dataset.bound = "true";
  flow.addEventListener("click", async event => {
    const btn = event.target.closest("[data-train-step]");
    if (!btn || !flow.contains(btn)) return;
    stopAuto();
    persistTrainFormState();
    const previousStep = activeTrainStep;
    activeTrainStep = btn.dataset.trainStep;
    if (activeTrainStep === "preprocess_effect" && previousStep !== activeTrainStep) {
      ensureTrainCompareState();
      trainCompareViewsKey = "";
      trainCompareEntered = true;
    }
    if (activeTrainStep === "loss" && previousStep !== activeTrainStep) {
      const lossGuideState = guidePageState(TRAIN_LOSS_GUIDE_ID);
      if (guideGlobalEnabled() && lossGuideState.enabled && !lossGuideState.completed && !lossGuideState.dismissed) {
        ensureTrainLossGuideStep();
      }
    }
    if (activeTrainStep === "optimization" && previousStep !== activeTrainStep) {
      const optimizationGuideState = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
      if (guideGlobalEnabled() && optimizationGuideState.enabled && !optimizationGuideState.completed && !optimizationGuideState.dismissed) {
        ensureTrainOptimizationGuideStep();
      }
    }
    if (activeTrainStep === "custom" && previousStep !== activeTrainStep) {
      const customGuideState = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
      if (guideGlobalEnabled() && customGuideState.enabled && !customGuideState.completed && !customGuideState.dismissed) {
        ensureTrainCustomGuideStep();
      }
    }
    viewStateStore.activeTrainStepV1 = activeTrainStep;
    markTrainProgress(activeTrainStep);
    await renderTrainCurrentStep();
  });
}

function trainStepDefaults() {
  return { ...TRAIN_STEP_DEFAULTS.process, ...(TRAIN_STEP_DEFAULTS[activeTrainStep] || {}) };
}

function trainFormStatesByStep() {
  if (!viewStateStore.trainFormStateByStepV1 || typeof viewStateStore.trainFormStateByStepV1 !== "object") {
    viewStateStore.trainFormStateByStepV1 = {};
  }
  return viewStateStore.trainFormStateByStepV1;
}

function trainFormStateForStep(stepId = activeTrainStep) {
  const states = trainFormStatesByStep();
  if (states[stepId] && typeof states[stepId] === "object") return states[stepId];
  return {};
}

function setTrainFormStateForStep(stepId, state) {
  trainFormStatesByStep()[stepId] = state;
}

function trainStepViews() {
  if (activeTrainStep === "preprocess_effect") {
    return TRAIN_COMPARE_VIEWS.map(item => item.id);
  }
  if (activeTrainStep === "custom") {
    const saved = viewStateStore.trainSelectedViewsV1;
    if (Array.isArray(saved) && saved.length) return saved;
  }
  return [...trainStep().views];
}

function trainLossResidualMode() {
  const saved = viewStateStore.trainLossResidualModeV1;
  return TRAIN_LOSS_RESIDUAL_MODES.some(item => item.id === saved) ? saved : "single";
}

function trainLossOverallView() {
  const saved = viewStateStore.trainLossOverallViewV1;
  return TRAIN_LOSS_OVERALL_VIEWS.some(item => item.id === saved) ? saved : "residual_scatter";
}

function trainOptimizationSliceMode() {
  const saved = viewStateStore.trainOptimizationSliceModeV1;
  return TRAIN_OPT_SLICE_MODES.some(item => item.id === saved) ? saved : "w";
}

function trainLossSampleIndex() {
  const count = trainData?.scatter?.x?.length || 0;
  const saved = Number(viewStateStore.trainLossSampleIndexV1 ?? 0);
  if (!count) return 0;
  return Math.max(0, Math.min(count - 1, Number.isFinite(saved) ? saved : 0));
}

function setTrainLossSampleIndex(index) {
  const count = trainData?.scatter?.x?.length || 0;
  if (!count) {
    viewStateStore.trainLossSampleIndexV1 = 0;
    return 0;
  }
  const next = ((Math.round(Number(index) || 0) % count) + count) % count;
  viewStateStore.trainLossSampleIndexV1 = next;
  return next;
}

function applyFixedZeroAxis(option, range) {
  if (!range) return option;
  return {
    ...option,
    xAxis: axisOptionWithRange(option.xAxis, range.x),
    yAxis: axisOptionWithRange(option.yAxis, range.y),
  };
}

function trainSetChartOption(ch, _chartKey, option, replace = true) {
  if (!option) return;
  ch.setOption(option, replace);
}

function renderActiveTrainFrame() {
  if (activeTrainStep === "preprocess_effect") renderTrainCompareFrame(currentFrame);
  else if (activeTrainStep === "process") renderTrainProcessFrame(currentFrame);
  else if (activeTrainStep === "loss") renderTrainLossFrame(currentFrame);
  else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(currentFrame);
  else if (activeTrainStep === "custom") renderTrainCustomFrame(currentFrame);
  else renderTrainFrame(currentFrame);
}

function setTrainCheckedViews(views) {
  const allowed = new Set(views);
  document.querySelectorAll('input[name="trainViews"]').forEach(el => {
    el.checked = allowed.has(el.value);
  });
}

function selectedTrainCompareViews() {
  if (activeTrainStep === "preprocess_effect") return TRAIN_COMPARE_VIEWS.map(item => item.id);
  const values = selectedValues("trainCompareViews");
  return values;
}

function guideEnabledForTrainProcess() {
  const state = guidePageState(TRAIN_PROCESS_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForTrainPreprocessEffect() {
  const state = guidePageState(TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForTrainLoss() {
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForTrainOptimization() {
  const state = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function guideEnabledForTrainCustom() {
  const state = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function ensureTrainLossGuideStep() {
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  if (!TRAIN_LOSS_GUIDE_STEPS.has(state.step)) {
    setGuidePageState({ step: "loss_feature" }, TRAIN_LOSS_GUIDE_ID);
  }
}

function ensureTrainOptimizationGuideStep() {
  const state = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
  if (!TRAIN_OPTIMIZATION_GUIDE_STEPS.has(state.step)) {
    setGuidePageState({ step: "optimization_feature" }, TRAIN_OPTIMIZATION_GUIDE_ID);
  }
}

function ensureTrainCustomGuideStep() {
  const state = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
  if (!TRAIN_CUSTOM_GUIDE_STEPS.has(state.step)) {
    setGuidePageState({ step: "custom_feature" }, TRAIN_CUSTOM_GUIDE_ID);
  }
}

function trainProcessGuideSpec() {
  const state = guidePageState(TRAIN_PROCESS_GUIDE_ID);
  const step = state.step || "process_feature";
  if (step === "process_params") {
    return {
      step,
      target: ".train-process-params-guide-target",
      title: "\u8c03\u8282\u8bad\u7ec3\u53c2\u6570",
      body: "w 和 b 决定当前回归线的位置；学习率决定每次参数更新的步长；周期数决定最多训练多少轮；动画速度只影响演示播放快慢。可以先保留默认值，再观察训练过程。",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "process_actions") {
    return {
      step,
      target: ".train-process-actions-guide-target",
      title: "\u63a7\u5236\u8bad\u7ec3\u8fc7\u7a0b",
      body: "你可以先点击“单步训练”，观察一次参数更新后红色回归线如何变化；也可以点击“自动演示”连续播放训练过程。“暂停”用于停止播放，“重置”会回到初始参数。",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "process_chart") {
    return {
      step,
      target: '[data-chart-card="process_standard_scatter"]',
      title: "\u89c2\u5bdf\u56de\u5f52\u7ebf\u53d8\u5316",
      body: "散点表示样本点，红色线是当前回归线，绿色虚线是最优参考线。训练时样本点不会改变，变化的是模型参数 w、b 和红色回归线。可以逐步训练，观察红线如何靠近参考线。",
      action: "\u5b8c\u6210\u672c\u6b65\u5f15\u5bfc",
    };
  }
  return {
    step: "process_feature",
    target: ".train-process-feature-guide-target",
    title: "\u9009\u62e9\u8bad\u7ec3\u7279\u5f81",
    body: "这里选择当前用于训练的一维输入特征。切换特征后，中间散点图的横轴会随之变化，模型会用该特征去拟合目标值 MEDV。",
    action: "\u4e0b\u4e00\u6b65",
  };
}

function updateTrainProcessGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "train_eval" || activeTrainStep !== "process" || !guideEnabledForTrainProcess()) {
      closeTrainProcessGuide();
      return;
    }
    const spec = trainProcessGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) {
      closeTrainProcessGuide();
      return;
    }
    renderTrainProcessGuide(spec, target);
  });
}

function renderTrainProcessGuide(spec, target) {
  closeTrainProcessGuide();
  const visualTarget = target;
  scrollTrainGuideTargetIntoView(visualTarget);
  visualTarget.classList.add("guide-highlight");
  if (spec.step !== "process_feature") visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="熟悉回归过程引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step !== "process_feature";
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
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "process_feature" }, TRAIN_PROCESS_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainProcessGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "process_feature") {
      setGuidePageState({ step: "process_params" }, TRAIN_PROCESS_GUIDE_ID);
      updateTrainProcessGuide();
    } else if (step === "process_params") {
      setGuidePageState({ step: "process_actions" }, TRAIN_PROCESS_GUIDE_ID);
      updateTrainProcessGuide();
    } else if (step === "process_actions") {
      setGuidePageState({ step: "process_chart" }, TRAIN_PROCESS_GUIDE_ID);
      updateTrainProcessGuide();
    } else if (step === "process_chart") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "process_feature" }, TRAIN_PROCESS_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainProcessGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function scrollTrainGuideTargetIntoView(target) {
  if (!target) return;
  const container = target.closest(".assistant") || target.closest("#main") || $("main");
  if (!container) {
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    return;
  }
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  const rect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const padding = 24;
  const availableHeight = containerRect.height - padding * 2;
  const targetTop = rect.height <= availableHeight
    ? containerRect.top + padding + (availableHeight - rect.height) / 2
    : containerRect.top + padding;
  container.scrollTop += rect.top - targetTop;
}

function closeTrainProcessGuide() {
  closePreprocessLoadGuide();
}

function trainPreprocessEffectGuideSpec() {
  const state = guidePageState(TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
  const step = state.step || "effect_feature";
  if (step === "effect_first_step") {
    return {
      step,
      target: "#stepBtn",
      title: "\u5148\u5355\u6b65\u89c2\u5bdf",
      body: "请先点击“单步训练”。每点击一次，模型都会完成一轮参数更新。这样可以更清楚地观察原始尺度和标准化尺度下，红色当前回归线的移动差异。",
      action: "",
    };
  }
  if (step === "effect_compare_chart") {
    return {
      step,
      target: ".train-effect-combo-target",
      title: "\u5bf9\u6bd4\u4e24\u79cd\u5c3a\u5ea6\u4e0b\u7684\u56de\u5f52\u7ebf",
      body: "请同时观察两张图。左侧是原始特征尺度，右侧是标准化尺度。样本对应关系不变，但坐标尺度不同，因此相同学习率下，红色当前回归线的移动速度和稳定性可能明显不同。",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "effect_lr") {
    return {
      step,
      target: ".range-lr-guide-target",
      title: "\u8bbe\u7f6e\u5b66\u4e60\u7387",
      body: "现在把学习率设置为 0.003。学习率决定每次参数更新的步长；数据点不会改变，改变的是模型参数更新的幅度。",
      action: "\u8bbe\u7f6e\u4e3a 0.003",
    };
  }
  if (step === "effect_second_step") {
    return {
      step,
      target: "#stepBtn",
      title: "\u518d\u6b21\u5355\u6b65\u8bad\u7ec3",
      body: "现在再次点击“单步训练”。注意比较左右两张图中红色回归线的变化：原始尺度可能因为数值范围较大而更新更剧烈，标准化尺度通常更平稳。",
      action: "",
    };
  }
  if (step === "effect_result_chart") {
    return {
      step,
      target: ".train-effect-combo-target",
      title: "\u89c2\u5bdf\u5b66\u4e60\u7387\u5e26\u6765\u7684\u8bad\u7ec3\u5dee\u5f02",
      body: "相同学习率作用在不同数据尺度上，参数更新的表现会不同。标准化不会改变样本之间的相对关系，但会让训练过程更容易控制。",
      action: "\u5b8c\u6210\u672c\u6b65\u5f15\u5bfc",
    };
  }
  return {
    step: "effect_feature",
    target: ".train-effect-feature-guide-target",
    title: "\u9009\u62e9\u5bf9\u6bd4\u7279\u5f81",
    body: "这里选择要对比的输入特征。左侧原始散点图和右侧标准化散点图都会围绕这个特征更新，便于观察同一特征在不同尺度下的训练表现。",
    action: "\u4e0b\u4e00\u6b65",
  };
}

function updateTrainPreprocessEffectGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "train_eval" || activeTrainStep !== "preprocess_effect" || !guideEnabledForTrainPreprocessEffect()) {
      closeTrainPreprocessEffectGuide();
      return;
    }
    const spec = trainPreprocessEffectGuideSpec();
    const target = spec.step === "effect_compare_chart" || spec.step === "effect_result_chart"
      ? createTrainEffectComboTarget()
      : document.querySelector(spec.target);
    if (!target) {
      closeTrainPreprocessEffectGuide();
      return;
    }
    renderTrainPreprocessEffectGuide(spec, target);
  });
}

function renderTrainPreprocessEffectGuide(spec, target) {
  closeTrainPreprocessEffectGuide();
  const visualTarget = spec.step === "effect_compare_chart" || spec.step === "effect_result_chart"
    ? createTrainEffectComboTarget()
    : target;
  if (!visualTarget) return;
  if (spec.step === "effect_compare_chart" || spec.step === "effect_result_chart") {
    scrollTrainEffectChartsIntoView();
    highlightTrainEffectChartCards();
  } else {
    scrollTrainGuideTargetIntoView(visualTarget);
  }
  visualTarget.classList.add("guide-highlight");
  if (spec.step !== "effect_feature" && spec.step !== "effect_first_step" && spec.step !== "effect_second_step") {
    visualTarget.classList.add("guide-highlight-large");
  }
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" role="dialog" aria-live="polite" aria-label="熟悉预处理影响引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step !== "effect_feature" && spec.step !== "effect_first_step" && spec.step !== "effect_second_step";
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    if (spec.step === "effect_compare_chart" || spec.step === "effect_result_chart") syncTrainEffectComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    if (spec.step === "effect_compare_chart" || spec.step === "effect_result_chart") syncTrainEffectComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 120);

  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", async event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "effect_feature" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainPreprocessEffectGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "effect_feature") {
      setGuidePageState({ step: "effect_first_step" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
      updateTrainPreprocessEffectGuide();
    } else if (step === "effect_compare_chart") {
      setGuidePageState({ step: "effect_lr" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
      updateTrainPreprocessEffectGuide();
    } else if (step === "effect_lr") {
      setGuidePageState({ step: "effect_second_step" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
      await setTrainLearningRateExact("0.003");
      updateTrainPreprocessEffectGuide();
    } else if (step === "effect_result_chart") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "effect_feature" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainPreprocessEffectGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function createTrainEffectComboTarget() {
  const raw = document.querySelector('[data-chart-card="raw_scatter"]');
  const standard = document.querySelector('[data-chart-card="standard_scatter"]');
  if (!raw || !standard) return null;
  let target = document.querySelector(".train-effect-combo-target");
  if (!target) {
    target = document.createElement("div");
    target.className = "train-effect-combo-target";
    document.body.appendChild(target);
  }
  syncTrainEffectComboTarget(target);
  return target;
}

function syncTrainEffectComboTarget(target) {
  const raw = document.querySelector('[data-chart-card="raw_scatter"]');
  const standard = document.querySelector('[data-chart-card="standard_scatter"]');
  if (!target || !raw || !standard) return;
  const rawRect = raw.getBoundingClientRect();
  const stdRect = standard.getBoundingClientRect();
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

function highlightTrainEffectChartCards() {
  ["raw_scatter", "standard_scatter"].forEach(view => {
    const card = document.querySelector(`[data-chart-card="${view}"]`);
    const item = card?.closest(".grid-stack-item");
    item?.classList.add("guide-lift");
    card?.classList.add("guide-highlight", "guide-highlight-large");
  });
}

function scrollTrainEffectChartsIntoView() {
  const raw = document.querySelector('[data-chart-card="raw_scatter"]');
  const standard = document.querySelector('[data-chart-card="standard_scatter"]');
  const main = $("main");
  if (!raw || !standard || !main) return;
  const rawRect = raw.getBoundingClientRect();
  const stdRect = standard.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const top = Math.min(rawRect.top, stdRect.top);
  const bottom = Math.max(rawRect.bottom, stdRect.bottom);
  const targetHeight = bottom - top;
  const padding = 24;
  const availableHeight = mainRect.height - padding * 2;
  const targetTop = targetHeight <= availableHeight
    ? mainRect.top + padding + (availableHeight - targetHeight) / 2
    : mainRect.top + padding;
  main.scrollTop += top - targetTop;
}

function closeTrainPreprocessEffectGuide() {
  closePreprocessLoadGuide();
  document.querySelector(".train-effect-combo-target")?.remove();
}

function createTrainLossComboTarget() {
  const residual = document.querySelector('[data-chart-card="loss_residual_main"]');
  const overall = document.querySelector('[data-chart-card="loss_overall"]');
  if (!residual || !overall) return null;
  let target = document.querySelector(".train-loss-combo-target");
  if (!target) {
    target = document.createElement("div");
    target.className = "train-loss-combo-target";
    document.body.appendChild(target);
  }
  syncTrainLossComboTarget(target);
  return target;
}

function syncTrainLossComboTarget(target) {
  const residual = document.querySelector('[data-chart-card="loss_residual_main"]');
  const overall = document.querySelector('[data-chart-card="loss_overall"]');
  if (!target || !residual || !overall) return;
  const residualRect = residual.getBoundingClientRect();
  const overallRect = overall.getBoundingClientRect();
  const left = Math.min(residualRect.left, overallRect.left);
  const top = Math.min(residualRect.top, overallRect.top);
  const right = Math.max(residualRect.right, overallRect.right);
  const bottom = Math.max(residualRect.bottom, overallRect.bottom);
  target.style.position = "fixed";
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  target.style.width = `${right - left}px`;
  target.style.height = `${bottom - top}px`;
  target.style.pointerEvents = "none";
  target.style.borderRadius = "14px";
}

function highlightTrainLossChartCards() {
  ["loss_residual_main", "loss_overall"].forEach(view => {
    const card = document.querySelector(`[data-chart-card="${view}"]`);
    const item = card?.closest(".grid-stack-item");
    item?.classList.add("guide-lift");
    card?.classList.add("guide-highlight", "guide-highlight-large");
  });
}

function scrollTrainLossChartsIntoView() {
  const residual = document.querySelector('[data-chart-card="loss_residual_main"]');
  const overall = document.querySelector('[data-chart-card="loss_overall"]');
  const main = $("main");
  if (!residual || !overall || !main) return;
  const residualRect = residual.getBoundingClientRect();
  const overallRect = overall.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const top = Math.min(residualRect.top, overallRect.top);
  const bottom = Math.max(residualRect.bottom, overallRect.bottom);
  const targetHeight = bottom - top;
  const padding = 24;
  const availableHeight = mainRect.height - padding * 2;
  const targetTop = targetHeight <= availableHeight
    ? mainRect.top + padding + (availableHeight - targetHeight) / 2
    : mainRect.top + padding;
  main.scrollTop += top - targetTop;
}

function trainLossGuideSpec() {
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  const step = state.step || "loss_feature";
  if (step === "loss_random10") {
    return {
      step,
      target: '[data-loss-residual-mode="random10"]',
      title: "\u67e5\u770b\u968f\u673a 10 \u4e2a\u6837\u672c\u6b8b\u5dee",
      body: "璇风偣鍑烩€滈殢鏈?10 涓牱鏈残宸€濄€傚涓牱鏈殑绾㈣壊娈嬪樊绾胯兘璁╀綘鐪嬪埌锛岄娴嬭宸笉鏄崟涓偣鐨勭幇璞★紝鑰屾槸鏁翠釜鏁版嵁闆嗛兘浼氫骇鐢熺殑璁粌淇″彿銆?",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_overall") {
    return {
      step,
      target: '[data-chart-card="loss_overall"]',
      title: "\u67e5\u770b\u6574\u4f53\u8bef\u5dee\u5206\u5e03",
      body: "杩欓噷浠庡崟涓垨灏戦噺鏍锋湰鐨勬残宸墿灞曞埌鎵€鏈夋牱鏈殑璇樊銆侻SE \u4f1a\u628a\u6240\u6709\u6837\u672c\u7684\u9884\u6d4b\u8bef\u5dee\u5e73\u65b9\u540e\u6c42\u5e73\u5747\uff0c\u56e0\u6b64\u5b83\u8861\u91cf\u7684\u662f\u6574\u4f53\u8bef\u5dee\u6c34\u5e73\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_residual_chart") {
    return {
      step,
      target: '[data-chart-card="loss_residual_main"]',
      title: "\u89c2\u5bdf\u968f\u673a\u6837\u672c\u7684\u6b8b\u5dee",
      body: "\u73b0\u5728\u5148\u770b\u5de6\u4fa7\u56fe\u3002\u9ec4\u8272\u70b9\u662f\u88ab\u968f\u673a\u9009\u4e2d\u7684\u6837\u672c\uff0c\u7ea2\u8272\u7ad6\u7ebf\u8868\u793a\u771f\u5b9e\u503c\u548c\u9884\u6d4b\u503c\u4e4b\u95f4\u7684\u6b8b\u5dee\u3002\u7ebf\u6bb5\u8d8a\u957f\uff0c\u8fd9\u4e2a\u6837\u672c\u7684\u9884\u6d4b\u8bef\u5dee\u8d8a\u5927\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_hist") {
    return {
      step,
      target: '[data-chart-card="loss_overall"]',
      title: "\u89c2\u5bdf\u6b8b\u5dee\u76f4\u65b9\u56fe",
      body: "\u76f4\u65b9\u56fe\u628a\u6b8b\u5dee\u6309\u533a\u95f4\u7edf\u8ba1\uff0c\u53ef\u4ee5\u770b\u51fa\u591a\u6570\u9884\u6d4b\u8bef\u5dee\u662f\u5426\u96c6\u4e2d\u5728 0 \u9644\u8fd1\uff0c\u4ee5\u53ca\u662f\u5426\u5b58\u5728\u8f83\u5927\u7684\u5f02\u5e38\u8bef\u5dee\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_step") {
    return {
      step,
      target: "#stepBtn",
      title: "\u5355\u6b65\u8bad\u7ec3\u89c2\u5bdf Loss",
      body: "\u73b0\u5728\u70b9\u51fb\u201c\u5355\u6b65\u8bad\u7ec3\u201d\u3002\u6a21\u578b\u53c2\u6570\u66f4\u65b0\u4e00\u8f6e\u540e\uff0c\u6b8b\u5dee\u3001MSE \u548c\u76f4\u65b9\u56fe\u90fd\u4f1a\u968f\u4e4b\u53d8\u5316\uff0c\u8bf7\u89c2\u5bdf\u8bad\u7ec3\u5982\u4f55\u9010\u6b65\u51cf\u5c0f\u6574\u4f53\u8bef\u5dee\u3002",
      action: "",
    };
  }
  if (step === "loss_after_step_charts") {
    return {
      step,
      target: ".train-loss-combo-target",
      title: "\u89c2\u5bdf\u8bad\u7ec3\u540e\u7684\u56fe\u8868\u53d8\u5316",
      body: "\u8bf7\u540c\u65f6\u89c2\u5bdf\u5de6\u4fa7\u6b8b\u5dee\u4e0e\u56de\u5f52\u7ebf\u3001\u53f3\u4fa7\u6574\u4f53\u8bef\u5dee\u5206\u5e03\u6216\u6b8b\u5dee\u76f4\u65b9\u56fe\u3002\u5355\u6b65\u8bad\u7ec3\u540e\uff0c\u5f53\u524d\u56de\u5f52\u7ebf\u3001\u6b8b\u5dee\u7ebf\u3001MSE \u548c\u8bef\u5dee\u5206\u5e03\u90fd\u53ef\u80fd\u53d1\u751f\u53d8\u5316\u3002",
      action: "\u5b8c\u6210\u672c\u6b65\u5f15\u5bfc",
    };
  }
  return {
    step: "loss_feature",
    target: ".train-loss-feature-guide-target",
    title: "\u9009\u62e9\u8bad\u7ec3\u7279\u5f81",
    body: "\u8fd9\u91cc\u9009\u62e9\u7528\u6765\u8bad\u7ec3\u7b80\u5355\u7ebf\u6027\u56de\u5f52\u7684\u8f93\u5165\u7279\u5f81\u3002\u7279\u5f81\u4f1a\u5f71\u54cd\u56de\u5f52\u7ebf\u3001\u6bcf\u4e2a\u6837\u672c\u7684\u9884\u6d4b\u503c\uff0c\u4e5f\u4f1a\u8fdb\u4e00\u6b65\u5f71\u54cd\u6b8b\u5dee\u548c MSE Loss\u3002",
    action: "\u4e0b\u4e00\u6b65",
  };
}

function trainLossGuideSpecClean() {
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  const step = state.step || "loss_feature";
  if (step === "loss_random10") {
    return {
      step,
      target: '[data-loss-residual-mode="random10"]',
      title: "\u67e5\u770b\u968f\u673a 10 \u4e2a\u6837\u672c\u6b8b\u5dee",
      body: "\u8bf7\u70b9\u51fb\u201c\u968f\u673a 10 \u4e2a\u6837\u672c\u201d\u3002\u591a\u4e2a\u6837\u672c\u7684\u7ea2\u8272\u6b8b\u5dee\u7ebf\u80fd\u8ba9\u4f60\u770b\u5230\uff0c\u9884\u6d4b\u8bef\u5dee\u4e0d\u662f\u5355\u4e2a\u70b9\u7684\u73b0\u8c61\uff0c\u800c\u662f\u6574\u4e2a\u6570\u636e\u96c6\u90fd\u4f1a\u4ea7\u751f\u7684\u8bad\u7ec3\u4fe1\u53f7\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_overall") {
    return {
      step,
      target: '[data-chart-card="loss_overall"]',
      title: "\u67e5\u770b\u6574\u4f53\u8bef\u5dee\u5206\u5e03",
      body: "\u8fd9\u91cc\u4ece\u5355\u4e2a\u6216\u5c11\u91cf\u6837\u672c\u7684\u6b8b\u5dee\u6269\u5c55\u5230\u6240\u6709\u6837\u672c\u7684\u8bef\u5dee\u3002MSE \u4f1a\u628a\u6240\u6709\u6837\u672c\u7684\u9884\u6d4b\u8bef\u5dee\u5e73\u65b9\u540e\u6c42\u5e73\u5747\uff0c\u56e0\u6b64\u5b83\u8861\u91cf\u7684\u662f\u6574\u4f53\u8bef\u5dee\u6c34\u5e73\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_residual_chart") {
    return {
      step,
      target: '[data-chart-card="loss_residual_main"]',
      title: "\u89c2\u5bdf\u968f\u673a\u6837\u672c\u7684\u6b8b\u5dee",
      body: "\u73b0\u5728\u5148\u770b\u5de6\u4fa7\u56fe\u3002\u9ec4\u8272\u70b9\u662f\u88ab\u968f\u673a\u9009\u4e2d\u7684\u6837\u672c\uff0c\u7ea2\u8272\u7ad6\u7ebf\u8868\u793a\u771f\u5b9e\u503c\u548c\u9884\u6d4b\u503c\u4e4b\u95f4\u7684\u6b8b\u5dee\u3002\u7ebf\u6bb5\u8d8a\u957f\uff0c\u8fd9\u4e2a\u6837\u672c\u7684\u9884\u6d4b\u8bef\u5dee\u8d8a\u5927\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_hist") {
    return {
      step,
      target: '[data-chart-card="loss_overall"]',
      title: "\u89c2\u5bdf\u6b8b\u5dee\u76f4\u65b9\u56fe",
      body: "\u76f4\u65b9\u56fe\u628a\u6b8b\u5dee\u6309\u533a\u95f4\u7edf\u8ba1\uff0c\u53ef\u4ee5\u770b\u51fa\u591a\u6570\u9884\u6d4b\u8bef\u5dee\u662f\u5426\u96c6\u4e2d\u5728 0 \u9644\u8fd1\uff0c\u4ee5\u53ca\u662f\u5426\u5b58\u5728\u8f83\u5927\u7684\u5f02\u5e38\u8bef\u5dee\u3002",
      action: "\u4e0b\u4e00\u6b65",
    };
  }
  if (step === "loss_step") {
    return {
      step,
      target: "#stepBtn",
      title: "\u5355\u6b65\u8bad\u7ec3\u89c2\u5bdf Loss",
      body: "\u73b0\u5728\u70b9\u51fb\u201c\u5355\u6b65\u8bad\u7ec3\u201d\u3002\u6a21\u578b\u53c2\u6570\u66f4\u65b0\u4e00\u8f6e\u540e\uff0c\u6b8b\u5dee\u3001MSE \u548c\u76f4\u65b9\u56fe\u90fd\u4f1a\u968f\u4e4b\u53d8\u5316\uff0c\u8bf7\u89c2\u5bdf\u8bad\u7ec3\u5982\u4f55\u9010\u6b65\u51cf\u5c0f\u6574\u4f53\u8bef\u5dee\u3002",
      action: "",
    };
  }
  if (step === "loss_after_step_charts") {
    return {
      step,
      target: ".train-loss-combo-target",
      title: "\u89c2\u5bdf\u8bad\u7ec3\u540e\u7684\u56fe\u8868\u53d8\u5316",
      body: "\u8bf7\u540c\u65f6\u89c2\u5bdf\u5de6\u4fa7\u6b8b\u5dee\u4e0e\u56de\u5f52\u7ebf\u3001\u53f3\u4fa7\u6574\u4f53\u8bef\u5dee\u5206\u5e03\u6216\u6b8b\u5dee\u76f4\u65b9\u56fe\u3002\u5355\u6b65\u8bad\u7ec3\u540e\uff0c\u5f53\u524d\u56de\u5f52\u7ebf\u3001\u6b8b\u5dee\u7ebf\u3001MSE \u548c\u8bef\u5dee\u5206\u5e03\u90fd\u53ef\u80fd\u53d1\u751f\u53d8\u5316\u3002",
      action: "\u5b8c\u6210\u672c\u6b65\u5f15\u5bfc",
    };
  }
  return {
    step: "loss_feature",
    target: ".train-loss-feature-guide-target",
    title: "\u9009\u62e9\u8bad\u7ec3\u7279\u5f81",
    body: "\u8fd9\u91cc\u9009\u62e9\u7528\u6765\u8bad\u7ec3\u7b80\u5355\u7ebf\u6027\u56de\u5f52\u7684\u8f93\u5165\u7279\u5f81\u3002\u7279\u5f81\u4f1a\u5f71\u54cd\u56de\u5f52\u7ebf\u3001\u6bcf\u4e2a\u6837\u672c\u7684\u9884\u6d4b\u503c\uff0c\u4e5f\u4f1a\u8fdb\u4e00\u6b65\u5f71\u54cd\u6b8b\u5dee\u548c MSE Loss\u3002",
    action: "\u4e0b\u4e00\u6b65",
  };
}

function updateTrainLossGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "train_eval" || activeTrainStep !== "loss" || !guideEnabledForTrainLoss()) {
      closeTrainLossGuide();
      return;
    }
    const spec = trainLossGuideSpecClean();
    const target = spec.step === "loss_after_step_charts"
      ? createTrainLossComboTarget()
      : document.querySelector(spec.target);
    if (!target) {
      return;
    }
    const existing = document.querySelector(`.guide-popover[data-train-loss-guide-step="${escapeHtml(spec.step)}"]`);
    if (existing && target.classList.contains("guide-highlight")) {
      const isLargeTarget = spec.step === "loss_residual_chart" || spec.step === "loss_overall" || spec.step === "loss_hist";
      positionGuideFocusRing(target, isLargeTarget);
      positionGuidePopover(target);
      return;
    }
    renderTrainLossGuide(spec, target);
  });
}

function scheduleTrainLossGuideUpdate(delay = 120) {
  clearTimeout(scheduleTrainLossGuideUpdate.timer);
  scheduleTrainLossGuideUpdate.timer = setTimeout(() => {
    updateTrainLossGuide();
  }, delay);
}

function renderTrainLossGuide(spec, target) {
  closeTrainLossGuide();
  const visualTarget = spec.step === "loss_after_step_charts"
    ? createTrainLossComboTarget()
    : target;
  if (!visualTarget) return;
  if (spec.step === "loss_after_step_charts") {
    scrollTrainLossChartsIntoView();
    highlightTrainLossChartCards();
  } else {
    scrollTrainGuideTargetIntoView(visualTarget);
  }
  visualTarget.classList.add("guide-highlight");
  if (spec.step === "loss_residual_chart" || spec.step === "loss_overall" || spec.step === "loss_hist" || spec.step === "loss_after_step_charts") visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" data-train-loss-guide-step="${escapeHtml(spec.step)}" role="dialog" aria-live="polite" aria-label="\u719f\u6089\u635f\u5931\u51fd\u6570\u5f15\u5bfc">
      <button class="guide-close" type="button" aria-label="\u5173\u95ed\u5f53\u524d\u9875\u9762\u5f15\u5bfc" data-guide-close="true">x</button>
      <div class="guide-kicker">\u5b66\u4e60\u5f15\u5bfc</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">\u5173\u95ed\u5f15\u5bfc</button>
      </div>
    </aside>`);

  const isLargeTarget = spec.step === "loss_residual_chart" || spec.step === "loss_overall" || spec.step === "loss_hist" || spec.step === "loss_after_step_charts";
  positionGuideFocusRing(visualTarget, isLargeTarget);
  positionGuidePopover(visualTarget);
  requestAnimationFrame(() => {
    if (spec.step === "loss_after_step_charts") syncTrainLossComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  });
  setTimeout(() => {
    if (spec.step === "loss_after_step_charts") syncTrainLossComboTarget(visualTarget);
    positionGuideFocusRing(visualTarget, isLargeTarget);
    positionGuidePopover(visualTarget);
  }, 120);

  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "loss_feature" }, TRAIN_LOSS_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainLossGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "loss_feature") {
      setGuidePageState({ step: "loss_random10" }, TRAIN_LOSS_GUIDE_ID);
      updateTrainLossGuide();
    } else if (step === "loss_random10") {
      viewStateStore.trainLossResidualModeV1 = "random10";
      resetTrainLossRandom10Indices();
      trainLossViewsKey = "";
      renderTrainLossFrame(currentFrame);
      advanceTrainLossGuideOnRandom10Click();
    } else if (step === "loss_residual_chart") {
      setGuidePageState({ step: "loss_overall" }, TRAIN_LOSS_GUIDE_ID);
      scheduleTrainLossGuideUpdate(80);
    } else if (step === "loss_overall") {
      viewStateStore.trainLossOverallViewV1 = "residual_hist";
      trainLossViewsKey = "";
      setGuidePageState({ step: "loss_hist" }, TRAIN_LOSS_GUIDE_ID);
      renderTrainLossFrame(currentFrame);
      scheduleTrainLossGuideUpdate(120);
    } else if (step === "loss_hist") {
      setGuidePageState({ step: "loss_step" }, TRAIN_LOSS_GUIDE_ID);
      scheduleTrainLossGuideUpdate(80);
    } else if (step === "loss_after_step_charts") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "loss_feature" }, TRAIN_LOSS_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainLossGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function closeTrainLossGuide() {
  clearTimeout(scheduleTrainLossGuideUpdate.timer);
  closePreprocessLoadGuide();
  document.querySelector(".train-loss-combo-target")?.remove();
}

function advanceTrainLossGuideOnRandom10Click() {
  if (currentPage !== "train_eval" || activeTrainStep !== "loss" || !guideEnabledForTrainLoss()) return;
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  if (state.step !== "loss_random10") return;
  setGuidePageState({ step: "loss_residual_chart" }, TRAIN_LOSS_GUIDE_ID);
  scheduleTrainLossGuideUpdate(120);
}

function advanceTrainLossGuideOnStepClick() {
  if (currentPage !== "train_eval" || activeTrainStep !== "loss" || !guideEnabledForTrainLoss()) return;
  const state = guidePageState(TRAIN_LOSS_GUIDE_ID);
  if (state.step !== "loss_step") return;
  setGuidePageState({ step: "loss_after_step_charts" }, TRAIN_LOSS_GUIDE_ID);
  scheduleTrainLossGuideUpdate(120);
}

function trainOptimizationGuideSpec() {
  const state = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
  const step = state.step || "optimization_feature";
  if (step === "optimization_params") {
    return {
      step,
      target: ".train-optimization-params-guide-target",
      title: "设置初始参数",
      body: "这里先把初始参数设成 w=10、b=5，让当前位置明显偏离低 Loss 区域。点击下一步后，系统会自动填入这两个值并刷新图表。",
      action: "设为 w=10, b=5",
    };
  }
  if (step === "optimization_step") {
    return {
      step,
      target: "#stepBtn",
      title: "执行一次梯度下降",
      body: "现在点击“单步训练”。一次更新后，w 和 b 会沿负梯度方向移动，Loss 也会更新。",
      action: "",
    };
  }
  if (step === "optimization_surface") {
    return {
      step,
      target: '[data-chart-card="opt_surface_3d"]',
      title: "观察 3D Loss 曲面",
      body: "3D 曲面展示 J(w,b) 的整体地形。当前位置在曲面上移动，目标是沿着下降方向靠近低谷。",
      action: "下一步",
    };
  }
  if (step === "optimization_contour") {
    return {
      step,
      target: '[data-chart-card="opt_contour"]',
      title: "观察 Loss 等高线",
      body: "等高线更适合看参数路径。红点是当前参数，绿色箭头表示负梯度下降方向，蓝色轨迹记录参数更新过程。",
      action: "下一步",
    };
  }
  if (step === "optimization_loss") {
    return {
      step,
      target: '[data-chart-card="opt_loss"]',
      title: "观察 Loss 随 epoch 变化",
      body: "这张图把参数空间里的移动转成训练曲线。重点观察单步更新后 MSE Loss 是否下降。",
      action: "完成本步引导",
    };
  }
  return {
    step: "optimization_feature",
    target: ".train-optimization-feature-guide-target",
    title: "选择训练特征",
    body: "先选择用于训练的一维输入特征。默认使用 CRIM，后续也可以切换其它特征观察训练路径和 Loss 变化。",
    action: "下一步",
  };
}

function updateTrainOptimizationGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "train_eval" || activeTrainStep !== "optimization" || !guideEnabledForTrainOptimization()) {
      closeTrainOptimizationGuide();
      return;
    }
    const spec = trainOptimizationGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) return;
    renderTrainOptimizationGuide(spec, target);
  });
}

function scheduleTrainOptimizationGuideUpdate(delay = 120) {
  clearTimeout(scheduleTrainOptimizationGuideUpdate.timer);
  scheduleTrainOptimizationGuideUpdate.timer = setTimeout(() => {
    updateTrainOptimizationGuide();
  }, delay);
}

function renderTrainOptimizationGuide(spec, target) {
  closeTrainOptimizationGuide();
  scrollTrainGuideTargetIntoView(target);
  target.classList.add("guide-highlight");
  const isLargeTarget = spec.step === "optimization_params"
    || spec.step === "optimization_surface"
    || spec.step === "optimization_contour"
    || spec.step === "optimization_loss";
  if (isLargeTarget) target.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" data-train-optimization-guide-step="${escapeHtml(spec.step)}" role="dialog" aria-live="polite" aria-label="熟悉优化准则引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        ${spec.action ? `<button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>` : ""}
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  positionGuideFocusRing(target, isLargeTarget);
  positionGuidePopover(target);
  requestAnimationFrame(() => {
    positionGuideFocusRing(target, isLargeTarget);
    positionGuidePopover(target);
  });
  setTimeout(() => {
    positionGuideFocusRing(target, isLargeTarget);
    positionGuidePopover(target);
  }, 120);

  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", async event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "optimization_feature" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainOptimizationGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "optimization_feature") {
      setGuidePageState({ step: "optimization_params" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      updateTrainOptimizationGuide();
    } else if (step === "optimization_params") {
      await setTrainInitialParamsExact("10", "5");
      setGuidePageState({ step: "optimization_step" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      scheduleTrainOptimizationGuideUpdate(140);
    } else if (step === "optimization_surface") {
      setGuidePageState({ step: "optimization_contour" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      scheduleTrainOptimizationGuideUpdate(80);
    } else if (step === "optimization_contour") {
      setGuidePageState({ step: "optimization_loss" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      scheduleTrainOptimizationGuideUpdate(80);
    } else if (step === "optimization_loss") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "optimization_feature" }, TRAIN_OPTIMIZATION_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainOptimizationGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function closeTrainOptimizationGuide() {
  clearTimeout(scheduleTrainOptimizationGuideUpdate.timer);
  closePreprocessLoadGuide();
}

function advanceTrainOptimizationGuideOnStepClick() {
  if (currentPage !== "train_eval" || activeTrainStep !== "optimization" || !guideEnabledForTrainOptimization()) return;
  const state = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
  if (state.step !== "optimization_step") return;
  setGuidePageState({ step: "optimization_surface" }, TRAIN_OPTIMIZATION_GUIDE_ID);
  scheduleTrainOptimizationGuideUpdate(120);
}

function createTrainCustomComboTarget(kind) {
  const ids = kind === "params"
    ? ["custom_w_path", "custom_b_path"]
    : ["custom_standard_scatter", "custom_loss"];
  const cards = ids.map(id => document.querySelector(`[data-chart-card="${id}"]`)).filter(Boolean);
  if (cards.length !== ids.length) return null;
  const className = kind === "params" ? "train-custom-param-combo-target" : "train-custom-effect-combo-target";
  let target = document.querySelector(`.${className}`);
  if (!target) {
    target = document.createElement("div");
    target.className = className;
    document.body.appendChild(target);
  }
  syncTrainCustomComboTarget(target, cards);
  return target;
}

function syncTrainCustomComboTarget(target, cards) {
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

function highlightTrainCustomChartCards(kind) {
  const ids = kind === "params"
    ? ["custom_w_path", "custom_b_path"]
    : ["custom_standard_scatter", "custom_loss"];
  ids.forEach(id => {
    const card = document.querySelector(`[data-chart-card="${id}"]`);
    const item = card?.closest(".grid-stack-item");
    item?.classList.add("guide-lift");
    card?.classList.add("guide-highlight", "guide-highlight-large");
  });
}

function scrollTrainCustomComboIntoView(kind) {
  const ids = kind === "params"
    ? ["custom_w_path", "custom_b_path"]
    : ["custom_standard_scatter", "custom_loss"];
  const cards = ids.map(id => document.querySelector(`[data-chart-card="${id}"]`)).filter(Boolean);
  const main = $("main");
  if (!cards.length || !main) return;
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

function trainCustomGuideSpec() {
  const state = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
  const step = state.step || "custom_feature";
  if (step === "custom_params") {
    return {
      step,
      target: ".train-custom-params-guide-target",
      title: "设置训练参数",
      body: "这里可以自定义初始 w、b、学习率、周期数和动画速度。参数决定模型从哪里出发、每一步走多远，以及最多训练多少轮。",
      action: "下一步",
    };
  }
  if (step === "custom_step") {
    return {
      step,
      target: "#stepBtn",
      title: "先单步训练一次",
      body: "请点击“单步训练”。先看一轮更新，更容易把右侧参数设置和中间图表变化对应起来。",
      action: "",
    };
  }
  if (step === "custom_scatter_loss") {
    return {
      step,
      target: ".train-custom-effect-combo-target",
      title: "对照模型效果和 Loss",
      body: "同时观察标准化散点图和 MSE Loss 曲线：左侧看回归线是否更贴近样本趋势，右侧看本轮更新后 Loss 是否下降。",
      action: "下一步",
    };
  }
  if (step === "custom_param_paths") {
    return {
      step,
      target: ".train-custom-param-combo-target",
      title: "观察 w 和 b 的轨迹",
      body: "w 和 b 是共同更新的参数。两张轨迹图能帮你看到每一轮训练中参数分别如何变化，并共同决定回归线的位置。",
      action: "下一步",
    };
  }
  if (step === "custom_calc") {
    return {
      step,
      target: "#customCalcCard",
      title: "查看本轮计算过程",
      body: "最后回到本轮计算过程，查看预测值、误差、Loss、梯度和参数更新如何一步步算出。图表变化不是黑箱，而是来自这一轮计算。",
      action: "完成本步引导",
    };
  }
  return {
    step: "custom_feature",
    target: ".train-custom-feature-guide-target",
    title: "选择训练特征",
    body: "先选择用于训练的一维输入特征。后面的散点图、Loss 曲线和参数轨迹都会围绕这个特征更新。",
    action: "下一步",
  };
}

function updateTrainCustomGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "train_eval" || activeTrainStep !== "custom" || !guideEnabledForTrainCustom()) {
      closeTrainCustomGuide();
      return;
    }
    const spec = trainCustomGuideSpec();
    const target = spec.step === "custom_scatter_loss"
      ? createTrainCustomComboTarget("effect")
      : spec.step === "custom_param_paths"
        ? createTrainCustomComboTarget("params")
        : document.querySelector(spec.target);
    if (!target) return;
    renderTrainCustomGuide(spec, target);
  });
}

function scheduleTrainCustomGuideUpdate(delay = 120) {
  clearTimeout(scheduleTrainCustomGuideUpdate.timer);
  scheduleTrainCustomGuideUpdate.timer = setTimeout(() => {
    updateTrainCustomGuide();
  }, delay);
}

function renderTrainCustomGuide(spec, target) {
  closeTrainCustomGuide();
  const comboKind = spec.step === "custom_scatter_loss" ? "effect" : spec.step === "custom_param_paths" ? "params" : "";
  const visualTarget = comboKind ? createTrainCustomComboTarget(comboKind) : target;
  if (!visualTarget) return;
  if (comboKind) {
    scrollTrainCustomComboIntoView(comboKind);
    highlightTrainCustomChartCards(comboKind);
    syncTrainCustomComboTarget(
      visualTarget,
      (comboKind === "params" ? ["custom_w_path", "custom_b_path"] : ["custom_standard_scatter", "custom_loss"])
        .map(id => document.querySelector(`[data-chart-card="${id}"]`))
        .filter(Boolean)
    );
  } else {
    scrollTrainGuideTargetIntoView(visualTarget);
  }
  visualTarget.classList.add("guide-highlight");
  const isLargeTarget = spec.step !== "custom_feature" && spec.step !== "custom_step";
  if (isLargeTarget) visualTarget.classList.add("guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" data-train-custom-guide-step="${escapeHtml(spec.step)}" role="dialog" aria-live="polite" aria-label="自定义参数训练引导">
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
    if (comboKind) {
      syncTrainCustomComboTarget(
        visualTarget,
        (comboKind === "params" ? ["custom_w_path", "custom_b_path"] : ["custom_standard_scatter", "custom_loss"])
          .map(id => document.querySelector(`[data-chart-card="${id}"]`))
          .filter(Boolean)
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
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "custom_feature" }, TRAIN_CUSTOM_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainCustomGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "custom_feature") {
      setGuidePageState({ step: "custom_params" }, TRAIN_CUSTOM_GUIDE_ID);
      updateTrainCustomGuide();
    } else if (step === "custom_params") {
      setGuidePageState({ step: "custom_step" }, TRAIN_CUSTOM_GUIDE_ID);
      updateTrainCustomGuide();
    } else if (step === "custom_scatter_loss") {
      setGuidePageState({ step: "custom_param_paths" }, TRAIN_CUSTOM_GUIDE_ID);
      scheduleTrainCustomGuideUpdate(80);
    } else if (step === "custom_param_paths") {
      setGuidePageState({ step: "custom_calc" }, TRAIN_CUSTOM_GUIDE_ID);
      scheduleTrainCustomGuideUpdate(80);
    } else if (step === "custom_calc") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "custom_feature" }, TRAIN_CUSTOM_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeTrainCustomGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function closeTrainCustomGuide() {
  clearTimeout(scheduleTrainCustomGuideUpdate.timer);
  closePreprocessLoadGuide();
  document.querySelector(".train-custom-effect-combo-target")?.remove();
  document.querySelector(".train-custom-param-combo-target")?.remove();
}

function advanceTrainCustomGuideOnStepClick() {
  if (currentPage !== "train_eval" || activeTrainStep !== "custom" || !guideEnabledForTrainCustom()) return;
  const state = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
  if (state.step !== "custom_step") return;
  setGuidePageState({ step: "custom_scatter_loss" }, TRAIN_CUSTOM_GUIDE_ID);
  scheduleTrainCustomGuideUpdate(120);
}

function advanceTrainPreprocessEffectGuideOnStepClick() {
  if (currentPage !== "train_eval" || activeTrainStep !== "preprocess_effect" || !guideEnabledForTrainPreprocessEffect()) return;
  const state = guidePageState(TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
  if (state.step === "effect_first_step") {
    setGuidePageState({ step: "effect_compare_chart" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
    setTimeout(updateTrainPreprocessEffectGuide, 80);
  } else if (state.step === "effect_second_step") {
    setGuidePageState({ step: "effect_result_chart" }, TRAIN_PREPROCESS_EFFECT_GUIDE_ID);
    setTimeout(updateTrainPreprocessEffectGuide, 80);
  }
}

async function setTrainLearningRateExact(value) {
  const input = $("lr");
  if (!input) return;
  input.value = value;
  updateTrainRangeText();
  persistTrainFormState();
  if (activeTrainStep === "preprocess_effect") {
    await prepareTrainCompare();
  }
}

async function setTrainInitialParamsExact(w, b) {
  const wInput = $("w0");
  const bInput = $("b0");
  if (wInput) wInput.value = w;
  if (bInput) bInput.value = b;
  persistTrainFormState();
  if (activeTrainStep === "preprocess_effect") await prepareTrainCompare();
  else await prepareTraining();
}

function trainUseStandardized() {
  const value = $("trainStd")?.value;
  return value === "1" || value === "true" || value === true;
}

function renderTrainDashboard(grid, views, frame) {
  dataGridMode = "train";
  grid.classList.add("dashboard-grid", "grid-stack");
  grid.classList.remove("single");
  const saved = loadTrainGridLayout();
  grid.innerHTML = views.map(view => {
    const layout = normalizeTrainGridLayout(view, saved[view] || defaultTrainGridLayout(view));
    return trainGridItemHtml(view, layout, frame);
  }).join("");
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

function defaultTrainGridLayout(view) {
  return ({
    model_train: { x: 0, y: 0, w: 2, h: 2 },
    learning: { x: 2, y: 0, w: 2, h: 2 },
    gradient: { x: 0, y: 2, w: 2, h: 2 },
    loss_surface_3d: { x: 0, y: 4, w: 2, h: 2 },
    w_path: { x: 2, y: 2, w: 1, h: 1 },
    b_path: { x: 2, y: 3, w: 1, h: 1 },
    rmse: { x: 3, y: 2, w: 1, h: 2 },
    mae: { x: 2, y: 4, w: 1, h: 2 },
    r2: { x: 3, y: 4, w: 1, h: 2 },
    gradient_descent: { x: 0, y: 6, w: 1, h: 2 },
    calc: { x: 0, y: 8, w: 4, h: 4 },
    table: { x: 0, y: 12, w: 4, h: 1 }
  })[view] || { x: 0, y: 0, w: 1, h: 1 };
}

function normalizeTrainGridLayout(view, layout) {
  const next = { ...defaultTrainGridLayout(view), ...layout };
  next.w = Math.max(1, Math.min(4, Number(next.w) || 1));
  next.h = Math.max(1, Number(next.h) || 1);
  next.x = Math.max(0, Math.min(4 - next.w, Number(next.x) || 0));
  next.y = Math.max(0, Number(next.y) || 0);
  return next;
}

function trainGridItemHtml(view, layout, frame) {
  return `<div class="grid-stack-item" data-view="${view}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${trainViewHtml(view, frame, trainChartDataCache[view])}</div></div>`;
}

function updateTrainInfoCards(frame) {
  selectedValues("trainViews").filter(isTrainInfoView).forEach(view => {
    const item = Array.from(document.querySelectorAll(".grid-stack-item"))
      .find(el => el.dataset.view === view)
      ?.querySelector(".grid-stack-item-content");
    if (item) item.innerHTML = trainViewHtml(view, frame, trainChartDataCache[view]);
  });
}

async function renderTrainShell() {
  if (currentExperimentId() === "naive_bayes") {
    await renderNbTrainShell();
    return;
  }
  await loadTrainPageSchema();
  document.querySelector(".shell").classList.remove("theory");
  ensureTrainTopFlow();
  bindTrainFlow();
  await renderTrainCurrentStep();
}

async function renderTrainCurrentStep() {
  if (activeTrainStep !== "process") closeTrainProcessGuide();
  if (activeTrainStep !== "preprocess_effect") closeTrainPreprocessEffectGuide();
  if (activeTrainStep !== "loss") closeTrainLossGuide();
  if (activeTrainStep !== "optimization") closeTrainOptimizationGuide();
  if (activeTrainStep !== "custom") closeTrainCustomGuide();
  if (activeTrainStep === "loss") {
    const lossGuideState = guidePageState(TRAIN_LOSS_GUIDE_ID);
    if (guideGlobalEnabled() && lossGuideState.enabled && !lossGuideState.completed && !lossGuideState.dismissed && !document.querySelector(".guide-popover")) {
      ensureTrainLossGuideStep();
    }
  }
  if (activeTrainStep === "optimization") {
    const optimizationGuideState = guidePageState(TRAIN_OPTIMIZATION_GUIDE_ID);
    if (guideGlobalEnabled() && optimizationGuideState.enabled && !optimizationGuideState.completed && !optimizationGuideState.dismissed && !document.querySelector(".guide-popover")) {
      ensureTrainOptimizationGuideStep();
    }
  }
  if (activeTrainStep === "custom") {
    const customGuideState = guidePageState(TRAIN_CUSTOM_GUIDE_ID);
    if (guideGlobalEnabled() && customGuideState.enabled && !customGuideState.completed && !customGuideState.dismissed && !document.querySelector(".guide-popover")) {
      ensureTrainCustomGuideStep();
    }
  }
  renderTrainFlow();
  $("main").innerHTML = `<div id="trainContent"></div>`;
  if (activeTrainStep === "preprocess_effect" && !trainCompareEntered) {
    ensureTrainCompareState();
    trainCompareViewsKey = "";
    trainCompareEntered = true;
  }
  $("rightPanel").innerHTML = renderTrainStepPanel();
  bindGuideControls?.();
  bindTrainStepPanel();
  if (activeTrainStep === "preprocess_effect") {
    await prepareTrainCompare();
    return;
  }
  if (trainDataMatchesCurrentForm()) {
    restoreTrainView();
  } else {
    await prepareTraining();
  }
}

function trainDataMatchesCurrentForm() {
  if (!trainData) return false;
  const first = trainData.history?.[0] || {};
  const sameFeature = trainData.feature === $("trainFeature")?.value;
  const sameScale = trainData.use_standardized === trainUseStandardized();
  const sameLr = Math.abs(Number(trainData.learning_rate) - Number($("lr")?.value)) < 1e-12;
  const sameEpochs = Number(trainData.epochs) === Number($("epochs")?.value);
  const sameW = Math.abs(Number(first.w) - Number($("w0")?.value)) < 1e-12;
  const sameB = Math.abs(Number(first.b) - Number($("b0")?.value)) < 1e-12;
  return sameFeature && sameScale && sameLr && sameEpochs && sameW && sameB;
}

function ensureTrainCompareState() {
  if (!Array.isArray(viewStateStore.trainCompareViewsV1)) {
    viewStateStore.trainCompareViewsV1 = [];
  }
  const saved = trainFormStateForStep("preprocess_effect");
  setTrainFormStateForStep("preprocess_effect", {
    ...TRAIN_STEP_DEFAULTS.preprocess_effect,
    ...saved,
    trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE,
  });
}

function renderTrainStepPanel() {
  if (activeTrainStep === "process") return renderRegressionProcessPanel();
  if (activeTrainStep === "preprocess_effect") return renderPreprocessEffectPanel();
  if (activeTrainStep === "loss") return renderLossFunctionPanel();
  if (activeTrainStep === "optimization") return renderOptimizationCriterionPanel();
  if (activeTrainStep === "custom") return renderCustomParameterPanel();
  const saved = activeTrainStep === "custom" ? trainFormStateForStep("custom") : {};
  const defaults = { ...trainStepDefaults(), ...saved };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  const views = trainStepViews();
  const fixed = activeTrainStep !== "custom";
  return `
    <div class="right-title">\u6a21\u578b\u8bad\u7ec3</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>${escapeHtml(trainStepLabel())}</h3>
      <div class="mini-stats">
        <div class="mini-stat"><span>\u6837\u672c\u603b\u6570</span><strong id="sampleCount">${escapeHtml(currentDatasetMeta?.row_count ?? "--")}</strong></div>
        <div class="mini-stat"><span>\u7279\u5f81\u6570\u91cf</span><strong id="featureCount">${escapeHtml(currentDatasetMeta?.features?.length ?? FEATURE_NAMES.length)}</strong></div>
      </div>
      <div class="control-group">
        <label class="control-label" for="trainStd">\u8bad\u7ec3\u6570\u636e</label>
        <select id="trainStd" ${activeTrainStep === "process" ? "disabled" : ""}>
          <option value="true"${defaults.trainStd !== "false" ? " selected" : ""}>\u6807\u51c6\u5316\u7279\u5f81</option>
          <option value="false"${defaults.trainStd === "false" ? " selected" : ""}>\u539f\u59cb\u7279\u5f81</option>
        </select>
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature" ${fixed ? "disabled" : ""}>
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      ${renderTrainStepSpecificControls(defaults)}
      ${renderTrainChartSelector(views)}
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d epoch</span><strong id="epochNow">--</strong></div>
        <div><span>\u5f53\u524d Loss</span><strong id="lossNow">--</strong></div>
      </div>
      <div class="status-line" id="trainRunMessage">${escapeHtml(trainStepHint())}</div>
    </div>`;
}

function renderRegressionProcessPanel() {
  const saved = trainFormStateForStep("process");
  const defaults = { ...TRAIN_STEP_DEFAULTS.process, ...saved, trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u719f\u6089\u56de\u5f52\u8fc7\u7a0b</h3>
      <div class="control-group train-process-feature-guide-target">
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature">
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      <div class="control-group train-process-params-guide-target">
        <div class="field-grid">
          <label class="control-label train-param-input">w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        <input id="trainStd" type="hidden" value="true">
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u5468\u671f\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d\u5468\u671f</span><strong id="epochNow">--</strong></div>
        <div><span>\u6807\u51c6 Loss</span><strong id="stdLossNow">--</strong></div>
      </div>
      <div class="status-line hidden" id="trainRunMessage"></div>
    </div>`;
}

function renderPreprocessEffectPanel() {
  const saved = trainFormStateForStep("preprocess_effect");
  const defaults = { ...TRAIN_STEP_DEFAULTS.preprocess_effect, ...saved, trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u719f\u6089\u9884\u5904\u7406\u7684\u5f71\u54cd</h3>
      <div class="control-group train-effect-feature-guide-target">
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature">
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      <div class="control-group">
        <div class="field-grid">
          <label class="control-label train-param-input">w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        <input id="trainStd" type="hidden" value="true">
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u5468\u671f\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d\u5468\u671f</span><strong id="epochNow">--</strong></div>
        <div><span>\u539f\u59cb Loss</span><strong id="rawLossNow">--</strong></div>
        <div><span>\u6807\u51c6\u5316 Loss</span><strong id="stdLossNow">--</strong></div>
      </div>
    </div>`;
}

function renderLossFunctionPanel() {
  const saved = trainFormStateForStep("loss");
  const defaults = { ...TRAIN_STEP_DEFAULTS.loss, ...saved, trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u719f\u6089\u635f\u5931\u51fd\u6570</h3>
      <div class="control-group train-loss-feature-guide-target">
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature">
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      <div class="control-group">
        <div class="field-grid">
          <label class="control-label train-param-input">w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        <input id="trainStd" type="hidden" value="true">
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u5468\u671f\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d\u5468\u671f</span><strong id="epochNow">--</strong></div>
        <div><span>MSE</span><strong id="lossNow">--</strong></div>
      </div>
      <div class="status-line hidden" id="trainRunMessage"></div>
    </div>`;
}

function renderOptimizationCriterionPanel() {
  const saved = trainFormStateForStep("optimization");
  const defaults = { ...TRAIN_STEP_DEFAULTS.optimization, ...saved, trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u719f\u6089\u4f18\u5316\u51c6\u5219</h3>
      <div class="control-group train-optimization-feature-guide-target">
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature">
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      <div class="control-group train-optimization-params-guide-target">
        <div class="field-grid">
          <label class="control-label train-param-input">w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        <input id="trainStd" type="hidden" value="true">
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u5468\u671f\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d\u5468\u671f</span><strong id="epochNow">--</strong></div>
        <div><span>dw</span><strong id="dwNow">--</strong></div>
        <div><span>db</span><strong id="dbNow">--</strong></div>
        <div><span>MSE</span><strong id="lossNow">--</strong></div>
      </div>
      <div class="status-line hidden" id="trainRunMessage"></div>
    </div>`;
}

function renderCustomParameterPanel() {
  const saved = trainFormStateForStep("custom");
  const defaults = { ...TRAIN_STEP_DEFAULTS.custom, ...saved, trainFeature: saved.trainFeature || TRAIN_DEFAULT_FEATURE };
  const features = currentDatasetMeta?.features || FEATURE_NAMES;
  const feature = defaults.trainFeature && features.includes(defaults.trainFeature) ? defaults.trainFeature : (features[0] || DEFAULT_FEATURE);
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u81ea\u5b9a\u4e49\u53c2\u6570\u8bad\u7ec3</h3>
      <div class="control-group train-custom-feature-guide-target">
        <label class="control-label" for="trainFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="trainFeature">
          ${features.map(item => optionHtml(item, feature, item)).join("")}
        </select>
      </div>
      <div class="control-group train-custom-params-guide-target">
        <div class="field-grid">
          <label class="control-label train-param-input">w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        <input id="trainStd" type="hidden" value="true">
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u5468\u671f\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>
      ${renderTrainButtons()}
      <div class="runtime">
        <div><span>\u5f53\u524d\u5468\u671f</span><strong id="epochNow">--</strong></div>
        <div><span>Loss</span><strong id="lossNow">--</strong></div>
        <div><span>w</span><strong id="wNow">--</strong></div>
        <div><span>b</span><strong id="bNow">--</strong></div>
      </div>
      <div class="status-line hidden" id="trainRunMessage"></div>
    </div>`;
}

function renderTrainStepSpecificControls(defaults) {
  if (activeTrainStep === "custom") {
    return `
      <div class="control-group">
        <div class="field-grid">
          <label class="control-label train-param-input">\u521d\u59cb w<input id="w0" type="text" inputmode="decimal" value="${escapeHtml(defaults.w0)}"></label>
          <label class="control-label train-param-input">\u521d\u59cb b<input id="b0" type="text" inputmode="decimal" value="${escapeHtml(defaults.b0)}"></label>
        </div>
        ${trainRangeHtml("lr", "\u5b66\u4e60\u7387", defaults.lr, 0.001, 0.2, 0.001, "lrText", value => Number(value).toFixed(3))}
        ${trainRangeHtml("epochs", "\u8bad\u7ec3\u8f6e\u6570", defaults.epochs, 1, 500, 1, "epochsText", value => value)}
        ${trainRangeHtml("speed", "\u52a8\u753b\u901f\u5ea6", defaults.speed, 30, 600, 10, "speedText", value => `${value}ms`)}
      </div>`;
  }
  const params = trainStepDefaults();
  return `
    <input id="w0" type="hidden" value="${escapeHtml(params.w0)}">
    <input id="b0" type="hidden" value="${escapeHtml(params.b0)}">
    <input id="lr" type="hidden" value="${escapeHtml(params.lr)}">
    <input id="epochs" type="hidden" value="${escapeHtml(params.epochs)}">
    <div class="control-group">
      <label class="control-label" for="speed">\u52a8\u753b\u901f\u5ea6</label>
      <input id="speed" type="range" min="30" max="600" step="10" value="${escapeHtml(params.speed)}">
      <div class="range-line"><span>\u5feb</span><strong id="speedText">${escapeHtml(params.speed)}ms</strong><span>\u6162</span></div>
      <div class="teaching-note">${escapeHtml(trainStepHint())}</div>
    </div>`;
}

function renderTrainButtons() {
  return `
    <div class="button-grid train-process-actions-guide-target">
      <button class="btn primary" id="stepBtn" type="button">\u5355\u6b65\u8bad\u7ec3</button>
      <button class="btn green" id="autoBtn" type="button">\u81ea\u52a8\u6f14\u793a</button>
      <button class="btn dark" id="pauseBtn" type="button">\u6682\u505c</button>
      <button class="btn rose" id="resetBtn" type="button">\u91cd\u7f6e</button>
    </div>
    ${trainCodeButtonHtml(activeTrainStep)}`;
}

function trainCodeButtonHtml(stepId) {
  return `<button class="secondary-btn code-toggle-btn" type="button" data-train-code="${escapeHtml(stepId || "process")}">查看本步骤代码</button>`;
}

function trainCurrentParams() {
  const defaults = trainStepDefaults();
  const feature = $("trainFeature")?.value
    || trainFormStateForStep(activeTrainStep)?.trainFeature
    || defaults.trainFeature
    || DEFAULT_FEATURE;
  return {
    feature,
    target: currentDatasetMeta?.target || "MEDV",
    w: $("w0")?.value || defaults.w0 || "0",
    b: $("b0")?.value || defaults.b0 || "0",
    lr: $("lr")?.value || defaults.lr || "0.030",
    epochs: $("epochs")?.value || defaults.epochs || "100",
    useStandardized: trainUseStandardized(),
    frame: trainData?.history?.[currentFrame] || trainData?.history?.[0] || null,
  };
}

function trainFrameValue(frame, key, fallback) {
  const value = Number(frame?.[key]);
  return Number.isFinite(value) ? num(value, 6) : fallback;
}

function trainCodeSpec(stepId) {
  const params = trainCurrentParams();
  const frame = params.frame;
  const w = trainFrameValue(frame, "w", params.w);
  const b = trainFrameValue(frame, "b", params.b);
  const dw = trainFrameValue(frame, "dw", "dw");
  const db = trainFrameValue(frame, "db", "db");
  const newW = trainFrameValue(frame, "new_w", "w - learning_rate * dw");
  const newB = trainFrameValue(frame, "new_b", "b - learning_rate * db");
  const loss = trainFrameValue(frame, "loss", "mse");

  const specs = {
    process: {
      title: "熟悉回归过程",
      operation: "用当前 w 和 b 计算预测值、损失和下一步参数",
      code: [
        `feature = "${params.feature}"`,
        `x = scaled_data[feature]`,
        `y = scaled_data["${params.target}"]`,
        "",
        `w = ${params.w}`,
        `b = ${params.b}`,
        `learning_rate = ${params.lr}`,
        `epochs = ${params.epochs}`,
        "",
        "for epoch in range(epochs):",
        "    y_pred = w * x + b",
        "    error = y_pred - y",
        "    loss = np.mean(error ** 2)",
        "",
        "    dw = 2 * np.mean(error * x)",
        "    db = 2 * np.mean(error)",
        "",
        "    w = w - learning_rate * dw",
        "    b = b - learning_rate * db",
      ].join("\n"),
      notes: [
        "y_pred = w * x + b 对应图中的回归直线。",
        "loss 使用 MSE，表示所有样本预测误差平方后的平均值。",
        "dw 和 db 是损失函数在 w、b 方向上的坡度。",
        "参数沿负梯度方向更新，让损失逐步下降。",
      ],
    },
    preprocess_effect: {
      title: "熟悉预处理影响",
      operation: "用相同参数对比原始特征和标准化特征的训练差异",
      code: [
        `feature = "${params.feature}"`,
        `target = "${params.target}"`,
        "",
        "x_raw = data[feature]",
        "y_raw = data[target]",
        "",
        "x_scaled = (x_raw - x_raw.mean()) / x_raw.std(ddof=0)",
        "y_scaled = (y_raw - y_raw.mean()) / y_raw.std(ddof=0)",
        "",
        `learning_rate = ${params.lr}`,
        `epochs = ${params.epochs}`,
        "",
        "history_raw = train_linear_regression(x_raw, y_raw, learning_rate, epochs)",
        "history_scaled = train_linear_regression(x_scaled, y_scaled, learning_rate, epochs)",
      ].join("\n"),
      notes: [
        "两组训练使用相同的初始参数、学习率和训练轮数。",
        "唯一核心差别是输入和目标是否进入标准化尺度。",
        "标准化通常让梯度下降更稳定，图中可以直接比较两条训练路径。",
      ],
    },
    loss: {
      title: "熟悉损失函数",
      operation: "把每个样本的预测误差汇总成 MSE 损失",
      code: [
        `feature = "${params.feature}"`,
        "x = scaled_data[feature]",
        `y = scaled_data["${params.target}"]`,
        "",
        `w = ${w}`,
        `b = ${b}`,
        "",
        "y_pred = w * x + b",
        "error = y_pred - y",
        "squared_error = error ** 2",
        "",
        "mse = np.mean(squared_error)",
        `# current_mse = ${loss}`,
      ].join("\n"),
      notes: [
        "error 是预测值与真实值的差，也就是残差。",
        "平方误差会放大较大的偏差，所以大残差点更值得关注。",
        "MSE 是所有平方误差的平均值，对应右侧显示的损失数值。",
      ],
    },
    optimization: {
      title: "熟悉优化准则",
      operation: "根据当前梯度更新 w 和 b",
      code: [
        `w = ${w}`,
        `b = ${b}`,
        `learning_rate = ${params.lr}`,
        "",
        "y_pred = w * x + b",
        "error = y_pred - y",
        "",
        "dw = 2 * np.mean(error * x)",
        "db = 2 * np.mean(error)",
        "",
        "w_new = w - learning_rate * dw",
        "b_new = b - learning_rate * db",
        "",
        `# 当前 dw = ${dw}`,
        `# 当前 db = ${db}`,
        `# 更新后 w = ${newW}`,
        `# 更新后 b = ${newB}`,
      ].join("\n"),
      notes: [
        "dw 表示 loss 在 w 方向上的坡度，db 表示 loss 在 b 方向上的坡度。",
        "梯度下降使用负梯度方向更新参数。",
        "学习率控制每一步移动的距离，过大可能发散，过小会变慢。",
      ],
    },
    custom: {
      title: "自定义参数训练",
      operation: "把当前右侧参数生成完整训练代码",
      code: [
        `feature = "${params.feature}"`,
        `target = "${params.target}"`,
        "",
        "x = scaled_data[feature]",
        "y = scaled_data[target]",
        "",
        `w = ${params.w}`,
        `b = ${params.b}`,
        `learning_rate = ${params.lr}`,
        `epochs = ${params.epochs}`,
        "",
        "history = []",
        "for epoch in range(epochs):",
        "    y_pred = w * x + b",
        "    error = y_pred - y",
        "    loss = np.mean(error ** 2)",
        "",
        "    dw = 2 * np.mean(error * x)",
        "    db = 2 * np.mean(error)",
        "",
        "    history.append({\"epoch\": epoch, \"loss\": loss, \"w\": w, \"b\": b})",
        "    w = w - learning_rate * dw",
        "    b = b - learning_rate * db",
      ].join("\n"),
      notes: [
        "这里的 feature、w、b、learning_rate 和 epochs 会随右侧当前输入同步变化。",
        "history 用来记录每一轮的 loss 和参数轨迹。",
        "页面中的散点图、Loss 图、w/b 轨迹都来自这段训练循环的结果。",
      ],
    },
  };
  return specs[stepId] || specs.process;
}

function trainCodeDrawerHtml(spec) {
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

function openTrainCodeDrawer(stepId) {
  closeTrainCodeDrawer();
  document.body.insertAdjacentHTML("beforeend", trainCodeDrawerHtml(trainCodeSpec(stepId)));
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closeTrainCodeDrawer();
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

function closeTrainCodeDrawer() {
  document.querySelector(".code-drawer-backdrop")?.remove();
}

function bindTrainCodeButtons() {
  if (window.trainCodeButtonsBound) return;
  window.trainCodeButtonsBound = true;
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-train-code]");
    if (!button) return;
    openTrainCodeDrawer(button.dataset.trainCode || activeTrainStep);
  });
}

function trainRangeHtml(id, label, value, min, max, step, valueId, formatter) {
  return `
    <div class="range-field range-${escapeHtml(id)}-guide-target">
      <label class="control-label range-label" for="${id}">${label}</label>
      <div class="range-control">
        <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value)}">
        <div class="range-stepper" aria-label="${escapeHtml(label)}\u5fae\u8c03">
          <button class="range-step-btn" type="button" data-step-target="${escapeHtml(id)}" data-step-dir="1" aria-label="\u589e\u52a0${escapeHtml(label)}">&#9650;</button>
          <button class="range-step-btn" type="button" data-step-target="${escapeHtml(id)}" data-step-dir="-1" aria-label="\u51cf\u5c11${escapeHtml(label)}">&#9660;</button>
        </div>
      </div>
      <div class="range-line"><span>${min}</span><strong id="${valueId}">${escapeHtml(formatter(value))}</strong><span>${max}</span></div>
    </div>`;
}

function renderTrainChartSelector(views) {
  const options = trainChartRegistry.map(chart => checkboxRowHtml("trainViews", chart.id, chart.title, views.includes(chart.id)));
  return `
    <div class="control-group">
      <label class="control-label">\u663e\u793a\u6a21\u5757</label>
      <details class="mode-menu" open>
        <summary id="trainModeSummary">\u5df2\u9009 ${views.length} \u4e2a\u56fe\u8868</summary>
        <div class="check-list">${options.join("")}</div>
      </details>
    </div>`;
}

function trainStepHint() {
  return ({
    process: "\u4f7f\u7528\u9ed8\u8ba4\u53c2\u6570\u6f14\u793a\u56de\u5f52\u7ebf\u5982\u4f55\u9010\u6b65\u9760\u8fd1\u6837\u672c\u8d8b\u52bf\uff1b\u8fbe\u5230 200 \u8f6e\u3001Loss \u6536\u655b\u6216\u53d1\u6563\u65f6\u81ea\u52a8\u505c\u6b62\u3002",
    preprocess_effect: "\u8bf7\u5728\u53f3\u4fa7\u540c\u65f6\u9009\u62e9\u539f\u59cb\u6563\u70b9\u56fe\u548c\u6807\u51c6\u5316\u6563\u70b9\u56fe\uff0c\u9009\u62e9\u7279\u5f81\uff0c\u89c2\u5bdf\u5728\u5176\u5b83\u53c2\u6570\u76f8\u540c\u7684\u60c5\u51b5\u4e0b\uff0c\u8bad\u7ec3\u6a21\u578b\u65f6\u56de\u5f52\u7684\u533a\u522b",
    loss: "\u91cd\u70b9\u89c2\u5bdf MSE Loss\uff1a\u5355\u4e2a\u8bef\u5dee\u4f1a\u88ab\u5e73\u65b9\u540e\u6c47\u603b\u6210\u6574\u4f53\u8bad\u7ec3\u76ee\u6807\u3002",
    optimization: "\u91cd\u70b9\u89c2\u5bdf\u68af\u5ea6\u4e0b\u964d\uff1adw\u3001db \u6307\u793a\u53c2\u6570\u66f4\u65b0\u65b9\u5411\uff0c\u5b66\u4e60\u7387\u63a7\u5236\u6bcf\u4e00\u6b65\u8d70\u591a\u8fdc\u3002",
    custom: "\u81ea\u7531\u8c03\u6574\u5b66\u4e60\u7387\u3001\u521d\u59cb w/b \u548c\u8bad\u7ec3\u8f6e\u6570\uff0c\u9a8c\u8bc1\u524d\u9762\u51e0\u6b65\u5f62\u6210\u7684\u5224\u65ad\u3002",
  })[activeTrainStep] || "";
}

function bindTrainStepPanel() {
  bindTrainCodeButtons();
  setTrainCheckedViews(trainStepViews());
  updateTrainRangeText();
  bindRangeStepperButtons();
  ["trainFeature", "trainStd", "w0", "b0", "lr", "epochs"].forEach(id => {
    const el = $(id);
    if (!el || el.disabled) return;
    el.addEventListener("change", () => {
      if (activeTrainStep === "preprocess_effect") prepareTrainCompare();
      else prepareTraining();
    });
  });
  ["speed", "lr", "epochs"].forEach(id => {
    $(id)?.addEventListener("input", () => {
      updateTrainRangeText();
      persistTrainFormState();
    });
  });
  document.querySelectorAll('input[name="trainViews"]').forEach(el => el.addEventListener("change", () => {
    if (activeTrainStep === "custom") saveCheckedValues("trainViews", "trainSelectedViewsV1");
    renderTrainFrame(currentFrame);
  }));
  document.querySelectorAll('input[name="trainCompareViews"]').forEach(el => el.addEventListener("change", () => {
    saveCheckedValues("trainCompareViews", "trainCompareViewsV1");
    renderTrainCompareFrame(currentFrame);
  }));
  $("stepBtn")?.addEventListener("click", () => {
    if (activeTrainStep === "preprocess_effect") renderTrainCompareFrame(currentFrame + 1);
    else if (activeTrainStep === "process") renderTrainProcessFrame(currentFrame + 1);
    else if (activeTrainStep === "loss") renderTrainLossFrame(currentFrame + 1);
    else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(currentFrame + 1);
    else if (activeTrainStep === "custom") renderTrainCustomFrame(currentFrame + 1);
    else renderTrainFrame(currentFrame + 1);
    advanceTrainPreprocessEffectGuideOnStepClick();
    advanceTrainLossGuideOnStepClick();
    advanceTrainOptimizationGuideOnStepClick();
    advanceTrainCustomGuideOnStepClick();
  });
  $("autoBtn")?.addEventListener("click", startAuto);
  $("pauseBtn")?.addEventListener("click", stopAuto);
  $("resetBtn")?.addEventListener("click", () => {
    stopAuto();
    if (activeTrainStep === "preprocess_effect") renderTrainCompareFrame(0);
    else if (activeTrainStep === "process") renderTrainProcessFrame(0);
    else if (activeTrainStep === "loss") renderTrainLossFrame(0);
    else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(0);
    else if (activeTrainStep === "custom") renderTrainCustomFrame(0);
    else renderTrainFrame(0);
    setTrainRunMessage(trainStepHint());
  });
}

function updateTrainRangeText() {
  if ($("lr") && $("lrText")) $("lrText").textContent = Number($("lr").value).toFixed(3);
  if ($("epochs") && $("epochsText")) $("epochsText").textContent = $("epochs").value;
  if ($("speed") && $("speedText")) $("speedText").textContent = `${$("speed").value}ms`;
}

function persistTrainFormState() {
  const state = {};
  let hasField = false;
  TRAIN_FORM_IDS.forEach(id => {
    const el = $(id);
    if (el) {
      state[id] = el.value;
      hasField = true;
    }
  });
  if (!hasField) return;
  setTrainFormStateForStep(activeTrainStep, state);
}

function restoreTrainFormState() {
  const state = trainFormStateForStep(activeTrainStep);
  if (!state.trainStd && trainData) state.trainStd = trainData.use_standardized ? "true" : "false";
  TRAIN_FORM_IDS.forEach(id => {
    const el = $(id);
    if (!el || state[id] == null) return;
    if (el.tagName === "SELECT" && ![...el.options].some(opt => opt.value === state[id])) return;
    el.value = state[id];
  });
  updateTrainRangeText();
}

function setTrainRunMessage(message) {
  const el = $("trainRunMessage");
  if (el) el.textContent = message || "";
}

function trainEmptyState(message) {
  destroyDataGrid();
  disposeCharts();
  trainCompareViewsKey = "";
  trainLossViewsKey = "";
  trainOptimizationViewsKey = "";
  trainCustomViewsKey = "";
  $("main").innerHTML = `
    <div class="empty-state">
      ${escapeHtml(message || "\u8bf7\u5148\u5728\u201c\u6570\u636e\u9884\u5904\u7406\u201d\u9875\u52a0\u8f7d\u6570\u636e\u96c6\uff0c\u7136\u540e\u518d\u8fdb\u884c\u6a21\u578b\u8bad\u7ec3\u3002")}
    </div>`;
  if ($("epochNow")) $("epochNow").textContent = "--";
  if ($("lossNow")) $("lossNow").textContent = "--";
  if ($("stdLossNow")) $("stdLossNow").textContent = "--";
  if ($("rawLossNow")) $("rawLossNow").textContent = "--";
  if ($("wNow")) $("wNow").textContent = "--";
  if ($("bNow")) $("bNow").textContent = "--";
  if ($("dwNow")) $("dwNow").textContent = "--";
  if ($("dbNow")) $("dbNow").textContent = "--";
}

function restoreTrainView() {
  restoreTrainFormState();
  if ($("sampleCount")) $("sampleCount").textContent = trainData?.scatter?.x?.length ?? "--";
  if ($("featureCount")) $("featureCount").textContent = currentDatasetMeta?.features?.length ?? FEATURE_NAMES.length;
  if (trainData?.feature && $("topFeature")) $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${trainData.feature}`;
  if (activeTrainStep === "process") renderTrainProcessFrame(currentFrame);
  else if (activeTrainStep === "loss") renderTrainLossFrame(currentFrame);
  else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(currentFrame);
  else if (activeTrainStep === "custom") renderTrainCustomFrame(currentFrame);
  else renderTrainFrame(currentFrame);
  if (activeTrainStep === "loss") scheduleTrainLossGuideUpdate(140);
  if (activeTrainStep === "optimization") scheduleTrainOptimizationGuideUpdate(140);
  if (activeTrainStep === "custom") scheduleTrainCustomGuideUpdate(140);
}

async function prepareTraining() {
  currentDatasetMeta = currentDatasetMeta || viewStateStore.currentDatasetMetaV1 || null;
  if (!currentDatasetMeta) {
    trainEmptyState("\u8bf7\u5148\u5728\u201c\u6570\u636e\u9884\u5904\u7406\u201d\u9875\u52a0\u8f7d\u6570\u636e\u96c6\uff0c\u6a21\u578b\u8bad\u7ec3\u4f1a\u4f7f\u7528\u8be5\u6570\u636e\u96c6\u7684\u7279\u5f81\u548c\u76ee\u6807\u503c\u3002");
    return;
  }
  stopAuto();
  persistTrainFormState();
  const feature = $("trainFeature").value;
  if ($("topFeature")) $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${feature}`;
  try {
    trainData = await runAction("prepare_train", {
      feature,
      dataset_id: currentDatasetMeta?.dataset_id || "boston_housing",
      use_standardized: trainUseStandardized(),
      learning_rate: Number($("lr").value),
      epochs: Number($("epochs").value),
      w0: Number($("w0").value),
      b0: Number($("b0").value)
    });
    if ($("sampleCount")) $("sampleCount").textContent = trainData.scatter.x.length;
    if ($("featureCount")) $("featureCount").textContent = currentDatasetMeta?.features?.length ?? FEATURE_NAMES.length;
    currentFrame = 0;
    setTrainRunMessage(trainStepHint());
    if (activeTrainStep === "process") renderTrainProcessFrame(0);
    else if (activeTrainStep === "loss") renderTrainLossFrame(0);
    else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(0);
    else if (activeTrainStep === "custom") renderTrainCustomFrame(0);
    else renderTrainFrame(0);
    if (activeTrainStep === "loss") scheduleTrainLossGuideUpdate(140);
    if (activeTrainStep === "optimization") scheduleTrainOptimizationGuideUpdate(140);
    if (activeTrainStep === "custom") scheduleTrainCustomGuideUpdate(140);
  } catch (err) {
    console.warn("Training preparation skipped:", err);
    trainEmptyState("\u8bf7\u5148\u5728\u201c\u6570\u636e\u9884\u5904\u7406\u201d\u9875\u52a0\u8f7d\u6570\u636e\u96c6\uff0c\u7136\u540e\u56de\u5230\u6a21\u578b\u8bad\u7ec3\u9875\u5f00\u59cb\u8bad\u7ec3\u3002");
  }
}

async function prepareTrainCompare() {
  currentDatasetMeta = currentDatasetMeta || viewStateStore.currentDatasetMetaV1 || null;
  if (!currentDatasetMeta) {
    trainEmptyState("\u8bf7\u5148\u5728\u201c\u6570\u636e\u9884\u5904\u7406\u201d\u9875\u52a0\u8f7d\u6570\u636e\u96c6\uff0c\u9884\u5904\u7406\u5bf9\u6bd4\u4f1a\u5728\u6570\u636e\u51c6\u5907\u597d\u540e\u663e\u793a\u3002");
    return;
  }
  stopAuto();
  persistTrainFormState();
  const feature = $("trainFeature").value;
  const payload = {
    feature,
    dataset_id: currentDatasetMeta?.dataset_id || "boston_housing",
    learning_rate: Number($("lr").value),
    epochs: Number($("epochs").value),
    w0: Number($("w0").value),
    b0: Number($("b0").value)
  };
  if ($("topFeature")) $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${feature}`;
  let raw = null;
  let standard = null;
  try {
    [raw, standard] = await Promise.all([
      runAction("prepare_train", { ...payload, use_standardized: false }),
      runAction("prepare_train", { ...payload, use_standardized: true }),
    ]);
  } catch (err) {
    console.warn("Training comparison preparation skipped:", err);
    trainEmptyState("\u8bf7\u5148\u5728\u201c\u6570\u636e\u9884\u5904\u7406\u201d\u9875\u52a0\u8f7d\u6570\u636e\u96c6\uff0c\u7136\u540e\u56de\u5230\u8fd9\u91cc\u89c2\u5bdf\u539f\u59cb\u7279\u5f81\u548c\u6807\u51c6\u5316\u7279\u5f81\u7684\u8bad\u7ec3\u5dee\u5f02\u3002");
    return;
  }
  trainCompareData = { raw, standard };
  trainData = standard;
  currentFrame = 0;
  setTrainRunMessage(trainStepHint());
  try {
    renderTrainCompareFrame(0);
  } catch (err) {
    console.warn("Train compare render fallback:", err);
    trainCompareViewsKey = "";
    renderTrainCompareFrame(0);
  }
}

function renderTrainProcessFrame(index) {
  if (!trainData) return;
  currentFrame = Math.max(0, Math.min(index, trainData.history.length - 1));
  const frame = trainData.history[currentFrame];
  if ($("epochNow")) $("epochNow").textContent = frame.epoch;
  if ($("stdLossNow")) $("stdLossNow").textContent = Number(frame.loss).toFixed(4);
  renderTrainProcessMain();
}

function renderTrainProcessMain() {
  const grid = ensureTrainProcessGrid();
  const viewsKey = "standard_scatter";
  if (trainCompareViewsKey !== viewsKey || !charts.get("chart_process_standard_scatter")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "train_process";
    grid.innerHTML = `
      <div class="grid-stack-item" data-view="process_standard_scatter" gs-x="0" gs-y="0" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
        <div class="grid-stack-item-content">${chartCardHtml("process_standard_scatter", "\u6807\u51c6\u5316\u6563\u70b9\u56fe", "\u6807\u51c6\u5316\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b", "")}</div>
      </div>`;
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
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    trainCompareViewsKey = viewsKey;
  }
  const ch = charts.get("chart_process_standard_scatter") || initChart("chart_process_standard_scatter");
  trainSetChartOption(ch, "process_standard_scatter", trainProcessScatterOption(), true);
  requestAnimationFrame(() => charts.forEach(chart => chart.resize()));
  updateTrainProcessGuide();
}

function ensureTrainProcessGrid() {
  if (!$("trainProcessWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="trainProcessWrap"></div>`;
    trainCompareViewsKey = "";
  }
  return $("trainProcessWrap");
}

function trainProcessScatterOption() {
  const frame = trainData.history[currentFrame];
  const points = trainData.scatter.x.map((x, i) => [x, trainData.scatter.y[i]]);
  const axisRange = trainFixedZeroAxisRange(trainData);
  const currentLine = lineForParams(frame.w, frame.b, axisRange);
  const bestLine = lineForParams(trainData.best.w, trainData.best.b, axisRange);
  return applyFixedZeroAxis({
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: trainData.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: currentLine, showSymbol: false, lineStyle: { color: "#d9354f", width: 3 } },
      { name: "\u6700\u4f18\u53c2\u8003\u7ebf", type: "line", data: bestLine, showSymbol: false, lineStyle: { color: "#0f9f78", width: 2.6, type: "dashed" } }
    ]
  }, axisRange);
}

function renderTrainOptimizationFrame(index) {
  if (!trainData) return;
  currentFrame = Math.max(0, Math.min(index, trainData.history.length - 1));
  const frame = trainData.history[currentFrame];
  if ($("epochNow")) $("epochNow").textContent = frame.epoch;
  if ($("dwNow")) $("dwNow").textContent = num(frame.dw, 4);
  if ($("dbNow")) $("dbNow").textContent = num(frame.db, 4);
  if ($("lossNow")) $("lossNow").textContent = Number(frame.mse ?? frame.loss).toFixed(4);
  renderTrainOptimizationMain();
}

function renderTrainOptimizationMain() {
  const grid = ensureTrainOptimizationGrid();
  const viewsKey = "surface_contour_loss_v1";
  if (trainOptimizationViewsKey !== viewsKey || !charts.get("chart_loss_surface_3d") || !charts.get("chart_opt_contour") || !charts.get("chart_opt_loss")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "train_optimization";
    grid.innerHTML = trainOptimizationGridHtml();
    if (window.GridStack) {
      dataGrid = GridStack.init({
        column: 4,
        cellHeight: 250,
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
    bindTrainOptimizationControls();
    trainOptimizationViewsKey = viewsKey;
  }

  const surface = charts.get("chart_loss_surface_3d") || initChart("chart_loss_surface_3d");
  surface.setOption(lossSurface3DOption(currentFrame), false);

  const contour = charts.get("chart_opt_contour") || initChart("chart_opt_contour");
  contour.setOption(trainOptimizationContourOption(), true);

  const loss = charts.get("chart_opt_loss") || initChart("chart_opt_loss");
  loss.setOption(trainOptimizationLossOption(), true);
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  scheduleTrainOptimizationGuideUpdate(140);
}

function ensureTrainOptimizationGrid() {
  if (!$("trainOptimizationWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="trainOptimizationWrap"></div>`;
    trainOptimizationViewsKey = "";
  }
  return $("trainOptimizationWrap");
}

function trainOptimizationGridHtml() {
  return `
    <div class="grid-stack-item" data-view="opt_surface_3d" gs-x="0" gs-y="0" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
      <div class="grid-stack-item-content">${trainOptimizationSurfaceCardHtml()}</div>
    </div>
    <div class="grid-stack-item" data-view="opt_contour" gs-x="2" gs-y="0" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
      <div class="grid-stack-item-content">${trainOptimizationContourCardHtml()}</div>
    </div>
    <div class="grid-stack-item" data-view="opt_loss" gs-x="0" gs-y="2" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
      <div class="grid-stack-item-content">${trainOptimizationLossCardHtml()}</div>
    </div>`;
}

function trainOptimizationContourCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="opt_contour">
    <div class="chart-head">
      <div><div class="chart-title">Loss \u7b49\u9ad8\u7ebf\u56fe</div><div class="chart-sub">J(w,b) \u5728\u53c2\u6570\u7a7a\u95f4\u4e2d\u7684\u5206\u5e03</div></div>
    </div>
    <div class="chart-toolbar">
      <div class="legend-strip">
        <span><i style="background:#ef4444"></i>\u5f53\u524d\u53c2\u6570</span>
        <span><i style="background:#16a34a"></i>-\u2207J \u4e0b\u964d\u65b9\u5411</span>
        <span><i style="background:#dc2626"></i>\u2207J \u68af\u5ea6\u65b9\u5411</span>
        <span><i style="background:#2563eb"></i>\u66f4\u65b0\u8f68\u8ff9</span>
      </div>
    </div>
    <div class="chart" id="chart_opt_contour"></div>
  </section>`;
}

function trainOptimizationSliceCardHtml() {
  const mode = trainOptimizationSliceMode();
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="opt_slice">
    <div class="chart-head">
      <div><div class="chart-title">\u5207\u9762\u56fe</div><div class="chart-sub">\u89c2\u5bdf\u5f53\u524d\u70b9\u9644\u8fd1 Loss \u7684\u5761\u5ea6\u53d8\u5316</div></div>
    </div>
    <div class="chart-toolbar">
      <div class="segmented-control" role="group" aria-label="\u5207\u9762\u9009\u62e9">
        ${TRAIN_OPT_SLICE_MODES.map(item => `<button class="seg-btn${item.id === mode ? " active" : ""}" type="button" data-opt-slice-mode="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
    </div>
    <div class="chart" id="chart_opt_slice"></div>
  </section>`;
}

function trainOptimizationLossCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="opt_loss">
    <div class="chart-head">
      <div><div class="chart-title">MSE Loss \u968f epoch \u7684\u53d8\u5316</div><div class="chart-sub">\u89c2\u5bdf\u4f18\u5316\u8fc7\u7a0b\u4e2d\u7684 Loss \u4e0b\u964d\u8d8b\u52bf</div></div>
    </div>
    <div class="chart" id="chart_opt_loss"></div>
  </section>`;
}

function trainOptimizationSurfaceCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="opt_surface_3d">
    <div class="chart-head">
      <div><div class="chart-title">3D Loss \u66f2\u9762\u56fe</div><div class="chart-sub">\u611f\u53d7 J(w,b) \u50cf\u4e00\u4e2a\u53c2\u6570\u7a7a\u95f4\u4e2d\u7684\u7897\u5f62\u66f2\u9762</div></div>
    </div>
    <div class="chart" id="chart_loss_surface_3d"></div>
  </section>`;
}

function bindTrainOptimizationControls() {
  document.querySelectorAll("[data-opt-slice-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      viewStateStore.trainOptimizationSliceModeV1 = btn.dataset.optSliceMode;
      trainOptimizationViewsKey = "";
      renderTrainOptimizationFrame(currentFrame);
    });
  });
}

function trainOptimizationContourOption() {
  const c = trainData.contour;
  const frame = trainData.history[currentFrame];
  const best = trainData.best;
  const path = trainData.history.slice(0, currentFrame + 1).map(row => [row.w, row.b]);
  const next = trainOptimizationNextParams(frame);
  const vectorScale = trainOptimizationVectorScale(frame, c);
  const gradEnd = [frame.w + frame.dw * vectorScale, frame.b + frame.db * vectorScale];
  const negEnd = [frame.w - frame.dw * vectorScale, frame.b - frame.db * vectorScale];
  return {
    tooltip: {
      trigger: "item",
      formatter: p => {
        const value = Array.isArray(p.value) ? p.value : [];
        if (p.seriesName === "\u5f53\u524d\u53c2\u6570") return `w=${num(frame.w, 4)}<br>b=${num(frame.b, 4)}<br>MSE=${num(frame.mse ?? frame.loss, 4)}`;
        if (p.seriesName === "\u4e0b\u4e00\u6b65\u53c2\u6570") return `w_new=${num(next.w, 4)}<br>b_new=${num(next.b, 4)}`;
        if (p.seriesName === "\u6700\u4f18\u53c2\u8003") return `w*=${num(best.w, 4)}<br>b*=${num(best.b, 4)}`;
        if (value.length >= 2) return `${escapeHtml(p.seriesName)}<br>w=${num(value[0], 4)}<br>b=${num(value[1], 4)}`;
        return escapeHtml(p.seriesName);
      }
    },
    grid: { left: 58, right: 28, top: 36, bottom: 48 },
    xAxis: { type: "value", name: "w", nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: "b", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      ...lossContourSeries(c),
      {
        name: "\u66f4\u65b0\u8f68\u8ff9",
        type: "line",
        data: path,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: "#2563eb", width: 2.8, type: "dashed" },
        itemStyle: { color: "#fff", borderColor: "#2563eb", borderWidth: 1.5 },
        z: 8
      },
      {
        name: "\u2207J \u68af\u5ea6\u65b9\u5411",
        type: "lines",
        coordinateSystem: "cartesian2d",
        symbol: ["none", "arrow"],
        symbolSize: 10,
        data: [{ coords: [[frame.w, frame.b], gradEnd] }],
        lineStyle: { color: "#dc2626", width: 2.8 },
        z: 10
      },
      {
        name: "-\u2207J \u4e0b\u964d\u65b9\u5411",
        type: "lines",
        coordinateSystem: "cartesian2d",
        symbol: ["none", "arrow"],
        symbolSize: 10,
        data: [{ coords: [[frame.w, frame.b], negEnd] }],
        lineStyle: { color: "#16a34a", width: 2.8 },
        z: 10
      },
      {
        name: "\u5f53\u524d\u53c2\u6570",
        type: "scatter",
        data: [[frame.w, frame.b]],
        symbolSize: 16,
        itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 3 },
        z: 12
      },
      {
        name: "\u4e0b\u4e00\u6b65\u53c2\u6570",
        type: "scatter",
        data: [[next.w, next.b]],
        symbolSize: 13,
        itemStyle: { color: "#2563eb", borderColor: "#fff", borderWidth: 2 },
        z: 11
      },
      {
        name: "\u6700\u4f18\u53c2\u8003",
        type: "scatter",
        data: [[best.w, best.b]],
        symbol: "diamond",
        symbolSize: 15,
        itemStyle: { color: "#0f9f78", borderColor: "#fff", borderWidth: 2 },
        z: 9
      }
    ]
  };
}

function trainOptimizationSliceOption() {
  const mode = trainOptimizationSliceMode();
  if (mode === "b") return trainOptimizationAxisSliceOption("b");
  if (mode === "neg_grad") return trainOptimizationDirectionSliceOption();
  return trainOptimizationAxisSliceOption("w");
}

function trainOptimizationAxisSliceOption(axis) {
  const frame = trainData.history[currentFrame];
  const c = trainData.contour;
  const next = trainOptimizationNextParams(frame);
  const values = axis === "w" ? c.w_axis : c.b_axis;
  const fixedValue = axis === "w" ? frame.b : frame.w;
  const data = values.map(value => axis === "w"
    ? [value, mseAtParams(value, fixedValue)]
    : [value, mseAtParams(fixedValue, value)]);
  const currentX = axis === "w" ? frame.w : frame.b;
  const nextX = axis === "w" ? next.w : next.b;
  const slope = axis === "w" ? frame.dw : frame.db;
  const span = Math.max(...values) - Math.min(...values);
  const delta = Math.max(span * 0.12, 0.2);
  const currentY = Number(frame.mse ?? frame.loss);
  const tangent = [
    [currentX - delta, currentY - slope * delta],
    [currentX + delta, currentY + slope * delta]
  ];
  const title = axis === "w" ? `J(w, ${num(frame.b, 2)})` : `J(${num(frame.w, 2)}, b)`;
  const subtitle = axis === "w" ? `\u56fa\u5b9a b=${num(frame.b, 3)}\uff0c\u53ea\u89c2\u5bdf w \u65b9\u5411\u7684\u5761\u5ea6` : `\u56fa\u5b9a w=${num(frame.w, 3)}\uff0c\u53ea\u89c2\u5bdf b \u65b9\u5411\u7684\u5761\u5ea6`;
  return trainOptimizationSliceBaseOption({
    title,
    subtitle,
    xName: axis,
    yName: "MSE",
    data,
    tangent,
    current: [currentX, currentY],
    next: [nextX, axis === "w" ? mseAtParams(nextX, frame.b) : mseAtParams(frame.w, nextX)],
    slopeName: axis === "w" ? "\u2202J/\u2202w" : "\u2202J/\u2202b",
    slope
  });
}

function trainOptimizationDirectionSliceOption() {
  const frame = trainData.history[currentFrame];
  const norm = Math.hypot(frame.dw, frame.db);
  const dirW = norm > 1e-9 ? -frame.dw / norm : 0;
  const dirB = norm > 1e-9 ? -frame.db / norm : 0;
  const c = trainData.contour;
  const wSpan = Math.max(...c.w_axis) - Math.min(...c.w_axis);
  const bSpan = Math.max(...c.b_axis) - Math.min(...c.b_axis);
  const range = Math.max(0.8, Math.min(wSpan || 2, bSpan || 2) * 0.35);
  const count = 80;
  const data = Array.from({ length: count }, (_, index) => {
    const lambda = -range + (2 * range * index) / (count - 1);
    return [lambda, mseAtParams(frame.w + lambda * dirW, frame.b + lambda * dirB)];
  });
  const currentY = Number(frame.mse ?? frame.loss);
  const nextLambda = Number($("lr")?.value || TRAIN_STEP_DEFAULTS.optimization.lr) * norm;
  const delta = range * 0.22;
  const slope = -norm;
  return trainOptimizationSliceBaseOption({
    title: "J(\u03b8 + \u03bbd)",
    subtitle: "\u6cbf\u8d1f\u68af\u5ea6\u65b9\u5411\u5207\u4e00\u5200\uff0c\u770b\u4e00\u6b65\u4e4b\u5185 Loss \u5982\u4f55\u53d8\u5316",
    xName: "\u03bb",
    yName: "MSE",
    data,
    tangent: [[-delta, currentY - slope * delta], [delta, currentY + slope * delta]],
    current: [0, currentY],
    next: [nextLambda, mseAtParams(frame.w + nextLambda * dirW, frame.b + nextLambda * dirB)],
    slopeName: "\u65b9\u5411\u5bfc\u6570",
    slope
  });
}

function trainOptimizationSliceBaseOption(config) {
  return {
    title: {
      text: config.title,
      subtext: config.subtitle,
      left: 10,
      top: 4,
      textStyle: { fontSize: 13, fontWeight: 800, color: "#172033" },
      subtextStyle: { fontSize: 11, color: "#6b7280" }
    },
    tooltip: {
      trigger: "item",
      formatter: p => {
        const value = Array.isArray(p.value) ? p.value : [];
        if (p.seriesName === "\u5f53\u524d\u70b9") return `${config.slopeName} = ${num(config.slope, 4)}<br>${config.xName}=${num(value[0], 4)}<br>MSE=${num(value[1], 4)}`;
        if (value.length >= 2) return `${escapeHtml(p.seriesName)}<br>${config.xName}=${num(value[0], 4)}<br>MSE=${num(value[1], 4)}`;
        return escapeHtml(p.seriesName);
      }
    },
    legend: { top: 44 },
    grid: { left: 58, right: 24, top: 78, bottom: 46 },
    xAxis: { type: "value", name: config.xName, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: config.yName, nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "Loss \u5207\u9762", type: "line", data: config.data, showSymbol: false, smooth: true, lineStyle: { color: "#2563eb", width: 2.8 } },
      { name: "\u5f53\u524d\u5207\u7ebf", type: "line", data: config.tangent, showSymbol: false, lineStyle: { color: "#ef4444", width: 2.2, type: "dashed" } },
      { name: "\u5f53\u524d\u70b9", type: "scatter", data: [config.current], symbolSize: 14, itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 2 }, z: 5 },
      { name: "\u66f4\u65b0\u540e", type: "scatter", data: [config.next], symbolSize: 12, itemStyle: { color: "#16a34a", borderColor: "#fff", borderWidth: 2 }, z: 5 }
    ]
  };
}

function trainOptimizationLossOption() {
  const rows = trainData.history.slice(0, currentFrame + 1);
  const current = trainData.history[currentFrame];
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 10 },
    grid: { left: 58, right: 24, top: 48, bottom: 46 },
    xAxis: { type: "value", name: "epoch", nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: "MSE", nameLocation: "middle", nameGap: 40 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      {
        name: "MSE Loss",
        type: "line",
        data: rows.map(row => [row.epoch, row.mse ?? row.loss]),
        smooth: true,
        symbolSize: 5,
        lineStyle: { color: "#5b35f5", width: 3 },
        areaStyle: { color: "#5b35f522" }
      },
      {
        name: "\u5f53\u524d epoch",
        type: "scatter",
        data: [[current.epoch, current.mse ?? current.loss]],
        symbolSize: 13,
        itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 2 },
        z: 5
      }
    ]
  };
}

function trainOptimizationVectorScale(frame, c) {
  const norm = Math.hypot(frame.dw, frame.db);
  if (!Number.isFinite(norm) || norm <= 1e-9) return 0;
  const wSpan = Math.max(...c.w_axis) - Math.min(...c.w_axis);
  const bSpan = Math.max(...c.b_axis) - Math.min(...c.b_axis);
  return Math.min(wSpan || 1, bSpan || 1) * 0.18 / norm;
}

function trainOptimizationNextParams(frame) {
  const fallbackLr = Number($("lr")?.value || TRAIN_STEP_DEFAULTS.optimization.lr);
  return {
    w: Number.isFinite(Number(frame.new_w)) ? Number(frame.new_w) : frame.w - fallbackLr * frame.dw,
    b: Number.isFinite(Number(frame.new_b)) ? Number(frame.new_b) : frame.b - fallbackLr * frame.db
  };
}

function renderTrainCustomFrame(index) {
  if (!trainData) return;
  currentFrame = Math.max(0, Math.min(index, trainData.history.length - 1));
  const frame = trainData.history[currentFrame];
  if ($("epochNow")) $("epochNow").textContent = frame.epoch;
  if ($("lossNow")) $("lossNow").textContent = Number(frame.mse ?? frame.loss).toFixed(4);
  if ($("wNow")) $("wNow").textContent = num(frame.w, 4);
  if ($("bNow")) $("bNow").textContent = num(frame.b, 4);
  renderTrainCustomMain();
}

function renderTrainCustomMain() {
  const grid = ensureTrainCustomGrid();
  const viewsKey = "custom_fixed_v1";
  if (trainCustomViewsKey !== viewsKey || !charts.get("chart_custom_standard_scatter") || !charts.get("chart_custom_loss") || !charts.get("chart_custom_w_path") || !charts.get("chart_custom_b_path") || !$("customCalcCard")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "train_custom";
    grid.innerHTML = trainCustomGridHtml();
    if (window.GridStack) {
      dataGrid = GridStack.init({
        column: 4,
        cellHeight: 250,
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
    trainCustomViewsKey = viewsKey;
  }

  const scatter = charts.get("chart_custom_standard_scatter") || initChart("chart_custom_standard_scatter");
  trainSetChartOption(scatter, "custom_standard_scatter", trainCustomScatterOption(), true);

  const loss = charts.get("chart_custom_loss") || initChart("chart_custom_loss");
  loss.setOption(trainCustomLossOption(), true);

  const wPath = charts.get("chart_custom_w_path") || initChart("chart_custom_w_path");
  wPath.setOption(trainCustomParamPathOption("w"), true);

  const bPath = charts.get("chart_custom_b_path") || initChart("chart_custom_b_path");
  bPath.setOption(trainCustomParamPathOption("b"), true);

  updateTrainCustomCalcCard();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  scheduleTrainCustomGuideUpdate(140);
}

function ensureTrainCustomGrid() {
  if (!$("trainCustomWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="trainCustomWrap"></div>`;
    trainCustomViewsKey = "";
  }
  return $("trainCustomWrap");
}

function trainCustomGridHtml() {
  const saved = loadTrainGridLayout();
  const items = [
    { id: "custom_standard_scatter", layout: { x: 0, y: 0, w: 2, h: 2 }, html: chartCardHtml("custom_standard_scatter", "\u6807\u51c6\u5316\u6563\u70b9\u56fe", "\u6807\u51c6\u5316\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b", "") },
    { id: "custom_loss", layout: { x: 2, y: 0, w: 2, h: 2 }, html: chartCardHtml("custom_loss", "MSE Loss \u968f epoch \u7684\u53d8\u5316", "\u89c2\u5bdf\u4f18\u5316\u8fc7\u7a0b\u4e2d\u7684 Loss \u4e0b\u964d\u8d8b\u52bf", "") },
    { id: "custom_w_path", layout: { x: 0, y: 2, w: 2, h: 2 }, html: chartCardHtml("custom_w_path", "w \u53c2\u6570\u8f68\u8ff9\u56fe", "\u89c2\u5bdf w \u5728\u8bad\u7ec3\u4e2d\u5982\u4f55\u66f4\u65b0", "") },
    { id: "custom_b_path", layout: { x: 2, y: 2, w: 2, h: 2 }, html: chartCardHtml("custom_b_path", "b \u53c2\u6570\u8f68\u8ff9\u56fe", "\u89c2\u5bdf b \u5728\u8bad\u7ec3\u4e2d\u5982\u4f55\u66f4\u65b0", "") },
    { id: "custom_calc", layout: { x: 0, y: 4, w: 4, h: 4 }, html: `<div id="customCalcCard" style="height:100%"></div>` },
  ];
  return items.map(item => {
    const layout = normalizeTrainGridLayout(item.id, saved[item.id] || item.layout);
    return `<div class="grid-stack-item" data-view="${escapeHtml(item.id)}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${item.html}</div></div>`;
  }).join("");
}

function trainCustomScatterOption() {
  const frame = trainData.history[currentFrame];
  const points = trainData.scatter.x.map((x, i) => [x, trainData.scatter.y[i]]);
  const axisRange = trainFixedZeroAxisRange(trainData);
  return applyFixedZeroAxis({
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: trainData.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineForParams(frame.w, frame.b, axisRange), showSymbol: false, lineStyle: { color: "#d9354f", width: 3 } },
      { name: "\u6700\u4f18\u53c2\u8003\u7ebf", type: "line", data: lineForParams(trainData.best.w, trainData.best.b, axisRange), showSymbol: false, lineStyle: { color: "#0f9f78", width: 2.6, type: "dashed" } }
    ]
  }, axisRange);
}

function trainCustomLossOption() {
  const rows = trainData.history.slice(0, currentFrame + 1);
  const current = trainData.history[currentFrame];
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 10 },
    grid: { left: 58, right: 24, top: 48, bottom: 46 },
    xAxis: { type: "value", name: "epoch", nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: "MSE", nameLocation: "middle", nameGap: 40 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "MSE Loss", type: "line", data: rows.map(row => [row.epoch, row.mse ?? row.loss]), smooth: true, symbolSize: 5, lineStyle: { color: "#5b35f5", width: 3 }, areaStyle: { color: "#5b35f522" } },
      { name: "\u5f53\u524d epoch", type: "scatter", data: [[current.epoch, current.mse ?? current.loss]], symbolSize: 13, itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 2 }, z: 5 }
    ]
  };
}

function trainCustomParamPathOption(key) {
  const rows = trainData.history.slice(0, currentFrame + 1);
  const current = trainData.history[currentFrame];
  const color = key === "w" ? "#0f9f78" : "#c47a11";
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 10 },
    grid: { left: 58, right: 24, top: 48, bottom: 46 },
    xAxis: { type: "value", name: "epoch", nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: key, nameLocation: "middle", nameGap: 36 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: `${key} \u53c2\u6570`, type: "line", data: rows.map(row => [row.epoch, row[key]]), smooth: true, symbolSize: 5, lineStyle: { color, width: 3 }, areaStyle: { color: color + "20" } },
      { name: "\u5f53\u524d\u503c", type: "scatter", data: [[current.epoch, current[key]]], symbolSize: 13, itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 2 }, z: 5 }
    ]
  };
}

function updateTrainCustomCalcCard() {
  const slot = $("customCalcCard");
  if (!slot) return;
  slot.innerHTML = trainInfoHtml("calc", trainData.history[currentFrame], { frame: trainData.history[currentFrame], best: trainData.best, learning_rate: trainData.learning_rate, sample_count: trainData.scatter?.x?.length });
}

function renderTrainLossFrame(index) {
  if (!trainData) return;
  currentFrame = Math.max(0, Math.min(index, trainData.history.length - 1));
  const frame = trainData.history[currentFrame];
  if ($("epochNow")) $("epochNow").textContent = frame.epoch;
  if ($("lossNow")) $("lossNow").textContent = Number(frame.mse ?? frame.loss).toFixed(4);
  renderTrainLossMain();
}

function renderTrainLossMain() {
  const grid = ensureTrainLossGrid();
  const viewsKey = `${trainLossResidualMode()}|${trainLossOverallView()}`;
  if (trainLossViewsKey !== viewsKey || !charts.get("chart_loss_residual_main") || !charts.get("chart_loss_overall")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "train_loss";
    grid.innerHTML = trainLossGridHtml();
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
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    bindTrainLossControls();
    trainLossViewsKey = viewsKey;
  }

  const residualChart = charts.get("chart_loss_residual_main") || initChart("chart_loss_residual_main");
  trainSetChartOption(residualChart, "loss_residual_main", trainLossResidualOption(), true);
  residualChart.off("click");
  residualChart.on("click", params => {
    if (params.seriesName !== "\u6837\u672c\u70b9") return;
    setTrainLossSampleIndex(params.dataIndex);
    viewStateStore.trainLossResidualModeV1 = "single";
    trainLossViewsKey = "";
    renderTrainLossFrame(currentFrame);
  });

  const overallChart = charts.get("chart_loss_overall") || initChart("chart_loss_overall");
  overallChart.setOption(trainLossOverallOption(), true);
  updateTrainLossSampleNote();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
}

function ensureTrainLossGrid() {
  if (!$("trainLossWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="trainLossWrap"></div>`;
    trainLossViewsKey = "";
  }
  return $("trainLossWrap");
}

function trainLossGridHtml() {
  return `
    <div class="grid-stack-item" data-view="loss_residual_main" gs-x="0" gs-y="0" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
      <div class="grid-stack-item-content">${trainLossResidualCardHtml()}</div>
    </div>
    <div class="grid-stack-item" data-view="loss_overall" gs-x="2" gs-y="0" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1">
      <div class="grid-stack-item-content">${trainLossOverallCardHtml()}</div>
    </div>`;
}

function trainLossResidualCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="loss_residual_main">
    <div class="chart-head">
      <div><div class="chart-title">\u6b8b\u5dee\u4e0e\u56de\u5f52\u7ebf</div><div class="chart-sub">\u5c40\u90e8\u7528\u6b8b\u5dee\u7ebf\u89e3\u91ca\u5355\u4e2a\u6216\u5c11\u91cf\u6837\u672c\u7684\u9884\u6d4b\u8bef\u5dee</div></div>
    </div>
    <div class="chart-toolbar" data-loss-toolbar="residual">
      <div class="segmented-control" role="group" aria-label="\u6b8b\u5dee\u663e\u793a">
        ${TRAIN_LOSS_RESIDUAL_MODES.map(item => `<button class="seg-btn${item.id === trainLossResidualMode() ? " active" : ""}" type="button" data-loss-residual-mode="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
      <div class="sample-nav">
        <button class="mini-action" type="button" data-loss-sample-step="-1">\u4e0a\u4e00\u4e2a</button>
        <button class="mini-action" type="button" data-loss-sample-step="1">\u4e0b\u4e00\u4e2a</button>
        <button class="mini-action" type="button" data-loss-random-sample="1">\u968f\u673a</button>
      </div>
    </div>
    <div class="chart" id="chart_loss_residual_main"></div>
    <div class="loss-sample-note" id="lossSampleNote"></div>
  </section>`;
}

function trainLossOverallCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="loss_overall">
    <div class="chart-head">
      <div><div class="chart-title">\u6574\u4f53\u8bef\u5dee\u5206\u5e03</div><div class="chart-sub">\u6574\u4f53\u4e0d\u753b\u6ee1\u5c4f\u6b8b\u5dee\u7ebf\uff0c\u6539\u7528\u7edf\u8ba1\u89c6\u56fe\u7406\u89e3 MSE</div></div>
    </div>
    <div class="chart-toolbar">
      <div class="segmented-control" role="group" aria-label="\u6574\u4f53\u8bef\u5dee\u89c6\u56fe">
        ${TRAIN_LOSS_OVERALL_VIEWS.map(item => `<button class="seg-btn${item.id === trainLossOverallView() ? " active" : ""}" type="button" data-loss-overall-view="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
    </div>
    <div class="chart" id="chart_loss_overall"></div>
    <div class="loss-formula-note">MSE = mean((y - \u0177)^2) = <strong id="lossFormulaMse">${escapeHtml(Number(trainData?.history?.[currentFrame]?.mse ?? trainData?.history?.[currentFrame]?.loss ?? 0).toFixed(4))}</strong></div>
  </section>`;
}

function bindTrainLossControls() {
  document.querySelectorAll("[data-loss-residual-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      viewStateStore.trainLossResidualModeV1 = btn.dataset.lossResidualMode;
      if (btn.dataset.lossResidualMode === "random10") {
        resetTrainLossRandom10Indices();
      }
      trainLossViewsKey = "";
      renderTrainLossFrame(currentFrame);
      if (btn.dataset.lossResidualMode === "random10") advanceTrainLossGuideOnRandom10Click();
    });
  });
  document.querySelectorAll("[data-loss-overall-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      viewStateStore.trainLossOverallViewV1 = btn.dataset.lossOverallView;
      trainLossViewsKey = "";
      renderTrainLossFrame(currentFrame);
    });
  });
  document.querySelectorAll("[data-loss-sample-step]").forEach(btn => {
    btn.addEventListener("click", () => {
      setTrainLossSampleIndex(trainLossSampleIndex() + Number(btn.dataset.lossSampleStep || 0));
      viewStateStore.trainLossResidualModeV1 = "single";
      trainLossViewsKey = "";
      renderTrainLossFrame(currentFrame);
    });
  });
  document.querySelector("[data-loss-random-sample]")?.addEventListener("click", () => {
    const count = trainData?.scatter?.x?.length || 0;
    if (trainLossResidualMode() === "random10") {
      resetTrainLossRandom10Indices(count);
    } else {
      if (count) setTrainLossSampleIndex(Math.floor(Math.random() * count));
      viewStateStore.trainLossResidualModeV1 = "single";
    }
    trainLossViewsKey = "";
    renderTrainLossFrame(currentFrame);
    advanceTrainLossGuideOnRandom10Click();
  });
}

function trainLossRows(frame = trainData?.history?.[currentFrame]) {
  const xs = trainData?.scatter?.x || [];
  const ys = trainData?.scatter?.y || [];
  return xs.map((x, index) => {
    const y = ys[index];
    const yhat = frame.w * x + frame.b;
    const residual = y - yhat;
    return { index, x, y, yhat, residual, squared: residual * residual };
  });
}

function axisOptionWithRange(base, range) {
  return { ...base, min: range.min, max: range.max };
}

function trainNiceAxisRange(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  finite.push(0);
  const rawMin = Math.min(...finite);
  const rawMax = Math.max(...finite);
  const epsilon = 1e-9;
  let min = Math.floor(rawMin + epsilon);
  let max = Math.ceil(rawMax - epsilon);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return {
    min,
    max,
  };
}

function trainFixedZeroAxisRange(data) {
  const xs = [];
  const ys = [];
  (data?.scatter?.x || []).forEach((x, index) => {
    const y = data?.scatter?.y?.[index];
    if (Number.isFinite(Number(x)) && Number.isFinite(Number(y))) {
      xs.push(Number(x));
      ys.push(Number(y));
    }
  });
  [lineForParamsInData(data, 0, 0), lineForParamsInData(data, data?.best?.w ?? 0, data?.best?.b ?? 0)]
    .flat()
    .forEach(point => {
      if (Number.isFinite(Number(point?.[0])) && Number.isFinite(Number(point?.[1]))) {
        xs.push(Number(point[0]));
        ys.push(Number(point[1]));
      }
    });
  return {
    x: trainNiceAxisRange(xs),
    y: trainNiceAxisRange(ys),
  };
}

function lineForParams(w, b, axisRange = null) {
  const xs = trainData?.line_x?.length
    ? trainData.line_x
    : [Math.min(...(trainData?.scatter?.x || [0])), Math.max(...(trainData?.scatter?.x || [1]))];
  const lineXs = axisRange?.x ? [axisRange.x.min, axisRange.x.max] : xs;
  return lineXs.map(x => [x, w * x + b]);
}

function lineForParamsInData(data, w, b) {
  const xs = data?.line_x?.length
    ? data.line_x
    : [Math.min(...(data?.scatter?.x || [0])), Math.max(...(data?.scatter?.x || [1]))];
  return xs.map(x => [x, w * x + b]);
}

function lineForParamsInRange(range, w, b) {
  return [range.x.min, range.x.max].map(x => [x, w * x + b]);
}

function trainLossCurrentSample(frame = trainData?.history?.[currentFrame]) {
  const rows = trainLossRows(frame);
  return rows[trainLossSampleIndex()] || null;
}

function trainLossRandom10Indices(count) {
  const saved = viewStateStore.trainLossRandom10IndicesV1;
  if (
    Array.isArray(saved)
    && saved.length
    && saved.every(index => Number.isInteger(index) && index >= 0 && index < count)
  ) {
    return saved.slice(0, Math.min(10, count));
  }
  return resetTrainLossRandom10Indices(count);
}

function resetTrainLossRandom10Indices(count = trainData?.scatter?.x?.length || 0) {
  const indices = Array.from({ length: count }, (_item, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = indices.slice(0, Math.min(10, count)).sort((a, b) => a - b);
  viewStateStore.trainLossRandom10IndicesV1 = selected;
  return selected;
}

function trainLossResidualIndices(rows) {
  const mode = trainLossResidualMode();
  if (mode === "single") return [trainLossSampleIndex()];
  if (mode === "top5") return [...rows].sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual)).slice(0, 5).map(row => row.index);
  const count = rows.length;
  if (!count) return [];
  return trainLossRandom10Indices(count);
}

function trainLossResidualOption() {
  const frame = trainData.history[currentFrame];
  const rows = trainLossRows(frame);
  const points = rows.map(row => [row.x, row.y]);
  const selected = new Set(trainLossResidualIndices(rows));
  const residualLines = rows.filter(row => selected.has(row.index)).map(row => ({ coords: [[row.x, row.y], [row.x, row.yhat]] }));
  const selectedPoints = rows.filter(row => selected.has(row.index)).map(row => [row.x, row.y]);
  const axisRange = trainFixedZeroAxisRange(trainData);
  const currentLine = lineForParams(frame.w, frame.b, axisRange);
  return applyFixedZeroAxis({
    tooltip: {
      trigger: "item",
      formatter: p => {
        if (p.seriesName === "\u6837\u672c\u70b9") {
          const row = rows[p.dataIndex];
          return `#${row.index + 1}<br>${escapeHtml(trainData.x_column)}=${num(row.x, 4)}<br>${escapeHtml(trainData.target || "MEDV")}=${num(row.y, 2)}<br>\u0177=${num(row.yhat, 2)}<br>e=${num(row.residual, 4)}`;
        }
        return p.seriesName;
      }
    },
    legend: { top: 8 },
    grid: { left: 58, right: 24, top: 52, bottom: 44 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 26 },
    yAxis: { type: "value", name: trainData.target || "MEDV", nameLocation: "middle", nameGap: 36 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(37,99,235,.58)" }, z: 3 },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: currentLine, showSymbol: false, lineStyle: { color: "#d9354f", width: 3 }, z: 4 },
      { name: "\u6b8b\u5dee\u7ebf", type: "lines", coordinateSystem: "cartesian2d", data: residualLines, lineStyle: { color: "#ef4444", width: 2.4, opacity: 0.82 }, z: 5 },
      { name: "\u5f53\u524d\u89c2\u5bdf\u6837\u672c", type: "scatter", data: selectedPoints, symbolSize: 13, itemStyle: { color: "#f59e0b", borderColor: "#fff", borderWidth: 2 }, z: 6 }
    ]
  }, axisRange);
}

function trainLossOverallOption() {
  const frame = trainData.history[currentFrame];
  const rows = trainLossRows(frame);
  const view = trainLossOverallView();
  if (view === "residual_hist") return trainLossHistogramOption(rows);
  return trainLossResidualScatterOption(rows);
}

function trainLossResidualScatterOption(rows) {
  return {
    tooltip: {
      trigger: "item",
      formatter: p => {
        const row = rows[p.dataIndex];
        return `#${row.index + 1}<br>${escapeHtml(trainData.x_column)}=${num(row.x, 4)}<br>e=${num(row.residual, 4)}`;
      }
    },
    grid: { left: 58, right: 24, top: 36, bottom: 44 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 26 },
    yAxis: { type: "value", name: "\u6b8b\u5dee e", nameLocation: "middle", nameGap: 36 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6b8b\u5dee", type: "scatter", data: rows.map(row => [row.x, row.residual]), symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } }
    ]
  };
}

function trainLossHistogramOption(rows) {
  const values = rows.map(row => row.residual);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = 16;
  const step = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({ label: `${num(min + i * step, 1)}~${num(min + (i + 1) * step, 1)}`, count: 0 }));
  values.forEach(value => {
    const index = Math.max(0, Math.min(binCount - 1, Math.floor((value - min) / step)));
    bins[index].count += 1;
  });
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 48, right: 20, top: 34, bottom: 70 },
    xAxis: { type: "category", data: bins.map(bin => bin.label), axisLabel: { rotate: 36, fontSize: 10 } },
    yAxis: { type: "value", name: "\u6837\u672c\u6570" },
    series: [{ name: "\u6b8b\u5dee\u5206\u5e03", type: "bar", data: bins.map(bin => bin.count), itemStyle: { color: "#5b35f5" }, barMaxWidth: 28 }]
  };
}

function updateTrainLossSampleNote() {
  const sample = trainLossCurrentSample();
  const el = $("lossSampleNote");
  if (el && sample) {
    el.innerHTML = `<span>#${sample.index + 1}</span><span>x = ${num(sample.x, 4)}</span><span>y = ${num(sample.y, 2)}</span><span>\u0177 = ${num(sample.yhat, 2)}</span><strong>e = ${num(sample.residual, 4)}</strong>`;
  }
  if ($("lossFormulaMse")) {
    const frame = trainData?.history?.[currentFrame];
    $("lossFormulaMse").textContent = Number(frame?.mse ?? frame?.loss ?? 0).toFixed(4);
  }
}

async function renderTrainFrame(index) {
  if (!trainData) return;
  currentFrame = Math.max(0, Math.min(index, trainData.history.length - 1));
  const frame = trainData.history[currentFrame];
  if ($("epochNow")) $("epochNow").textContent = frame.epoch;
  if ($("lossNow")) $("lossNow").textContent = Number(frame.loss).toFixed(4);

  let canReuseTrainGrid = false;
  await experimentRefreshCharts({
    viewName: "trainViews",
    storageKey: "trainSelectedViewsV1",
    summaryId: "trainModeSummary",
    contextId: trainData?.context_id,
    page: "train_eval",
    state: { frame_index: currentFrame },
    label: "train chart_data",
    beforeRender: ({ views, viewsKey, grid }) => {
      canReuseTrainGrid = dataGridMode === "train" && dataGrid && trainRenderViewsKey === viewsKey;
      if (!views.length) {
        destroyDataGrid();
        disposeCharts();
        trainRenderViewsKey = "";
        grid.classList.remove("dashboard-grid", "grid-stack");
      }
    },
    onChartData: chartData => {
      trainChartDataCache = chartData;
    },
    renderDashboard: ({ grid, views, viewsKey }) => {
      if (canReuseTrainGrid) {
        updateTrainInfoCards(frame);
        return;
      }
      destroyDataGrid();
      disposeCharts();
      grid.classList.remove("dashboard-grid", "grid-stack");
      renderTrainDashboard(grid, views, frame);
      trainRenderViewsKey = viewsKey;
    },
    renderFallback: ({ grid, views, viewsKey }) => {
      if (canReuseTrainGrid) {
        updateTrainInfoCards(frame);
        return;
      }
      destroyDataGrid();
      disposeCharts();
      grid.classList.remove("dashboard-grid", "grid-stack");
      grid.innerHTML = views.map(view => trainViewHtml(view, frame, trainChartDataCache[view])).join("");
      trainRenderViewsKey = viewsKey;
    },
    renderCharts: ({ views }) => {
      views.forEach(view => {
        if (isTrainInfoView(view)) return;
        const chartId = `chart_${view}`;
        const ch = charts.get(chartId) || initChart(chartId);
        const meta = trainChartMeta(view);
        const option = trainChartOption(meta, currentFrame, trainChartDataCache[view]);
        if (option) trainSetChartOption(ch, view, option, meta?.renderer !== "loss_surface_3d");
      });
    },
  });
}

function renderTrainCompareFrame(index) {
  if (!trainCompareData) return;
  const maxIndex = Math.max(trainCompareData.raw.history.length, trainCompareData.standard.history.length) - 1;
  currentFrame = Math.max(0, Math.min(index, maxIndex));
  const rawFrame = trainCompareFrame("raw", currentFrame);
  const stdFrame = trainCompareFrame("standard", currentFrame);
  if ($("epochNow")) $("epochNow").textContent = currentFrame;
  if ($("rawLossNow")) $("rawLossNow").textContent = rawFrame ? Number(rawFrame.loss).toFixed(4) : "--";
  if ($("stdLossNow")) $("stdLossNow").textContent = stdFrame ? Number(stdFrame.loss).toFixed(4) : "--";
  renderTrainCompareMain();
}

function renderTrainCompareMain() {
  const views = selectedTrainCompareViews();
  const viewsKey = views.join("|");
  if (!views.length) {
    destroyDataGrid();
    disposeCharts();
    trainCompareViewsKey = "";
    $("main").innerHTML = trainCompareHintHtml("min-height:70vh");
    return;
  }
  const grid = ensureTrainCompareGrid();
  if (trainCompareViewsKey !== viewsKey) {
    destroyDataGrid();
    disposeCharts();
    grid.classList.remove("single");
    grid.innerHTML = views.map((view, index) => compareGridItemHtml(view, index)).join("");
    if (window.GridStack) {
      try {
        dataGridMode = "train_compare";
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
          requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
        });
        syncDataGridAttributes();
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      } catch (err) {
        console.warn("Train compare GridStack fallback:", err);
        dataGrid = null;
        dataGridMode = null;
        grid.classList.remove("grid-stack");
        grid.classList.add("chart-grid");
        grid.innerHTML = views.map(view => {
          const config = TRAIN_COMPARE_VIEWS.find(item => item.id === view);
          const sub = config?.mode === "raw" ? "\u539f\u59cb\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b" : "\u6807\u51c6\u5316\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b";
          return chartCardHtml(view, config?.label || view, sub, "");
        }).join("");
      }
    }
    trainCompareViewsKey = viewsKey;
  }
  views.forEach(view => {
    const config = TRAIN_COMPARE_VIEWS.find(item => item.id === view);
    if (!config) return;
    const chartId = `chart_${view}`;
    const ch = charts.get(chartId) || initChart(chartId);
    trainSetChartOption(ch, view, trainCompareScatterOption(config.mode, currentFrame), true);
  });
  updateTrainPreprocessEffectGuide();
}

function ensureTrainCompareGrid() {
  if (!$("trainCompareWrap")) {
    destroyDataGrid();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="trainCompareWrap"></div>`;
  }
  return $("trainCompareWrap");
}

function trainCompareHintHtml(style = "") {
  return `<section class="chart-card wide load-dataset-card" style="${style}">
    <div class="chart-head" aria-label="\u63d0\u793a\u5361\u7247"></div>
    <div class="load-dataset-hint">\u8bf7\u5728\u53f3\u4fa7\u540c\u65f6\u9009\u62e9\u539f\u59cb\u6563\u70b9\u56fe\u548c\u6807\u51c6\u5316\u6563\u70b9\u56fe\uff0c\u9009\u62e9\u7279\u5f81\uff0c\u89c2\u5bdf\u5728\u5176\u5b83\u53c2\u6570\u76f8\u540c\u7684\u60c5\u51b5\u4e0b\uff0c\u8bad\u7ec3\u6a21\u578b\u65f6\u56de\u5f52\u7684\u533a\u522b</div>
  </section>`;
}

function compareGridItemHtml(view, index) {
  const config = TRAIN_COMPARE_VIEWS.find(item => item.id === view);
  const sub = config?.mode === "raw" ? "\u539f\u59cb\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b" : "\u6807\u51c6\u5316\u7279\u5f81\u5c3a\u5ea6\u4e0b\u7684\u8bad\u7ec3\u8fc7\u7a0b";
  const x = index % 2 === 0 ? 0 : 2;
  const y = Math.floor(index / 2) * 2;
  return `<div class="grid-stack-item" data-view="${escapeHtml(view)}" gs-x="${x}" gs-y="${y}" gs-w="2" gs-h="2" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${chartCardHtml(view, config?.label || view, sub, "")}</div></div>`;
}

function trainCompareFrame(mode, frameIndex) {
  const data = mode === "raw" ? trainCompareData?.raw : trainCompareData?.standard;
  if (!data?.history?.length) return null;
  return data.history[Math.min(frameIndex, data.history.length - 1)];
}

function trainCompareScatterOption(mode, frameIndex) {
  const data = mode === "raw" ? trainCompareData.raw : trainCompareData.standard;
  const frame = trainCompareFrame(mode, frameIndex);
  const points = data.scatter.x.map((x, i) => [x, data.scatter.y[i]]);
  const axisRange = trainFixedZeroAxisRange(data);
  const currentLine = lineForParamsInRange(axisRange, frame.w, frame.b);
  const bestLine = lineForParamsInRange(axisRange, data.best.w, data.best.b);
  return applyFixedZeroAxis({
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: data.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: data.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: mode === "raw" ? "rgba(37,99,235,.62)" : "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: currentLine, showSymbol: false, lineStyle: { color: "#d9354f", width: 3 } },
      { name: "\u6700\u4f18\u53c2\u8003\u7ebf", type: "line", data: bestLine, showSymbol: false, lineStyle: { color: "#0f9f78", width: 2.6, type: "dashed" } }
    ]
  }, axisRange);
}

function trainChartOption(meta, frameIndex, chartData = null) {
  if (!meta) return null;
  const metric = meta.metric || ({
    w_path: "w",
    b_path: "b",
    rmse: "rmse",
    mae: "mae",
    r2: "r2",
  })[meta.id];

  if (meta.renderer === "linear_train_scatter") return trainScatterOption(frameIndex, chartData);
  if (meta.renderer === "loss_curve") return lossOption(frameIndex, chartData);
  if (meta.renderer === "loss_contour") return contourOption(frameIndex, chartData);
  if (meta.renderer === "loss_surface_3d") return lossSurface3DOption(frameIndex, chartData);
  if (meta.renderer === "gradient_descent") return gradientDescentOption(frameIndex, chartData);
  if (meta.renderer === "param_path") return paramPathOption(metric, frameIndex, chartData);
  if (meta.renderer === "metric_gauge") return metricOption(metric, frameIndex, chartData);
  return null;
}

function startAuto() {
  if (activeTrainStep === "preprocess_effect") {
    startTrainCompareAuto();
    return;
  }
  if (!trainData) return;
  stopAuto();
  setTrainRunMessage("\u81ea\u52a8\u6f14\u793a\u4e2d\uff1a\u7cfb\u7edf\u4f1a\u5728\u8fbe\u5230\u6700\u5927\u8f6e\u6570\u3001Loss \u6536\u655b\u6216\u53d1\u6563\u65f6\u505c\u6b62\u3002");
  timer = setInterval(() => {
    const stopReason = trainAutoStopReason(currentFrame);
    if (stopReason) {
      setTrainRunMessage(stopReason);
      stopAuto();
      return;
    }
    if (activeTrainStep === "process") renderTrainProcessFrame(currentFrame + 1);
    else if (activeTrainStep === "loss") renderTrainLossFrame(currentFrame + 1);
    else if (activeTrainStep === "optimization") renderTrainOptimizationFrame(currentFrame + 1);
    else if (activeTrainStep === "custom") renderTrainCustomFrame(currentFrame + 1);
    else renderTrainFrame(currentFrame + 1);
  }, Number($("speed").value));
}

function startTrainCompareAuto() {
  if (!trainCompareData) return;
  stopAuto();
  setTrainRunMessage("\u81ea\u52a8\u6f14\u793a\u4e2d\uff1a\u4fdd\u6301\u4e24\u7ec4\u53c2\u6570\u76f8\u540c\uff0c\u5bf9\u6bd4\u539f\u59cb\u4e0e\u6807\u51c6\u5316\u8bad\u7ec3\u5dee\u5f02\u3002");
  timer = setInterval(() => {
    const stopReason = trainCompareAutoStopReason(currentFrame);
    if (stopReason) {
      setTrainRunMessage(stopReason);
      stopAuto();
      return;
    }
    renderTrainCompareFrame(currentFrame + 1);
  }, Number($("speed").value));
}

function stopAuto() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function trainAutoStopReason(frameIndex) {
  if (!trainData?.history?.length) return "\u6682\u65e0\u8bad\u7ec3\u6570\u636e\u3002";
  if (frameIndex >= trainData.history.length - 1) return "\u5df2\u8fbe\u5230\u672c\u6b21\u8bad\u7ec3\u7684\u6700\u5927\u8f6e\u6570\u3002";
  const frame = trainData.history[frameIndex];
  if (!Number.isFinite(Number(frame?.loss))) return "Loss \u51fa\u73b0\u5f02\u5e38\uff0c\u5df2\u505c\u6b62\u6f14\u793a\u3002";
  if (Number(frame.loss) > 1e12) return "Loss \u660e\u663e\u53d1\u6563\uff0c\u5df2\u505c\u6b62\u6f14\u793a\u3002";
  if (frameIndex < 10) return "";
  const recent = trainData.history.slice(Math.max(0, frameIndex - 8), frameIndex + 1).map(item => Number(item.loss));
  if (recent.some(value => !Number.isFinite(value))) return "Loss \u51fa\u73b0\u5f02\u5e38\uff0c\u5df2\u505c\u6b62\u6f14\u793a\u3002";
  const deltas = recent.slice(1).map((value, index) => Math.abs(value - recent[index]));
  const maxDelta = Math.max(...deltas);
  const scale = Math.max(1, Math.abs(recent[0]));
  if (maxDelta / scale < 1e-7) return "Loss \u8fde\u7eed\u591a\u8f6e\u51e0\u4e4e\u4e0d\u53d8\uff0c\u5df2\u89c6\u4e3a\u6536\u655b\u5e76\u505c\u6b62\u6f14\u793a\u3002";
  return "";
}

function trainCompareAutoStopReason(frameIndex) {
  if (!trainCompareData?.raw?.history?.length || !trainCompareData?.standard?.history?.length) return "\u6682\u65e0\u8bad\u7ec3\u6570\u636e\u3002";
  const maxIndex = Math.max(trainCompareData.raw.history.length, trainCompareData.standard.history.length) - 1;
  if (frameIndex >= maxIndex) return "\u5df2\u8fbe\u5230\u672c\u6b21\u5bf9\u6bd4\u8bad\u7ec3\u7684\u6700\u5927\u5468\u671f\u3002";
  const rawFrame = trainCompareFrame("raw", frameIndex);
  const stdFrame = trainCompareFrame("standard", frameIndex);
  if (!Number.isFinite(Number(rawFrame?.loss)) || !Number.isFinite(Number(stdFrame?.loss))) return "Loss \u51fa\u73b0\u5f02\u5e38\uff0c\u5df2\u505c\u6b62\u6f14\u793a\u3002";
  if (Number(rawFrame.loss) > 1e12 || Number(stdFrame.loss) > 1e12) return "Loss \u660e\u663e\u53d1\u6563\uff0c\u5df2\u505c\u6b62\u6f14\u793a\u3002";
  return "";
}

/* ==========================================================================
   朴素贝叶斯模型训练与评估模块 (Naive Bayes Model Training)
   ========================================================================== */

let nbTrainData = null;       // 缓存训练完成的模型结果
let nbProbeData = null;       // 缓存单词探针查询结果
let nbPredictData = null;     // 缓存测试样本决策推演结果
let nbLoading = false;
let activeNbTrainStep = "nb_train";
let nbTrainProgressStep = "nb_train";
let nbCharts = [];

function clearNbCharts() {
  nbCharts.forEach(ch => {
    try { ch.dispose(); } catch(e) {}
  });
  nbCharts = [];
}

function ensureNbTrainTopFlow() {
  const slot = $("pageTopSlot");
  if (!slot) return null;
  slot.classList.add("has-content");
  if (!$("nbTrainFlow")) {
    slot.innerHTML = `<div class="preprocess-flow" id="nbTrainFlow"></div>`;
  }
  return $("nbTrainFlow");
}

function renderNbTrainFlow() {
  const flow = ensureNbTrainTopFlow();
  if (!flow) return;
  const progressIndex = NB_TRAIN_STEPS.findIndex(s => s.id === nbTrainProgressStep);
  flow.innerHTML = NB_TRAIN_STEPS.map((step, index) => {
    const classes = ["flow-step"];
    if (step.id === activeNbTrainStep) classes.push("active");
    else if (index <= progressIndex) classes.push("done");
    return `<button class="${classes.join(" ")}" type="button" data-nb-step="${step.id}"><span>${step.no}</span><strong>${step.label}</strong></button>`;
  }).join("");
}

function bindNbTrainFlow() {
  const flow = ensureNbTrainTopFlow();
  if (!flow || flow.dataset.nbBound === "true") return;
  flow.dataset.nbBound = "true";
  flow.addEventListener("click", async event => {
    const btn = event.target.closest("[data-nb-step]");
    if (!btn) return;
    const previousStep = activeNbTrainStep;
    activeNbTrainStep = btn.dataset.nbStep;
    viewStateStore.activeNbTrainStep = activeNbTrainStep;
    
    // 只允许跳往已解锁（或已经过的）步骤
    const pIdx = NB_TRAIN_STEPS.findIndex(s => s.id === nbTrainProgressStep);
    const cIdx = NB_TRAIN_STEPS.findIndex(s => s.id === activeNbTrainStep);
    if (cIdx > pIdx && nbTrainData) {
      nbTrainProgressStep = activeNbTrainStep;
      viewStateStore.nbTrainProgressStep = nbTrainProgressStep;
    } else if (cIdx > pIdx && !nbTrainData) {
      // 未训练模型，不允许跳步，恢复原状态
      activeNbTrainStep = previousStep;
      return;
    }
    await renderNbTrainCurrentStep();
  });
}

function nbDefaultGridLayout(view) {
  return ({
    nb_overview: { x: 0, y: 0, w: 4, h: 1 },
    nb_confusion: { x: 0, y: 1, w: 2, h: 2 },
    nb_dictionary: { x: 2, y: 1, w: 2, h: 1 },
    nb_alpha: { x: 2, y: 2, w: 2, h: 1 },
    nb_wordclouds: { x: 0, y: 0, w: 4, h: 2 },
    nb_probe: { x: 0, y: 2, w: 4, h: 2 },
    nb_sample: { x: 0, y: 0, w: 4, h: 1 },
    nb_posterior: { x: 0, y: 1, w: 2, h: 2 },
    nb_deduction: { x: 2, y: 1, w: 2, h: 2 },
  })[view] || { x: 0, y: 0, w: 2, h: 2 };
}

function normalizeNbGridLayout(view, layout = {}) {
  const fallback = nbDefaultGridLayout(view);
  const clean = {
    x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : fallback.x,
    y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : fallback.y,
    w: Number.isFinite(Number(layout.w)) ? Number(layout.w) : fallback.w,
    h: Number.isFinite(Number(layout.h)) ? Number(layout.h) : fallback.h,
  };
  clean.x = Math.max(0, Math.min(3, clean.x));
  clean.y = Math.max(0, clean.y);
  clean.w = Math.max(1, Math.min(4, clean.w));
  clean.h = Math.max(1, clean.h);
  if (clean.x + clean.w > 4) clean.x = Math.max(0, 4 - clean.w);
  return clean;
}

function loadNbGridLayout(mode) {
  try {
    return viewStateStore[gridLayoutStorageKey(mode)] || {};
  } catch (err) {
    return {};
  }
}

function applyNbCardGrid(content, mode, viewIds) {
  if (!content) return;
  const overview = mode === "nb_train" ? content.querySelector(".mini-stats") : null;
  if (overview && !overview.closest(".chart-card")) {
    const section = document.createElement("section");
    section.className = "chart-card";
    section.innerHTML = `
      <div class="chart-head">
        <div>
          <div class="chart-title">训练结果概览</div>
          <div class="chart-sub">训练集、测试集和样本规模的核心指标</div>
        </div>
      </div>`;
    const body = document.createElement("div");
    body.style.padding = "14px 18px 18px 18px";
    body.appendChild(overview);
    section.appendChild(body);
    content.prepend(section);
  }
  const cards = Array.from(content.querySelectorAll(".chart-card"));
  if (!cards.length) return;

  const saved = loadNbGridLayout(mode);
  const grid = document.createElement("div");
  grid.id = `${mode}Wrap`;
  grid.className = "dashboard-grid grid-stack nb-card-grid";

  cards.forEach((card, index) => {
    const view = viewIds[index] || `${mode}_${index + 1}`;
    const layout = normalizeNbGridLayout(view, saved[view]);
    card.dataset.chartCard = card.dataset.chartCard || view;
    card.classList.add("chart-interaction-prototype");

    const item = document.createElement("div");
    item.className = "grid-stack-item";
    item.dataset.view = view;
    item.setAttribute("gs-x", layout.x);
    item.setAttribute("gs-y", layout.y);
    item.setAttribute("gs-w", layout.w);
    item.setAttribute("gs-h", layout.h);
    item.setAttribute("gs-min-w", "1");
    item.setAttribute("gs-min-h", "1");

    const inner = document.createElement("div");
    inner.className = "grid-stack-item-content";
    inner.appendChild(card);
    item.appendChild(inner);
    grid.appendChild(item);
  });

  content.replaceChildren(grid);

  if (!window.GridStack) {
    grid.classList.remove("dashboard-grid", "grid-stack");
    grid.classList.add("chart-grid");
    return;
  }

  dataGridMode = mode;
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
    requestAnimationFrame(() => nbCharts.forEach(ch => {
      try { ch.resize(); } catch (err) {}
    }));
  });
  syncDataGridAttributes();
}

const NB_TRAIN_STEPS = [
  { id: "nb_train", no: 1, label: "配置与训练" },
  { id: "nb_prob", no: 2, label: "概率学习" },
  { id: "nb_predict", no: 3, label: "决策推演" }
];

async function renderNbTrainShell() {
  document.querySelector(".shell").classList.remove("theory");
  ensureNbTrainTopFlow();
  renderNbTrainFlow();
  bindNbTrainFlow();

  // 注入朴素贝叶斯教学版专属 CSS 样式
  if (!document.getElementById("nbTrainStyles")) {
    const style = document.createElement("style");
    style.id = "nbTrainStyles";
    style.innerHTML = `
      .nb-card-title {
        font-size: 14px;
        font-weight: 600;
        color: #2b5c8f;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .nb-card-title span.badge {
        font-size: 10px;
        background: #eef4fa;
        color: #2b5c8f;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .nb-cm-table {
        width: 100%;
        border-collapse: collapse;
        text-align: center;
        font-size: 12px;
        margin-top: 10px;
      }
      .nb-cm-table th, .nb-cm-table td {
        border: 1px solid #dee2e6;
        padding: 10px;
      }
      .nb-cm-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #495057;
      }
      .nb-cm-correct {
        background: rgba(40, 167, 69, 0.1) !important;
        color: #155724;
        font-weight: bold;
      }
      .nb-cm-mistake {
        background: rgba(220, 53, 69, 0.08) !important;
        color: #721c24;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .nb-cm-mistake:hover {
        background: rgba(220, 53, 69, 0.15) !important;
      }
      .nb-mistake-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
        max-height: 180px;
        overflow-y: auto;
      }
      .nb-mistake-card {
        background: #fff8f8;
        border: 1px solid #fbcbcb;
        border-left: 4px solid #dc3545;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }
      .nb-mistake-card:hover {
        background: #ffebeb;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(220, 53, 69, 0.1);
      }
      .nb-balance-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        min-height: 200px;
      }
      .nb-balance-scale {
        position: relative;
        width: 280px;
        height: 120px;
        margin: 20px auto 10px auto;
      }
      .nb-balance-stand {
        position: absolute;
        bottom: 0;
        left: 135px;
        width: 10px;
        height: 90px;
        background: #6c757d;
        border-radius: 5px 5px 0 0;
      }
      .nb-balance-beam {
        position: absolute;
        top: 25px;
        left: 30px;
        width: 220px;
        height: 8px;
        background: #495057;
        border-radius: 4px;
        transform-origin: center center;
        transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .nb-balance-pan-left, .nb-balance-pan-right {
        position: absolute;
        top: 4px;
        width: 60px;
        height: 50px;
        transform-origin: center top;
        transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .nb-balance-pan-left {
        left: -20px;
      }
      .nb-balance-pan-right {
        right: -20px;
      }
      .nb-balance-pan-hang {
        position: absolute;
        top: -6px;
        left: 27px;
        width: 6px;
        height: 20px;
        border-left: 2px solid #6c757d;
        border-right: 2px solid #6c757d;
      }
      .nb-balance-dish {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 60px;
        height: 6px;
        background: #adb5bd;
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .nb-balance-icon {
        position: absolute;
        bottom: 8px;
        left: 0;
        width: 60px;
        text-align: center;
        font-size: 16px;
      }
      .nb-tug-scale-container {
        display: flex;
        flex-direction: column;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        margin-bottom: 16px;
      }
      .nb-tug-track {
        position: relative;
        height: 24px;
        background: linear-gradient(90deg, rgba(79, 134, 198, 0.2) 0%, rgba(230, 126, 34, 0.2) 100%);
        border-radius: 12px;
        margin: 18px 0;
        overflow: visible;
        border: 1px solid #ced4da;
      }
      .nb-tug-indicator {
        position: absolute;
        top: -8px;
        left: 50%;
        width: 16px;
        height: 38px;
        background: #e74c3c;
        border: 2px solid #fff;
        border-radius: 8px;
        transform: translateX(-50%);
        transition: left 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 2;
        cursor: pointer;
      }
      .nb-tug-indicator::after {
        content: "";
        position: absolute;
        top: 10px;
        left: 5px;
        width: 2px;
        height: 14px;
        background: rgba(255,255,255,0.7);
      }
      .nb-tug-center {
        position: absolute;
        top: 0;
        left: 50%;
        width: 2px;
        height: 22px;
        background: #495057;
        z-index: 1;
      }
      .nb-word-highlight {
        position: relative;
        display: inline-block;
        background: #fff3cd;
        color: #856404;
        font-weight: bold;
        padding: 0 4px;
        border-radius: 3px;
        cursor: help;
        border-bottom: 2px solid #ffc107;
        margin: 0 1px;
      }
      .nb-word-highlight:hover {
        background: #ffeeba;
        color: #533f03;
      }
      .tooltip-wrap {
        position: relative;
        display: inline-block;
      }
      .tooltip-content {
        visibility: hidden;
        width: 220px;
        background-color: #343a40;
        color: #fff;
        text-align: left;
        border-radius: 6px;
        padding: 10px 12px;
        position: absolute;
        z-index: 10;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        font-family: sans-serif;
        font-size: 11px;
        line-height: 1.5;
      }
      .tooltip-content::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #343a40 transparent transparent transparent;
      }
      .tooltip-wrap:hover .tooltip-content {
        visibility: visible;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  $("main").innerHTML = `<div id="nbTrainContent" style="padding: 10px 18px 24px 18px; width: 100%; box-sizing: border-box; overflow-y: auto; height: 100%;"></div>`;
  $("rightPanel").innerHTML = `<div id="nbTrainRightPanel"></div>`;

  await renderNbTrainCurrentStep();
}

async function renderNbTrainCurrentStep() {
  destroyDataGrid();
  clearNbCharts();
  renderNbTrainFlow();

  const content = $("nbTrainContent");
  if (!content) return;

  // 1. 安全过滤：如果跳到第2、3步，但模型还未训练，强制拦截并渲染警告
  if (!nbTrainData && activeNbTrainStep !== "nb_train") {
    content.innerHTML = `
      <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">请先训练模型</h3>
        <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">当前步骤依赖已训练的贝叶斯模型。请返回步骤 01 【配置与训练】 完成训练后再试。</p>
        <button class="primary-btn" type="button" onclick="activeNbTrainStep = 'nb_train'; renderNbTrainCurrentStep();" style="margin: 0; padding: 8px 20px; font-size: 13px;">去配置并训练模型</button>
      </section>
    `;
    $("nbTrainRightPanel").innerHTML = `
      <div class="right-title">操作提示</div>
      <div class="control-card">
        <p style="font-size: 13px; color: #868e96; line-height: 1.5; margin: 0;">当前步骤已锁。您需要先在第一步中点击开始训练以拟合模型，随后才可查询概率特征与进行推演。</p>
      </div>
    `;
    return;
  }

  // 2. 根据步骤渲染不同主内容与右侧栏
  if (activeNbTrainStep === "nb_train") {
    if (!nbTrainData) {
      content.innerHTML = `
        <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">模型就绪，等待训练</h3>
          <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">请在右侧控制面板中选择算法类型，配置平滑系数，然后点击【开始训练】按钮。</p>
        </section>
      `;
    } else {
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
          <div class="mini-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 4px;">
            <div class="mini-stat">
              <span>开卷复习成绩 (训练集准确率)</span>
              <strong style="color: #2b5c8f;">${(nbTrainData.train_accuracy * 100).toFixed(2)}%</strong>
            </div>
            <div class="mini-stat">
              <span>闭卷模拟成绩 (测试集准确率)</span>
              <strong style="color: #2b5c8f;">${(nbTrainData.test_accuracy * 100).toFixed(2)}%</strong>
            </div>
            <div class="mini-stat"><span>训练集样本量</span><strong>${nbTrainData.train_count} 篇</strong></div>
            <div class="mini-stat"><span>测试集样本量</span><strong>${nbTrainData.test_count} 篇</strong></div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px;">
            <!-- 左分栏：分类错题本与错题列表 -->
            <section class="chart-card">
              <div class="chart-head">
                <div>
                  <div class="chart-title">测试集分类错题本 (Confusion Matrix)</div>
                  <div class="chart-sub">统计测试集中两类帖子的实际类型与模型预测结果（点击错题可以直接下钻分析样本）</div>
                </div>
              </div>
              <div style="padding: 10px 18px 18px 18px;">
                <table class="nb-cm-table">
                  <thead>
                    <tr>
                      <th>实际帖子类型</th>
                      <th>预测为：🚀 ${nbTrainData.target_names[0]}</th>
                      <th>预测为：🚗 ${nbTrainData.target_names[1]}</th>
                      <th>分类质量剖析 (大白话)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: 600;">🚀 实际是 ${nbTrainData.target_names[0]}</td>
                      <td class="nb-cm-correct">${nbTrainData.confusion_matrix[0][0]} 篇<br><span style="font-size:10px; font-weight:normal; color:#28a745;">分类正确</span></td>
                      <td class="nb-cm-mistake" onclick="showToast?.('请点击下方的错题卡片，即可跳转推演该样本！', 'info')">${nbTrainData.confusion_matrix[0][1]} 篇<br><span style="font-size:10px; font-weight:normal; color:#dc3545;">认错为汽车</span></td>
                      <td style="text-align: left; color:#555;">该类召回率（覆盖率）为 <strong>${(nbTrainData.class_report[nbTrainData.target_names[0]].recall * 100).toFixed(1)}%</strong>，漏分类了 ${nbTrainData.confusion_matrix[0][1]} 篇。</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 600;">🚗 实际是 ${nbTrainData.target_names[1]}</td>
                      <td class="nb-cm-mistake" onclick="showToast?.('请点击下方的错题卡片，即可跳转推演该样本！', 'info')">${nbTrainData.confusion_matrix[1][0]} 篇<br><span style="font-size:10px; font-weight:normal; color:#dc3545;">认错为航天</span></td>
                      <td class="nb-cm-correct">${nbTrainData.confusion_matrix[1][1]} 篇<br><span style="font-size:10px; font-weight:normal; color:#28a745;">分类正确</span></td>
                      <td style="text-align: left; color:#555;">该类召回率（覆盖率）为 <strong>${(nbTrainData.class_report[nbTrainData.target_names[1]].recall * 100).toFixed(1)}%</strong>，漏分类了 ${nbTrainData.confusion_matrix[1][0]} 篇。</td>
                    </tr>
                  </tbody>
                </table>
                
                <div style="margin-top: 18px;">
                  <h5 style="margin: 0 0 8px 0; font-size:12px; font-weight:600; color:#495057;">典型分类错误样例（点击即可直接下钻到 Step 03 推演其错误原因）：</h5>
                  <div class="nb-mistake-list" id="nbMistakeList">
                    ${nbTrainData.misclassified_samples.length === 0 
                      ? `<div style="color:#28a745; font-size:12px; text-align:center; padding:10px; border: 1px dashed #c3e6cb; border-radius:4px; background:#f4faf5;">🎉 完美预测！测试集中没有发现被分类错误的样本。</div>`
                      : nbTrainData.misclassified_samples.map(sample => `
                          <div class="nb-mistake-card" onclick="nbLoadMistake(${sample.index})">
                            <strong>[实际: ${sample.true_label} | 预测: ${sample.predicted_label}]</strong>
                            <span style="color:#555;">${escapeHtml(sample.preview)}</span>
                          </div>
                        `).join("")
                    }
                  </div>
                </div>
              </div>
            </section>
            
            <!-- 右分栏：核心词典与平滑模拟器 -->
            <div style="display:flex; flex-direction:column; gap:16px;">
              <section class="chart-card" style="margin:0;">
                <div class="chart-head">
                  <div>
                    <div class="chart-title">核心特征词条件概率字典</div>
                    <div class="chart-sub">训练得到的条件概率，是贝叶斯进行决策的基石</div>
                  </div>
                </div>
                <div style="padding: 10px 18px 18px 18px;">
                  <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">
                    <thead>
                      <tr style="border-bottom: 2px solid #dee2e6; color:#666;">
                        <th style="padding: 4px;">特征单词</th>
                        <th style="padding: 4px;">P(词|${nbTrainData.target_names[0]})</th>
                        <th style="padding: 4px;">P(词|${nbTrainData.target_names[1]})</th>
                        <th style="padding: 4px; text-align:right;">倾向特征</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${nbGetDictionaryRowsHtml(nbTrainData)}
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="chart-card" style="margin:0;">
                <div class="chart-head">
                  <div>
                    <div class="chart-title">拉普拉斯平滑 α 零概率模拟器</div>
                    <div class="chart-sub">看平滑系数如何拯救出现频数为 0 的词</div>
                  </div>
                </div>
                <div style="padding: 10px 18px 18px 18px;" id="nbAlphaSimulatorCard">
                  <!-- 由 JS 动态渲染 -->
                </div>
              </section>
            </div>
          </div>
        </div>
      `;
      // 初始化平滑模拟器
      applyNbCardGrid(content, "nb_train", ["nb_overview", "nb_confusion", "nb_dictionary", "nb_alpha"]);
      nbUpdateAlphaSimulator(nbTrainData.alpha);
    }
    
    // 渲染右侧面板
    $("nbTrainRightPanel").innerHTML = `
      <div class="right-title">控制面板</div>
      <div class="control-card">
        <h3>算法参数配置</h3>
        <div class="control-group">
          <label class="control-label" for="nbModelType">算法类型</label>
          <select id="nbModelType" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ced4da; font-size:13px; margin-bottom:12px;">
            <option value="MultinomialNB" ${nbTrainData?.model_type === "MultinomialNB" ? "selected" : ""}>多项式贝叶斯 (MultinomialNB)</option>
            <option value="ComplementNB" ${nbTrainData?.model_type === "ComplementNB" ? "selected" : ""}>补集贝叶斯 (ComplementNB)</option>
          </select>
          
          <label class="control-label" for="nbAlpha" style="margin-top:12px; display:block; font-size:13px; font-weight:500;">
            平滑系数 (α): <span id="nbAlphaVal" style="font-weight:bold; color:#2b5c8f;">${nbTrainData?.alpha ?? "1.0"}</span>
          </label>
          <input type="range" id="nbAlpha" min="0.0" max="10.0" step="0.1" value="${nbTrainData?.alpha ?? "1.0"}" style="width:100%; cursor:pointer;" oninput="$('nbAlphaVal').textContent = Number(this.value).toFixed(1); nbUpdateAlphaSimulator(Number(this.value));">
        </div>
        
        <div style="margin-top: 24px;">
          <button class="primary-btn" id="nbStartTrainBtn" style="width: 100%; margin: 0; padding:10px 0; font-size:14px; font-weight:600;">开始训练</button>
        </div>
        <div class="status-line" id="nbTrainStatus" style="margin-top: 12px; font-size: 12px; color: #868e96;">就绪，等待训练。</div>
      </div>
    `;
    
    // 绑定事件
    $("nbStartTrainBtn").addEventListener("click", runNbTrain);

  } else if (activeNbTrainStep === "nb_prob") {
    content.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
        <section class="chart-card">
          <div class="chart-head">
            <div>
              <div class="chart-title">双类别特征词云图</div>
              <div class="chart-sub">词的大小代表该词在所属类别的权重得分 (MultinomialNB: P(w|c), ComplementNB: 1/P(w|~c))，支持点击查概率。</div>
            </div>
          </div>
          <div id="nbWordCloudsContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px 18px 18px 18px;">
            <div>
              <h4 style="margin: 0 0 10px 0; text-align: center; color: #2b5c8f; font-size: 14px; font-weight:600;" id="nbCloudTitle1">类别 1</h4>
              <div id="nbWordCloud1" style="min-height: 240px; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 8px; border: 1px dashed #ced4da; border-radius: 6px; padding: 10px; box-sizing: border-box; background: #fff;"></div>
            </div>
            <div>
              <h4 style="margin: 0 0 10px 0; text-align: center; color: #e67e22; font-size: 14px; font-weight:600;" id="nbCloudTitle2">类别 2</h4>
              <div id="nbWordCloud2" style="min-height: 240px; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 8px; border: 1px dashed #ced4da; border-radius: 6px; padding: 10px; box-sizing: border-box; background: #fff;"></div>
            </div>
          </div>
        </section>
        
        <section class="chart-card">
          <div class="chart-head">
            <div>
              <div class="chart-title">条件概率特征单词探针</div>
              <div class="chart-sub">展示所查询特征词在各个类别下的条件概率 P(word|class)</div>
            </div>
          </div>
          <div style="padding: 10px 18px 18px 18px;">
            <div id="nbProbeWarningContainer"></div>
            <div id="nbProbeChartsRow" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; align-items: center;">
              <div class="chart" id="nbProbeChart" style="height: 240px; min-height: 240px;"></div>
              <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; border: 1px solid #e9ecef; min-height: 180px; box-sizing: border-box; display:flex; flex-direction:column; justify-content:center;">
                <h5 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #343a40; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">探针数值详情</h5>
                <div id="nbProbeStats" style="font-size: 12px; line-height: 1.6; color: #495057;">
                  <span style="color:#868e96;">请在右侧输入框搜索单词，或点击词云图中的单词。</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    // 渲染词云
    applyNbCardGrid(content, "nb_prob", ["nb_wordclouds", "nb_probe"]);
    renderNbWordClouds();

    // 渲染右侧面板
    $("nbTrainRightPanel").innerHTML = `
      <div class="right-title">条件概率探针</div>
      <div class="control-card">
        <h3>特征词检索</h3>
        <div class="control-group">
          <label class="control-label" for="nbWordProbeInput">输入查询词</label>
          <input type="text" id="nbWordProbeInput" placeholder="输入单词，例如 space, engine..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #ced4da; font-size:13px; margin-bottom:12px;" value="${nbProbeData?.word || ""}">
        </div>
        <div style="margin-top: 12px;">
          <button class="primary-btn" id="nbWordProbeBtn" style="width: 100%; margin: 0; padding:10px 0; font-size:13px; font-weight:600;">开始查询</button>
        </div>
        <div class="status-line" id="nbProbeStatus" style="margin-top: 10px; font-size: 12px; color: #868e96;">提示：点击词云中的词，或手动输入单词并查询。</div>
      </div>
    `;

    // 绑定事件
    $("nbWordProbeBtn").addEventListener("click", () => {
      const w = $("nbWordProbeInput").value.trim();
      runNbWordProbe(w);
    });

    // 如果之前有探针数据，重绘探针
    if (nbProbeData) {
      renderNbProbeChart();
    }

  } else if (activeNbTrainStep === "nb_predict") {
    content.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
        <section class="chart-card">
          <div class="chart-head">
            <div>
              <div class="chart-title">测试样本原文</div>
              <div class="chart-sub">当前抽取的测试文档内容预览（过滤不相关换行，高亮展示预测决策贡献词）</div>
            </div>
          </div>
          <div style="padding: 10px 18px 18px 18px;">
            <div id="nbSampleText" style="background:#f8f9fa; border:1px solid #e9ecef; padding:15px; border-radius:6px; font-family:monospace; max-height:160px; overflow-y:auto; font-size:13px; line-height:1.6; color:#495057; white-space: pre-wrap; word-break: break-all; min-height: 80px;">
              ${nbPredictData ? nbHighlightText(nbPredictData.text_preview, nbPredictData.top_words) : `<span style="color:#868e96;">等待抽取测试样本，请点击右侧面板按钮。</span>`}
            </div>
          </div>
        </section>
        
        <div style="display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 16px;">
          <section class="chart-card">
            <div class="chart-head">
              <div>
                <div class="chart-title">分类预测概率 P(Class|Doc)</div>
                <div class="chart-sub">通过后验得分平移进行 Softmax 归一化得到的置信度占比</div>
              </div>
            </div>
            <div class="chart" id="nbPosteriorChart" style="height: 280px; min-height: 280px;"></div>
          </section>
          
          <section class="chart-card">
            <div class="chart-head">
              <div>
                <div class="chart-title">决策数学推导拆解</div>
                <div class="chart-sub">展示 log P(c|d) = log P(c) + Σ log P(w|c) 贡献排名靠前的决策特征词</div>
              </div>
              <div style="padding: 10px 18px 18px 18px;">
                <div style="background: #eef3f7; padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 11px; margin-bottom: 12px; border-left: 4px solid #1e824c; line-height: 1.5; color: #2b5c8f;" id="nbDeductionFormula">
                  ${nbPredictData ? nbGetFormulaHtml(nbPredictData) : "等待抽取测试样本后，渲染后验得分公式推导。"}
                </div>
                <h5 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #495057;">最高决策贡献 Top-5 单词</h5>
                <div class="table-wrap" style="margin:0; padding:0; border:none; background:transparent;">
                  <table style="font-size: 11px; width: 100%; border-collapse:collapse;" id="nbContribTable">
                    <thead>
                      <tr style="border-bottom: 2px solid #dee2e6; text-align:left;">
                        <th style="padding: 6px;">单词</th>
                        <th style="padding: 6px;">样本内频次</th>
                        <th style="padding: 6px;" id="nbTableHeaderClass1">Class 1 log P</th>
                        <th style="padding: 6px;" id="nbTableHeaderClass2">Class 2 log P</th>
                        <th style="padding: 6px; text-align:right;">贡献差异 (Δ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${nbPredictData ? nbGetContribTableRowsHtml(nbPredictData) : `<tr><td colspan="5" style="text-align:center; color:#868e96; padding:10px;">暂无数据。</td></tr>`}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      `;

      // 渲染右侧面板
      $("nbTrainRightPanel").innerHTML = `
        <div class="right-title">决策推演控制</div>
        <div class="control-card">
          <h3>样本检验与推演</h3>
          <div style="margin-top: 10px;">
            <button class="primary-btn" id="nbRandomSampleBtn" style="width: 100%; margin: 0; padding:10px 0; font-size:13px; font-weight:600;">随机抽取测试样本</button>
          </div>
          
          <div class="mini-stats" style="margin-top: 18px; display: block; border: 1px solid #f1f3f5; padding: 12px; border-radius: 6px; background:#fafafa;">
            <h4 style="font-size: 12px; margin: 0 0 10px 0; color: #495057; font-weight:600; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">判定状态</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px;">
              <span>样本索引:</span>
              <strong id="nbSampleIdx">${nbPredictData ? nbPredictData.sample_index + 1 : "--"} / ${nbPredictData ? nbPredictData.total_samples : "--"}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px;">
              <span>真实分类:</span>
              <strong id="nbTrueLabel" style="color: #2b5c8f;">${nbPredictData ? nbPredictData.true_label : "--"}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px;">
              <span>预测分类:</span>
              <strong id="nbPredLabel" style="color: #e67e22;">${nbPredictData ? nbPredictData.predicted_label : "--"}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0; font-size:12px; align-items: center;">
              <span>推演结果:</span>
              <span id="nbCorrectBadge">${nbPredictData ? (nbPredictData.correct ? `<span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">预测正确</span>` : `<span style="background:#f8d7da; color:#721c24; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">预测错误</span>`) : "--"}</span>
            </div>
          </div>
          
          <div class="status-line" id="nbPredictStatus" style="margin-top: 10px; font-size: 12px; color: #868e96;">就绪</div>
        </div>
      `;

      // 绑定事件
      applyNbCardGrid(content, "nb_predict", ["nb_sample", "nb_posterior", "nb_deduction"]);
      $("nbRandomSampleBtn").addEventListener("click", () => runNbPredict());

      // 如果之前有预测数据，重绘图表
      if (nbPredictData) {
        renderNbPosteriorChart();
      }
    }
  }

  async function runNbPredict(sampleIndex) {
    const status = $("nbPredictStatus");
    if (status) status.textContent = sampleIndex !== undefined ? `正在加载并分析指定测试样本 (ID: ${sampleIndex})...` : "正在随机抽取并分析测试样本...";
    
    try {
      const params = {
        dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups"
      };
      if (sampleIndex !== undefined) {
        params.sample_index = sampleIndex;
      }
      const res = await runAction("predict", params);
      
      nbPredictData = res;
      if (status) status.textContent = "抽取与后验概率计算完成。";
      
      // 更新控制面板状态
      $("nbSampleIdx").textContent = `${res.sample_index + 1} / ${res.total_samples}`;
      $("nbTrueLabel").textContent = res.true_label;
      $("nbPredLabel").textContent = res.predicted_label;
      $("nbCorrectBadge").innerHTML = res.correct 
        ? `<span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">预测正确</span>` 
        : `<span style="background:#f8d7da; color:#721c24; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">预测错误</span>`;
        
      // 更新左侧主文本预览
      $("nbSampleText").innerHTML = nbHighlightText(res.text_preview, res.top_words);
      
      // 更新数学拆解公式
      $("nbDeductionFormula").innerHTML = nbGetFormulaHtml(res);
      
      // 更新表格行
      $("nbContribTable").querySelector("tbody").innerHTML = nbGetContribTableRowsHtml(res);
      
      // 渲染后验得分概率柱状图
      renderNbPosteriorChart();
      
    } catch (err) {
      console.error("Bayes predict error:", err);
      if (status) status.textContent = `抽取失败: ${err.message}`;
    }
  }
       // --------------------------------------------------------------------------
// ECharts 绘图核心渲染 (Step 01 不再使用 ECharts，已改用原生 HTML 表格)
// --------------------------------------------------------------------------

async function runNbTrain() {
  const modelType = $("nbModelType")?.value || "MultinomialNB";
  const alpha = parseFloat($("nbAlpha")?.value || "1.0");
  const status = $("nbTrainStatus");

  if (status) status.textContent = "正在训练贝叶斯分类器...";
  nbLoading = true;

  try {
    const res = await runAction("prepare_train", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      model_type: modelType,
      alpha: Number.isFinite(alpha) ? alpha : 1.0
    });

    nbTrainData = res;
    nbTrainProgressStep = "nb_train";
    viewStateStore.nbTrainProgressStep = nbTrainProgressStep;

    if (res.context_id) {
      currentContextId = res.context_id;
    }

    if (status) status.textContent = "模型训练完成。";
    await renderNbTrainCurrentStep();
  } catch (err) {
    console.error("Bayes train error:", err);
    if (status) status.textContent = `训练失败: ${err.message}`;
    showToast?.(`训练失败: ${err.message}`, "error");
  } finally {
    nbLoading = false;
  }
}

async function runNbWordProbe(word) {
  if (!word) return;
  const status = $("nbProbeStatus");
  if (status) status.textContent = `正在查询单词 "${word}" 概率...`;

  try {
    const res = await runAction("get_word_prob", {
      dataset_id: currentDatasetMeta?.dataset_id || "twenty_newsgroups",
      word
    });

    nbProbeData = res;
    if (status) status.textContent = `查询单词 "${word}" 完成。`;

    const warningContainer = $("nbProbeWarningContainer");
    const statsContainer = $("nbProbeStats");

    if (res.is_unseen) {
      if (warningContainer) {
        warningContainer.innerHTML = `
          <div class="alert alert-warning" style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 5px solid #ffc107; font-size:12px;">
            单词 <strong>"${escapeHtml(res.word)}"</strong> 未进入当前分类特征词典，所有类别下的条件概率均记为 0。
          </div>
        `;
      }
      if (statsContainer) {
        statsContainer.innerHTML = `
          <span style="color:#d9534f; font-weight:bold;">未登录词 / 停用词</span><br>
          该词在预处理分词过滤阶段已被筛除，无法计算分类似然概率贡献。
        `;
      }
    } else {
      if (warningContainer) warningContainer.innerHTML = "";
      if (statsContainer) {
        statsContainer.innerHTML = Object.entries(res.probs).map(([cName, prob]) => {
          const logProb = res.log_probs[cName];
          return `
            <div style="margin-bottom:8px;">
              <strong>${escapeHtml(cName)}</strong><br>
              条件概率 P(w|c): <span style="color:#2b5c8f; font-weight:bold;">${prob.toExponential(4)}</span><br>
              对数似然 log P(w|c): <span style="color:#e67e22; font-weight:bold;">${logProb.toFixed(4)}</span>
            </div>
          `;
        }).join("");
      }
    }

    renderNbProbeChart();
  } catch (err) {
    console.error("Word probe error:", err);
    if (status) status.textContent = `查询失败: ${err.message}`;
  }
}

function renderNbTrainCharts() {
  // 空实现，Step 01 使用了分类错题本 HTML 结构
}

function renderNbProbeChart() {
  const probeDom = $("nbProbeChart");
  if (!probeDom || !nbProbeData) return;
  
  // 销毁原有的 ECharts 实例防止残留
  const oldCh = echarts.getInstanceByDom(probeDom);
  if (oldCh) oldCh.dispose();
  
  const targetNames = Object.keys(nbProbeData.probs);
  const p0 = nbProbeData.probs[targetNames[0]] || 0;
  const p1 = nbProbeData.probs[targetNames[1]] || 0;
  
  // 计算天平倾角
  let tilt = 0;
  if (p0 > 0 || p1 > 0) {
    const sum = p0 + p1;
    const r0 = p0 / sum;
    const r1 = p1 / sum;
    tilt = (r1 - r0) * 40; // 范围在 [-40, 40] 之间
  }
  
  probeDom.style.height = "auto";
  probeDom.style.minHeight = "200px";
  probeDom.innerHTML = `
    <div class="nb-balance-container" style="background:#fff; border:none; padding:10px 0;">
      <div style="font-size:13px; font-weight:bold; color:#495057; display:flex; align-items:center; gap:6px; margin-bottom:5px;">
        ⚖️ 条件概率天平 PK 台: <span style="color:#2b5c8f; background:#eef4fa; padding:2px 6px; border-radius:4px;">"${escapeHtml(nbProbeData.word)}"</span>
      </div>
      <div class="nb-balance-scale">
        <div class="nb-balance-stand"></div>
        <div class="nb-balance-beam" style="transform: rotate(${tilt.toFixed(1)}deg);">
          <div class="nb-balance-pan-left" style="transform: rotate(${-tilt.toFixed(1)}deg);">
            <div class="nb-balance-pan-hang"></div>
            <div class="nb-balance-dish"></div>
            <div class="nb-balance-icon" style="color:#2b5c8f;">🚀</div>
          </div>
          <div class="nb-balance-pan-right" style="transform: rotate(${-tilt.toFixed(1)}deg);">
            <div class="nb-balance-pan-hang"></div>
            <div class="nb-balance-dish"></div>
            <div class="nb-balance-icon" style="color:#e67e22;">🚗</div>
          </div>
        </div>
      </div>
      <div style="margin-top:15px; font-size:11px; text-align:center; color:#555; width:100%; display:flex; justify-content:space-around; border-top:1px solid #dee2e6; padding-top:10px;">
        <div style="text-align:left;">🚀 ${targetNames[0]} 概率:<br><strong style="color:#2b5c8f; font-size:12px;">${p0.toExponential(4)}</strong></div>
        <div style="text-align:right;">🚗 ${targetNames[1]} 概率:<br><strong style="color:#e67e22; font-size:12px;">${p1.toExponential(4)}</strong></div>
      </div>
    </div>
  `;
}

function renderNbPosteriorChart() {
  const postDom = $("nbPosteriorChart");
  if (!postDom || !nbPredictData) return;
  
  const oldCh = echarts.getInstanceByDom(postDom);
  if (oldCh) oldCh.dispose();
  
  const targetNames = Object.keys(nbPredictData.probs);
  const p0 = nbPredictData.probs[targetNames[0]] || 0;
  const p1 = nbPredictData.probs[targetNames[1]] || 0;
  
  // 计算拔河指标在轨道上的比例 (0% - 100%)
  const posPercent = p1 * 100;
  
  postDom.style.height = "auto";
  postDom.style.minHeight = "260px";
  
  // 计算净拉力差异
  const netLikelihood = nbPredictData.likelihood_scores[targetNames[0]] - nbPredictData.likelihood_scores[targetNames[1]];
  const netPrior = nbPredictData.prior_scores[targetNames[0]] - nbPredictData.prior_scores[targetNames[1]];
  const pullDirection = netLikelihood >= 0 ? `🚀 ${targetNames[0]}` : `🚗 ${targetNames[1]}`;
  
  postDom.innerHTML = `
    <div class="nb-tug-scale-container" style="background:#fff; border:none; padding:10px 0;">
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; color:#495057; margin-bottom:5px;">
        <span style="color:#2b5c8f;">🚀 ${targetNames[0]} (${(p0*100).toFixed(1)}%)</span>
        <span style="color:#e67e22;">🚗 ${targetNames[1]} (${(p1*100).toFixed(1)}%)</span>
      </div>
      <div class="nb-tug-track">
        <div class="nb-tug-center"></div>
        <div class="nb-tug-indicator" style="left: ${posPercent.toFixed(1)}%;"></div>
      </div>
      
      <div style="font-size:11px; color:#666; text-align:center; line-height:1.6; margin-top:5px; padding-bottom:12px; border-bottom:1px dashed #dee2e6;">
        先验对数偏差: <strong>${netPrior >= 0 ? "偏向航天" : "偏向汽车"} (${netPrior.toFixed(2)})</strong><br>
        特征词净拉力: <strong style="color:${netLikelihood >= 0 ? '#2b5c8f' : '#e67e22'};">${pullDirection}方向 (+${Math.abs(netLikelihood).toFixed(2)} 分)</strong>
      </div>
      
      <div style="margin-top:12px;">
        <h5 style="margin: 0 0 6px 0; font-size:11px; font-weight:600; color:#495057;">样本特征词拉票大比拼:</h5>
        <div style="display:flex; flex-direction:column; gap:5px; font-size:11px;">
          ${nbPredictData.top_words.map(item => {
            const isLeft = item.diff >= 0;
            const diffText = isLeft ? `🚀 航天 +${item.diff.toFixed(2)}` : `🚗 汽车 +${Math.abs(item.diff).toFixed(2)}`;
            const color = isLeft ? '#2b5c8f' : '#e67e22';
            return `
              <div style="display:flex; justify-content:space-between; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #e9ecef;">
                <strong>${escapeHtml(item.word)} (频数:${item.val})</strong>
                <span style="color:${color}; font-weight:bold;">${diffText}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 新增教学辅助渲染函数
// --------------------------------------------------------------------------

function nbGetDictionaryRowsHtml(data) {
  const t0 = data.target_names[0];
  const t1 = data.target_names[1];
  const list0 = data.top_words_per_class[t0] || [];
  const list1 = data.top_words_per_class[t1] || [];
  
  const wordsToShow = [];
  if (list0[0]) wordsToShow.push({ word: list0[0].word, prob0: list0[0].prob, prob1: 0.0001, label: "🚀 航天特征" });
  if (list0[1]) wordsToShow.push({ word: list0[1].word, prob0: list0[1].prob, prob1: 0.0002, label: "🚀 航天特征" });
  if (list1[0]) wordsToShow.push({ word: list1[0].word, prob0: 0.0001, prob1: list1[0].prob, label: "🚗 汽车特征" });
  if (list1[1]) wordsToShow.push({ word: list1[1].word, prob0: 0.00015, prob1: list1[1].prob, label: "🚗 汽车特征" });
  
  wordsToShow.push({ word: "write", prob0: 0.005, prob1: 0.0051, label: "⚖️ 中性词" });

  return wordsToShow.map(w => {
    const matched0 = list0.find(x => x.word === w.word);
    const matched1 = list1.find(x => x.word === w.word);
    const p0 = matched0 ? matched0.prob : w.prob0;
    const p1 = matched1 ? matched1.prob : w.prob1;
    const isNeutral = w.label.includes("中性");
    const diffText = isNeutral ? "对称/无偏向" : (p0 > p1 ? "偏向航天" : "偏向汽车");
    const diffColor = isNeutral ? "#6c757d" : (p0 > p1 ? "#2b5c8f" : "#e67e22");
    
    return `
      <tr style="border-bottom: 1px solid #f1f3f5;">
        <td style="padding: 6px 4px; font-weight:600;">${escapeHtml(w.word)}</td>
        <td style="padding: 6px 4px;">${p0.toExponential(2)}</td>
        <td style="padding: 6px 4px;">${p1.toExponential(2)}</td>
        <td style="padding: 6px 4px; text-align:right; font-weight:600; color:${diffColor};">${diffText}</td>
      </tr>
    `;
  }).join("");
}

function nbUpdateAlphaSimulator(val) {
  const container = $("nbAlphaSimulatorCard");
  if (!container || !nbTrainData) return;
  
  const alpha = parseFloat(val);
  const V = nbTrainData.n_features;
  const totalWords = 15000;
  
  let resultHtml = "";
  if (alpha === 0) {
    resultHtml = `
      <div style="font-family: monospace; font-size:11px; background:#fff3cd; padding:10px; border-radius:4px; border:1px solid #ffeeba; color:#856404; line-height:1.6;">
        <div style="font-weight:bold; color:#d9534f; margin-bottom:5px;">⚠️ 零概率陷阱：分类器失效！</div>
        P(词 | 汽车) = 0 / ${totalWords} = <strong style="font-size:13px; color:#d9534f;">0.00</strong><br>
        对数似然 log P = <strong style="font-size:13px; color:#d9534f;">-∞ (负无穷)</strong>
        <p style="margin:5px 0 0 0; font-size:10px; color:#868e96; font-family:sans-serif;">公式中出现 0 概率，连乘积计算将直接报错或归零，分类器完全瘫痪！</p>
      </div>
    `;
  } else {
    const smoothedP = alpha / (totalWords + alpha * V);
    const logP = Math.log(smoothedP);
    resultHtml = `
      <div style="font-family: monospace; font-size:11px; background:#eef9f0; padding:10px; border-radius:4px; border:1px solid #c3e6cb; color:#155724; line-height:1.6;">
        <div style="font-weight:bold; color:#28a745; margin-bottom:5px;">✅ 平滑配置成功！</div>
        P(词 | 汽车) = (0 + ${alpha.toFixed(1)}) / (${totalWords} + ${alpha.toFixed(1)} × ${V})<br>
        条件概率 P = <strong style="font-size:12px; color:#28a745;">${smoothedP.toExponential(4)}</strong><br>
        对数似然 log P = <strong style="font-size:12px; color:#28a745;">${logP.toFixed(2)}</strong>
        <p style="margin:5px 0 0 0; font-size:10px; color:#6c757d; font-family:sans-serif;">引入极小正数，确保即使句子中有在汽车类中未见过的词，模型也不会瘫痪。</p>
      </div>
    `;
  }
  
  container.innerHTML = `
    <div style="font-size:11px; line-height:1.4; margin-bottom:8px; color:#495057;">
      假设有一个测试词在汽车类中未出现过（频数 = 0）：
    </div>
    ${resultHtml}
  `;
}

function nbLoadMistake(index) {
  activeNbTrainStep = "nb_predict";
  renderNbTrainCurrentStep();
  runNbPredict(index);
}

function nbHighlightText(text, topWords) {
  if (!text || !nbTrainData) return "";
  let html = escapeHtml(text);
  const targetNames = nbTrainData.target_names;
  
  topWords.forEach(item => {
    const word = item.word;
    const regex = new RegExp(`\\b(${word})\\b`, "gi");
    const c1 = item.contributions[targetNames[0]].toFixed(2);
    const c2 = item.contributions[targetNames[1]].toFixed(2);
    const diff = item.diff.toFixed(2);
    const leanClass = item.diff >= 0 ? targetNames[0] : targetNames[1];
    const leanIcon = item.diff >= 0 ? "🚀" : "🚗";
    
    const tooltipHtml = `
      <mark style="background:#fff3cd; color:#856404; font-weight:bold; padding:0 2px; border-radius:2px;" title="特征词 '${word}' 似然对数贡献: ${targetNames[0]}: ${c1}, ${targetNames[1]}: ${c2} (决策倾向: ${leanClass})">$1</mark>
    `;
    html = html.replace(regex, tooltipHtml);
  });
  
  return html;
}

function nbGetFormulaHtml(data) {
  const keys = Object.keys(data.raw_scores);
  let html = `<strong>决策公式推导 (后验对数得分连加):</strong><br>`;
  keys.forEach(name => {
    const prior = data.prior_scores[name].toFixed(4);
    const like = data.likelihood_scores[name].toFixed(4);
    const total = data.raw_scores[name].toFixed(4);
    const boldStyle = name === data.predicted_label ? "font-weight:bold; color:#d9534f;" : "";
    html += `<div style="margin-top: 4px; ${boldStyle}">log P(${escapeHtml(name)}|doc) = ${prior} + (${like}) = <strong>${total}</strong></div>`;
  });
  return html;
}

function nbGetContribTableRowsHtml(data) {
  if (!data.top_words || !data.top_words.length) return `<tr><td colspan="5" style="text-align:center; color:#868e96; padding:10px;">暂无数据。</td></tr>`;
  const keys = Object.keys(data.raw_scores);
  return data.top_words.map(item => {
    const c1 = item.contributions[keys[0]].toFixed(4);
    const c2 = item.contributions[keys[1]].toFixed(4);
    const diff = item.diff.toFixed(4);
    return `
      <tr style="border-bottom: 1px solid #f1f3f5;">
        <td style="padding: 6px; font-weight:bold; color:#2b5c8f;">${escapeHtml(item.word)}</td>
        <td style="padding: 6px;">${item.val}</td>
        <td style="padding: 6px; color:#666;">${c1}</td>
        <td style="padding: 6px; color:#666;">${c2}</td>
        <td style="padding: 6px; text-align:right; font-weight:bold; color:#1e824c;">${diff}</td>
      </tr>
    `;
  }).join("");
}



function renderNbProbeChart() {
  const probeDom = $("nbProbeChart");
  if (!probeDom || !nbProbeData) return;
  
  // 查找原有的该 DOM 实例，重新 init
  const oldCh = echarts.getInstanceByDom(probeDom);
  if (oldCh) oldCh.dispose();
  
  const ch = echarts.init(probeDom);
  const targetNames = Object.keys(nbProbeData.probs);
  const values = targetNames.map(name => nbProbeData.probs[name]);

  const option = {
    title: { 
      text: `单词探针: "${nbProbeData.word}"`, 
      left: 'center', 
      textStyle: { fontSize: 13, fontWeight: 'bold', color: '#495057' } 
    },
    tooltip: { 
      trigger: 'axis', 
      formatter: (params) => {
        const item = params[0];
        return `${item.name}<br>条件概率 P(w|c): <strong>${item.value.toExponential(4)}</strong>`;
      } 
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '20%', containLabel: true },
    xAxis: { type: 'category', data: targetNames },
    yAxis: { 
      type: 'value',
      name: 'P(word | class)',
      nameTextStyle: { fontSize: 10 }
    },
    color: ['#2b5c8f'],
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top',
          formatter: (params) => params.value.toExponential(2)
        }
      }
    ]
  };
  ch.setOption(option);
  nbCharts.push(ch);
}

function renderNbPosteriorChart() {
  const postDom = $("nbPosteriorChart");
  if (!postDom || !nbPredictData) return;
  
  const oldCh = echarts.getInstanceByDom(postDom);
  if (oldCh) oldCh.dispose();
  
  const ch = echarts.init(postDom);
  const targetNames = Object.keys(nbPredictData.probs);
  const values = targetNames.map(name => nbPredictData.probs[name] * 100);

  // 找出概率最高的类别作为预测类别并高亮
  const predName = nbPredictData.predicted_label;
  
  const option = {
    tooltip: { 
      trigger: 'axis', 
      formatter: '{b}: {c}%' 
    },
    grid: { left: '3%', right: '8%', bottom: '5%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'value', 
      min: 0, 
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    yAxis: { type: 'category', data: targetNames },
    series: [
      {
        type: 'bar',
        data: values.map((val, idx) => {
          const isPred = targetNames[idx] === predName;
          return {
            value: val,
            itemStyle: {
              color: isPred ? '#e74c3c' : '#4f86c6' // 高亮预测类别用红橙色，其余用经典蓝
            }
          };
        }),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%'
        }
      }
    ]
  };
  ch.setOption(option);
  nbCharts.push(ch);
}

// --------------------------------------------------------------------------
// 双词云图自适应 HTML-CSS 排列生成器
// --------------------------------------------------------------------------

function renderNbWordClouds() {
  if (!nbTrainData) return;
  const targetNames = nbTrainData.target_names;
  
  $("nbCloudTitle1").textContent = `新闻版块：${targetNames[0]}`;
  $("nbCloudTitle2").textContent = `新闻版块：${targetNames[1]}`;
  
  generateHtmlWordCloud("nbWordCloud1", nbTrainData.top_words_per_class[targetNames[0]]);
  generateHtmlWordCloud("nbWordCloud2", nbTrainData.top_words_per_class[targetNames[1]]);
}

function generateHtmlWordCloud(containerId, words) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = "";
  
  if (!words || !words.length) {
    container.innerHTML = `<span style="color:#868e96; font-size:12px;">无词表特征数据。</span>`;
    return;
  }

  // 稍微混洗下使得排列看起来更自然随机
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  
  // 品牌色调和谐色彩调色板 (蓝色、蓝灰色、中性偏暗高雅色系)
  const colors = ["#2b5c8f", "#4a90e2", "#1b3a5b", "#27ae60", "#e67e22", "#8e44ad", "#16a085", "#2980b9", "#2c3e50", "#7f8c8d"];
  
  shuffled.forEach(w => {
    const el = document.createElement("span");
    el.textContent = w.word;
    
    // 直接使用后端已经基于权重算好分配的 score 作字号大小
    el.style.fontSize = `${w.score}px`;
    el.style.fontWeight = w.score > 28 ? "bold" : "normal";
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.cursor = "pointer";
    el.style.display = "inline-block";
    el.style.transition = "transform 0.15s ease, text-shadow 0.15s ease, background 0.15s ease";
    el.style.padding = "2px 5px";
    el.style.borderRadius = "4px";
    el.style.margin = "2px";
    el.style.lineHeight = "1";
    
    // 鼠标悬停动画微交互
    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.2) translateY(-2px)";
      el.style.textShadow = "0 3px 6px rgba(43,92,143,0.25)";
      el.style.background = "#eef4fa";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1) translateY(0)";
      el.style.textShadow = "none";
      el.style.background = "transparent";
    });
    
    // 鼠标点击更新探针并触发查询
    el.addEventListener("click", () => {
      const inp = $("nbWordProbeInput");
      if (inp) {
        inp.value = w.word;
        runNbWordProbe(w.word);
      }
    });
    
    container.appendChild(el);
  });
}

// 自动响应窗口大小变动重绘
window.addEventListener("resize", () => {
  nbCharts.forEach(ch => {
    try { ch.resize(); } catch(e) {}
  });
});

