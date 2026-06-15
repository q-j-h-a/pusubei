// Experiment test flow.

const EXPERIMENT_TEST_STATE_KEY = "experimentTestStateV1";
let freeExperimentSnapshot = null;

const EXPERIMENT_BEHAVIOR_EVENT_LIMIT = 500;

const EXPERIMENT_TEST_FLOW = [
  {
    id: "preprocess_load_leak",
    module: "数据预处理",
    title: "加载 20 Newsgroups 数据",
    page: "preprocess",
    step: "load",
    operation: "在右侧选择 sci.space 与 rec.autos 两个类别，设置最大样本数，点击【加载数据集】，观察类别分布和文本预览。",
    hint: "重点看原始文本中是否包含邮件头、签名、引用行等容易泄露类别的信息。",
    question: "如果文本分类实验没有移除 Headers、Footers 或 Quotes，朴素贝叶斯模型最可能学到什么？",
    type: "single",
    options: [
      "只学习主题词本身，泛化能力一定更强",
      "可能记住发件域名、签名和引用格式等泄露信息，导致评估虚高",
      "无法计算先验概率",
      "词袋特征会自动消除所有泄露信息"
    ],
    answer: "可能记住发件域名、签名和引用格式等泄露信息，导致评估虚高",
    explanation: "邮件头和签名可能直接暴露来源或主题。模型记住这些线索会得到漂亮的测试分数，但真实泛化能力会变差。"
  },
  {
    id: "preprocess_tokenize_clean",
    module: "数据预处理",
    title: "清洗与分词",
    page: "preprocess",
    step: "tokenize",
    operation: "执行清洗与分词，观察大小写归一、符号清理、停用词过滤后的 token 列表。",
    hint: "比较清洗前后的文本，关注 the、and、is 等高频但弱区分词是否被处理。",
    question: "在文本分类中，停用词过滤的主要作用是什么？",
    type: "single",
    options: [
      "删除所有和类别强相关的词",
      "减少高频弱区分词的干扰，让主题词贡献更清晰",
      "把文本直接转换成预测结果",
      "替代模型训练过程"
    ],
    answer: "减少高频弱区分词的干扰，让主题词贡献更清晰",
    explanation: "停用词通常在多个类别中都频繁出现，区分类别的能力弱。过滤它们可以降低噪声。"
  },
  {
    id: "preprocess_vectorize_bow",
    module: "数据预处理",
    title: "词袋向量化",
    page: "preprocess",
    step: "vectorize",
    operation: "执行特征向量化，查看词表大小、稀疏矩阵形状和样本文档的词频特征。",
    hint: "朴素贝叶斯接收的是数值矩阵，不是原始字符串。",
    question: "词袋向量化把一篇文本转换成了什么？",
    type: "single",
    options: [
      "每个词在词表中的出现次数或权重组成的向量",
      "一张图片",
      "一条线性回归直线",
      "固定长度的人工标签"
    ],
    answer: "每个词在词表中的出现次数或权重组成的向量",
    explanation: "词袋模型忽略词序，保留词项出现信息。MultinomialNB 正是基于这些计数或权重估计条件概率。"
  },
  {
    id: "preprocess_word_freq",
    module: "数据预处理",
    title: "词频特征分析",
    page: "preprocess",
    step: "word_freq",
    operation: "查看两类文本的高频词和差异词，判断哪些词更能区分 sci.space 与 rec.autos。",
    hint: "主题词在某一类中明显更常见时，通常会成为强分类线索。",
    question: "如果 engine、ford、tires 在 rec.autos 中明显更高频，它们在分类时通常会产生什么影响？",
    type: "single",
    options: [
      "提高文档被判为 rec.autos 的后验得分",
      "一定导致模型训练失败",
      "让所有类别先验概率相等",
      "直接删除 sci.space 类别"
    ],
    answer: "提高文档被判为 rec.autos 的后验得分",
    explanation: "这些词对汽车主题有更强指示性，会提高对应类别的似然贡献。"
  },
  {
    id: "preprocess_split_stratify",
    module: "数据预处理",
    title: "划分训练集与测试集",
    page: "preprocess",
    step: "split",
    operation: "执行训练/测试集划分，观察训练集、测试集的类别比例是否接近原始数据。",
    hint: "分类任务中，分层抽样可以降低某一类在测试集中比例异常的风险。",
    question: "为什么二分类数据划分时通常要保持类别比例接近？",
    type: "single",
    options: [
      "为了让评估集更能代表原始分类任务",
      "为了让模型只学习一个类别",
      "为了跳过向量化",
      "为了让词表大小变成 0"
    ],
    answer: "为了让评估集更能代表原始分类任务",
    explanation: "如果测试集类别比例严重偏移，准确率、召回率等指标会失真。"
  },
  {
    id: "train_alpha_config",
    module: "模型训练",
    title: "配置并训练朴素贝叶斯",
    page: "train_eval",
    step: "nb_train",
    operation: "选择 MultinomialNB，设置平滑系数 α，点击【开始训练】，观察训练集与测试集准确率。",
    hint: "α 控制拉普拉斯平滑强度，用来缓解未见词导致的零概率问题。",
    question: "拉普拉斯平滑 α 的核心作用是什么？",
    type: "single",
    options: [
      "让未在某类出现过的词仍然拥有非零概率",
      "把所有文本变成同一个类别",
      "删除测试集",
      "把分类任务改成回归任务"
    ],
    answer: "让未在某类出现过的词仍然拥有非零概率",
    explanation: "没有平滑时，某个词在某类中频数为 0 会让连乘概率归零。平滑给每个词一个极小的概率底座。"
  },
  {
    id: "train_confusion_matrix",
    module: "模型训练",
    title: "阅读混淆矩阵",
    page: "train_eval",
    step: "nb_train",
    operation: "训练完成后查看混淆矩阵，比较每个类别的正确分类和误分类数量。",
    hint: "混淆矩阵的行表示真实类别，列表示预测类别。",
    question: "混淆矩阵中某一行的非对角线数量表示什么？",
    type: "single",
    options: [
      "该真实类别被模型错分到其他类别的样本数",
      "该类别的先验概率一定为 0",
      "词表中的总词数",
      "模型训练轮数"
    ],
    answer: "该真实类别被模型错分到其他类别的样本数",
    explanation: "对角线是预测正确，非对角线是该真实类别被误判成其他类别。"
  },
  {
    id: "train_conditional_prob",
    module: "模型训练",
    title: "理解条件概率",
    page: "train_eval",
    step: "nb_prob",
    operation: "进入概率学习，查询 space、engine 等词，比较它们在两个类别下的 P(word|class)。",
    hint: "同一个词在不同类别下的条件概率差异越明显，分类贡献通常越强。",
    question: "朴素贝叶斯中的 P(word|class) 表示什么？",
    type: "single",
    options: [
      "在给定类别下看到某个词的概率",
      "某个类别的样本总数",
      "测试集准确率",
      "页面渲染耗时"
    ],
    answer: "在给定类别下看到某个词的概率",
    explanation: "条件概率描述词与类别的关联强度，是朴素贝叶斯计算文档后验得分的关键组成。"
  },
  {
    id: "train_decision_deduction",
    module: "模型训练",
    title: "查看决策推演",
    page: "train_eval",
    step: "nb_predict",
    operation: "随机抽取测试样本，观察原文、高亮贡献词、后验概率柱状图和 log 得分拆解。",
    hint: "分类结果来自先验项和各个词条件概率贡献的累加。",
    question: "为什么页面用 log P(c) + Σ log P(w|c) 展示推演？",
    type: "single",
    options: [
      "为了把很多小概率的连乘转换成更稳定的加法计算",
      "为了隐藏真实预测结果",
      "为了强制两个类别概率相等",
      "为了替代文本清洗"
    ],
    answer: "为了把很多小概率的连乘转换成更稳定的加法计算",
    explanation: "概率连乘容易数值下溢，取对数后可以转成求和，计算更稳定，也更容易解释每个词的贡献。"
  },
  {
    id: "evaluate_threshold",
    module: "模型评估",
    title: "调整分类阈值",
    page: "evaluate",
    step: "threshold",
    operation: "拖动评估页阈值滑块，观察混淆矩阵、Precision、Recall 和 F1 的变化。",
    hint: "当前阈值控制的是判为概率列对应正类的严格程度。",
    question: "提高正类判定阈值通常会带来什么变化？",
    type: "single",
    options: [
      "判为正类更严格，Precision 通常上升，Recall 通常下降",
      "所有指标都必然变成 100%",
      "训练集样本会自动增加",
      "词袋向量会被删除"
    ],
    answer: "判为正类更严格，Precision 通常上升，Recall 通常下降",
    explanation: "阈值越高，模型越谨慎地判为正类。误报会减少，但漏报可能增加。"
  },
  {
    id: "evaluate_metric_choice",
    module: "模型评估",
    title: "理解分类指标",
    page: "evaluate",
    step: "metrics",
    operation: "结合动态混淆矩阵阅读 Accuracy、Precision、Recall 和 F1，判断单看准确率是否足够。",
    hint: "Precision 关注判为正类的样本有多少是真的，Recall 关注真实正类有多少被找出来。",
    question: "F1 值主要综合了哪两个指标？",
    type: "single",
    options: [
      "Precision 和 Recall",
      "RMSE 和 MAE",
      "学习率和训练轮数",
      "样本编号和页面宽度"
    ],
    answer: "Precision 和 Recall",
    explanation: "F1 是 Precision 与 Recall 的调和平均，适合观察两者的综合平衡。"
  },
  {
    id: "predict_custom_text",
    module: "模型预测",
    title: "输入文本并解释预测",
    page: "predict",
    step: "predict",
    operation: "在预测页选择预设样本或输入自定义文本，查看预测类别、置信度、贡献词和拔河决策天平。",
    hint: "观察贡献词是否符合对应类别主题，而不只看最终标签。",
    question: "预测页中贡献词列表最适合用来判断什么？",
    type: "single",
    options: [
      "模型为什么倾向某个类别",
      "浏览器窗口高度",
      "训练按钮是否存在",
      "CSV 是否包含 MEDV"
    ],
    answer: "模型为什么倾向某个类别",
    explanation: "贡献词展示了哪些词把后验得分推向某个类别，是解释文本分类结果的重要依据。"
  }
];

function defaultExperimentTestState() {
  return {
    active: false,
    started: false,
    finished: false,
    currentIndex: 0,
    score: 0,
    pendingFeedbackId: null,
    answers: {},
    records: [],
    behavior: null,
    locked: true
  };
}

function getExperimentTestState() {
  const saved = viewStateStore[EXPERIMENT_TEST_STATE_KEY];
  return { ...defaultExperimentTestState(), ...(saved || {}) };
}

function setExperimentTestState(next) {
  viewStateStore[EXPERIMENT_TEST_STATE_KEY] = { ...defaultExperimentTestState(), ...next };
  updateExperimentTestNavState();
  injectExperimentTestEntryButton();
  window.dispatchEvent(new CustomEvent("experiment-test-state-change", {
    detail: { state: getExperimentTestState() }
  }));
}

function cloneExperimentSnapshotValue(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return value;
  }
}

function captureFreeExperimentSnapshot() {
  freeExperimentSnapshot = {
    viewState: Object.fromEntries(
      Object.entries(viewStateStore)
        .filter(([key]) => key !== EXPERIMENT_TEST_STATE_KEY)
        .map(([key, value]) => [key, cloneExperimentSnapshotValue(value)])
    ),
    globals: {
      activePreprocessStep,
      preprocessProgressStep,
      activeTrainStep,
      trainProgressStep,
      currentFrame,
      currentDatasetMeta: cloneExperimentSnapshotValue(currentDatasetMeta),
      dataCache: cloneExperimentSnapshotValue(dataCache),
      dataChartDataCache: cloneExperimentSnapshotValue(dataChartDataCache),
      trainData: cloneExperimentSnapshotValue(trainData),
      trainCompareData: cloneExperimentSnapshotValue(trainCompareData),
      trainChartDataCache: cloneExperimentSnapshotValue(trainChartDataCache),
      trainCompareViewsKey,
      trainCompareEntered,
      trainLossViewsKey,
      trainOptimizationViewsKey,
      trainCustomViewsKey,
      trainRenderViewsKey,
      predictData: cloneExperimentSnapshotValue(predictData),
      predictChartDataCache: cloneExperimentSnapshotValue(predictChartDataCache),
      predictRawScatterData: cloneExperimentSnapshotValue(predictRawScatterData),
      predictRawScatterKey,
      predictRenderViewsKey,
      evaluateChartDataCache: cloneExperimentSnapshotValue(evaluateChartDataCache),
      evaluateRenderViewsKey,
    },
  };
}

function restoreFreeExperimentSnapshot() {
  if (!freeExperimentSnapshot) return;
  const testState = viewStateStore[EXPERIMENT_TEST_STATE_KEY];
  Object.keys(viewStateStore).forEach(key => {
    if (key !== EXPERIMENT_TEST_STATE_KEY) delete viewStateStore[key];
  });
  Object.assign(viewStateStore, cloneExperimentSnapshotValue(freeExperimentSnapshot.viewState));
  if (testState) viewStateStore[EXPERIMENT_TEST_STATE_KEY] = testState;

  const globals = freeExperimentSnapshot.globals || {};
  activePreprocessStep = globals.activePreprocessStep || "load";
  preprocessProgressStep = globals.preprocessProgressStep || activePreprocessStep;
  activeTrainStep = globals.activeTrainStep || "process";
  trainProgressStep = globals.trainProgressStep || activeTrainStep;
  currentFrame = Number(globals.currentFrame || 0);
  currentDatasetMeta = cloneExperimentSnapshotValue(globals.currentDatasetMeta) || null;
  dataCache = cloneExperimentSnapshotValue(globals.dataCache) || null;
  dataChartDataCache = cloneExperimentSnapshotValue(globals.dataChartDataCache) || {};
  trainData = cloneExperimentSnapshotValue(globals.trainData) || null;
  trainCompareData = cloneExperimentSnapshotValue(globals.trainCompareData) || null;
  trainChartDataCache = cloneExperimentSnapshotValue(globals.trainChartDataCache) || {};
  trainCompareViewsKey = globals.trainCompareViewsKey || "";
  trainCompareEntered = Boolean(globals.trainCompareEntered);
  trainLossViewsKey = globals.trainLossViewsKey || "";
  trainOptimizationViewsKey = globals.trainOptimizationViewsKey || "";
  trainCustomViewsKey = globals.trainCustomViewsKey || "";
  trainRenderViewsKey = globals.trainRenderViewsKey || "";
  predictData = cloneExperimentSnapshotValue(globals.predictData) || null;
  predictChartDataCache = cloneExperimentSnapshotValue(globals.predictChartDataCache) || {};
  predictRawScatterData = cloneExperimentSnapshotValue(globals.predictRawScatterData) || null;
  predictRawScatterKey = globals.predictRawScatterKey || "";
  predictRenderViewsKey = globals.predictRenderViewsKey || "";
  evaluateChartDataCache = cloneExperimentSnapshotValue(globals.evaluateChartDataCache) || {};
  evaluateRenderViewsKey = globals.evaluateRenderViewsKey || "";
  freeExperimentSnapshot = null;
}

function isExperimentTestActive() {
  const state = getExperimentTestState();
  return Boolean(state.active && state.started && !state.finished);
}

function experimentBehaviorSessionId() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function experimentBehaviorStepKey(node) {
  if (!node) return "";
  return `${node.page}:${node.step}`;
}

function createExperimentBehaviorSession() {
  const now = Date.now();
  return {
    version: 1,
    sessionId: experimentBehaviorSessionId(),
    startTime: now,
    endTime: null,
    currentStepKey: "",
    currentStepStartedAt: null,
    totalDurationMs: 0,
    moduleDurations: {},
    stepDurations: {},
    actionCounts: {},
    stepActions: {},
    events: [],
    flags: []
  };
}

function cloneExperimentBehavior(behavior) {
  return behavior ? cloneExperimentSnapshotValue(behavior) : createExperimentBehaviorSession();
}

function experimentBehaviorEventContext() {
  const node = currentExperimentTestNode();
  return {
    module: node?.module || "",
    page: node?.page || currentPage || "",
    step: node?.step || "",
    title: node?.title || "",
    stepKey: experimentBehaviorStepKey(node)
  };
}

function setExperimentBehavior(behavior) {
  const state = getExperimentTestState();
  viewStateStore[EXPERIMENT_TEST_STATE_KEY] = { ...state, behavior };
}

function recordExperimentBehavior(action, payload = {}) {
  if (!isExperimentTestActive() || !action) return;
  const state = getExperimentTestState();
  const behavior = cloneExperimentBehavior(state.behavior);
  const context = experimentBehaviorEventContext();
  const event = {
    time: Date.now(),
    action,
    module: context.module,
    page: context.page,
    step: context.step,
    title: context.title,
    payload
  };
  behavior.actionCounts[action] = (behavior.actionCounts[action] || 0) + 1;
  const stepKey = context.stepKey || "unknown";
  behavior.stepActions[stepKey] = behavior.stepActions[stepKey] || {};
  behavior.stepActions[stepKey][action] = (behavior.stepActions[stepKey][action] || 0) + 1;
  behavior.events.push(event);
  if (behavior.events.length > EXPERIMENT_BEHAVIOR_EVENT_LIMIT) {
    behavior.events = behavior.events.slice(-EXPERIMENT_BEHAVIOR_EVENT_LIMIT);
  }
  setExperimentBehavior(behavior);
}

function finalizeExperimentBehaviorStep(behavior = null, at = Date.now()) {
  const next = cloneExperimentBehavior(behavior || getExperimentTestState().behavior);
  if (!next.currentStepKey || !next.currentStepStartedAt) return next;
  const duration = Math.max(0, at - next.currentStepStartedAt);
  const node = EXPERIMENT_TEST_FLOW.find(item => experimentBehaviorStepKey(item) === next.currentStepKey);
  next.stepDurations[next.currentStepKey] = (next.stepDurations[next.currentStepKey] || 0) + duration;
  if (node?.module) next.moduleDurations[node.module] = (next.moduleDurations[node.module] || 0) + duration;
  next.currentStepStartedAt = null;
  return next;
}

function enterExperimentBehaviorStep(index) {
  const node = EXPERIMENT_TEST_FLOW[index];
  if (!node) return;
  const state = getExperimentTestState();
  if (!state.active || !state.started || state.finished) return;
  const at = Date.now();
  let behavior = cloneExperimentBehavior(state.behavior);
  const nextStepKey = experimentBehaviorStepKey(node);
  if (behavior.currentStepKey && behavior.currentStepKey !== nextStepKey) {
    behavior = finalizeExperimentBehaviorStep(behavior, at);
  }
  behavior.currentStepKey = nextStepKey;
  behavior.currentStepStartedAt = at;
  behavior.events.push({
    time: at,
    action: "enter_step",
    module: node.module,
    page: node.page,
    step: node.step,
    title: node.title,
    payload: { index }
  });
  if (behavior.events.length > EXPERIMENT_BEHAVIOR_EVENT_LIMIT) {
    behavior.events = behavior.events.slice(-EXPERIMENT_BEHAVIOR_EVENT_LIMIT);
  }
  setExperimentBehavior(behavior);
}

function finishExperimentBehaviorSession(state) {
  const at = Date.now();
  let behavior = finalizeExperimentBehaviorStep(state.behavior, at);
  behavior.endTime = at;
  behavior.totalDurationMs = Math.max(0, at - (behavior.startTime || at));
  behavior.flags = experimentBehaviorFlags(behavior, state.records || []);
  return { ...state, behavior };
}

function behaviorHasAnyStepAction(behavior, stepKey, actions) {
  const stepActions = behavior.stepActions?.[stepKey] || {};
  return actions.some(action => Number(stepActions[action] || 0) > 0);
}

function experimentBehaviorFlags(behavior, records = []) {
  const flags = [];
  const totalMs = behavior.totalDurationMs || 0;
  if (totalMs > 0 && totalMs < 3 * 60 * 1000) flags.push("总用时较短，建议结合答题结果复核。");
  Object.entries(behavior.moduleDurations || {}).forEach(([module, duration]) => {
    if (duration < 15 * 1000) flags.push(`${module}模块停留时间较短。`);
  });
  Object.entries(behavior.stepDurations || {}).forEach(([stepKey, duration]) => {
    if (duration < 5 * 1000) flags.push(`${experimentStepLabel(stepKey)}完成较快。`);
  });
  EXPERIMENT_TEST_FLOW.forEach(node => {
    const stepKey = experimentBehaviorStepKey(node);
    if (!behavior.stepDurations?.[stepKey]) return;
    if (node.page === "train_eval" && !behaviorHasAnyStepAction(behavior, stepKey, ["train_step", "train_auto"])) {
      flags.push(`${node.title}缺少训练操作记录。`);
    }
    if (node.page === "predict" && !behaviorHasAnyStepAction(behavior, stepKey, ["predict_run", "predict_enter_run"])) {
      flags.push(`${node.title}缺少预测操作记录。`);
    }
    if (node.page === "preprocess" && node.step === "load" && !behaviorHasAnyStepAction(behavior, stepKey, ["load_dataset"])) {
      flags.push("加载原始数据步骤缺少加载数据集记录。");
    }
    if (node.page === "evaluate" && !behaviorHasAnyStepAction(behavior, stepKey, ["metric_switch", "view_task_hint"])) {
      flags.push("模型评估步骤缺少指标切换或任务查看记录。");
    }
  });
  const totalActions = Object.values(behavior.actionCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const correctCount = records.filter(item => item.correct).length;
  if (correctCount >= Math.max(1, records.length - 1) && totalActions < records.length) {
    flags.push("答题正确率较高，但关键操作记录偏少。");
  }
  return [...new Set(flags)];
}

function experimentStepLabel(stepKey) {
  const node = EXPERIMENT_TEST_FLOW.find(item => experimentBehaviorStepKey(item) === stepKey);
  return node ? `${node.module}-${node.title}` : stepKey;
}

function formatBehaviorDuration(ms) {
  const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}分${rest}秒` : `${rest}秒`;
}

function experimentBehaviorActionLabel(action) {
  return ({
    enter_step: "进入小模块",
    view_task_hint: "查看测试内容",
    load_dataset: "加载数据集",
    step_tab_click: "点击步骤",
    view_code: "查看代码",
    feature_change: "切换特征",
    train_data_mode_change: "切换训练数据模式",
    parameter_adjust: "调整参数",
    train_step: "单步训练",
    train_auto: "自动演示",
    train_pause: "暂停训练",
    train_reset: "重置训练",
    metric_switch: "切换指标",
    loss_residual_view: "切换残差视图",
    loss_overall_view: "切换误差分布视图",
    optimization_view: "切换优化图表",
    chart_view_change: "切换图表显示",
    predict_input_mode_change: "切换预测输入类型",
    predict_input: "输入预测值",
    predict_run: "开始预测",
    predict_enter_run: "回车预测",
    submit_answer: "提交答案",
    answer_missing: "漏选提示"
  })[action] || action;
}

function experimentStepActionDetailHtml(stepActions = {}) {
  const entries = Object.entries(stepActions)
    .filter(([, count]) => Number(count || 0) > 0)
    .sort(([left], [right]) => experimentBehaviorActionLabel(left).localeCompare(experimentBehaviorActionLabel(right), "zh-Hans-CN"));
  if (!entries.length) return `<div class="test-step-action-empty">暂无关键事件</div>`;
  return `<div class="test-step-action-list">${entries.map(([action, count]) => `
    <span>${escapeHtml(experimentBehaviorActionLabel(action))}：${Number(count || 0)} 次</span>
  `).join("")}</div>`;
}

function experimentBehaviorReportHtml(behavior) {
  if (!behavior) return "";
  const moduleHtml = Object.entries(behavior.moduleDurations || {}).map(([module, duration]) => `
    <div class="test-score-card"><span>${escapeHtml(module)}</span><strong>${formatBehaviorDuration(duration)}</strong></div>
  `).join("") || `<div class="test-score-card"><span>模块用时</span><strong>暂无记录</strong></div>`;
  const keyActions = [
    ["view_task_hint", "查看测试内容"],
    ["load_dataset", "加载数据集"],
    ["view_code", "查看代码"],
    ["feature_change", "切换特征"],
    ["parameter_adjust", "调整参数"],
    ["train_step", "单步训练"],
    ["train_auto", "自动演示"],
    ["metric_switch", "切换指标"],
    ["predict_input", "输入预测值"],
    ["predict_run", "开始预测"]
  ];
  const actionHtml = keyActions.map(([key, label]) => `
    <div class="test-answer-row"><span>${escapeHtml(label)}</span><strong>${Number(behavior.actionCounts?.[key] || 0)}</strong></div>
  `).join("");
  const stepHtml = Object.entries(behavior.stepDurations || {}).map(([stepKey, duration]) => {
    const stepActions = behavior.stepActions?.[stepKey] || {};
    const actions = Object.values(stepActions).reduce((sum, value) => sum + Number(value || 0), 0);
    return `<div class="test-step-action-card">
      <div class="test-answer-row"><span>${escapeHtml(experimentStepLabel(stepKey))}</span><strong>${formatBehaviorDuration(duration)} / ${actions} 次操作</strong></div>
      ${experimentStepActionDetailHtml(stepActions)}
    </div>`;
  }).join("");
  const flags = behavior.flags || [];
  const flagHtml = flags.length
    ? flags.map(flag => `<li>${escapeHtml(flag)}</li>`).join("")
    : `<li>未发现明显学习过程异常。</li>`;
  return `
    <h3>学习过程证据</h3>
    <div class="test-rule-box">
      <strong>本次测试会话</strong>
      <p>总用时：${formatBehaviorDuration(behavior.totalDurationMs)}；记录关键事件 ${behavior.events?.length || 0} 条。以下提示用于辅助教师复核，不直接判定作弊。</p>
    </div>
    <div class="test-score-grid">${moduleHtml}</div>
    <div class="test-record-list">
      <article class="test-record-card">
        <div class="test-record-head"><strong>关键行为计数</strong><span>过程摘要</span></div>
        ${actionHtml}
      </article>
      <article class="test-record-card">
        <div class="test-record-head"><strong>小模块事件明细</strong><span>时间 / 操作明细</span></div>
        ${stepHtml || `<div class="test-answer-row"><span>暂无小模块记录</span><strong>--</strong></div>`}
      </article>
      <article class="test-record-card">
        <div class="test-record-head"><strong>过程提示</strong><span>${flags.length ? "需复核" : "正常"}</span></div>
        <div class="test-explain"><ul>${flagHtml}</ul></div>
      </article>
    </div>`;
}

function currentExperimentTestNode() {
  const state = getExperimentTestState();
  return EXPERIMENT_TEST_FLOW[Math.min(state.currentIndex, EXPERIMENT_TEST_FLOW.length - 1)] || null;
}

function currentExperimentTestGroup() {
  const state = getExperimentTestState();
  const first = currentExperimentTestNode();
  if (!first) return [];
  const group = [];
  for (let i = state.currentIndex; i < EXPERIMENT_TEST_FLOW.length; i += 1) {
    const item = EXPERIMENT_TEST_FLOW[i];
    if (item.page !== first.page || item.step !== first.step) break;
    group.push({ ...item, index: i });
  }
  return group;
}

function currentPracticeTestGroup() {
  if (!["preprocess", "train_eval", "evaluate", "predict"].includes(currentPage)) return [];
  const step = currentPage === "preprocess"
    ? activePreprocessStep
    : currentPage === "train_eval"
      ? activeTrainStep
      : currentPage === "evaluate"
        ? "metrics"
        : "predict";
  return EXPERIMENT_TEST_FLOW
    .map((item, index) => ({ ...item, index }))
    .filter(item => item.page === currentPage && item.step === step);
}

function experimentTestButtonHtml({ practice = false } = {}) {
  if (!practice && !isExperimentTestActive()) return "";
  return `
    <button class="test-task-btn" type="button" ${practice ? "data-practice-test-open" : "data-test-open"}>查看测试内容</button>
  `;
}

function injectExperimentTestEntryButton() {
  if (!["preprocess", "train_eval", "evaluate", "predict"].includes(currentPage)) return;
  const panel = $("rightPanel");
  const card = Array.from(panel?.querySelectorAll(".control-card") || [])
    .find(item => !item.classList.contains("guide-control-card"));
  const title = card?.querySelector("h3");
  if (!card || !title || card.querySelector("[data-test-open], [data-practice-test-open]")) return;
  const practice = !isExperimentTestActive();
  if (practice && !currentPracticeTestGroup().length) return;
  title.insertAdjacentHTML("afterend", experimentTestButtonHtml({ practice }));
  if (typeof updatePreprocessLoadGuide === "function") updatePreprocessLoadGuide();
}

function startExperimentTest() {
  closeInterfaceGuidesForExperimentTest();
  captureFreeExperimentSnapshot();
  resetExperimentPagesForTest();
  setExperimentTestState({
    active: true,
    started: true,
    finished: false,
    currentIndex: 0,
    score: 0,
    pendingFeedbackId: null,
    answers: {},
    records: [],
    behavior: createExperimentBehaviorSession(),
    locked: true
  });
  goToExperimentTestNode(0);
}

function closeInterfaceGuidesForExperimentTest() {
  document.querySelectorAll(".guide-backdrop, .guide-focus-ring, .guide-popover").forEach(item => item.remove());
  document.querySelectorAll(".guide-highlight, .guide-highlight-large").forEach(item => {
    item.classList.remove("guide-highlight", "guide-highlight-large");
  });
  if (typeof closePreprocessCodeDrawer === "function") closePreprocessCodeDrawer();
}

function resetExperimentPagesForTest() {
  stopAuto?.();
  destroyDataGrid?.();
  disposeCharts?.();

  activePreprocessStep = "load";
  preprocessProgressStep = "load";
  activeTrainStep = "process";
  trainProgressStep = "process";
  currentFrame = 0;

  dataCache = null;
  dataChartDataCache = {};
  currentDatasetMeta = null;
  trainData = null;
  trainCompareData = null;
  trainChartDataCache = {};
  trainCompareViewsKey = "";
  trainCompareEntered = false;
  trainLossViewsKey = "";
  trainOptimizationViewsKey = "";
  trainCustomViewsKey = "";
  trainRenderViewsKey = "";
  predictData = null;
  predictChartDataCache = {};
  predictRawScatterData = null;
  predictRawScatterKey = "";
  predictRenderViewsKey = "";
  evaluateChartDataCache = {};
  evaluateRenderViewsKey = "";

  [
    "currentDatasetMetaV1",
    "preprocessFormStateV1",
    "rawVizFormStateV1",
    "standardizeFormStateV1",
    "standardVizFormStateV1",
    "preprocessSelectedViewsV1",
    "rawVizSelectedViewsV1",
    "standardVizSelectedViewsV1",
    "activePreprocessStepV1",
    "preprocessProgressStepV1",
    "trainFormStateV1",
    "trainFormStateByStepV1",
    "trainSelectedViewsV1",
    "trainCompareViewsV1",
    "activeTrainStepV1",
    "trainProgressStepV1",
    "evaluateMetricModeV1",
    "evaluateSelectedViewsV1",
    "activeNbTrainStep",
    "nbTrainProgressStep",
    "predictFormStateV1",
    "predictSelectedViewsV2"
  ].forEach(key => {
    delete viewStateStore[key];
  });

  viewStateStore.activePreprocessStepV1 = "load";
  viewStateStore.preprocessProgressStepV1 = "load";
  viewStateStore.activeTrainStepV1 = "process";
  viewStateStore.trainProgressStepV1 = "process";
  viewStateStore.activeNbTrainStep = "nb_train";
  viewStateStore.nbTrainProgressStep = "nb_train";
  if (typeof activeNbTrainStep !== "undefined") activeNbTrainStep = "nb_train";
  if (typeof nbTrainProgressStep !== "undefined") nbTrainProgressStep = "nb_train";
  if (typeof nbTrainData !== "undefined") nbTrainData = null;
  if (typeof nbProbeData !== "undefined") nbProbeData = null;
  if (typeof nbPredictData !== "undefined") nbPredictData = null;
  viewStateStore.evaluateMetricModeV1 = "accuracy";
  viewStateStore.predictFormStateV1 = {
    predictInput: "The engine and tires need repair before the race.",
    predictInputMode: "custom"
  };
}

function restartExperimentTest() {
  startExperimentTest();
}

function exitExperimentTest() {
  setExperimentTestState(defaultExperimentTestState());
  restoreFreeExperimentSnapshot();
  setPage("preprocess");
}

function finishExperimentTest() {
  const state = getExperimentTestState();
  setExperimentTestState(finishExperimentBehaviorSession({
    ...state,
    active: false,
    finished: true,
    locked: false
  }));
  restoreFreeExperimentSnapshot();
  setPage("experiment_test");
}

function goToExperimentTestNode(index) {
  const node = EXPERIMENT_TEST_FLOW[index];
  if (!node) {
    finishExperimentTest();
    return;
  }
  const state = getExperimentTestState();
  setExperimentTestState({ ...state, currentIndex: index, active: true, started: true, finished: false, pendingFeedbackId: null });
  if (node.page === "preprocess") {
    activePreprocessStep = node.step;
    viewStateStore.activePreprocessStepV1 = node.step;
    markPreprocessProgress?.(node.step);
  }
  if (node.page === "train_eval") {
    stopAuto?.();
    if (String(node.step || "").startsWith("nb_")) {
      if (typeof activeNbTrainStep !== "undefined") activeNbTrainStep = node.step;
      viewStateStore.activeNbTrainStep = node.step;
      if (typeof nbTrainProgressStep !== "undefined") {
        const order = ["nb_train", "nb_prob", "nb_predict"];
        const currentIdx = order.indexOf(node.step);
        const progressIdx = order.indexOf(nbTrainProgressStep);
        if (currentIdx > progressIdx) nbTrainProgressStep = node.step;
        viewStateStore.nbTrainProgressStep = nbTrainProgressStep;
      }
    } else {
      activeTrainStep = node.step;
      viewStateStore.activeTrainStepV1 = node.step;
      markTrainProgress?.(node.step);
    }
  }
  enterExperimentBehaviorStep(index);
  setPage(node.page);
}

function renderExperimentTestPage() {
  document.querySelector(".shell").classList.remove("theory");
  clearPageTopSlot();
  const state = getExperimentTestState();
  const inProgress = state.active && state.started && !state.finished;
  $("rightPanel").innerHTML = `
    <div class="right-title">实验测试</div>
    <div class="control-card dataset-load-card">
      <h3>${state.finished ? "测试已完成" : inProgress ? "测试进行中" : "实验测试"}</h3>
      <div class="test-side-actions">
        ${state.finished ? `<button class="primary-btn" type="button" data-test-restart>重新开始测试</button>` : inProgress ? `<button class="primary-btn" type="button" data-test-continue-current>继续当前题</button>
        <button class="secondary-btn" type="button" data-test-exit>退出实验测试</button>` : `<button class="primary-btn" type="button" data-test-start>开始实验测试</button>`}
      </div>
    </div>`;
  $("main").innerHTML = state.finished ? experimentTestResultHtml(state) : inProgress ? experimentTestProgressHtml(state) : experimentTestIntroHtml();
}

function experimentTestIntroHtml() {
  return `
    <section class="content-card test-page-card">
      <div class="eyebrow">实验测试</div>
      <h2>按完整实验流程完成一次测试</h2>
      <p>本测试将依次覆盖数据预处理、模型训练、模型评估和模型预测。每个节点需要先查看当前任务提示，再回到原实验页面完成观察或操作。</p>
      <div class="test-flow-grid">
        <div><strong>1. 数据预处理</strong><span>加载、清洗分词、向量化、词频、划分</span></div>
        <div><strong>2. 模型训练</strong><span>训练、混淆矩阵、条件概率、决策推演</span></div>
        <div><strong>3. 模型评估</strong><span>阈值、Accuracy、Precision、Recall、F1</span></div>
        <div><strong>4. 模型预测</strong><span>输入文本并解释分类结果</span></div>
      </div>
      <div class="test-rule-box">
        <strong>测试规则</strong>
        <p>提交当前题后才能进入下一题。测试过程中左侧实验导航和顶部步骤条会锁定，系统会自动推进流程。</p>
      </div>
    </section>`;
}

function experimentTestResultHtml(state) {
  const records = state.records || [];
  const moduleScores = records.reduce((acc, item) => {
    acc[item.module] = acc[item.module] || { score: 0, total: 0 };
    acc[item.module].score += item.correct ? 1 : 0;
    acc[item.module].total += 1;
    return acc;
  }, {});
  const moduleHtml = Object.entries(moduleScores).map(([module, item]) => `
    <div class="test-score-card"><span>${escapeHtml(module)}</span><strong>${item.score} / ${item.total}</strong></div>
  `).join("");
  const recordHtml = records.map((item, index) => `
    <article class="test-record-card ${item.correct ? "correct" : "wrong"}">
      <div class="test-record-head">
        <strong>题目 ${index + 1}：${escapeHtml(item.title)}</strong>
        <span>${item.correct ? "正确" : "错误"}</span>
      </div>
      <p>${escapeHtml(item.question)}</p>
      <div class="test-answer-row"><span>你的答案</span><strong>${escapeHtml(item.userAnswer || "未作答")}</strong></div>
      <div class="test-answer-row"><span>正确答案</span><strong>${escapeHtml(item.correctAnswer)}</strong></div>
      <div class="test-explain">${escapeHtml(item.explanation)}</div>
    </article>
  `).join("");
  return `
    <section class="content-card test-page-card">
      <div class="eyebrow">实验测试结果</div>
      <h2>总成绩：${state.score} / ${EXPERIMENT_TEST_FLOW.length}</h2>
      <div class="test-score-grid">${moduleHtml}</div>
      ${experimentBehaviorReportHtml(state.behavior)}
      <h3>答题详情</h3>
      <div class="test-record-list">${recordHtml}</div>
    </section>`;
}

function experimentTestProgressHtml(state) {
  const node = currentExperimentTestNode();
  return `
    <section class="content-card test-page-card">
      <div class="eyebrow">实验测试进行中</div>
      <h2>第 ${state.currentIndex + 1} / ${EXPERIMENT_TEST_FLOW.length} 题：${escapeHtml(node?.title || "")}</h2>
      <p>当前模块：${escapeHtml(node?.module || "")}。请回到系统指定的实验页面，点击右侧“查看测试内容”了解本页任务，再完成观察或操作。</p>
      <div class="test-rule-box">
        <strong>当前操作要求</strong>
        <p>${escapeHtml(node?.operation || "")}</p>
      </div>
    </section>`;
}

function openExperimentTestModal() {
  const group = currentExperimentTestGroup();
  if (!group.length) return;
  document.querySelector(".test-modal-backdrop")?.remove();
  document.body.insertAdjacentHTML("beforeend", experimentTestModalHtml(group));
  restoreExperimentTestModalState(group);
}

function openPracticeTestModal() {
  const group = currentPracticeTestGroup();
  if (!group.length) return;
  document.querySelector(".test-modal-backdrop")?.remove();
  document.body.insertAdjacentHTML("beforeend", experimentTestModalHtml(group, { practice: true }));
}

function openCurrentPracticeTestAfterGuide(delay = 80) {
  setTimeout(() => {
    if (document.querySelector(".test-modal-backdrop")) return;
    const practiceOpen = document.querySelector("[data-practice-test-open]");
    const testOpen = document.querySelector("[data-test-open]");
    if (practiceOpen) {
      openPracticeTestModal();
    } else if (testOpen) {
      openExperimentTestModal();
    }
  }, delay);
}

function experimentTestModalHtml(group, options = {}) {
  const practice = Boolean(options.practice);
  const state = getExperimentTestState();
  const first = group[0];
  const questionHtml = experimentTestQuestionHtml(group, { practice });
  const actionHtml = practice
    ? `<button class="primary-btn" type="button" data-test-close>我知道了</button>`
    : `<button class="primary-btn" type="button" data-test-submit>提交答案</button>`;
  return `
    <div class="test-modal-backdrop">
      <section class="test-modal" role="dialog" aria-modal="true" aria-label="实验测试题目">
        <div class="test-modal-head">
          <div>
            <div class="code-kicker">${practice ? "任务提示" : `实验任务 ${state.currentIndex + 1}${group.length > 1 ? `-${state.currentIndex + group.length}` : ""} / ${EXPERIMENT_TEST_FLOW.length}`}</div>
            <h2>${escapeHtml(first.title)}</h2>
          </div>
          <button class="code-close-btn" type="button" data-test-close>×</button>
        </div>
        <div class="test-meta">
          <span>当前模块：${escapeHtml(first.module)}</span>
          <span>当前步骤：${escapeHtml(first.title)}</span>
        </div>
        <div class="test-section">
          <span>一、操作要求</span>
          <p>${escapeHtml(first.operation)}</p>
        </div>
        <div class="test-section">
          <span>二、观察问题</span>
          ${questionHtml}
        </div>
        <div class="test-modal-actions">${actionHtml}</div>
      </section>
    </div>`;
}

function experimentTestQuestionHtml(group, options = {}) {
  const practice = Boolean(options.practice);
  if (group.length === 1) {
    const node = group[0];
    const optionHtml = experimentTestOptionHtml(node, { practice });
    return `
      <p>${escapeHtml(node.question)}</p>
      <div class="test-options" data-test-question-id="${escapeHtml(node.id)}">${optionHtml}</div>
      <div class="test-feedback" data-test-feedback="${escapeHtml(node.id)}" hidden></div>`;
  }
  return `<div class="test-question-list">${group.map((node, questionIndex) => `
    <div class="test-question-card" data-test-question-id="${escapeHtml(node.id)}">
      <span>问题 ${questionIndex + 1}</span>
      <p>${escapeHtml(node.question)}</p>
      <div class="test-options">${experimentTestOptionHtml(node, { practice })}</div>
      <div class="test-feedback" data-test-feedback="${escapeHtml(node.id)}" hidden></div>
    </div>
  `).join("")}</div>`;
}

function experimentTestOptionHtml(node, options = {}) {
  const practice = Boolean(options.practice);
  return (node.options || []).map((option, index) => `
    <label class="test-option ${practice ? "test-option-readonly" : "test-option-selectable"}" ${practice ? `aria-disabled="true"` : ""}>
      ${practice
        ? `<span class="test-option-marker" aria-hidden="true"></span>`
        : `<input class="test-option-input" type="radio" name="testAnswer_${escapeHtml(node.id)}" value="${escapeHtml(option)}">`}
      <span>${escapeHtml(String.fromCharCode(65 + index))}. ${escapeHtml(option)}</span>
    </label>
  `).join("");
}

function practiceTestRecords(group) {
  return group.map(node => {
    const checked = document.querySelector(`input[name="testAnswer_${node.id}"]:checked`);
    const userAnswer = checked?.value || "";
    const correct = userAnswer === node.answer;
    return {
      id: node.id,
      module: node.module,
      title: node.title,
      question: node.question,
      userAnswer,
      correctAnswer: node.answer,
      correct,
      score: correct ? 1 : 0,
      explanation: node.explanation
    };
  });
}

function submitPracticeTestAnswer() {
  const group = currentPracticeTestGroup();
  if (!group.length) return;
  const records = practiceTestRecords(group);
  showExperimentTestSubmittedState(group, records, { practice: true });
}

function submitExperimentTestAnswer() {
  const group = currentExperimentTestGroup();
  if (!group.length) return;
  const missing = group.some(node => !document.querySelector(`input[name="testAnswer_${node.id}"]:checked`));
  if (missing) {
    recordExperimentBehavior("answer_missing", { group: group.map(item => item.id) });
    showExperimentTestToast("请先完成当前题目。");
    return;
  }
  recordExperimentBehavior("submit_answer", { group: group.map(item => item.id) });
  setExperimentBehavior(finalizeExperimentBehaviorStep());
  const state = getExperimentTestState();
  const groupIds = new Set(group.map(item => item.id));
  const records = (state.records || []).filter(item => !groupIds.has(item.id));
  const answers = { ...(state.answers || {}) };
  const newRecords = group.map(node => {
    const checked = document.querySelector(`input[name="testAnswer_${node.id}"]:checked`);
    const userAnswer = checked?.value || "";
    const correct = userAnswer === node.answer;
    answers[node.id] = userAnswer;
    return {
      id: node.id,
      module: node.module,
      title: node.title,
      question: node.question,
      userAnswer,
      correctAnswer: node.answer,
      correct,
      score: correct ? 1 : 0,
      explanation: node.explanation
    };
  });
  records.push(...newRecords);
  const nextState = {
    ...state,
    answers,
    records,
    pendingFeedbackId: null,
    score: records.reduce((sum, item) => sum + (item.correct ? 1 : 0), 0)
  };
  const isLastQuestion = state.currentIndex + group.length >= EXPERIMENT_TEST_FLOW.length;
  if (isLastQuestion) {
    const finishedState = finishExperimentBehaviorSession({
      ...nextState,
      active: false,
      finished: true,
      locked: false,
      pendingFeedbackId: null
    });
    setExperimentTestState(finishedState);
    restoreFreeExperimentSnapshot();
    showExperimentTestFinalResultModal(finishedState);
    return;
  }
  setExperimentTestState(nextState);
  continueExperimentTest();
}

function showExperimentTestFinalResultModal(state) {
  const records = state.records || [];
  const detailHtml = records.map((item, index) => `
    <div class="test-final-row ${item.correct ? "correct" : "wrong"}">
      <span>题目 ${index + 1}</span>
      <strong>${item.correct ? "正确" : "错误"}</strong>
    </div>
  `).join("");
  const backdrop = document.querySelector(".test-modal-backdrop");
  if (!backdrop) return;
  backdrop.innerHTML = `
    <section class="test-modal test-final-modal" role="dialog" aria-modal="true" aria-label="实验测试结果">
      <div class="test-modal-head">
        <div>
          <div class="code-kicker">实验测试结果</div>
          <h2>总成绩：${state.score} / ${EXPERIMENT_TEST_FLOW.length}</h2>
        </div>
        <button class="code-close-btn" type="button" data-test-result-page>×</button>
      </div>
      <div class="test-section">
        <span>本次测试已完成</span>
        <p>系统已记录本次题目答案、关键操作、模块用时和过程提示。你可以进入结果页查看完整答题详情与学习过程证据。</p>
      </div>
      <div class="test-final-grid">${detailHtml}</div>
      <div class="test-modal-actions">
        <button class="primary-btn" type="button" data-test-result-page>查看完整结果</button>
      </div>
    </section>`;
}

function restoreExperimentTestModalState(group) {
  const state = getExperimentTestState();
  const records = group.map(node => (state.records || []).find(item => item.id === node.id)).filter(Boolean);
  records.forEach(record => {
    document.querySelectorAll(`input[name="testAnswer_${record.id}"]`).forEach(input => {
      input.checked = input.value === record.userAnswer;
    });
  });
  if (records.length === group.length && state.pendingFeedbackId === group[0].id) {
    showExperimentTestSubmittedState(group, records);
  }
}

function showExperimentTestSubmittedState(group, records, options = {}) {
  const practice = Boolean(options.practice);
  records.forEach(record => {
    const node = group.find(item => item.id === record.id) || record;
    const feedback = document.querySelector(`[data-test-feedback="${record.id}"]`);
    if (!feedback) return;
    feedback.hidden = false;
    feedback.className = `test-feedback ${record.correct ? "correct" : "wrong"}`;
    feedback.innerHTML = `<strong>${record.correct ? "回答正确" : "回答错误"}</strong><p>${escapeHtml(node.explanation)}</p>`;
  });
  document.querySelectorAll('.test-question-card input[type="radio"]').forEach(input => { input.disabled = true; });
  group.forEach(node => {
    document.querySelectorAll(`input[name="testAnswer_${node.id}"]`).forEach(input => { input.disabled = true; });
  });
  const submit = document.querySelector("[data-test-submit]");
  if (submit) submit.hidden = true;
  const practiceSubmit = document.querySelector("[data-practice-test-submit]");
  if (practiceSubmit) practiceSubmit.hidden = true;
  const next = document.querySelector("[data-test-next]");
  if (next && !practice) {
    const state = getExperimentTestState();
    next.hidden = false;
    next.textContent = state.currentIndex >= EXPERIMENT_TEST_FLOW.length - 1 ? "查看测试结果" : "进入下一题";
  }
}

function continueExperimentTest() {
  document.querySelector(".test-modal-backdrop")?.remove();
  const state = getExperimentTestState();
  const nextIndex = state.currentIndex + currentExperimentTestGroup().length;
  if (nextIndex >= EXPERIMENT_TEST_FLOW.length) {
    finishExperimentTest();
  } else {
    goToExperimentTestNode(nextIndex);
  }
}

function handleExperimentTestNavigation(page) {
  if (!isExperimentTestActive()) return false;
  if (page === "experiment_test") return false;
  const node = currentExperimentTestNode();
  if (node && page === node.page) return false;
  showExperimentTestToast("请先完成当前测试内容。");
  return true;
}

function showExperimentTestToast(message) {
  let toast = document.querySelector(".test-toast");
  if (!toast) {
    document.body.insertAdjacentHTML("beforeend", `<div class="test-toast"></div>`);
    toast = document.querySelector(".test-toast");
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showExperimentTestToast.timer);
  showExperimentTestToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function updateExperimentTestNavState() {
  const state = getExperimentTestState();
  const node = currentExperimentTestNode();
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const page = btn.dataset.page;
    btn.classList.remove("test-current", "test-locked", "test-done");
    if (!state.active || state.finished) return;
    if (page === node?.page) btn.classList.add("test-current");
    else if (["preprocess", "train_eval", "evaluate", "predict"].includes(page)) btn.classList.add("test-locked");
  });
}

function controlValuePayload(id) {
  const el = $(id);
  return el ? { control: id, value: el.value } : { control: id };
}

function recordExperimentClickBehavior(event) {
  if (!isExperimentTestActive()) return;
  const target = event.target;
  const node = currentExperimentTestNode();
  if (target.closest("[data-test-open]")) {
    recordExperimentBehavior("view_task_hint");
    return;
  }
  if (target.closest("#loadDatasetBtn")) {
    recordExperimentBehavior("load_dataset", {
      dataset: document.querySelector("#datasetSelect")?.value || "twenty_newsgroups"
    });
    return;
  }
  const preprocessStep = target.closest("[data-preprocess-step]");
  if (preprocessStep && node?.page === "preprocess" && preprocessStep.dataset.preprocessStep === node.step) {
    recordExperimentBehavior("step_tab_click", { step: preprocessStep.dataset.preprocessStep });
    return;
  }
  const trainStep = target.closest("[data-train-step]");
  if (trainStep && node?.page === "train_eval" && trainStep.dataset.trainStep === node.step) {
    recordExperimentBehavior("step_tab_click", { step: trainStep.dataset.trainStep });
    return;
  }
  const nbTrainStep = target.closest("[data-nb-step]");
  if (nbTrainStep && node?.page === "train_eval" && nbTrainStep.dataset.nbStep === node.step) {
    recordExperimentBehavior("nb_step_tab_click", { step: nbTrainStep.dataset.nbStep });
    return;
  }
  const codeButton = target.closest("[data-preprocess-code], [data-train-code], [data-evaluate-code], [data-predict-code]");
  if (codeButton) {
    recordExperimentBehavior("view_code", {
      code: codeButton.dataset.preprocessCode || codeButton.dataset.trainCode || codeButton.dataset.evaluateCode || codeButton.dataset.predictCode || ""
    });
    return;
  }
  if (target.closest("#nbStartTrainBtn")) {
    recordExperimentBehavior("nb_train_start", { step: "nb_train" });
    return;
  }
  if (target.closest("#nbRandomSampleBtn")) {
    recordExperimentBehavior("nb_random_sample", { step: "nb_predict" });
    return;
  }
  if (target.closest("#stepBtn")) {
    recordExperimentBehavior("train_step", {
      step: activeTrainStep,
      frame: currentFrame,
      lr: $("lr")?.value,
      epochs: $("epochs")?.value
    });
    return;
  }
  if (target.closest("#autoBtn")) {
    recordExperimentBehavior("train_auto", { step: activeTrainStep, lr: $("lr")?.value, epochs: $("epochs")?.value });
    return;
  }
  if (target.closest("#pauseBtn")) {
    recordExperimentBehavior("train_pause", { step: activeTrainStep, frame: currentFrame });
    return;
  }
  if (target.closest("#resetBtn")) {
    recordExperimentBehavior("train_reset", { step: activeTrainStep });
    return;
  }
  const metricButton = target.closest("[data-evaluate-metric]");
  if (metricButton) {
    recordExperimentBehavior("metric_switch", { metric: metricButton.dataset.evaluateMetric });
    return;
  }
  const residualMode = target.closest("[data-loss-residual-mode]");
  if (residualMode) {
    recordExperimentBehavior("loss_residual_view", { mode: residualMode.dataset.lossResidualMode });
    return;
  }
  const overallView = target.closest("[data-loss-overall-view]");
  if (overallView) {
    recordExperimentBehavior("loss_overall_view", { view: overallView.dataset.lossOverallView });
    return;
  }
  const optSlice = target.closest("[data-opt-slice-mode]");
  if (optSlice) {
    recordExperimentBehavior("optimization_view", { mode: optSlice.dataset.optSliceMode });
    return;
  }
  const rangeStep = target.closest("[data-step-target]");
  if (rangeStep) {
    recordExperimentBehavior("parameter_adjust", {
      control: rangeStep.dataset.stepTarget,
      direction: rangeStep.dataset.stepDir
    });
    return;
  }
  if (target.closest("#predictRun")) {
    recordExperimentBehavior("predict_run", {
      input: $("predictInput")?.value,
      inputMode: $("predictInputMode")?.value
    });
  }
}

function recordExperimentChangeBehavior(event) {
  if (!isExperimentTestActive()) return;
  const id = event.target?.id || "";
  if (!id) return;
  if (["dataFeature", "trainFeature"].includes(id)) {
    recordExperimentBehavior("feature_change", controlValuePayload(id));
  } else if (["trainStd", "predictInputMode"].includes(id)) {
    recordExperimentBehavior(id === "predictInputMode" ? "predict_input_mode_change" : "train_data_mode_change", controlValuePayload(id));
  } else if (["w0", "b0", "lr", "epochs", "speed"].includes(id)) {
    recordExperimentBehavior("parameter_adjust", controlValuePayload(id));
  } else if (id === "predictInput") {
    recordExperimentBehavior("predict_input", controlValuePayload(id));
  } else if (event.target?.name === "trainViews" || event.target?.name === "trainCompareViews") {
    recordExperimentBehavior("chart_view_change", { name: event.target.name, value: event.target.value, checked: event.target.checked });
  }
}

function recordExperimentKeyBehavior(event) {
  if (!isExperimentTestActive()) return;
  if (event.key === "Enter" && event.target?.id === "predictInput") {
    recordExperimentBehavior("predict_enter_run", {
      input: $("predictInput")?.value,
      inputMode: $("predictInputMode")?.value
    });
  }
}

function bindExperimentTestRuntime() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (target.closest("[data-test-start]")) startExperimentTest();
    if (target.closest("[data-test-restart]")) restartExperimentTest();
    if (target.closest("[data-test-exit]")) exitExperimentTest();
    if (target.closest("[data-test-continue-current]")) goToExperimentTestNode(getExperimentTestState().currentIndex);
    if (target.closest("[data-test-open]")) openExperimentTestModal();
    if (target.closest("[data-practice-test-open]")) openPracticeTestModal();
    if (target.closest("[data-test-close]")) document.querySelector(".test-modal-backdrop")?.remove();
    if (target.closest("[data-test-result-page]")) {
      document.querySelector(".test-modal-backdrop")?.remove();
      setPage("experiment_test");
    }
    if (target.closest("[data-test-submit]")) submitExperimentTestAnswer();
    if (target.closest("[data-practice-test-submit]")) submitPracticeTestAnswer();
    if (target.closest("[data-test-next]")) continueExperimentTest();
  });

  document.addEventListener("click", recordExperimentClickBehavior);
  document.addEventListener("change", recordExperimentChangeBehavior);
  document.addEventListener("keydown", recordExperimentKeyBehavior);

  document.addEventListener("click", event => {
    if (!isExperimentTestActive()) return;
    const node = currentExperimentTestNode();
    const preprocessStep = event.target.closest("[data-preprocess-step]");
    if (preprocessStep && node?.page === "preprocess" && preprocessStep.dataset.preprocessStep !== node.step) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showExperimentTestToast("请先完成当前测试内容。");
    }
    const trainStep = event.target.closest("[data-train-step]");
    if (trainStep && node?.page === "train_eval" && trainStep.dataset.trainStep !== node.step) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showExperimentTestToast("请先完成当前测试内容。");
    }
  }, true);

  const panel = $("rightPanel");
  if (panel && window.MutationObserver) {
    const observer = new MutationObserver(() => injectExperimentTestEntryButton());
    observer.observe(panel, { childList: true, subtree: true });
  }
}

bindExperimentTestRuntime();

