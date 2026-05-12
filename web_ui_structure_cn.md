# Web 界面结构图

本文说明当前 Web 界面的层级结构：左侧导航、中间主工作区、右侧控制面板，以及图表 Grid、下拉框、按钮、统计卡片等 UI 元素分别由哪些文件生成。

## 1. 总体三栏布局

当前页面根结构定义在 `templates/index.html`。

```text
body
└─ .app
   ├─ header.topbar                         顶部栏
   │  ├─ .brand
   │  │  ├─ .logo                           ML 标识
   │  │  └─ 标题 + 副标题
   │  └─ .top-actions.hidden-top
   │     ├─ #topFeature                     当前特征提示
   │     └─ #jumpExperiment                 跳转实验按钮
   │
   └─ .shell                                主体三栏 Grid
      ├─ aside.sidebar                      左侧导航栏
      ├─ main.main#main                     中间主内容区
      └─ aside.assistant                    右侧控制面板区
         └─ #rightPanel
```

CSS Grid 主体：

```text
.shell {
  grid-template-columns: 250px minmax(0, 1fr) 320px;
}
```

也就是：

```text
左侧导航 250px | 中间内容自适应 | 右侧控制面板 320px
```

理论页会切换成：

```text
.shell.theory {
  grid-template-columns: 250px minmax(0, 1fr);
}
```

也就是理论页隐藏/清空右侧控制面板，只保留左侧 + 中间内容。

## 2. 左侧导航结构

左侧导航由 `templates/index.html` 静态写入。

```text
aside.sidebar
├─ details.nav-section open                 理论部分
│  ├─ summary                               分组标题
│  └─ .step-list
│     ├─ button.nav-btn[data-page=basic]
│     ├─ button.nav-btn[data-page=purpose]
│     ├─ button.nav-btn[data-page=knowledge]
│     ├─ details.nested-section             模型介绍子分组
│     │  ├─ button.nav-btn[data-page=dataset]
│     │  ├─ button.nav-btn[data-page=model]
│     │  ├─ button.nav-btn[data-page=criterion]
│     │  ├─ button.nav-btn[data-page=optimization]
│     │  └─ button.nav-btn[data-page=evaluation]
│     ├─ button.nav-btn[data-page=result]
│     └─ button.nav-btn[data-page=thinking]
│
└─ details.nav-section open                 实验部分
   └─ .step-list
      ├─ button.nav-btn[data-page=preprocess]
      ├─ button.nav-btn[data-page=train_eval]
      ├─ button.nav-btn[data-page=predict]
      └─ button.nav-btn[data-page=student]
```

导航绑定在 `static/js/app_shell.js`：

```text
button.nav-btn click -> setPage(btn.dataset.page)
```

页面切换核心函数在 `static/js/app_shell.js`：

```text
setPage(page)
├─ persistActiveViewSelection()
├─ stopAuto()
├─ setActive(page)
├─ destroyDataGrid()
├─ disposeCharts()
├─ 更新 #topFeature
└─ 按 page 分发：
   ├─ preprocess  -> renderDataShell().then(loadDataView)
   ├─ train_eval  -> renderTrainShell()
   ├─ predict     -> renderPredictShell().then(loadPrediction)
   ├─ student     -> renderStudentShell()
   └─ theory page -> renderTheory(page)
```

## 3. 中间主内容区

中间区域是：

```text
main.main#main
```

它本身在 HTML 里是空容器，实际内容由 JS 动态写入。

### 3.1 理论页

文件：

```text
static/js/theory_page.js
```

结构：

```text
#main
└─ section.hero-card
   ├─ .hero-line
   │  ├─ .eyebrow
   │  └─ h2
   └─ .html-lesson[data-theory-html]
      └─ iframe
```

说明：

- `renderTheory(page)` 写入理论页外壳。
- `loadTheoryHtml(page)` 从 `static/theory-html/<page>.html` 加载可选课程 HTML。
- 理论页通常不显示右侧控制面板。

### 3.2 数据预处理页

文件：

```text
static/js/preprocess_page.js
```

结构：

```text
#main
└─ section.hero-card
   ├─ .hero-line
   │  ├─ .eyebrow
   │  └─ h2
   └─ .chart-grid#dataChartGrid
      └─ GridStack items / 普通 chart-card
```

Grid 生成流程：

```text
renderDataCharts()
├─ selectedValues("dataViews")
├─ loadDataChartData(views)
├─ renderDataDashboard(grid, views)
└─ 为每个 view 初始化 ECharts
```

GridStack item 结构：

```text
.grid-stack-item[data-view=<view>]
└─ .grid-stack-item-content
   └─ section.chart-card
      ├─ .chart-head
      │  ├─ .chart-title
      │  └─ .chart-sub
      └─ .chart#chart_<view>
```

普通非 GridStack fallback：

```text
.chart-grid
└─ section.chart-card
   └─ .chart#chart_<view>
```

### 3.3 模型训练与评估页

文件：

```text
static/js/train_page.js
```

结构：

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .chart-grid#trainChartGrid
      ├─ 图表卡片
      ├─ 参数路径卡片
      ├─ 指标仪表盘卡片
      ├─ 计算过程信息卡片
      └─ 训练表格信息卡片
```

主要流程：

```text
renderTrainShell()
├─ loadTrainPageSchema()
├─ renderTrainControlPanel(schema)           右侧面板
├─ bindTrainControlPanel(prepareTraining)
└─ prepareTraining()

prepareTraining()
├─ runAction("prepare_train")
├─ 保存 trainData
└─ renderTrainFrame(0)

renderTrainFrame(index)
├─ selectedValues("trainViews")
├─ loadTrainChartData(views, currentFrame)
├─ renderTrainDashboard(...)
└─ 初始化/更新每个图表
```

### 3.4 模型预测页

文件：

```text
static/js/predict_page.js
```

结构：

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ .chart-grid#predictChartGrid
      ├─ 预测结果卡片
      ├─ 预测计算过程卡片
      ├─ 预测可视化图表卡片
      └─ 相近样本表格卡片
```

主要流程：

```text
renderPredictShell()
├─ loadPanelSchema("predict")
├─ renderPredictPanel(schema)
└─ 绑定 #predictRun

loadPrediction()
├─ runAction("predict")
├─ 保存 predictData
└─ renderPredictCharts()
```

### 3.5 自主实验页

文件：

```text
static/js/student_page.js
```

结构：

```text
#main
└─ section.hero-card
   ├─ .hero-line
   └─ #studentWorkspace
      ├─ .stage-strip#studentStageStrip
      ├─ 上传前 empty-state
      └─ .chart-grid#studentChartGrid
         ├─ 数据预处理图表/表格
         ├─ 训练图表/指标/计算过程
         └─ 预测图表/结果/相近样本
```

学生实验是一个分阶段工作流：

```text
01 数据集上传
02 字段设置
03 数据预处理
04 模型训练与评估
05 模型预测
```

右侧面板由 `studentPanelHtml()` 生成，中间内容由 `renderStudentWorkspace()` 和各阶段 dashboard 函数生成。

## 4. 右侧控制面板结构

右侧容器：

```text
aside.assistant
└─ #rightPanel
```

不同页面会把不同控制面板写入 `#rightPanel`。

### 4.1 控制面板来源

后端 schema 定义：

```text
models/simple_linear_regression/controls/preprocess.py
models/simple_linear_regression/controls/train_eval.py
models/simple_linear_regression/controls/predict.py
models/simple_linear_regression/controls/student.py
```

前端渲染器：

```text
static/js/control_renderers.js
```

页面调用：

```text
preprocess_page.js -> renderPreprocessPanel(schema)
train_page.js      -> renderTrainControlPanel(schema)
predict_page.js    -> renderPredictPanel(schema)
student_page.js    -> renderStudentPanel() -> studentPanelHtml()
```

### 4.2 通用控制类型

控制项 schema 的 `type` 决定生成什么 UI。

```text
stat
└─ .mini-stat
   ├─ span label
   └─ strong#value_id

runtime_stat
└─ .mini-stat
   ├─ span label
   └─ strong#value_id

select
└─ label.control-label
   └─ select#element_id
      └─ option...

number
└─ label.control-label
   └─ input#element_id[type=number]

range
└─ label.control-label
   ├─ input#element_id[type=range]
   └─ .range-line
      ├─ min label
      ├─ strong#value_id
      └─ max label

button
└─ button.btn#element_id

chart_selector
└─ details.check-group
   ├─ summary#summary_id
   └─ .check-list
      └─ label.check-row
         ├─ input[type=checkbox]
         └─ span label
```

### 4.3 数据预处理右侧面板

```text
#rightPanel
└─ .panel-card
   ├─ h3 控制面板
   ├─ .mini-stats
   │  ├─ #sampleCount
   │  └─ #featureCount
   ├─ select#dataFeature
   └─ details.check-group
      ├─ summary#dataModeSummary
      └─ input[name=dataViews]...
```

### 4.4 训练评估右侧面板

```text
#rightPanel
└─ .panel-card
   ├─ .mini-stats
   │  ├─ #sampleCount
   │  └─ #featureCount
   ├─ select#trainFeature
   ├─ select#trainStd
   ├─ details.check-group
   │  └─ input[name=trainViews]...
   ├─ input#w0[type=number]
   ├─ input#b0[type=number]
   ├─ input#lr[type=range]
   ├─ input#epochs[type=range]
   ├─ input#speed[type=range]
   ├─ .button-grid
   │  ├─ #stepBtn
   │  ├─ #autoBtn
   │  ├─ #pauseBtn
   │  └─ #resetBtn
   └─ .runtime stats
      ├─ #epochNow
      └─ #lossNow
```

### 4.5 预测右侧面板

```text
#rightPanel
└─ .panel-card
   ├─ .mini-stats
   │  ├─ #predictValue
   │  └─ #predictModelX
   ├─ select#predictFeature
   ├─ select#predictStd
   ├─ input#predictInput[type=number]
   ├─ details.check-group
   │  └─ input[name=predictViews]...
   └─ button#predictRun
```

### 4.6 自主实验右侧面板

自主实验右侧面板不是完全通用 schema 渲染，而是由 `studentPanelHtml()` 定制生成，因为它是多阶段流程。

```text
#rightPanel
└─ .student-panel
   ├─ details.student-section 01 数据集
   │  ├─ select#studentSourceType
   │  ├─ input#studentFile[type=file]
   │  ├─ button#studentUploadBtn
   │  └─ #studentUploadMessage
   │
   ├─ details.student-section 02 字段设置
   │  ├─ select#studentTarget
   │  ├─ input[name=studentFeatures][type=checkbox]...
   │  └─ select#studentFeature
   │
   ├─ details.student-section 03 数据预处理
   │  ├─ button#studentPrepareDataBtn
   │  ├─ button#studentPreprocessBtn
   │  ├─ button#studentDataBtn
   │  └─ input[name=studentDataViews][type=checkbox]...
   │
   ├─ details.student-section 04 模型训练与评估
   │  ├─ select#studentStd
   │  ├─ input#studentW0[type=number]
   │  ├─ input#studentB0[type=number]
   │  ├─ input#studentLr[type=number]
   │  ├─ input#studentEpochs[type=number]
   │  ├─ input#studentSpeed[type=range]
   │  ├─ button#studentTrainBtn
   │  ├─ button#studentResetBtn
   │  ├─ button#studentStepBtn
   │  ├─ button#studentAutoBtn
   │  ├─ button#studentPauseBtn
   │  └─ input[name=studentTrainViews][type=checkbox]...
   │
   └─ details.student-section 05 模型预测
      ├─ input#studentPredictInput[type=number]
      ├─ input[name=studentPredictViews][type=checkbox]...
      ├─ button#studentPreparePredictBtn
      └─ button#studentPredictBtn
```

## 5. 图表卡片与 GridStack 结构

图表卡片统一由 `static/js/view_renderers.js` 中的 `chartCardHtml()` 生成。

```text
section.chart-card[.wide|.small]
├─ .chart-head
│  └─ div
│     ├─ .chart-title
│     └─ .chart-sub
└─ .chart#chart_<key>
```

GridStack 包装层：

```text
.chart-grid.grid-stack
└─ .grid-stack-item[data-view=<view>]
   └─ .grid-stack-item-content
      └─ section.chart-card
```

拖拽缩放相关：

```text
GridStack.init({
  column: 4,
  cellHeight: 260,
  margin: 8,
  float: true,
  animate: true,
  draggable: { handle: ".chart-head" },
  resizable: { handles: "se" }
})
```

布局保存：

```text
saveDataGridLayout()
└─ viewStateStore[gridLayoutStorageKey(dataGridMode)] = layout
```

不同页面的布局 key：

```text
preprocess -> preprocessGridLayoutV4
train      -> trainGridLayoutV1
predict    -> predictGridLayoutV1
student    -> studentGridLayoutV1
```

## 6. 数据流结构

```text
用户操作右侧面板
        ↓
页面 JS 收集控件值
        ↓
runAction(action, payload)
        ↓
POST /api/run_action
        ↓
models/simple_linear_regression/model.py
        ↓
返回 context_id / history / prediction / preview 等
        ↓
页面 JS 根据选择的 views 请求图表数据
        ↓
POST /api/chart_data
        ↓
models/simple_linear_regression/charts/*
        ↓
chart_renderers.js 生成 ECharts option
        ↓
ECharts 渲染到 .chart#chart_xxx
```

## 7. 文件职责速查

```text
templates/index.html
  页面骨架、CSS、左侧导航、三栏容器、脚本引用

static/js/app_shell.js
  页面切换、导航点击、启动 setPage("basic")

static/js/state_runtime.js
  全局状态、图表实例、GridStack 状态、选择项保存恢复

static/js/control_renderers.js
  右侧控制面板控件生成

static/js/view_renderers.js
  中间内容区卡片、表格、计算过程 HTML 生成

static/js/chart_renderers.js
  ECharts option 生成

static/js/preprocess_page.js
  数据预处理页

static/js/train_page.js
  模型训练与评估页

static/js/predict_page.js
  模型预测页

static/js/student_page.js
  自主实验页

models/simple_linear_regression/controls/*.py
  右侧控制面板 schema

models/simple_linear_regression/charts/*
  图表数据 schema / chart data
```

