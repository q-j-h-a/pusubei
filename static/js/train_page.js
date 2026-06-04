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
