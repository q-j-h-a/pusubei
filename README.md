# 简单线性回归教学演示

这是一个 Flask + ECharts + GridStack 的简单线性回归教学项目。页面重点不是只给出一个训练结果，而是把数据预处理、线性拟合、梯度下降、指标变化和预测过程拆开展示，便于观察 `w`、`b`、Loss、RMSE、MAE、R2 如何随训练变化。

## 当前状态

项目已经完成后端和前端的模块化整理：

- 后端入口 `app.py` 已经精简为路由层。
- 业务动作统一走 `/api/run_action`。
- 图表数据统一走 `/api/chart_data`。
- 控制面板和图表注册已迁入 `models/simple_linear_regression/`。
- 旧的 `control_modules/` 和 `chart_modules/` 已删除。
- 前端大脚本已拆分到 `static/js/`，`templates/index.html` 只保留 HTML/CSS、两个 Jinja 常量和脚本引用。

## 运行方式

```bash
python -m pip install -r requirements.txt
python app.py
```

浏览器打开：

```text
http://127.0.0.1:5000/
```

## 目录结构

```text
simple_linear_regression1/
├─ app.py
├─ core/
│  └─ registry.py
├─ models/
│  └─ simple_linear_regression/
│     ├─ __init__.py
│     ├─ model.py
│     ├─ charts/
│     │  ├─ predict/
│     │  ├─ preprocess/
│     │  ├─ student/
│     │  └─ train_eval/
│     └─ controls/
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
└─ scripts/
```

## 后端接口

```text
GET  /
GET  /api/page_schema?page=<page>
GET  /api/chart_registry?page=<page>
POST /api/run_action
POST /api/chart_data
```

`/api/run_action` 的 JSON 请求格式：

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

当前动作包括：

```text
data_view
prepare_train
predict
student_upload
student_preprocess
student_data_view
student_train_prepare
student_predict
```

## 前端拆分说明

- `api.js`：通用 POST 和 action 调用。
- `state_runtime.js`：全局状态、DOM 工具、图表生命周期、GridStack 布局状态。
- `schema_registry.js`：页面 schema、图表 metadata、标题和说明兜底。
- `control_renderers.js`：控制面板 HTML 生成。
- `chart_renderers.js`：ECharts option 生成。
- `view_renderers.js`：信息卡片、表格、计算过程等 HTML 生成。
- `preprocess_page.js`：数据预处理页面流程。
- `train_page.js`：训练评估页面流程。
- `predict_page.js`：预测页面流程。
- `student_page.js`：学生自定义 CSV 实验流程。
- `theory_page.js`：理论页面和可选 HTML 课程片段加载。
- `app_shell.js`：导航、启动和窗口 resize 绑定。

## 后端模块说明

- `models/simple_linear_regression/model.py`：核心业务动作，包括预处理、训练、预测、学生 CSV 数据流程。
- `models/simple_linear_regression/controls/`：各页面右侧控制面板 schema。
- `models/simple_linear_regression/charts/`：各页面图表数据提供模块。
- `core/registry.py`：按模型包发现 controls/charts。

新增控制项或图表时，优先放到对应模型包内，不再新增旧式根目录模块。

## 验证命令

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

本机 PowerShell 会话如果没有刷新 PATH，可以直接使用：

```text
C:\python\nodejs\node.exe
C:\python\Git\cmd\git.exe
```

## 收尾待办

- 浏览器手动点测四个主要页面：预处理、训练评估、预测、学生实验。
- 可选：把 `templates/index.html` 中的大段 CSS 继续拆到 `static/css/app.css`。
- 可选：给 `/api/run_action` 和 `/api/chart_data` 补一组轻量自动化测试。
