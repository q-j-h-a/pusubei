// Experiment test flow.

const EXPERIMENT_TEST_STATE_KEY = "experimentTestStateV1";
let freeExperimentSnapshot = null;

const EXPERIMENT_BEHAVIOR_EVENT_LIMIT = 500;

const EXPERIMENT_TEST_FLOW = [
  {
    id: "preprocess_load_target",
    module: "数据预处理",
    title: "加载原始数据",
    page: "preprocess",
    step: "load",
    operation: "请在右侧控制面板中选择 Boston 原始数据集，点击“加载数据集”。加载完成后，观察页面上方的数据概览卡片和下方数据表格，重点确认以下内容：样本数量、特征数量、目标列名称，以及数据表中每一行代表什么、每一列代表什么。",
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
    operation: "请查看数据详情页面，先确认字段名称、字段角色和中文含义，再观察统计详情中的缺失值数量、重复样本数量、数值型列数量，以及各字段的最小值、最大值、平均值和标准差。重点思考这些统计信息如何帮助判断数据质量、字段取值范围和后续是否需要标准化处理。",
    hint: "标准差可以帮助判断字段取值在样本之间的波动程度。",
    question: "在数据详情页中，如果发现某个字段的“标准差”明显较大，通常说明什么？",
    type: "single",
    options: [
      "该字段已经完成标准化，均值一定为0",
      "该字段一定是目标列，不能作为输入特征",
      "该字段存在缺失值，必须删除整列",
      "该字段的取值波动较大，样本之间差异更明显"
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
    operation: "请查看数据详情页面，先确认字段名称、字段角色和中文含义，再观察统计详情中的缺失值数量、重复样本数量、数值型列数量，以及各字段的最小值、最大值、平均值和标准差。重点思考这些统计信息如何帮助判断数据质量、字段取值范围和后续是否需要标准化处理。",
    hint: "这些信息用于判断数据是否适合进入后续标准化和模型训练。",
    question: "在数据详情页中，为什么要同时查看缺失值数量、重复样本数量和各字段的统计值？",
    type: "single",
    options: [
      "为了直接得到最终预测结果",
      "为了判断数据质量，并了解各字段的取值范围和分布情况",
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
    operation: "请选择一个特征，观察左侧“原始散点图”中特征值与目标值 MEDV 之间的分布关系，并查看右侧“全特征线性相关系数”排序图。重点判断：当前特征与 MEDV 是正相关还是负相关，相关程度强还是弱，以及哪些特征与房价目标值关系更明显。",
    hint: "相关系数可以帮助判断不同特征与目标值 MEDV 的线性关系强弱。",
    question: "在线性相关系数图中，相关系数的绝对值越大，通常说明什么？",
    type: "single",
    options: [
      "该特征一定没有异常值",
      "该特征的样本数量越多",
      "该特征与目标值 MEDV 的线性关系越强",
      "该特征一定不能用于模型训练"
    ],
    answer: "该特征与目标值 MEDV 的线性关系越强",
    explanation: "相关系数用于衡量两个变量之间线性关系的方向和强弱。数值接近 1 表示较强的正相关，接近 -1 表示较强的负相关，接近 0 表示线性关系较弱。通常看相关性强弱时，会关注相关系数的绝对值，绝对值越大，说明该特征与目标值 MEDV 的线性关系越明显。"
  },
  {
    id: "preprocess_raw_rm_relation",
    module: "数据预处理",
    title: "原始数据可视化",
    page: "preprocess",
    step: "raw_viz",
    operation: "请选择一个特征，观察左侧“原始散点图”中特征值与目标值 MEDV 之间的分布关系，并查看右侧“全特征线性相关系数”排序图。重点判断：当前特征与 MEDV 是正相关还是负相关，相关程度强还是弱，以及哪些特征与房价目标值关系更明显。",
    hint: "RM 表示住宅平均房间数，通常与 MEDV 呈正相关。",
    question: "请在右侧“特征选择”中选择 RM，观察左侧原始散点图和线性趋势线，判断 RM 与目标值 MEDV 之间的关系。",
    type: "single",
    options: [
      "RM 越大，MEDV 整体越高，二者呈正相关关系",
      "RM 越大，MEDV 整体越低，二者呈负相关关系",
      "RM 与 MEDV 完全没有关系",
      "RM 是目标列，不是输入特征"
    ],
    answer: "RM 越大，MEDV 整体越高，二者呈正相关关系",
    explanation: "RM 表示住宅平均房间数。从散点和趋势线可以看到，RM 较大时 MEDV 通常也更高，二者整体呈正相关关系。"
  },
  {
    id: "preprocess_standardize_formula",
    module: "数据预处理",
    title: "数据标准化",
    page: "preprocess",
    step: "standardize",
    operation: "请在右侧选择一个特征，观察该特征的均值 μ、标准差 σ 和 z-score 标准化公式。对比标准化前后前 5 行数据以及范围对比表，理解标准化如何把不同量纲的特征转换到更容易比较和训练的尺度上。重点观察：标准化后数据是否围绕 0 分布，标准差是否接近 1，原始最小值和最大值被转换到了什么范围。",
    hint: "z-score 标准化会使用均值和标准差把原始数值转换到更统一的尺度。",
    question: "z-score 标准化后的特征值通常具有什么特点？",
    type: "single",
    options: [
      "目标列 MEDV 会被删除",
      "所有数据都会被压缩到 0 到 1 之间",
      "样本数量会减少",
      "数据会围绕 0 分布，标准差通常接近 1"
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
    operation: "请先选择特征，分别观察标准化前后的散点图和趋势线，再结合下方“全特征线性相关系数”图，判断哪些特征与 MEDV 的线性关系更明显。",
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
    id: "preprocess_standardized_candidate_features",
    module: "数据预处理",
    title: "标准数据可视化",
    page: "preprocess",
    step: "standard_viz",
    operation: "请先选择特征，分别观察标准化前后的散点图和趋势线，再结合下方“全特征线性相关系数”图，判断哪些特征与 MEDV 的线性关系更明显。",
    hint: "LSTAT 与 RM 通常是与 MEDV 线性关系最明显的两个候选特征。",
    question: "根据右侧“全特征线性相关系数”图，哪两个特征与目标值 MEDV 的线性关系最明显，更适合作为线性回归的候选特征？",
    type: "single",
    options: ["RAD 和 B", "CHAS 和 DIS", "LSTAT 和 RM", "ZN 和 CHAS"],
    answer: "LSTAT 和 RM",
    explanation: "从全特征线性相关系数排序看，LSTAT 和 RM 与 MEDV 的线性关系最明显，更适合作为简单线性回归的候选特征。"
  },
  {
    id: "train_regression_process",
    module: "模型训练",
    title: "熟悉回归过程",
    page: "train_eval",
    step: "process",
    operation: "请在右侧“特征选择”中选择 RM 特征，点击“单步训练”或“自动演示”，观察当前回归线如何随着训练逐步调整，并与最优参考线进行比较。重点关注：回归线的斜率 w 和截距 b 如何变化，模型是否逐渐拟合散点的整体上升趋势。",
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
    operation: "请在右侧“特征选择”中选择 RM 特征，保持相同学习率，分别观察左侧原始尺度散点图和右侧标准化散点图中的训练过程。点击“单步训练”或“自动演示”，重点比较两种情况下当前回归线的变化是否稳定、是否逐渐接近最优参考线，以及 Loss 是否呈下降趋势。",
    hint: "未标准化数据的数值尺度可能更大，过大的学习率会让参数更新变得不稳定。",
    question: "在选择 RM 特征后，如果使用原始尺度数据且学习率过大，训练过程最可能出现什么现象？",
    type: "single",
    options: [
      "模型会自动完成标准化，所以训练不受影响",
      "Loss 一定会快速下降到 0",
      "参数更新幅度过大，回归线来回跳动，Loss 可能越来越大",
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
    operation: "请在右侧“特征选择”中选择 RM 特征，观察左侧“残差与回归线”和右侧“整体差分布”图。重点查看单个样本的真实值 y、预测值 ŷ 和残差 e 之间的关系，并理解多个样本的平方误差求平均后如何得到 MSE。",
    hint: "损失函数越小，表示当前直线整体上越贴近样本点。",
    question: "MSE 主要衡量什么？",
    type: "single",
    options: ["预测误差平方的平均值", "样本数量", "特征列名称", "页面刷新速度"],
    answer: "预测误差平方的平均值",
    explanation: "MSE 是 mean((y - y_pred) ** 2)，表示预测误差平方后的平均水平。"
  },
  {
    id: "train_loss_residual",
    module: "模型训练",
    title: "熟悉损失函数",
    page: "train_eval",
    step: "loss",
    operation: "请在右侧“特征选择”中选择 RM 特征，观察左侧“残差与回归线”和右侧“整体差分布”图。重点查看单个样本的真实值 y、预测值 ŷ 和残差 e 之间的关系，并理解多个样本的平方误差求平均后如何得到 MSE。",
    hint: "残差表示真实值与预测值之间的差距。",
    question: "选择 RM 特征后，在“残差与回归线”图中，残差主要表示什么？",
    type: "single",
    options: [
      "学习率的大小",
      "RM 特征本身的取值范围",
      "样本数量的变化",
      "样本真实值 y 与预测值 ŷ 之间的差距"
    ],
    answer: "样本真实值 y 与预测值 ŷ 之间的差距",
    explanation: "残差通常表示真实值 y 与预测值 ŷ 之间的差距。残差越小，说明当前样本的预测越接近真实值。"
  },
  {
    id: "train_optimization_rule",
    module: "模型训练",
    title: "熟悉优化准则",
    page: "train_eval",
    step: "optimization",
    operation: "请在右侧“特征选择”中选择 RM 特征，设置参数，点击“单步训练”或“自动演示”，观察 3D Loss 曲面图、Loss 等高线图和 MSE Loss 随 epoch 的变化。重点关注当前参数点如何沿着 Loss 下降方向移动，w 和 b 如何更新，以及 MSE Loss 是否整体呈下降趋势。",
    hint: "梯度下降会不断调整 w 和 b，让损失函数逐步减小。",
    question: "在梯度下降中，参数 w 和 b 的更新目标是什么？",
    type: "single",
    options: [
      "随机改变 w 和 b，只要图像发生变化即可",
      "沿着 Loss 下降的方向移动，使损失值逐步变小",
      "沿着 Loss 增大的方向移动，使模型误差变大",
      "固定 w 和 b 不变，只观察样本点分布"
    ],
    answer: "沿着 Loss 下降的方向移动，使损失值逐步变小",
    explanation: "梯度下降的目标是不断调整参数 w 和 b，使损失函数 Loss 逐步减小。在图中可以把当前参数点看作站在 Loss 曲面上的一个位置，更新时会沿着 Loss 下降的方向移动，也就是负梯度方向。这样模型预测误差会逐渐减小，回归线也会逐步接近更好的拟合效果。"
  },
  {
    id: "train_optimization_loss_trend",
    module: "模型训练",
    title: "熟悉优化准则",
    page: "train_eval",
    step: "optimization",
    operation: "请在右侧“特征选择”中选择 RM 特征，设置参数，点击“单步训练”或“自动演示”，观察 3D Loss 曲面图、Loss 等高线图和 MSE Loss 随 epoch 的变化。重点关注当前参数点如何沿着 Loss 下降方向移动，w 和 b 如何更新，以及 MSE Loss 是否整体呈下降趋势。",
    hint: "有效优化时，MSE Loss 通常会逐步下降。",
    question: "选择 RM 特征并开始训练后，如果优化过程是有效的，MSE Loss 曲线通常应该呈现什么趋势？",
    type: "single",
    options: [
      "随机改变 w 和 b，只要图像发生变化即可",
      "沿着 Loss 下降的方向移动，使损失值逐步变小",
      "沿着 Loss 增大的方向移动，使模型误差变大",
      "固定 w 和 b 不变，只观察样本点分布"
    ],
    answer: "沿着 Loss 下降的方向移动，使损失值逐步变小",
    explanation: "如果优化过程有效，参数会沿着使 Loss 下降的方向更新，MSE Loss 曲线整体应逐步变小。"
  },
  {
    id: "train_custom_params",
    module: "模型训练",
    title: "自定义参数训练",
    page: "train_eval",
    step: "custom",
    operation: "请在右侧“特征选择”中选择 RM 特征，设置初始参数 w、b、学习率和训练轮数，然后点击“单步训练”或“自动演示”完成一次模型训练。训练过程中请观察回归线、MSE Loss、w 参数轨迹和 b 参数轨迹的变化。注意：本步骤训练得到的模型参数将作为后续“模型评估”和“模型预测”模块使用的模型基础。",
    hint: "学习率过大可能震荡，过小则收敛较慢。",
    question: "自定义训练中，学习率主要影响什么？",
    type: "single",
    options: ["浏览器窗口宽度", "数据集字段数量", "目标列名称", "每次参数更新的步长"],
    answer: "每次参数更新的步长",
    explanation: "学习率控制 w 和 b 每次沿梯度方向移动的幅度。"
  },
  {
    id: "train_custom_early_stop",
    module: "模型训练",
    title: "自定义参数训练",
    page: "train_eval",
    step: "custom",
    operation: "请在右侧“特征选择”中选择 RM 特征，设置初始参数 w、b、学习率和训练轮数，然后点击“单步训练”或“自动演示”完成一次模型训练。训练过程中请观察回归线、MSE Loss、w 参数轨迹和 b 参数轨迹的变化。注意：本步骤训练得到的模型参数将作为后续“模型评估”和“模型预测”模块使用的模型基础。",
    hint: "自动演示会在达到轮数、Loss 发散或判断收敛时停止。",
    question: "选择 RM 特征，当初始参数 w=0、b=0，训练轮数设置为 120 时，如果训练在达到 120 轮之前停止，最可能的原因是什么？",
    type: "single",
    options: [
      "Loss 连续多轮变化很小，系统判断模型已经基本收敛并提前停止",
      "样本数量不足，所以训练轮数被自动减少",
      "RM 特征不能用于简单线性回归训练",
      "浏览器显示错误，实际并没有停止"
    ],
    answer: "Loss 连续多轮变化很小，系统判断模型已经基本收敛并提前停止",
    explanation: "自动演示允许提前停止。如果 Loss 连续多轮变化很小，系统会认为模型已经基本收敛，因此当前轮次可能小于设置的最大训练轮数。"
  },
  {
    id: "evaluate_metrics",
    module: "模型评估",
    title: "模型评估",
    page: "evaluate",
    step: "metrics",
    operation: "请观察左侧 RM 特征训练得到的回归线与散点分布，并依次点击查看 RMSE、MAE 和 R² 三个评估指标。",
    hint: "RMSE 和 MAE 越小通常越好，R² 越接近 1 通常拟合越好。",
    question: "当前模型已经完成训练并基本收敛，但评估指标显示拟合效果一般，这更可能说明什么？",
    type: "single",
    options: [
      "只要训练收敛，RMSE、MAE 和 R² 一定都会非常理想",
      "模型一定训练失败，不能用于任何预测",
      "模型在当前单特征条件下已经尽力拟合，但仅使用 RM 一个特征无法解释 MEDV 的全部变化",
      "评估指标一般说明数据集被删除了"
    ],
    answer: "模型在当前单特征条件下已经尽力拟合，但仅使用 RM 一个特征无法解释 MEDV 的全部变化",
    explanation: "训练收敛只说明当前参数已经较稳定，并不代表单特征线性模型能解释目标值的全部变化。只使用 RM 时，模型可能已经尽力拟合，但仍会遗漏其他影响 MEDV 的因素。"
  },
  {
    id: "predict_input",
    module: "模型预测",
    title: "模型预测",
    page: "predict",
    step: "predict",
    operation: "请确认当前模型来自前面“自定义参数训练”步骤，特征为 RM。在右侧输入类型中选择“原始特征值”，输入 6.5，点击“开始预测”。观察左侧预测点、右侧预测结果卡片和下方预测计算过程，记录模型输入 x、预测 MEDV 以及计算过程中的标准化与还原步骤。",
    hint: "线性回归预测会使用当前模型参数和输入特征值计算预测结果。",
    question: "当输入原始值 RM=6.5 并点击“开始预测”后，模型预测的 MEDV 大约是多少？",
    type: "single",
    options: ["24.50", "20.12", "28.87", "22.96"],
    answer: "24.50",
    explanation: "在当前设计的 RM 单特征模型下，输入原始值 RM=6.5 后，预测 MEDV 约为 24.50。"
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
    activeTrainStep = node.step;
    viewStateStore.activeTrainStepV1 = node.step;
    markTrainProgress?.(node.step);
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
      dataset: document.querySelector("#datasetSelect")?.value || "boston_housing"
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
  const codeButton = target.closest("[data-preprocess-code], [data-train-code], [data-evaluate-code], [data-predict-code]");
  if (codeButton) {
    recordExperimentBehavior("view_code", {
      code: codeButton.dataset.preprocessCode || codeButton.dataset.trainCode || codeButton.dataset.evaluateCode || codeButton.dataset.predictCode || ""
    });
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

