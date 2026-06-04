# 简单线性回归教学实验

这是一个面向初学者的简单线性回归 Web 教学实验。项目使用 Flask 提供后端接口，前端使用原生 JavaScript、ECharts、ECharts GL、GridStack 和可编辑课件式理论页，帮助学生完成从理论理解到实验操作、再到测试反馈的完整学习流程。

项目定位不是展示完整工程源码，而是让学生先观察实验现象，再在当前步骤查看对应的 Python / NumPy 风格核心代码。

## 当前能力

- 理论部分：提供实验基本信息、实验目的、前置知识、数据集、训练模型、学习准则、参数优化、评价指标、预期成果和思考拓展等课件式页面。
- 理论课件编辑与导出：理论页支持只读查看、编辑课件、导出 PDF。同时，详情页支持**一键下载 Word 讲义**（完美整合 10 大章节为 A4 格式、公式原生可编辑、图表高清内嵌），且在编辑状态下支持双栏**物理段落高度插值映射同步滚动**，并通过 `/api/theory_deck_overrides` 保存页面覆盖数据。
- 数据预处理：加载 Boston Housing 数据集，查看数据详情、原始数据可视化、z-score 标准化和标准数据可视化。
- 模型训练：支持回归过程、预处理影响、损失函数、优化准则和自定义参数训练。
- 模型评估：展示当前训练模型的拟合效果，并解释 RMSE、MAE、R²。
- 模型预测：基于当前模型参数 `w`、`b` 和输入特征值 `x` 计算预测 MEDV，并展示预测可视化和计算过程。
- 代码解释层：预处理、训练、评估、预测页面均提供“查看代码”入口，展示当前步骤的核心代码、操作说明和解释。
- AI 学习助手：实验页提供可拖动的悬浮 AI 助手，点击后展开聊天框，支持快捷问题和自由提问；助手会结合当前页面、步骤、特征、训练参数、预测输入和测试状态生成提示。
- 界面引导：右侧控制面板提供全局引导和当前页面引导开关；数据预处理的“加载原始数据”步骤已接入 8 步任务式引导，覆盖查看测试题、加载数据、观察结果和查看代码。
- 随堂任务提示：普通实验模式下也会在当前功能卡片中显示“查看测试内容”，学生可随时打开当前步骤的操作要求和观察问题。
- 实验测试：左侧新增“实验测试”入口，按完整实验流程引导学生完成测试题，并生成成绩和答题详情。

## 运行方式

```bash
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:5000/
```

### DeepSeek 配置

AI 学习助手通过后端接口调用 DeepSeek，API Key 不应写入前端。服务端读取顺序为：

```text
环境变量 DEEPSEEK_API_KEY
-> config.local.json 中的 deepseek_api_key
```

本地开发可复制或直接编辑根目录 `config.local.json`：

```json
{
  "deepseek_api_key": "你的真实 key",
  "deepseek_model": "deepseek-v4-flash",
  "deepseek_api_url": "https://api.deepseek.com/chat/completions"
}
```

`config.local.json` 已加入 `.gitignore`，不要提交真实 key。`config.local.example.json` 只用于保存示例格式。服务器或 Docker 部署时推荐使用环境变量：

```bash
docker run -d --name simple-linear-regression -p 15000:5000 -e DEEPSEEK_API_KEY=你的真实key simple-linear-regression:latest
```

## Docker 部署

项目已提供 `Dockerfile` 和 `.dockerignore`。容器内部服务监听 `5000` 端口，服务器宿主机端口可以映射到其它未占用端口，避免和服务器上已有的 `5000` 项目冲突。

构建镜像：

```bash
docker build -t simple-linear-regression:latest .
```

示例运行方式：

```bash
docker run -d --name simple-linear-regression -p 15000:5000 simple-linear-regression:latest
```

这里的含义是：

```text
服务器宿主机 15000 端口 -> 容器内部 5000 端口
```

因此，即使服务器上已有其它服务占用 `5000`，本项目也不会顶掉它。只需要把 `15000` 换成服务器上未被占用的端口即可。

如果通过 Nginx 代理到站点根路径，推荐只让 Nginx 访问宿主机本地端口，例如：

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:15000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

如果使用二级目录访问，例如：

```text
http://your-domain.example/wj1xbghs/
```

当前前端已支持根据访问路径自动添加资源和 API 前缀，不需要依赖 Nginx `sub_filter`。Nginx 只需要把二级目录转发到容器根路径：

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

二级目录部署时，页面内静态资源会请求 `/wj1xbghs/static/...`，接口会请求 `/wj1xbghs/api/...`。如果修改了二级目录名称，只需要同步修改 Nginx 的 `location` 前缀。

## 项目结构

```text
simple_linear_regression/
├─ app.py
├─ config.local.example.json
├─ requirements.txt
├─ README.md
├─ web_ui_structure_cn.md
├─ core/
├─ datasets/
├─ models/simple_linear_regression/
│  ├─ model.py
│  ├─ dataset.py
│  ├─ controls/
│  └─ charts/
├─ static/
│  ├─ aiLogo-Cusx885-.png
│  ├─ theory_deck_overrides.json
│  ├─ theory-html/
│  └─ js/
│     ├─ ai_assistant.js
│     ├─ app_shell.js
│     ├─ experiment_test.js
│     ├─ theory_page.js
│     ├─ theory_page_registry.js
│     ├─ theory-pages/
│     ├─ preprocess_page.js
│     ├─ train_page.js
│     ├─ evaluate_page.js
│     └─ predict_page.js
└─ templates/
   └─ index.html
```

## 数据集约定

默认数据集为 Boston Housing：

```text
datasets/raw/boston_housing.csv
datasets/preprocessed/boston_housing_preprocessed.csv
```

字段包含：

```text
CRIM, ZN, INDUS, CHAS, NOX, RM, AGE, DIS, RAD, TAX, PTRATIO, B, LSTAT, MEDV
```

当前实验默认将 `MEDV` 作为目标值 `y`，其余数值列作为输入特征 `X`。标准化使用 z-score：

```python
z = (x - mean) / std
```

预测页会根据训练时的标准化信息处理新输入：

```python
x_std = (x_raw - feature_mean) / feature_std
y_std_pred = w * x_std + b
y_raw_pred = y_std_pred * target_std + target_mean
```

## 主要页面

### 理论部分

理论部分由以下文件组成：

```text
static/js/theory_page_registry.js
static/js/theory-pages/*.js
static/js/theory_page.js
static/theory_deck_overrides.json
```

理论页使用课件式渲染，支持：

- 只读浏览
- 编辑课件内容，且在详情页编辑下支持双栏 **物理段落高度插值映射同步滚动**（方案四：基于内容指纹虚拟桥接，实现正文、标题、列表及代码块“每一行”绝对水平对齐，打字防闪烁锚定）
- 插入文本、卡片、公式、图表和图片
- 保存覆盖数据
- 导出 PDF 与 **下载 Word 讲义**（后台自动等比自适应重绘，整合 10 大模块为一份排版精美、公式转换为 native MathML、图表高清内嵌的 A4 学术讲义）

如果 `theory_deck_overrides.json` 中某个页面覆盖数据不完整，运行时会回退到 `static/js/theory-pages/` 中的默认页面配置，避免出现只有标题、正文空白的情况。

### 数据预处理

步骤：

```text
01 加载原始数据
02 数据详情
03 原始数据可视化
04 数据标准化
05 标准数据可视化
```

核心代码内容包括读取 CSV、拆分特征和目标列、统计缺失值和重复值、绘制散点图、计算 mean/std、执行 z-score 标准化。

特征选择状态按小模块独立保存：

- 原始数据可视化使用 `rawVizFormStateV1`。
- 数据标准化使用 `standardizeFormStateV1`。
- 标准数据可视化使用 `standardVizFormStateV1`。

这三个小模块互不继承彼此的特征选择。切换到未保存过特征的小模块时，默认回到当前数据集的第一个特征。

“加载原始数据”步骤带有界面引导，默认流程为：

```text
查看测试内容
-> 阅读测试题
-> 关闭测试题弹窗
-> 选择 Boston 原始数据集
-> 加载数据集
-> 观察中间结果卡片
-> 查看本步骤代码
-> 阅读代码抽屉并完成引导
```

引导强调学生点击真实界面控件。最后一步完成或关闭引导时，会同步收回代码抽屉。

### 模型训练

步骤：

```text
01 熟悉回归过程
02 熟悉预处理影响
03 熟悉损失函数
04 熟悉优化准则
05 自定义参数训练
```

核心概念包括：

```python
y_pred = w * x + b
loss = np.mean((y - y_pred) ** 2)
w = w - learning_rate * dw
b = b - learning_rate * db
```

训练页 5 个小模块的表单状态按小模块分别保存到 `trainFormStateByStepV1`，特征选择、参数和动画速度互不串用。五个小模块的默认特征统一为 `CRIM`，默认周期数统一为 `120`。

自动演示不是简单播放到周期数结束：当达到最大周期数、Loss 明显发散，或连续多轮 Loss 几乎不变并被视为收敛时，演示会自动停止。因此设置为 `120` 时，若模型在更早周期已经收敛，当前周期可能小于 `120`。

### 模型评估

评估页展示当前模型的拟合效果，并支持 RMSE、MAE、R² 指标解释：

```python
mse = np.mean((y - y_pred) ** 2)
rmse = np.sqrt(mse)
mae = np.mean(np.abs(y - y_pred))
r2 = 1 - ss_res / ss_tot
```

### 模型预测

预测页使用当前训练得到的 `w`、`b` 和输入特征值 `x`：

```python
y_pred = w * x + b
```

页面规则：

- 修改输入框不会自动刷新预测结果。
- 只有点击“开始预测”或在输入框按 Enter，才更新预测点、预测 MEDV 和计算过程。
- “开始预测”和“查看预测代码”在同一个按钮容器内，保持等宽和统一间距。

### AI 学习助手

AI 学习助手由以下文件和接口组成：

```text
static/js/ai_assistant.js
templates/index.html 中 .ai-assistant-* 样式与悬浮组件
POST /api/ai_assistant
config.local.json / DEEPSEEK_API_KEY
```

交互规则：

- 理论页不显示 AI 助手。
- 普通实验页显示右下角可拖动悬浮按钮，点击后展开聊天框。
- “实验测试”说明页和完整测试进行中隐藏 AI 助手，避免干扰正式测试；测试完成结果页或退出测试回到自由实验后重新显示。
- 快捷问题包括“我现在应该做什么？”“这个图怎么看？”“参数是什么意思？”和“下一步是什么？”。
- 当前版本只支持文字提问；粘贴图片时会提示学生用文字描述图中现象。
- 聊天上下文会携带当前页面、当前步骤、当前特征、训练表单状态、预测表单状态和测试状态。
- 后端提示词要求 AI 在测试场景只给思路和观察方向，不直接给最终选项或完整答案。

## 实验测试模块

左侧实验部分新增“实验测试”入口。流程为：

```text
实验测试
-> 查看测试说明
-> 开始实验测试
-> 自动进入第一个测试节点
-> 学生在原实验页操作
-> 点击右侧“查看测试内容”
-> 弹窗答题
-> 提交并查看反馈
-> 进入下一题
-> 最后一题提交后显示测试结果
```

测试模式特点：

- 普通实验模式下也显示“查看测试内容”按钮，用作当前步骤随堂测试。
- 测试模式下，右侧控制面板主卡片标题下方同样显示“查看测试内容”。
- 右侧原有控制面板功能保持不变。
- 左侧实验导航和顶部步骤条在测试模式下锁定。
- 同一页面同一步骤的多道题会合并到同一个弹窗中。
- 题目选项初始不默认选中，学生需要主动选择。
- 普通实验模式下提交后只显示反馈，不显示“进入下一题”，也不推进完整实验测试进度。
- 提交后关闭弹窗再打开，会保持已提交反馈状态。
- 最后一题提交后直接显示结果弹窗和结果页。
- 只有完整实验测试模式会记录正式学习过程证据；自由实验和随堂任务提示不进入正式行为记录。
- 测试结果页除答题成绩外，还会展示总用时、各模块用时、各小模块用时、关键行为计数和学习过程提示。
- 过程提示用于辅助教师复核，例如用时过短、缺少关键操作或答题结果与操作记录不匹配；系统不直接判定“作弊”。

测试状态保存在前端：

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

`behavior` 在开始实验测试时创建，包含本次测试会话 ID、开始/结束时间、模块用时、小模块用时、关键行为计数、事件摘要和过程提示。

## API

```text
GET  /
GET  /api/experiments
GET  /api/dataset_profile?experiment=<experiment>
GET  /api/page_schema?experiment=<experiment>&page=<page>
GET  /api/chart_registry?experiment=<experiment>&page=<page>
GET  /api/theory_deck_overrides
POST /api/theory_deck_overrides
POST /api/ai_assistant
POST /api/run_action
POST /api/chart_data
```

当前实验 ID：

```text
simple_linear_regression
```

## 验证命令

```bash
python -m compileall app.py core models
node --check static/js/api.js
node --check static/js/ai_assistant.js
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

理论拆分页也应检查：

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

## 当前实现补充

### 查看测试内容的定位

实验部分右侧的“查看测试内容”现在定位为当前步骤的任务提示，而不是答题弹窗。

- 弹窗展示“操作要求”和“观察问题”。
- 选项为只读展示，不能点击选择。
- 弹窗不显示“提交答案”按钮。
- 点击“完成本步引导”或完整完成当前模块引导后，会自动弹出当前步骤的“查看测试内容”，提醒学生本页需要完成什么操作、观察什么现象；点击“关闭引导”只退出引导，不自动弹出任务提示。
- 数据预处理“加载原始数据”步骤中，点击任务弹窗里的“我知道了”后，会自动关闭任务弹窗并直接进入“选择数据集”引导，不再单独高亮关闭按钮。

### 模型训练引导

模型训练页已接入以下当前页面引导：

- 熟悉回归过程：选择特征、调节参数、训练控制按钮、标准化散点图。
- 熟悉预处理影响：选择特征、单步训练、对比原始图与标准化图、设置学习率为 `0.003`、再次单步训练、观察差异。
- 熟悉损失函数：选择特征、点击“随机 10 个样本”、观察左侧“残差与回归线”、观察右侧“整体误差分布”、切换并观察“残差直方图”、点击“单步训练”。
- 熟悉优化准则：选择特征、自动设置 `w=10` 和 `b=5`、点击“单步训练”、观察 3D Loss 曲面图、Loss 等高线图和 MSE Loss 随 epoch 的变化。
- 自定义参数训练：选择特征、设置参数、点击“单步训练”、整体高亮“标准化散点图 + MSE Loss 图”、整体高亮“w 参数轨迹图 + b 参数轨迹图”、最后查看本轮计算过程。

损失函数引导采用事件驱动，不应挂在图表重绘函数中反复触发。只有进入模块、点击“下一步”、点击“随机 10 个样本”和点击“单步训练”这些明确动作才推进引导状态。

自定义参数训练中的双图高亮使用组合目标，覆盖两张图和中间间隙，避免中间 gap 被引导遮罩压暗。

### 模型评估引导

模型评估页已接入 4 步当前页面引导：

```text
标准化散点图
-> RMSE 指标图
-> MAE 指标图
-> R² 指标图
```

- 第一步说明评估页复用上一节自定义参数训练得到的当前模型。
- 后三步持续高亮“评估指标图”，点击“下一步”时自动切换 `RMSE`、`MAE`、`R²`。
- RMSE 和 MAE 均强调“越小越好”，R² 强调“越接近 1 解释能力越强”。

### 模型预测引导

模型预测页已接入 5 步当前页面引导：

```text
当前模型
-> 输入类型与输入特征值
-> 开始预测
-> 预测可视化 + 原始散点图
-> 预测计算过程
```

- 当前模型卡片说明预测使用的是自定义参数训练得到的模型，并展示特征、`w`、`b`。
- 输入步骤点击“下一步”会自动选择“原始特征值”并填入 `6.5`。
- “开始预测”步骤要求学生点击真实按钮，点击成功后才推进到图表观察。
- 预测可视化和原始散点图使用组合目标整体高亮，两张图和中间间隙都处在高亮区域内。
- 最后高亮预测计算过程，说明输入标准化、代入 `y = wx + b` 和反标准化输出 MEDV。

### 模型训练默认参数

模型训练 5 个小模块的默认特征统一为 `CRIM`，默认周期数统一为 `120`。

训练页表单状态按小模块分别保存，避免“熟悉回归过程”“熟悉预处理影响”“熟悉损失函数”“熟悉优化准则”和“自定义参数训练”之间共用或串改特征选择。

自动演示允许提前停止：达到设置周期数、Loss 发散或 Loss 连续多轮几乎不变被视为收敛时都会停止。

### 图表固定尺度

训练相关散点图和残差图默认使用 `w=0`、`b=0` 时的自适应坐标范围作为全程固定尺度。训练过程中坐标轴不随当前参数变化，只更新回归线、残差或相关曲线。

## 维护建议

- 理论部分以 `static/js/theory-pages/*.js` 和 `static/theory_deck_overrides.json` 为主，不要只同步其中一个。
- 修改理论页样式时，要同步检查 `templates/index.html` 中 `.theory-*` 相关 CSS。
- 新增测试题优先修改 `static/js/experiment_test.js` 中的 `EXPERIMENT_TEST_FLOW`。
- 修改 AI 学习助手时同步检查 `static/js/ai_assistant.js`、`templates/index.html` 中 `.ai-assistant-*` 样式和 `app.py` 中 `/api/ai_assistant`。
- 真实 DeepSeek Key 只放在环境变量或 `config.local.json`，不要写入 `config.local.example.json`、README、前端 JS 或提交记录。
- 随堂测试和测试模式都只添加测试入口和弹窗，不应替换原实验右侧控制面板。
- 修改界面引导时优先检查 `static/js/preprocess_page.js` 中的引导状态机，以及 `templates/index.html` 中 `.guide-*` 样式。
- 开始实验测试时应重置四个实验模块状态，避免沿用自由实验中的旧结果。
