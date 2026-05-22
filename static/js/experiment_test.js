// Experiment test flow.

const EXPERIMENT_TEST_STATE_KEY = "experimentTestStateV1";

const EXPERIMENT_TEST_FLOW = [
  {
    id: "preprocess_load_target",
    module: "数据预处理",
    title: "加载原始数据",
    page: "preprocess",
    step: "load",
    operation: "请加载 Boston Housing 数据集，并观察样本数量、特征数量和目标列。",
    hint: "注意 MEDV 在当前实验中不是输入特征，而是要预测的目标值。",
    question: "当前实验的目标列是哪一个？",
    type: "single",
    options: ["RM", "MEDV", "CRIM", "LSTAT"],
    answer: "MEDV",
    explanation: "MEDV 表示房价中位数，是当前简单线性回归实验要预测的目标列。"
  },
  {
    id: "preprocess_detail_stats",
    module: "数据预处理",
    title: "数据详情",
    page: "preprocess",
    step: "detail",
    operation: "请查看数据详情中的统计摘要，重点观察不同字段的均值、最大值、最小值和标准差。",
    hint: "标准差可以帮助判断字段取值在样本之间的波动程度。",
    question: "在数据详情页中，如果发现某个字段的“标准差”明显较大，通常说明什么？",
    type: "single",
    options: [
      "该字段的取值波动较大，样本之间差异更明显",
      "该字段一定是目标列，不能作为输入特征",
      "该字段存在缺失值，必须删除整列",
      "该字段已经完成标准化，均值一定为 0"
    ],
    answer: "该字段的取值波动较大，样本之间差异更明显",
    explanation: "标准差反映数据围绕平均值的离散程度。标准差越大，说明该字段的取值波动越大，样本之间差异越明显。它不代表该字段一定无效，也不等于存在缺失值。"
  },
  {
    id: "preprocess_detail_quality",
    module: "数据预处理",
    title: "数据详情",
    page: "preprocess",
    step: "detail",
    operation: "请查看数据详情中的质量检查和统计摘要，关注缺失值数量、重复样本数量和各字段统计值。",
    hint: "这些信息用于判断数据是否适合进入后续标准化和模型训练。",
    question: "在数据详情页中，为什么要同时查看缺失值数量、重复样本数量和各字段的统计值？",
    type: "single",
    options: [
      "为了判断数据质量，并了解各字段的取值范围和分布情况",
      "为了直接得到最终预测结果",
      "为了跳过模型训练过程",
      "为了把所有字段都转换成目标列"
    ],
    answer: "为了判断数据质量，并了解各字段的取值范围和分布情况",
    explanation: "缺失值和重复样本用于检查数据质量，字段统计值用于了解各特征的取值范围、均值和波动情况。这样可以在训练前发现数据问题，并为后续标准化和模型训练提供依据。"
  },
  {
    id: "preprocess_raw_relation",
    module: "数据预处理",
    title: "原始数据可视化",
    page: "preprocess",
    step: "raw_viz",
    operation: "观察原始散点图，并查看右侧“全特征线性相关系数”排序图。",
    hint: "相关系数可以帮助判断不同特征与目标值 MEDV 的线性关系强弱。",
    question: "在线性相关系数图中，相关系数的绝对值越大，通常说明什么？",
    type: "single",
    options: [
      "该特征与目标值 MEDV 的线性关系越强",
      "该特征的样本数量越多",
      "该特征一定没有异常值",
      "该特征一定不能用于模型训练"
    ],
    answer: "该特征与目标值 MEDV 的线性关系越强",
    explanation: "相关系数用于衡量两个变量之间线性关系的方向和强弱。数值接近 1 表示较强的正相关，接近 -1 表示较强的负相关，接近 0 表示线性关系较弱。通常看相关性强弱时，会关注相关系数的绝对值，绝对值越大，说明该特征与目标值 MEDV 的线性关系越明显。"
  },
  {
    id: "preprocess_standardize_formula",
    module: "数据预处理",
    title: "数据标准化",
    page: "preprocess",
    step: "standardize",
    operation: "观察页面中的标准化公式、mean、std，以及标准化前后 5 行和范围对比。",
    hint: "z-score 标准化会使用均值和标准差把原始数值转换到更统一的尺度。",
    question: "z-score 标准化后的特征值通常具有什么特点？",
    type: "single",
    options: [
      "数据会围绕 0 分布，标准差通常接近 1",
      "所有数据都会被压缩到 0 到 1 之间",
      "样本数量会减少",
      "目标列 MEDV 会被删除"
    ],
    answer: "数据会围绕 0 分布，标准差通常接近 1",
    explanation: "z-score 标准化使用公式 z = (x - mean) / std，将原始数据减去均值后再除以标准差。这样处理后，特征值通常会围绕 0 分布，标准差接近 1，从而让不同量纲的特征处在更容易比较和训练的尺度上。"
  },
  {
    id: "preprocess_standardized_distribution",
    module: "数据预处理",
    title: "标准数据可视化",
    page: "preprocess",
    step: "standard_viz",
    operation: "观察标准化后的散点图和右侧全特征线性相关系数图。",
    hint: "标准化会改变数值尺度，但不会改变变量之间的基本线性关系方向。",
    question: "与原始数据可视化相比，标准数据可视化主要发生了什么变化？",
    type: "single",
    options: [
      "横轴和纵轴变成标准化后的数值尺度，但特征与目标值的相关方向基本不变",
      "样本数量减少，所以散点图中的点变少了",
      "MEDV 被删除，所以无法再观察目标值",
      "所有特征和目标值之间的相关系数都会变成 1"
    ],
    answer: "横轴和纵轴变成标准化后的数值尺度，但特征与目标值的相关方向基本不变",
    explanation: "标准化会把原始数值转换到更容易比较的尺度上，例如均值接近 0、标准差接近 1，因此散点图的横轴和纵轴范围会发生变化。但标准化只是改变数值尺度，不会改变变量之间的基本线性关系方向，所以相关系数的正负方向通常保持不变。"
  },
  {
    id: "train_regression_process",
    module: "模型训练",
    title: "熟悉回归过程",
    page: "train_eval",
    step: "process",
    operation: "请单步训练或自动演示，观察直线如何逐步拟合散点。",
    hint: "关注 w、b 和 Loss 随训练轮次的变化。",
    question: "简单线性回归的预测函数是什么？",
    type: "single",
    options: ["y_pred = w * x + b", "y_pred = x / w + b", "loss = w + b", "x = y * b"],
    answer: "y_pred = w * x + b",
    explanation: "简单线性回归用一条直线表示输入特征 x 和预测值 y_pred 的关系，核心形式是 y_pred = w * x + b。"
  },
  {
    id: "train_preprocess_effect",
    module: "模型训练",
    title: "熟悉预处理影响",
    page: "train_eval",
    step: "preprocess_effect",
    operation: "请观察左侧原始散点图和右侧标准化散点图，在相同学习率下比较两种训练过程的变化。重点关注当前回归线是否稳定、Loss 是否下降。",
    hint: "未标准化数据的数值尺度可能更大，过大的学习率会让参数更新变得不稳定。",
    question: "如果不进行标准化，并且学习率设置过大，训练过程中最可能出现什么现象？",
    type: "single",
    options: [
      "参数更新幅度过大，回归线来回跳动，Loss 可能越来越大",
      "Loss 一定会快速下降到 0",
      "模型会自动完成标准化，所以训练不受影响",
      "样本数量会自动减少，训练会更稳定"
    ],
    answer: "参数更新幅度过大，回归线来回跳动，Loss 可能越来越大",
    explanation: "不进行标准化时，原始特征的数值尺度可能较大，不同变量的取值范围差异明显。如果学习率也设置得过大，每次参数更新的步子就可能过大，导致模型越过最优位置，表现为回归线来回跳动、Loss 不下降，甚至越来越大。标准化可以把数据调整到更接近的尺度上，使梯度下降过程更稳定。"
  },
  {
    id: "train_loss_function",
    module: "模型训练",
    title: "熟悉损失函数",
    page: "train_eval",
    step: "loss",
    operation: "请观察残差、平方误差和 MSE 的计算过程。",
    hint: "损失函数越小，表示当前直线整体上越贴近样本点。",
    question: "MSE 主要衡量什么？",
    type: "single",
    options: ["预测误差平方的平均值", "样本数量", "特征列名称", "页面刷新速度"],
    answer: "预测误差平方的平均值",
    explanation: "MSE 是 mean((y - y_pred) ** 2)，表示预测误差平方后的平均水平。"
  },
  {
    id: "train_optimization_rule",
    module: "模型训练",
    title: "熟悉优化准则",
    page: "train_eval",
    step: "optimization",
    operation: "请观察 Loss 等高线图、切面图和 3D Loss 曲面图，关注当前参数点、梯度方向和更新后位置的变化。",
    hint: "梯度下降会不断调整 w 和 b，让损失函数逐步减小。",
    question: "在梯度下降中，参数 w 和 b 的更新目标是什么？",
    type: "single",
    options: [
      "沿着 Loss 下降的方向移动，使损失值逐步变小",
      "随机改变 w 和 b，只要图像发生变化即可",
      "沿着 Loss 增大的方向移动，使模型误差变大",
      "固定 w 和 b 不变，只观察样本点分布"
    ],
    answer: "沿着 Loss 下降的方向移动，使损失值逐步变小",
    explanation: "梯度下降的目标是不断调整参数 w 和 b，使损失函数 Loss 逐步减小。在图中可以把当前参数点看作站在 Loss 曲面上的一个位置，更新时会沿着 Loss 下降的方向移动，也就是负梯度方向。这样模型预测误差会逐渐减小，回归线也会逐步接近更好的拟合效果。"
  },
  {
    id: "train_custom_params",
    module: "模型训练",
    title: "自定义参数训练",
    page: "train_eval",
    step: "custom",
    operation: "请调整特征、初始 w/b、学习率和训练轮数，并运行一次训练。",
    hint: "学习率过大可能震荡，过小则收敛较慢。",
    question: "自定义训练中，学习率主要影响什么？",
    type: "single",
    options: ["每次参数更新的步长", "数据集字段数量", "目标列名称", "浏览器窗口宽度"],
    answer: "每次参数更新的步长",
    explanation: "学习率控制 w 和 b 每次沿梯度方向移动的幅度。"
  },
  {
    id: "evaluate_metrics",
    module: "模型评估",
    title: "评估指标",
    page: "evaluate",
    step: "metrics",
    operation: "请查看模型拟合效果，并切换 RMSE、MAE、R² 指标说明。",
    hint: "RMSE 和 MAE 越小通常越好，R² 越接近 1 通常拟合越好。",
    question: "R² 更接近 1 通常表示什么？",
    type: "single",
    options: ["模型拟合效果更好", "样本数量更少", "学习率为 0", "目标列被删除"],
    answer: "模型拟合效果更好",
    explanation: "R² 衡量模型解释目标值变化的能力，越接近 1 通常代表拟合效果越好。"
  },
  {
    id: "predict_input",
    module: "模型预测",
    title: "预测输入",
    page: "predict",
    step: "predict",
    operation: "请在右侧输入特征值，然后点击“开始预测”，观察预测点、预测 MEDV 和预测计算过程。",
    hint: "线性回归预测会使用当前模型参数和输入特征值计算预测结果。",
    question: "在模型预测中，系统主要根据哪些内容计算预测的 MEDV？",
    type: "single",
    options: [
      "当前模型参数 w、b，以及输入的特征值 x",
      "页面当前滚动条位置",
      "数据表中的第一行样本",
      "浏览器窗口大小"
    ],
    answer: "当前模型参数 w、b，以及输入的特征值 x",
    explanation: "线性回归预测使用公式 y_pred = w * x + b。系统会读取当前训练得到的模型参数 w 和 b，再结合学生输入的特征值 x，计算出预测的 MEDV。页面中的预测点和计算过程也是根据这一步结果更新的。"
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
}

function isExperimentTestActive() {
  const state = getExperimentTestState();
  return Boolean(state.active && state.started && !state.finished);
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

function experimentTestButtonHtml() {
  if (!isExperimentTestActive()) return "";
  const state = getExperimentTestState();
  return `
    <button class="test-task-btn" type="button" data-test-open>查看测试内容</button>
    <div class="test-progress-note">实验测试进行中：第 ${state.currentIndex + 1} / ${EXPERIMENT_TEST_FLOW.length} 题</div>
  `;
}

function injectExperimentTestEntryButton() {
  if (!isExperimentTestActive()) return;
  if (!["preprocess", "train_eval", "evaluate", "predict"].includes(currentPage)) return;
  const panel = $("rightPanel");
  const card = panel?.querySelector(".control-card");
  const title = card?.querySelector("h3");
  if (!card || !title || card.querySelector("[data-test-open]")) return;
  title.insertAdjacentHTML("afterend", experimentTestButtonHtml());
}

function startExperimentTest() {
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
    locked: true
  });
  goToExperimentTestNode(0);
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
    "preprocessSelectedViewsV1",
    "activePreprocessStepV1",
    "preprocessProgressStepV1",
    "trainFormStateV1",
    "trainSelectedViewsV1",
    "trainCompareViewsV1",
    "activeTrainStepV1",
    "trainProgressStepV1",
    "evaluateMetricModeV1",
    "evaluateSelectedViewsV1",
    "predictFormStateV1",
    "predictSelectedViewsV2"
  ].forEach(key => {
    delete viewStateStore[key];
  });

  viewStateStore.activePreprocessStepV1 = "load";
  viewStateStore.preprocessProgressStepV1 = "load";
  viewStateStore.activeTrainStepV1 = "process";
  viewStateStore.trainProgressStepV1 = "process";
  viewStateStore.evaluateMetricModeV1 = "rmse";
  viewStateStore.predictFormStateV1 = {
    predictInput: "6.5",
    predictInputMode: "raw"
  };
}

function restartExperimentTest() {
  startExperimentTest();
}

function exitExperimentTest() {
  setExperimentTestState(defaultExperimentTestState());
  setPage("preprocess");
}

function finishExperimentTest() {
  const state = getExperimentTestState();
  setExperimentTestState({
    ...state,
    active: false,
    finished: true,
    locked: false
  });
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
    activeTrainStep = node.step;
    viewStateStore.activeTrainStepV1 = node.step;
    markTrainProgress?.(node.step);
  }
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
        ${state.finished ? `<button class="primary-btn" type="button" data-test-restart>重新开始测试</button>
        <button class="secondary-btn" type="button" data-test-exit>返回自由实验</button>` : inProgress ? `<button class="primary-btn" type="button" data-test-continue-current>继续当前题</button>
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
      <p>本测试将依次覆盖数据预处理、模型训练、模型评估和模型预测。每个节点需要先在原实验页面完成观察或操作，再点击右侧的“查看测试内容”回答问题。</p>
      <div class="test-flow-grid">
        <div><strong>1. 数据预处理</strong><span>加载、详情、原始可视化、标准化</span></div>
        <div><strong>2. 模型训练</strong><span>回归过程、预处理影响、损失、优化、自定义训练</span></div>
        <div><strong>3. 模型评估</strong><span>RMSE、MAE、R² 指标理解</span></div>
        <div><strong>4. 模型预测</strong><span>输入样本并理解预测计算过程</span></div>
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
      <p>当前模块：${escapeHtml(node?.module || "")}。请回到系统指定的实验页面完成观察或操作，然后点击右侧“查看测试内容”作答。</p>
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

function experimentTestModalHtml(group) {
  const state = getExperimentTestState();
  const first = group[0];
  const questionHtml = experimentTestQuestionHtml(group);
  return `
    <div class="test-modal-backdrop">
      <section class="test-modal" role="dialog" aria-modal="true" aria-label="实验测试题目">
        <div class="test-modal-head">
          <div>
            <div class="code-kicker">实验测试 ${state.currentIndex + 1}${group.length > 1 ? `-${state.currentIndex + group.length}` : ""} / ${EXPERIMENT_TEST_FLOW.length}</div>
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
          <span>二、测试问题</span>
          ${questionHtml}
        </div>
        <div class="test-modal-actions">
          <button class="primary-btn" type="button" data-test-submit>提交答案</button>
          <button class="secondary-btn" type="button" data-test-next hidden>进入下一题</button>
        </div>
      </section>
    </div>`;
}

function experimentTestQuestionHtml(group) {
  if (group.length === 1) {
    const node = group[0];
    const optionHtml = experimentTestOptionHtml(node);
    return `
      <p>${escapeHtml(node.question)}</p>
      <div class="test-options" data-test-question-id="${escapeHtml(node.id)}">${optionHtml}</div>
      <div class="test-feedback" data-test-feedback="${escapeHtml(node.id)}" hidden></div>`;
  }
  return `<div class="test-question-list">${group.map((node, questionIndex) => `
    <div class="test-question-card" data-test-question-id="${escapeHtml(node.id)}">
      <span>问题 ${questionIndex + 1}</span>
      <p>${escapeHtml(node.question)}</p>
      <div class="test-options">${experimentTestOptionHtml(node)}</div>
      <div class="test-feedback" data-test-feedback="${escapeHtml(node.id)}" hidden></div>
    </div>
  `).join("")}</div>`;
}

function experimentTestOptionHtml(node) {
  return (node.options || []).map((option, index) => `
    <label class="test-option">
      <input type="radio" name="testAnswer_${escapeHtml(node.id)}" value="${escapeHtml(option)}" ${index === 0 ? "checked" : ""}>
      <span>${escapeHtml(String.fromCharCode(65 + index))}. ${escapeHtml(option)}</span>
    </label>
  `).join("");
}

function submitExperimentTestAnswer() {
  const group = currentExperimentTestGroup();
  const state = getExperimentTestState();
  if (!group.length) return;
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
    pendingFeedbackId: group[0].id,
    score: records.reduce((sum, item) => sum + (item.correct ? 1 : 0), 0)
  };
  const isLastQuestion = state.currentIndex + group.length >= EXPERIMENT_TEST_FLOW.length;
  if (isLastQuestion) {
    const finishedState = {
      ...nextState,
      active: false,
      finished: true,
      locked: false,
      pendingFeedbackId: null
    };
    setExperimentTestState(finishedState);
    showExperimentTestFinalResultModal(finishedState);
    return;
  }
  setExperimentTestState(nextState);
  showExperimentTestSubmittedState(group, newRecords);
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
        <p>系统已记录本次所有题目的答案、正确答案和解析。你可以进入结果页查看完整答题详情。</p>
      </div>
      <div class="test-final-grid">${detailHtml}</div>
      <div class="test-modal-actions">
        <button class="primary-btn" type="button" data-test-result-page>查看完整结果</button>
        <button class="secondary-btn" type="button" data-test-exit>返回自由实验</button>
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

function showExperimentTestSubmittedState(group, records) {
  records.forEach(record => {
    const node = group.find(item => item.id === record.id) || record;
    const feedback = document.querySelector(`[data-test-feedback="${record.id}"]`);
    if (!feedback) return;
    feedback.hidden = false;
    feedback.className = `test-feedback ${record.correct ? "correct" : "wrong"}`;
    feedback.innerHTML = `<strong>${record.correct ? "回答正确" : "回答错误"}</strong><p>${escapeHtml(node.explanation)}</p>`;
  });
  document.querySelectorAll('.test-question-card input[type="radio"]').forEach(input => { input.disabled = true; });
  const submit = document.querySelector("[data-test-submit]");
  if (submit) submit.hidden = true;
  const next = document.querySelector("[data-test-next]");
  if (next) {
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

function bindExperimentTestRuntime() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (target.closest("[data-test-start]")) startExperimentTest();
    if (target.closest("[data-test-restart]")) restartExperimentTest();
    if (target.closest("[data-test-exit]")) exitExperimentTest();
    if (target.closest("[data-test-continue-current]")) goToExperimentTestNode(getExperimentTestState().currentIndex);
    if (target.closest("[data-test-open]")) openExperimentTestModal();
    if (target.closest("[data-test-close]")) document.querySelector(".test-modal-backdrop")?.remove();
    if (target.closest("[data-test-result-page]")) {
      document.querySelector(".test-modal-backdrop")?.remove();
      setPage("experiment_test");
    }
    if (target.closest("[data-test-submit]")) submitExperimentTestAnswer();
    if (target.closest("[data-test-next]")) continueExperimentTest();
  });

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

