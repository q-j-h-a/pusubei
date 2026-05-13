# 简单线性回归教学实验

这是一个基于 Flask + ECharts + GridStack 的简单线性回归教学实验项目。系统围绕 Boston Housing 房价预测和学生自定义 CSV 数据实验展开，支持数据预处理、梯度下降训练、模型评估、模型预测和自主实验。

## 主要功能

- 理论部分：实验基本信息、实验目的、前置知识、模型介绍、数据集、训练模型、学习准则、参数优化、评价指标、预期成果、思考拓展。
- 数据预处理：查看原始散点图、标准化散点图、单特征线性相关系数、全特征线性相关系数。
- 模型训练与评估：训练回归模型，查看训练图、学习准则图、Loss 曲线、Loss 等高线图、梯度下降图、w/b 参数轨迹、RMSE、MAE、R2、参数表和计算过程。
- 模型预测：基于当前训练模型进行预测，支持原始特征输入和标准化特征输入，展示预测可视化和预测计算过程。
- 自主实验：上传 CSV 或使用内置学生成绩数据，按 4 个阶段完成数据集、预处理、训练评估和预测。

## 启动方式

```bash
python -m pip install -r requirements.txt
python app.py
```

浏览器访问：

```text
http://127.0.0.1:5000/
```

如果本机 PowerShell 没有刷新 PATH，可以直接使用本机 Node 或 Git 路径运行检查命令，例如：

```text
C:\python\nodejs\node.exe
C:\python\Git\cmd\git.exe
```

## 项目结构

```text
simple_linear_regression/
├─ app.py
├─ core/
│  ├─ chart_registry.py
│  ├─ context_store.py
│  ├─ control_registry.py
│  ├─ data_utils.py
│  ├─ registry.py
│  └─ schemas.py
├─ models/
│  └─ simple_linear_regression/
│     ├─ model.py
│     ├─ controls/
│     │  ├─ preprocess.py
│     │  ├─ train_eval.py
│     │  ├─ predict.py
│     │  └─ student.py
│     └─ charts/
│        ├─ preprocess/
│        ├─ train_eval/
│        ├─ predict/
│        └─ student/
├─ static/
│  ├─ js/
│  │  ├─ api.js
│  │  ├─ app_shell.js
│  │  ├─ chart_renderers.js
│  │  ├─ control_renderers.js
│  │  ├─ predict_page.js
│  │  ├─ preprocess_page.js
│  │  ├─ schema_registry.js
│  │  ├─ state_runtime.js
│  │  ├─ student_page.js
│  │  ├─ theory_page.js
│  │  ├─ train_page.js
│  │  └─ view_renderers.js
│  └─ theory-html/
├─ templates/
│  └─ index.html
├─ boston_housing.csv
├─ boston_housing_features_standardized.csv
├─ student_score_regression_100.csv
├─ requirements.txt
└─ web_ui_structure_cn.md
```

## API

```text
GET  /
GET  /api/page_schema?page=<page>
GET  /api/chart_registry?page=<page>
POST /api/run_action
POST /api/chart_data
```

`/api/run_action` 的典型请求：

```json
{
  "action": "prepare_train",
  "payload": {
    "feature": "RM",
    "use_standardized": true,
    "learning_rate": 0.03,
    "epochs": 120,
    "w0": 0,
    "b0": 0
  }
}
```

常用 action：

```text
data_view
prepare_train
predict
student_upload
student_preprocess
student_data_view
student_prepare_train
student_predict
```

## 前端模块

- `app_shell.js`：页面切换、左右栏拖拽宽度、全局布局。
- `api.js`：封装 `/api/run_action` 和 `/api/chart_data` 请求。
- `state_runtime.js`：GridStack 布局、图表 resize、视图选择本地存储。
- `schema_registry.js`：加载后端 schema 和图表元数据。
- `control_renderers.js`：右侧控制面板 HTML。
- `chart_renderers.js`：ECharts option 构造。
- `view_renderers.js`：图表卡片、表格、计算过程等视图 HTML。
- `preprocess_page.js`：数据预处理页面流程。
- `train_page.js`：模型训练与评估页面流程。
- `predict_page.js`：模型预测页面流程。
- `student_page.js`：自主实验页面流程。
- `theory_page.js`：理论页 iframe 加载。

## 自主实验说明

- CSV 第一行必须是列名，且至少包含 1 个数值特征列和 1 个数值目标列。
- 系统固定把 CSV 最后一列作为目标列 `y`。
- 目标列不参与标准化；其余数值列作为特征列参与预处理，并生成 `特征名_standardized` 列。
- 自主实验右侧面板按 4 个阶段组织：`01 数据集`、`02 数据预处理`、`03 模型训练与评估`、`04 模型预测`。
- `03 模型训练与评估` 的训练数据版本在标准化结果可用时默认选择 `标准化特征`。
- `03 模型训练与评估` 的状态徽标只有 `未训练` 和 `已训练` 两种。训练一轮或自动训练后变为 `已训练`，点击重置后恢复为 `未训练`。
- `评估标准图` 使用与模型训练与评估页一致的仪表盘样式，在同一张图中横向显示 RMSE、MAE、R2 三个仪表盘。
- `04 模型预测` 默认展开，切换页面或重绘右侧面板后仍保持展开。
- 自主实验预测区与模型预测页保持一致：右侧显示当前模型、输入类型、输入特征值、显示图表、准备预测和开始预测。
- 自主实验预测默认只显示 `预测可视化` 和 `预测计算过程` 两张图。点击准备预测会先展示这两张图；如果前面没有完成训练，会提示先训练。
- 点击开始预测后，会根据当前模型、输入类型和输入特征值进行预测；右侧状态徽标从 `待预测` 变为 `已预测`。
- 自主实验预测计算过程与模型预测页使用同一套计算逻辑：原始特征输入会先换算为模型输入，标准化特征输入会反推对应原始特征值，再代入当前模型计算预测结果。

## 检查命令

```bash
python -m compileall app.py core models
node --check static/js/api.js
node --check static/js/chart_renderers.js
node --check static/js/control_renderers.js
node --check static/js/view_renderers.js
node --check static/js/state_runtime.js
node --check static/js/schema_registry.js
node --check static/js/theory_page.js
node --check static/js/preprocess_page.js
node --check static/js/student_page.js
node --check static/js/predict_page.js
node --check static/js/train_page.js
node --check static/js/app_shell.js
```
