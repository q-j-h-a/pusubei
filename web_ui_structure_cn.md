# Web UI 结构说明

本文档记录当前项目的页面结构、右侧控制面板、图表卡片和自主实验交互规则。入口文件为 `templates/index.html`，主要前端逻辑位于 `static/js/`。

## 1. 整体布局

```text
body
└─ .app
   ├─ header.topbar
   │  ├─ .brand
   │  └─ .top-actions.hidden-top
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

左右栏拖拽由 `static/js/app_shell.js` 处理，宽度写入 `localStorage`。切换页面时，`setPage(page)` 会更新左侧导航、主内容区和右侧面板，并触发图表 resize。

## 2. 左侧导航

```text
aside.sidebar
├─ 理论部分
│  ├─ 实验基本信息
│  ├─ 实验目的
│  ├─ 前置知识
│  ├─ 模型介绍
│  │  ├─ 数据集
│  │  ├─ 训练模型
│  │  ├─ 学习准则
│  │  ├─ 参数优化
│  │  └─ 评价指标
│  ├─ 预期成果
│  └─ 思考拓展
└─ 实验部分
   ├─ 数据预处理
   ├─ 模型训练与评估
   ├─ 模型预测
   └─ 自主实验
```

导航按钮点击后调用：

```text
button.nav-btn click -> setPage(btn.dataset.page)
```

## 3. 主内容区

主内容挂载点：

```text
main.main#main
```

### 3.1 理论页

文件：`static/js/theory_page.js`

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .html-lesson[data-theory-html]
      └─ iframe
```

理论 HTML 位于 `static/theory-html/<page>.html`。

### 3.2 数据预处理页

文件：`static/js/preprocess_page.js`

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .chart-grid#chartGrid
      └─ GridStack items / chart-card
```

主要流程：

```text
renderDataShell()
└─ loadDataView()
   ├─ runAction("data_view")
   ├─ loadDataChartData(views)
   └─ renderDataDashboard(grid, views)
```

### 3.3 模型训练与评估页

文件：`static/js/train_page.js`

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .chart-grid#chartGrid
      ├─ 模型训练图
      ├─ 学习准则图
      ├─ Loss 等高线图
      ├─ Loss 三维曲面图
      ├─ 梯度下降图
      ├─ w 参数轨迹
      ├─ b 参数轨迹
      ├─ RMSE
      ├─ MAE
      ├─ R2
      ├─ 本轮计算过程
      └─ 每轮参数表
```

RMSE、MAE、R2 使用同一套训练页仪表盘样式。

### 3.4 模型预测页

文件：`static/js/predict_page.js`

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .chart-grid#chartGrid
      ├─ 预测可视化
      ├─ 预测计算过程
      ├─ 预测输入与结果
      └─ 相近样本对比
```

当前主要使用 `预测可视化` 和 `预测计算过程` 两张图。预测支持：

- 原始特征输入：先按训练数据的 mean/std 转为模型输入，再代入模型。
- 标准化特征输入：直接代入模型，同时反推对应原始特征值用于可视化。

### 3.5 自主实验页

文件：`static/js/student_page.js`

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ #studentWorkspace
      ├─ .stage-strip#studentStageStrip
      └─ .chart-grid#studentChartGrid
```

自主实验主内容按当前阶段渲染：

```text
01 数据集
02 数据预处理
03 模型训练与评估
04 模型预测
```

## 4. 右侧控制面板

右侧挂载点：

```text
aside.assistant
└─ #rightPanel
```

右侧面板由 `static/js/control_renderers.js` 生成。

### 4.1 数据预处理

```text
#rightPanel
└─ .control-card
   ├─ .mini-stats
   ├─ .control-group 特征选择
   │  └─ select#dataFeature
   ├─ .control-group 显示模式
   │  └─ details.mode-menu input[name=dataViews]
   └─ 预处理 / 看图按钮
```

### 4.2 模型训练与评估

```text
#rightPanel
└─ .control-card
   ├─ .mini-stats
   ├─ .control-group 训练数据版本
   │  ├─ select#trainStd
   │  └─ select#trainFeature
   ├─ .control-group 训练图表
   │  └─ details.mode-menu input[name=trainViews]
   ├─ .control-group 初始参数
   │  ├─ input#w0
   │  └─ input#b0
   ├─ .control-group 训练控制
   │  ├─ input#lr[type=range]
   │  ├─ input#epochs[type=range]
   │  └─ input#speed[type=range]
   ├─ .button-grid
   └─ .runtime
```

### 4.3 模型预测

```text
#rightPanel
└─ .control-card
   ├─ .mini-stats / 当前模型信息
   ├─ .control-group 数据版本与特征选择
   │  ├─ select#predictStd
   │  └─ select#predictFeature
   ├─ .control-group 输入
   │  ├─ select#predictInputMode
   │  └─ input#predictInput
   ├─ .control-group 显示模式
   │  └─ details.mode-menu input[name=predictViews]
   └─ #predictRun
```

### 4.4 自主实验

自主实验使用定制面板 `studentPanelHtml()`，阶段外层使用 `.control-card.student-stage-card`，阶段内使用 `.control-group` 分区。

当前规则：

- `01 数据集` 支持上传 CSV 或加载内置数据集。
- CSV 最后一列固定作为目标列 `y`，且不参与标准化。
- 其余数值列作为特征列，预处理后生成 `特征名_standardized`。
- `02 数据预处理` 支持原始散点图、预处理散点图、单特征线性相关系数、全特征线性相关系数。
- `03 模型训练与评估` 中，训练数据版本默认选择 `标准化特征`。
- `03 模型训练与评估` 的状态徽标在初始和重置后为 `未训练`，训练一轮或自动训练后为 `已训练`。
- `评估标准图` 是 3 个横向布置的仪表盘，样式与模型训练与评估页的 RMSE、MAE、R2 仪表盘保持一致。
- `04 模型预测` 默认展开，右侧状态徽标初始为 `待预测`，预测成功后变为 `已预测`。
- `04 模型预测` 右侧内容依次为当前模型、输入类型、输入特征值、显示图表、准备预测、开始预测。
- 自主实验预测默认展示 `预测可视化` 和 `预测计算过程` 两张图，与模型预测页保持一致。
- 点击准备预测时，如果尚未训练，会提示先完成 `03 模型训练与评估`；如果已训练，则先展示默认两张预测图。
- 点击开始预测时，会使用当前训练帧的 `w`、`b`、`epoch`，并根据输入类型完成原始特征/标准化特征转换和预测计算。
- 自主实验的 `预测计算过程` 与模型预测页使用同一套展示逻辑。

右侧结构：

```text
01 数据集
├─ 上传 CSV 数据集
└─ 数据类型 + 加载数据集

02 数据预处理
├─ 特征选择
├─ 显示模式
└─ 预处理 / 看图

03 模型训练与评估
├─ 训练数据版本
├─ 训练状态徽标
├─ 训练图表
├─ 初始参数
└─ 训练控制

04 模型预测
├─ 当前模型
├─ 输入类型
├─ 输入特征值
├─ 显示图表
├─ 准备预测
└─ 开始预测
```

## 5. 图表卡片与交互

图表卡片统一由 `static/js/view_renderers.js` 的 `chartCardHtml()` 生成：

```text
section.chart-card.chart-interaction-prototype
├─ .chart-head
│  ├─ .chart-title
│  └─ .chart-sub
└─ .chart#chart_<key>
```

GridStack 包装层：

```text
.chart-grid.grid-stack
└─ .grid-stack-item[data-view=<view>]
   └─ .grid-stack-item-content
      └─ section.chart-card
```

GridStack 初始化：

```text
GridStack.init({
  column: 4,
  cellHeight: 260,
  margin: 8,
  float: true,
  animate: true,
  draggable: { handle: ".chart-head" },
  resizable: { handles: "e, s, se" }
})
```

布局存储 key：

```text
preprocess -> preprocessGridLayoutV4
train      -> trainGridLayoutV2
predict    -> predictGridLayoutV1
student    -> studentGridLayoutV1
```

自主实验预测显示模式存储 key：

```text
studentPredictSelectedViewsV2
```

## 6. 数据流

```text
右侧控制面板
  -> 页面 JS 读取表单
  -> runAction(action, payload)
  -> POST /api/run_action
  -> models/simple_linear_regression/model.py
  -> 返回 context_id / history / prediction / preview
  -> 页面 JS 根据 views 请求图表数据
  -> POST /api/chart_data
  -> models/simple_linear_regression/charts/*
  -> chart_renderers.js 生成 ECharts option
  -> ECharts 渲染到 .chart#chart_xxx
```

## 7. 关键文件职责

```text
templates/index.html
  页面骨架、基础 CSS、左右侧栏、主内容区和右侧控制面板挂载点

static/js/app_shell.js
  页面切换、导航状态、左右栏拖拽、全局 resize

static/js/state_runtime.js
  GridStack 初始化、布局存储、视图选择存储、图表 resize

static/js/control_renderers.js
  右侧控制面板渲染

static/js/view_renderers.js
  主内容区图表卡片、表格、计算过程 HTML 渲染

static/js/chart_renderers.js
  ECharts option 渲染

static/js/student_page.js
  自主实验 4 阶段流程、训练帧切换、预测准备与预测执行

models/simple_linear_regression/model.py
  后端 action 入口、训练、预测、自主实验数据处理

models/simple_linear_regression/controls/student.py
  自主实验右侧控制 schema

models/simple_linear_regression/charts/student/
  自主实验各图表数据构造
```
