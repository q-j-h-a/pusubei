# Web UI 结构说明

本文档记录当前简单线性回归教学实验的前端页面结构、主要交互、状态规则、理论课件页和实验测试模块，方便后续维护和扩展。

## 1. 总体布局

页面采用三栏结构：

```text
body
└─ .app
   ├─ header.topbar
   └─ .shell
      ├─ aside.sidebar
      ├─ .splitter.splitter-left
      ├─ main.main#main
      ├─ .splitter.splitter-right
      └─ aside.assistant
         └─ #rightPanel
```

默认宽度变量：

```text
--sidebar-width: 16%;
--main-width: 64%;
--assistant-width: 20%;
```

左侧为导航，中间为主要教学内容，右侧为当前页面控制面板。理论页进入 `.shell.theory` 模式后会隐藏右侧控制面板，只保留左侧导航和中间课件区域。

## 2. 左侧导航

左侧导航分为理论部分和实验部分。

理论部分：

```text
实验基本信息
实验目的
前置知识
模型介绍
  数据集
  训练模型
  学习准则
  参数优化
  评价指标
预期成果
思考拓展
```

实验部分：

```text
数据预处理
模型训练
模型评估
模型预测
实验测试
```

导航按钮通过 `data-page` 切换页面：

```text
button.nav-btn click -> setPage(btn.dataset.page)
```

页面分发主要在 `static/js/app_shell.js`：

```text
preprocess       -> renderPreprocessShell()
train_eval       -> renderTrainShell()
evaluate         -> renderEvaluateShell()
predict          -> renderPredictShell()
experiment_test  -> renderExperimentTestPage()
理论页           -> renderTheory(page)
```

## 3. 理论课件页

理论部分由以下文件组成：

```text
static/js/theory_page_registry.js
static/js/theory-pages/basic.js
static/js/theory-pages/purpose.js
static/js/theory-pages/knowledge.js
static/js/theory-pages/dataset.js
static/js/theory-pages/model.js
static/js/theory-pages/criterion.js
static/js/theory-pages/optimization.js
static/js/theory-pages/evaluation.js
static/js/theory-pages/result.js
static/js/theory-pages/thinking.js
static/js/theory_page.js
static/theory_deck_overrides.json
```

理论页结构：

```text
.theory-deck-shell
├─ .theory-deck-toolbar
├─ .theory-editor-tools
└─ .theory-slide-viewport
   └─ .theory-slide
      └─ .theory-component
```

主要能力：

- 只读模式浏览理论课件。
- 编辑课件内容，且在详情页编辑下支持双栏 **物理段落高度插值映射同步滚动**（方案四：基于内容指纹虚拟桥接与段落内外双重插值映射系统，实现每一行文字、列表及代码块绝对对齐且打字防闪烁）。
- 插入文本、卡片、项目符号、公式、图表、图片。
- 拖拽、缩放和删除组件。
- 保存课件覆盖数据。
- 导出 PDF 与 **下载 Word 讲义**（自动等比例重绘，合并 10 个理论部分，公式映射为 Word 原生可编辑的 MathML，图表高清嵌入，排版完美符合 A4 学术规格且无多余白页）。

理论页样式集中在 `templates/index.html` 中 `.theory-*` 相关 CSS。同步理论功能时，不要只同步 JS，也要同步理论样式和 `theory_deck_overrides.json`。

## 4. 中间主内容区

中间内容容器固定为：

```text
main.main#main
```

实验页通常使用：

```text
.dashboard-grid.grid-stack
└─ .grid-stack-item
   └─ .grid-stack-item-content
      └─ section.chart-card
```

GridStack 用于图表卡片布局和拖拽调整。页面切换时需要销毁旧 grid 和旧 ECharts 实例，避免残留。

## 5. 右侧控制面板

右侧控制面板渲染位置：

```text
aside.assistant
└─ #rightPanel
```

视觉约定：

- 页面标题使用 `.right-title`。
- 控制面板主体使用 `.control-card`。
- 主要按钮使用 `.primary-btn`。
- 次要按钮使用 `.secondary-btn`。
- 查看代码按钮通常附加 `.code-toggle-btn`。
- 同组按钮放在同一个父容器中，用 `gap` 控制间距。

普通实验模式和测试模式下，原右侧控制面板都保持功能不变，只在当前功能卡片标题下方插入“查看测试内容”按钮。按钮不插入 `.guide-control-card`，避免和界面引导开关混在一起。

界面引导卡片结构：

```text
.control-card.guide-control-card
├─ h3 界面引导
├─ 全局引导 switch
└─ 当前页面引导 switch
```

全局引导开关保存到 `localStorage`。当前页面引导状态只保存在本次页面运行的 `viewStateStore` 中，刷新后默认重新打开。

## 6. 数据预处理页

入口文件：

```text
static/js/preprocess_page.js
```

步骤：

```text
01 加载原始数据
02 数据详情
03 原始数据可视化
04 数据标准化
05 标准数据可视化
```

顶部步骤条：

```text
.preprocess-flow#preprocessFlow
├─ button[data-preprocess-step="load"]
├─ button[data-preprocess-step="detail"]
├─ button[data-preprocess-step="raw_viz"]
├─ button[data-preprocess-step="standardize"]
└─ button[data-preprocess-step="standard_viz"]
```

代码重点：

```python
data = pd.read_csv("boston_housing.csv")
X = data.drop(columns=["MEDV"])
y = data["MEDV"]

mean = X.mean()
std = X.std(ddof=0)
X_scaled = (X - mean) / std
```

加载原始数据步骤的界面引导由 `static/js/preprocess_page.js` 管理，当前流程为：

```text
01 高亮“查看测试内容”
02 高亮测试题弹窗
03 高亮测试题右上角关闭按钮
04 高亮数据集下拉框
05 高亮“加载数据集”
06 高亮中间结果卡片
07 高亮“查看本步骤代码”
08 高亮代码抽屉
```

规则：

- 第 1 步和第 7 步只高亮真实按钮，不在引导卡片里提供替代点击按钮。
- 第 2、3、8 步不额外创建引导遮罩，避免盖住测试弹窗或代码抽屉自身。
- 第 6 步卡片按钮文案为“下一步”。
- 第 8 步点击“完成本页引导”或“关闭引导”时，会同步关闭代码抽屉。
- 当前页面引导关闭后，本次运行内不再自动出现；刷新页面后若全局引导开启，会从第 1 步重新开始。
- 原始数据可视化、数据标准化和标准数据可视化的特征选择互不影响，分别保存到 `rawVizFormStateV1`、`standardizeFormStateV1` 和 `standardVizFormStateV1`。
- 这三个小模块不从其它小模块继承 `dataCache.feature`；没有保存过特征时默认使用当前数据集的第一个特征。

相关样式：

```text
.guide-backdrop
.guide-popover
.guide-focus-ring
.guide-highlight
.guide-highlight-large
```

## 7. 模型训练页

入口文件：

```text
static/js/train_page.js
```

步骤：

```text
01 熟悉回归过程
02 熟悉预处理影响
03 熟悉损失函数
04 熟悉优化准则
05 自定义参数训练
```

核心代码：

```python
w = 0
b = 0
learning_rate = 0.03

for epoch in range(epochs):
    y_pred = w * x + b
    loss = np.mean((y - y_pred) ** 2)

    dw = -2 * np.mean(x * (y - y_pred))
    db = -2 * np.mean(y - y_pred)

    w = w - learning_rate * dw
    b = b - learning_rate * db
```

训练页需要让学生观察拟合线、Loss、参数路径和梯度下降过程。

训练页表单状态按小模块保存到 `trainFormStateByStepV1`。五个训练小模块的特征选择互不影响，默认特征统一为 `CRIM`，默认周期数统一为 `120`。

自动演示停止规则：

- 达到当前设置的最大周期数时停止。
- Loss 出现异常或明显发散时停止。
- Loss 连续多轮几乎不变时视为收敛并提前停止。因此自动演示的当前周期可能小于周期数输入框中的值。

## 8. 模型评估页

入口文件：

```text
static/js/evaluate_page.js
```

评估页依赖当前训练结果。若没有训练结果，应显示空状态并提示先完成训练。

支持指标：

```text
RMSE
MAE
R²
```

代码示例：

```python
y_pred = w * x + b
mse = np.mean((y - y_pred) ** 2)
rmse = np.sqrt(mse)

mae = np.mean(np.abs(y - y_pred))

ss_res = np.sum((y - y_pred) ** 2)
ss_tot = np.sum((y - np.mean(y)) ** 2)
r2 = 1 - ss_res / ss_tot
```

评估页重点是解释指标含义，而不是重新训练模型。

## 9. 模型预测页

入口文件：

```text
static/js/predict_page.js
```

预测页依赖当前训练结果。没有训练结果时显示空状态。

预测页右侧结构：

```text
#rightPanel
└─ .control-card.predict-control-card
   ├─ h3 模型预测
   ├─ .mini-stats
   ├─ 当前模型
   ├─ 特征选择
   ├─ 输入类型
   ├─ 输入特征值
   └─ .predict-actions
      ├─ 开始预测
      └─ 查看预测代码
```

预测输入使用：

```html
<input id="predictInput" type="text" inputmode="decimal" autocomplete="off">
```

交互规则：

- 修改输入值只保存表单状态，不刷新预测图表。
- 修改输入类型只保存选择状态，不刷新预测图表。
- 点击“开始预测”或在输入框按 Enter 后，才执行预测。
- 切换训练模型或重新训练后，预测结果应回到待预测状态。

## 10. 代码解释层

代码抽屉结构：

```text
.code-drawer-backdrop
└─ aside.code-drawer
   ├─ .code-drawer-head
   ├─ .code-operation
   ├─ .code-block-head
   ├─ pre.teaching-code
   └─ .code-explain
```

关闭规则：

- 只能通过右上角关闭按钮关闭。
- 点击遮罩或页面其他位置不关闭。
- 这是为了避免学生阅读代码时误触导致面板消失。

代码展示原则：

- 以 Python / NumPy 风格为主。
- 不展示 ECharts、GridStack、DOM 等前端工程代码。
- 代码与当前页面状态联动，例如特征、学习率、w、b、输入类型和指标模式。

## 11. 实验测试模块

入口文件：

```text
static/js/experiment_test.js
```

左侧新增：

```text
实验测试
```

整体流程：

```text
点击实验测试
-> 进入测试说明页
-> 点击开始实验测试
-> 重置四个实验模块状态
-> 自动进入第一个测试节点
-> 学生在原实验页操作
-> 点击右侧查看测试内容
-> 弹窗答题
-> 提交并查看反馈
-> 进入下一题
-> 最后一题提交后显示测试结果
```

测试模式下右侧按钮插入位置：

```text
.control-card
├─ h3 当前模块标题
├─ [查看测试内容]
├─ 原有控件
└─ 原有操作按钮 / 查看代码按钮
```

普通实验模式下也会在同一位置插入“查看测试内容”，作为随堂测试入口。随堂测试不锁定左侧导航，不推进完整测试进度，也不显示“进入下一题”按钮。

测试弹窗结构：

```text
.test-modal-backdrop
└─ .test-modal
   ├─ .test-modal-head
   ├─ .test-meta
   ├─ .test-section 操作要求
   ├─ .test-section 测试问题
   └─ .test-modal-actions
```

弹窗不再显示“观察提示”。如果同一个 `page + step` 有多道题，会合并在同一个弹窗里一次展示、一次提交。

答题规则：

- 单选题初始不默认选择任何选项。
- 普通实验模式下提交后只显示“回答正确/回答错误”和解析。
- 完整实验测试模式下提交后按测试流程推进，最后展示成绩和答题详情。
- 只有完整实验测试模式会记录正式学习过程证据；自由实验和普通随堂任务提示不进入正式行为记录。
- 测试结果页展示答题结果，同时展示总用时、各模块用时、各小模块用时、关键行为计数和学习过程提示。

测试状态：

```js
experimentTestStateV1 = {
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
}
```

`behavior` 结构用于保存一次正式测试的过程证据，核心字段包括：

```js
{
  sessionId: "",
  startTime: 0,
  endTime: 0,
  totalDurationMs: 0,
  moduleDurations: {},
  stepDurations: {},
  actionCounts: {},
  stepActions: {},
  events: [],
  flags: []
}
```

当前通用关键行为包括查看测试内容、加载数据集、查看代码、切换特征、调整参数、单步训练、自动演示、切换评估指标、输入预测值和开始预测。`flags` 仅作为学习过程复核提示，不直接判定作弊。

重要规则：

- 普通实验模式下显示“查看测试内容”，用于当前步骤随堂测试。
- 测试模式下左侧实验导航和顶部步骤条锁定。
- 已提交但未进入下一题时，重新打开弹窗应恢复反馈状态。
- 最后一题提交后不显示“下一题”，直接显示测试结果。
- 结果页中间区域展示总成绩、分模块成绩和答题详情。
- 重新开始测试和返回自由实验按钮统一放在右侧控制面板。

## 12. 状态存储

前端状态主要保存在 `viewStateStore` 中。常见 key：

```text
activePreprocessStepV1
preprocessProgressStepV1
activeTrainStepV1
trainProgressStepV1
trainFormStateByStepV1
evaluateMetricModeV1
predictFormStateV1
currentDatasetMetaV1
experimentTestStateV1
guideGlobalEnabledV1
guidePageStateV1
```

维护原则：

- 表单输入变化可以保存状态。
- 数据预处理页中 `raw_viz`、`standardize`、`standard_viz` 的特征选择按小模块分别保存，互不继承。
- 模型训练页表单状态按训练小模块分别保存，避免特征、参数和动画速度在不同小模块之间串用。
- 保存状态不等于执行计算。
- 图表刷新应由明确动作触发，例如加载数据、开始训练、开始预测、提交测试答案。
- 全局引导开关持久化到 `localStorage`。
- 当前页面引导状态只保存在 `viewStateStore`，刷新后默认重新启用。

## 13. 后端接口

主要接口：

```text
GET  /
GET  /api/experiments
GET  /api/dataset_profile
GET  /api/page_schema
GET  /api/chart_registry
GET  /api/theory_deck_overrides
POST /api/theory_deck_overrides
POST /api/run_action
POST /api/chart_data
```

理论课件保存接口：

```text
GET  /api/theory_deck_overrides
POST /api/theory_deck_overrides
```

`POST` 请求体：

```json
{
  "page_id": "dataset",
  "deck": {}
}
```

## 14. Docker 与反向代理部署

当前项目可通过根目录 `Dockerfile` 构建镜像。Flask/Gunicorn 在容器内部监听 `0.0.0.0:5000`：

```text
container:5000
```

服务器宿主机不需要继续使用 `5000`，可以映射到任意未占用端口，避免和已有项目冲突：

```bash
docker build -t simple-linear-regression:latest .
docker run -d --name simple-linear-regression -p 15000:5000 simple-linear-regression:latest
```

端口含义：

```text
host:15000 -> container:5000
```

Nginx 可代理到宿主机本地端口。根路径部署示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:15000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

二级目录部署示例：

```nginx
location = /wj1xbghs {
    return 301 /wj1xbghs/;
}

location /wj1xbghs/ {
    proxy_pass http://127.0.0.1:15000/;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_redirect off;
}
```

当前前端已支持二级目录前缀：`templates/index.html` 中静态脚本使用相对 `static/...` 路径；`static/js/api.js` 会根据当前访问路径自动为 `/api/...`、`/static/...` 添加一级路径前缀。因此二级目录部署时不需要使用 Nginx `sub_filter`。

如果访问路径为 `/wj1xbghs/`，浏览器中的请求应表现为：

```text
/wj1xbghs/static/js/...
/wj1xbghs/api/run_action
```

如果修改二级目录名称，只需要同步修改 Nginx 的 `location` 前缀。推荐优先使用独立域名或子域名代理到站点根路径 `/`，二级目录适合服务器上已有多个项目共用同一域名或 IP 时使用。

## 15. 样式维护要点

- 不要把卡片嵌套在卡片里。
- 右侧控制面板按钮应放在统一父容器中，通过 `gap` 管理间距。
- 预测页的“开始预测”和“查看预测代码”必须同宽、同容器。
- 测试页的右侧按钮使用 `.test-side-actions` 管理间距。
- “查看测试内容”按钮插入当前功能卡片，不插入界面引导卡片。
- 引导高亮样式集中在 `.guide-*`，大面积目标使用 `.guide-highlight-large` 降低呼吸效果强度。
- 理论页样式集中在 `.theory-*`，同步理论功能时要同时检查模板样式。
- 左侧“模型介绍”的下拉符号使用 `&rsaquo;`，避免编码问题变成问号。

## 16. 验证命令

```bash
python -m compileall app.py core models
node --check static/js/api.js
node --check static/js/app_shell.js
node --check static/js/chart_renderers.js
node --check static/js/control_renderers.js
node --check static/js/evaluate_page.js
node --check static/js/experiment_runtime.js
node --check static/js/experiment_test.js
node --check static/js/predict_page.js
node --check static/js/preprocess_page.js
node --check static/js/schema_registry.js
node --check static/js/state_runtime.js
node --check static/js/theory_page.js
node --check static/js/theory_page_registry.js
node --check static/js/train_page.js
node --check static/js/view_renderers.js
```

理论拆分页：

```bash
node --check static/js/theory-pages/basic.js
node --check static/js/theory-pages/purpose.js
node --check static/js/theory-pages/knowledge.js
node --check static/js/theory-pages/dataset.js
node --check static/js/theory-pages/model.js
node --check static/js/theory-pages/criterion.js
node --check static/js/theory-pages/optimization.js
node --check static/js/theory-pages/evaluation.js
node --check static/js/theory-pages/result.js
node --check static/js/theory-pages/thinking.js
```
## 17. 当前交互补充

### 17.1 查看测试内容的定位

实验部分每个模块右侧的“查看测试内容”用于展示当前页面的操作要求和观察目标，不再作为答题测验使用。

- 弹窗标题应表达为“任务提示”或“实验任务”。
- 选项只用于展示观察问题的参考项，不能点击，也不记录选择状态。
- 弹窗底部不显示“提交答案”按钮。
- 学生点击“完成本步引导”或完整完成当前模块引导后，应自动再次看到当前页面的任务提示，帮助学生回到“现在要做什么”；点击“关闭引导”只退出当前引导，不自动弹出任务提示。

### 17.2 数据预处理引导流程补充

数据预处理模块的首次“加载原始数据”引导中，学生点击任务提示里的“我知道了”后，不再额外引导关闭弹窗右上角的叉号，而是直接进入“选择要加载的数据集”步骤。

这样可以减少重复动作：任务提示负责说明目标，关闭任务提示后，学习引导立即回到实验界面操作。

### 17.3 模型训练默认参数

模型训练页中几个训练相关小模块的默认特征统一为 `CRIM`，默认周期数统一为 `120`，包括：

- 熟悉回归过程
- 熟悉预处理影响
- 熟悉损失函数
- 熟悉优化准则
- 自定义参数训练

五个小模块分别使用 `trainFormStateByStepV1` 中各自的表单状态；切换特征、学习率、周期数或动画速度只影响当前小模块。

自动演示允许因收敛提前停止：如果 Loss 连续多轮几乎不变，系统会视为模型已经收敛并停止播放。这个停止点可能早于周期数输入框中的值。

### 17.4 训练图固定尺度

训练相关散点图和残差图默认使用 `w=0`、`b=0` 时的自适应坐标范围作为全程固定尺度。

- 不显示“固定坐标”图例项或按钮。
- 特征或数据尺度变化后重新计算固定尺度，但计算基准仍然是 `w=0`、`b=0`。
- 训练过程中保持坐标轴范围不变，只更新回归模型、残差或相关曲线。

### 17.5 熟悉回归过程引导

“熟悉回归过程”小模块主要帮助学生认识训练页上可操作的区域。推荐引导顺序如下：

1. 高亮“特征选择”，说明这里决定用哪个输入特征训练简单线性回归。
2. 高亮参数区域，说明 `w`、`b`、学习率、周期数和动画速度会影响模型更新。
3. 高亮四个训练按钮，包含按钮之间的间隙，说明可以单步训练、自动演示、暂停或重置。
4. 高亮标准化散点图，说明训练时观察当前回归线如何逐步靠近最优参考线。

高亮时必须保证目标区域完整显示在视口内，避免只露出局部控件。

### 17.6 熟悉预处理影响引导

“熟悉预处理影响”小模块用于让学生直观看到原始尺度和标准化尺度下训练表现的差异，并感受学习率对训练步长的影响。

推荐引导顺序如下：

1. 高亮“特征选择”。
2. 高亮“单步训练”，让学生先执行一次训练更新。
3. 将原始散点图和标准化散点图作为一个整体同时高亮，对比两种尺度下回归线的变化。
4. 高亮学习率区域，点击引导按钮时把学习率精确设置为 `0.003`。
5. 再次高亮“单步训练”，让学生观察较小学习率下的更新幅度。
6. 再次整体高亮两个散点图，引导学生比较学习率改变后模型更新的差异。

学习率设置步骤中，学习率框内的滑块、数值和上下调节按钮都应处在高亮区域内。

### 17.7 熟悉损失函数引导

“熟悉损失函数”小模块用于让学生从单个样本残差，逐步过渡到整体误差分布和残差直方图。

推荐引导顺序如下：

1. 高亮“特征选择”，说明特征会影响预测值、残差和 MSE。
2. 高亮“随机 10 个样本”，要求学生真实点击该按钮。
3. 点击后先高亮左侧“残差与回归线”图，让学生观察多个样本的残差线。
4. 点击“下一步”后，高亮右侧“整体误差分布”图，说明 MSE 来自所有样本预测误差的平方平均。
5. 再高亮右侧“残差直方图”，观察残差集中程度和偏移情况。
6. 最后高亮“单步训练”，让学生通过一次参数更新观察残差和整体误差的变化。

损失函数引导应由用户动作推进，例如点击“随机 10 个样本”或“单步训练”。图表重绘不应自动重置或重复触发引导，否则容易在“特征选择”和“随机 10 个样本”之间来回跳动。

### 17.8 熟悉优化准则引导

“熟悉优化准则”小模块用于让学生从参数空间理解梯度下降方向、更新轨迹和 Loss 下降趋势。

当前引导顺序如下：

1. 高亮“特征选择”。
2. 高亮参数区域，点击引导按钮时自动设置 `w=10`、`b=5`，并重新准备训练数据。
3. 高亮“单步训练”，要求学生真实点击该按钮。
4. 高亮 `3D Loss 曲面图`，说明 `J(w,b)` 是参数空间中的整体地形。
5. 高亮 `Loss 等高线图`，说明红点、负梯度方向和更新轨迹。
6. 高亮 `MSE Loss 随 epoch 的变化`，观察单步更新后 Loss 是否下降。

### 17.9 自定义参数训练引导

“自定义参数训练”小模块用于收束训练页前面几节内容，让学生把特征、参数、单步训练、图表观察和本轮计算过程连起来。

当前引导顺序如下：

1. 高亮“特征选择”。
2. 高亮参数区域，说明 `w`、`b`、学习率、周期数和动画速度的作用。
3. 高亮“单步训练”，要求学生真实点击该按钮。
4. 将 `标准化散点图` 和 `MSE Loss 随 epoch 的变化` 作为一个整体高亮，观察模型效果和 Loss 变化。
5. 将 `w 参数轨迹图` 和 `b 参数轨迹图` 作为一个整体高亮，观察两个参数如何共同更新。
6. 高亮 `本轮计算过程`，说明当前轮次的预测、误差、Loss、梯度和参数更新来源。

双图高亮使用组合目标：

```text
.train-custom-effect-combo-target
.train-custom-param-combo-target
```

组合目标需要覆盖两张图和中间间隙，并在 `templates/index.html` 中设置白底高亮，避免 gap 被 `.guide-backdrop` 压暗。

### 17.10 模型评估引导

模型评估页引导围绕上一节自定义参数训练得到的当前模型展开，不重新训练模型。

当前引导顺序如下：

1. 高亮 `标准化散点图`，说明当前回归线来自自定义参数训练后的模型。
2. 高亮 `评估指标图`，默认展示 `RMSE`，说明整体预测误差，越小越好。
3. 点击“下一步”自动切换为 `MAE`，说明平均绝对误差，越小越好且对大误差更平稳。
4. 点击“下一步”自动切换为 `R²`，说明解释能力，越接近 1 越好。

相关状态：

```text
evaluateMetricModeV1
evaluate_metrics
```

### 17.11 模型预测引导

模型预测页引导用于把当前训练模型、新输入、预测图表和计算过程串起来。

当前引导顺序如下：

1. 高亮右侧“当前模型”卡片，说明预测使用自定义参数训练得到的模型，并展示特征、`w`、`b`。
2. 高亮“输入类型”和“输入特征值”，点击引导按钮时自动设置为“原始特征值”并填入 `6.5`。
3. 高亮“开始预测”按钮，要求学生真实点击按钮；预测成功后推进到图表观察。
4. 将 `预测可视化` 和 `原始散点图` 作为一个整体高亮，说明左图是标准化空间中的预测点，右图是原始数据空间中的预测点。
5. 高亮 `预测计算过程`，说明输入标准化、代入 `y = wx + b` 和反标准化输出 MEDV。

双图高亮使用组合目标：

```text
.predict-chart-combo-target
```

该组合目标需要覆盖两张图和中间间隙，并在 `templates/index.html` 中设置白底高亮，避免中间 gap 被引导遮罩压暗。
