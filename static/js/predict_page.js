// Predict Page.

let predictRawScatterData = null;
let predictRawScatterKey = "";

async function renderPredictShell() {
  predictPageSchema = predictPageSchema || await loadPanelSchema("predict", {
    title: "\u6a21\u578b\u9884\u6d4b",
    sections: []
  });
  document.querySelector(".shell").classList.remove("theory");
  predictData = null;
  predictRawScatterData = null;
  predictRawScatterKey = "";
  predictRenderViewsKey = "";
  $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="predictWrap"></div>`;
  $("rightPanel").innerHTML = renderPredictPanel();
  bindGuideControls?.();
  bindPredictCodeButtons();
  syncPredictPanelWithTrainModel();
  $("predictRun")?.addEventListener("click", loadPrediction);
  $("predictInputMode")?.addEventListener("change", persistPredictFormState);
  $("predictInput")?.addEventListener("input", persistPredictFormState);
  $("predictInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") loadPrediction();
  });
  restorePredictFormState();
  await resetPredictionPendingState();
}

function renderPredictPanel() {
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card predict-control-card">
      <h3>\u6a21\u578b\u9884\u6d4b</h3>
      <div class="mini-stats">
        <div class="mini-stat"><span>\u9884\u6d4b MEDV</span><strong id="predictValue">--</strong></div>
        <div class="mini-stat"><span>\u6a21\u578b\u8f93\u5165 x</span><strong id="predictModelX">--</strong></div>
      </div>
      <div class="control-group" aria-label="\u5f53\u524d\u6a21\u578b">
        <label class="control-label">\u5f53\u524d\u6a21\u578b</label>
        <div class="formula-box" id="predictModelStatus">\u8bf7\u5148\u5728\u201c\u6a21\u578b\u8bad\u7ec3\u201d\u9875\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\u3002</div>
      </div>
      <div class="control-group">
        <label class="control-label" for="predictFeature">\u7279\u5f81\u9009\u62e9</label>
        <select id="predictFeature" disabled>
          ${(currentDatasetMeta?.features || FEATURE_NAMES).map(item => optionHtml(item, trainData?.feature || DEFAULT_FEATURE, item)).join("")}
        </select>
        <input id="predictStd" type="hidden" value="true">
      </div>
      <div class="control-group" aria-label="\u8f93\u5165\u8bbe\u7f6e">
        <div class="field-grid">
          <label class="control-label" for="predictInputMode">\u8f93\u5165\u7c7b\u578b
            <select id="predictInputMode">
              <option value="raw">\u539f\u59cb\u7279\u5f81\u503c</option>
              <option value="standardized">\u6807\u51c6\u7279\u5f81\u503c</option>
            </select>
          </label>
          <label class="control-label" for="predictInput">\u8f93\u5165\u7279\u5f81\u503c
            <input id="predictInput" type="text" inputmode="decimal" value="6.5" autocomplete="off">
          </label>
        </div>
      </div>
      <div class="predict-actions">
        <button class="primary-btn" id="predictRun" type="button">\u5f00\u59cb\u9884\u6d4b</button>
        ${predictCodeButtonHtml()}
      </div>
    </div>`;
}

function persistPredictFormState() {
  const state = {};
  ["predictInput", "predictInputMode"].forEach(id => {
    const el = $(id);
    if (el) state[id] = el.value;
  });
  viewStateStore.predictFormStateV1 = state;
}

function restorePredictFormState() {
  const state = viewStateStore.predictFormStateV1 || {};
  ["predictInput", "predictInputMode"].forEach(id => {
    const el = $(id);
    if (!el || state[id] == null) return;
    if (el.tagName === "SELECT" && ![...el.options].some(opt => opt.value === state[id])) return;
    el.value = state[id];
  });
  syncPredictPanelWithTrainModel();
}

async function resetPredictionPendingState() {
  persistPredictFormState();
  predictData = null;
  predictRawScatterData = null;
  predictRawScatterKey = "";
  predictRenderViewsKey = "";
  if ($("predictValue")) $("predictValue").textContent = "--";
  if ($("predictModelX")) $("predictModelX").textContent = "--";
  syncPredictPanelWithTrainModel();
  if (!currentTrainPredictionState()) {
    predictEmptyState();
    return;
  }
  await renderPredictBaseCharts();
}

function restorePredictionView() {
  restorePredictFormState();
  if ($("predictValue")) $("predictValue").textContent = Number(predictDisplayPrediction()).toFixed(2);
  if ($("predictModelX")) $("predictModelX").textContent = Number(predictData.model_x).toFixed(3);
  if (predictData?.feature) $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${predictData.feature}`;
  ensurePredictRawScatterData()
    .catch(err => console.warn("Predict raw scatter fallback skipped:", err))
    .finally(() => renderPredictCharts());
}

function predictionMatchesCurrentState() {
  const trainState = currentTrainPredictionState();
  if (!predictData || !trainState) return false;
  const inputValue = Number($("predictInput")?.value || viewStateStore.predictFormStateV1?.predictInput || 0);
  const inputMode = $("predictInputMode")?.value || viewStateStore.predictFormStateV1?.predictInputMode || "raw";
  return predictData.train_context_id === trainState.contextId
    && Number(predictData.train_frame_index) === Number(trainState.frameIndex)
    && Number(predictData.input_value ?? predictData.raw_value) === inputValue
    && (predictData.input_mode || "raw") === inputMode;
}

function currentTrainPredictionState() {
  if (!trainData?.context_id || !Array.isArray(trainData.history) || !trainData.history.length) return null;
  const frameIndex = Math.max(0, Math.min(currentFrame, trainData.history.length - 1));
  const frame = trainData.history[frameIndex];
  return {
    contextId: trainData.context_id,
    frameIndex,
    frame,
    feature: trainData.feature,
    useStandardized: Boolean(trainData.use_standardized),
  };
}

function syncPredictPanelWithTrainModel() {
  const state = currentTrainPredictionState();
  const featureEl = $("predictFeature");
  const runEl = $("predictRun");
  const statusEl = $("predictModelStatus");
  const inputModeEl = $("predictInputMode");
  if (!state) {
    if (featureEl) featureEl.disabled = true;
    if (runEl) runEl.disabled = true;
    if (inputModeEl) inputModeEl.disabled = true;
    if (statusEl) {
      statusEl.className = "model-status-empty";
      statusEl.textContent = "\u6682\u65e0\u53ef\u7528\u8bad\u7ec3\u6a21\u578b\uff0c\u8bf7\u5148\u5b8c\u6210\u6a21\u578b\u8bad\u7ec3\u540e\u518d\u8fdb\u884c\u9884\u6d4b\u3002";
    }
    return;
  }
  if (featureEl) {
    featureEl.value = state.feature;
    featureEl.disabled = true;
  }
  if (inputModeEl) {
    inputModeEl.disabled = false;
    [...inputModeEl.options].forEach(option => {
      option.disabled = option.value === "standardized" && !state.useStandardized;
    });
    if (!state.useStandardized && inputModeEl.value === "standardized") inputModeEl.value = "raw";
  }
  if (runEl) runEl.disabled = false;
  if (statusEl) {
    statusEl.className = "predict-model-plain";
    statusEl.innerHTML = `
      <div><span>\u6765\u6e90\uff1a</span><strong>\u81ea\u5b9a\u4e49\u53c2\u6570\u8bad\u7ec3</strong></div>
      <div><span>\u7279\u5f81\uff1a</span><strong>${escapeHtml(state.feature)}</strong></div>
      <div><span>w = </span><strong>${Number(state.frame.w).toFixed(6)}</strong></div>
      <div><span>b = </span><strong>${Number(state.frame.b).toFixed(6)}</strong></div>`;
  }
}

async function loadPrediction() {
  persistPredictFormState();
  const trainState = currentTrainPredictionState();
  syncPredictPanelWithTrainModel();
  if (!trainState) {
    predictData = null;
    if ($("predictValue")) $("predictValue").textContent = "--";
    if ($("predictModelX")) $("predictModelX").textContent = "--";
    predictEmptyState();
    return;
  }
  const feature = trainState.feature;
  $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${feature}`;
  try {
    predictData = await runAction("predict", {
      value: Number($("predictInput").value || 0),
      input_mode: $("predictInputMode")?.value || "raw",
      train_context_id: trainState.contextId,
      train_frame_index: trainState.frameIndex
    });
    await ensurePredictRawScatterData();
    if ($("predictValue")) $("predictValue").textContent = Number(predictDisplayPrediction()).toFixed(2);
    if ($("predictModelX")) $("predictModelX").textContent = Number(predictData.model_x).toFixed(3);
    renderPredictCharts();
  } catch (err) {
    renderError(err.message);
  }
}

function predictEmptyState() {
  destroyDataGrid();
  disposeCharts();
  $("main").innerHTML = `
    <div class="empty-state">
      \u8bf7\u5148\u5728\u201c\u6a21\u578b\u8bad\u7ec3\u201d\u9875\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\uff0c\u7136\u540e\u518d\u8fdb\u884c\u6a21\u578b\u9884\u6d4b\u3002
    </div>`;
}

async function ensurePredictRawScatterData() {
  const trainState = currentTrainPredictionState();
  const feature = predictData?.feature || trainState?.feature;
  if (!feature) return null;
  const datasetId = predictData?.dataset_id || currentDatasetMeta?.dataset_id || "boston_housing";
  const key = `${datasetId}|${feature}`;
  if (predictRawScatterData && predictRawScatterKey === key) return predictRawScatterData;
  const raw = await runAction("prepare_train", {
    feature,
    dataset_id: datasetId,
    use_standardized: false,
    learning_rate: 0.03,
    epochs: 1,
    w0: 0,
    b0: 0
  });
  predictRawScatterData = raw;
  predictRawScatterKey = key;
  return raw;
}

async function renderPredictBaseCharts() {
  const trainState = currentTrainPredictionState();
  if (!trainState) {
    predictEmptyState();
    return;
  }
  $("topFeature").textContent = `\u5f53\u524d\u7279\u5f81 ${trainState.feature}`;
  await ensurePredictRawScatterData();
  const grid = ensurePredictGrid();
  const viewsKey = "predict_base_v1";
  if (predictRenderViewsKey !== viewsKey || !charts.get("chart_predict_standard") || !charts.get("chart_predict_raw") || !$("predictCalcCard")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "predict";
    grid.innerHTML = predictGridHtml();
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
        saveDataGridLayout();
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    predictRenderViewsKey = viewsKey;
  }

  const standard = charts.get("chart_predict_standard") || initChart("chart_predict_standard");
  standard.setOption(predictStandardBaseOption(), true);

  const raw = charts.get("chart_predict_raw") || initChart("chart_predict_raw");
  raw.setOption(predictRawBaseOption(), true);

  updatePredictCalcCard();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
}

function renderPredictCharts() {
  if (!predictData) return;
  const grid = ensurePredictGrid();
  const viewsKey = "predict_fixed_v1";
  if (predictRenderViewsKey !== viewsKey || !charts.get("chart_predict_standard") || !charts.get("chart_predict_raw") || !$("predictCalcCard")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "predict";
    grid.innerHTML = predictGridHtml();
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
        saveDataGridLayout();
        requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
      });
      syncDataGridAttributes();
    }
    predictRenderViewsKey = viewsKey;
  }

  const standard = charts.get("chart_predict_standard") || initChart("chart_predict_standard");
  standard.setOption(predictStandardOption(), true);

  const raw = charts.get("chart_predict_raw") || initChart("chart_predict_raw");
  raw.setOption(predictRawOption(), true);

  updatePredictCalcCard();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
}

function ensurePredictGrid() {
  if (!$("predictWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="predictWrap"></div>`;
    predictRenderViewsKey = "";
  }
  return $("predictWrap");
}

function predictGridHtml() {
  const saved = loadPredictGridLayout();
  const items = [
    { id: "predict_standard", layout: { x: 0, y: 0, w: 2, h: 2 }, html: chartCardHtml("predict_standard", "\u9884\u6d4b\u53ef\u89c6\u5316", "x \u548c y \u5747\u4e3a\u6807\u51c6\u5316\u7a7a\u95f4\uff0c\u663e\u793a\u6a21\u578b\u56de\u5f52\u7ebf\u4e0e\u9884\u6d4b\u70b9", "") },
    { id: "predict_raw", layout: { x: 2, y: 0, w: 2, h: 2 }, html: chartCardHtml("predict_raw", "\u539f\u59cb\u6563\u70b9\u56fe", "\u4ec5\u663e\u793a\u539f\u59cb\u6837\u672c\u70b9\u548c\u53cd\u6807\u51c6\u5316\u540e\u7684\u9884\u6d4b\u70b9", "") },
    { id: "predict_calc", layout: { x: 0, y: 2, w: 4, h: 3 }, html: `<div id="predictCalcCard" style="height:100%"></div>` },
  ];
  return items.map(item => {
    const layout = normalizePredictGridLayout(item.id, saved[item.id] || item.layout);
    return `<div class="grid-stack-item" data-view="${escapeHtml(item.id)}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${item.html}</div></div>`;
  }).join("");
}

function defaultPredictGridLayout(view) {
  return ({
    predict_standard: { x: 0, y: 0, w: 2, h: 2 },
    predict_raw: { x: 2, y: 0, w: 2, h: 2 },
    predict_calc: { x: 0, y: 2, w: 4, h: 3 },
  })[view] || { x: 0, y: 0, w: 2, h: 1 };
}

function normalizePredictGridLayout(view, layout) {
  const next = { ...defaultPredictGridLayout(view), ...layout };
  next.w = Math.max(1, Math.min(4, Number(next.w) || 1));
  next.h = Math.max(1, Number(next.h) || 1);
  next.x = Math.max(0, Math.min(4 - next.w, Number(next.x) || 0));
  next.y = Math.max(0, Number(next.y) || 0);
  return next;
}

function predictStandardOption() {
  const points = predictData.scatter.x.map((x, i) => [x, predictData.scatter.y[i]]);
  const lineData = Array.isArray(predictData.line)
    ? predictData.line
    : predictData.line.x.map((x, i) => [x, predictData.line.y[i]]);
  const inputPoint = [predictData.model_x, predictModelPrediction()];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: predictData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: `${predictData.target || "MEDV"}(std)`, nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineData, showSymbol: false, lineStyle: { color: "#0f9f78", width: 3 } },
      { name: "\u9884\u6d4b\u8f85\u52a9\u7ebf", type: "lines", coordinateSystem: "cartesian2d", data: [{ coords: [[predictData.model_x, 0], inputPoint] }], lineStyle: { color: "#f59e0b", width: 2, type: "dashed" } },
      { name: "\u9884\u6d4b\u70b9", type: "scatter", data: [inputPoint], symbolSize: 15, itemStyle: { color: "#e23b5a", borderColor: "#fff", borderWidth: 3 } }
    ]
  };
}

function predictStandardBaseOption() {
  const trainState = currentTrainPredictionState();
  const frame = trainState?.frame || {};
  const points = trainData.scatter.x.map((x, i) => [x, trainData.scatter.y[i]]);
  const lineData = trainData.line_x.map(x => [x, Number(frame.w) * x + Number(frame.b)]);
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: `${trainData.target || "MEDV"}(std)`, nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineData, showSymbol: false, lineStyle: { color: "#0f9f78", width: 3 } }
    ]
  };
}

function predictRawOption() {
  const raw = predictRawScatterData;
  const points = raw?.scatter?.x?.map((x, i) => [x, raw.scatter.y[i]]) || [];
  const inputPoint = [predictData.raw_value, predictDisplayPrediction()];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: predictData.feature, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: predictData.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u539f\u59cb\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(37,99,235,.58)" } },
      { name: "\u9884\u6d4b\u70b9", type: "scatter", data: [inputPoint], symbolSize: 15, itemStyle: { color: "#e23b5a", borderColor: "#fff", borderWidth: 3 } }
    ]
  };
}

function predictRawBaseOption() {
  const raw = predictRawScatterData;
  const trainState = currentTrainPredictionState();
  const points = raw?.scatter?.x?.map((x, i) => [x, raw.scatter.y[i]]) || [];
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainState?.feature || DEFAULT_FEATURE, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: raw?.target || trainData?.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u539f\u59cb\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(37,99,235,.58)" } }
    ]
  };
}

function updatePredictCalcCard() {
  const slot = $("predictCalcCard");
  if (!slot) return;
  slot.innerHTML = predictCalcCardHtml();
}

function predictCalcCardHtml() {
  if (!predictData) {
    return `<section class="chart-card wide">
      <div class="chart-head">
        <div><div class="chart-title">\u9884\u6d4b\u8ba1\u7b97\u8fc7\u7a0b</div><div class="chart-sub">\u8f93\u5165\u503c\u3001\u6807\u51c6\u5316\u6362\u7b97\u3001\u6a21\u578b\u4ee3\u5165\u548c\u9884\u6d4b\u8f93\u51fa</div></div>
      </div>
      <div style="padding:18px">
        <div class="formula">请在右侧输入特征值，然后点击“开始预测”。

点击后这里会展示：
1. 读取输入
2. 换算为模型输入
3. 代入线性回归模型
4. 还原为原始 MEDV
5. 图中预测点对应位置</div>
      </div>
    </section>`;
  }
  const modelType = predictData.use_standardized ? "\u6807\u51c6\u5316\u7279\u5f81" : "\u539f\u59cb\u7279\u5f81";
  const conversion = predictData.use_standardized
    ? `x_std = (x_raw - mean) / std = (${num(predictData.raw_value, 6)} - ${num(predictData.mean, 6)}) / ${num(predictData.std, 6)} = ${num(predictData.model_x, 6)}`
    : `x_model = x_raw = ${num(predictData.model_x, 6)}`;
  const yConversion = predictData.use_standardized
    ? `\u0177_raw = \u0177_std * y_std + y_mean = ${num(predictModelPrediction(), 6)} * ${num(predictData.target_std, 6)} + ${num(predictData.target_mean, 6)} = ${num(predictDisplayPrediction(), 6)}`
    : `\u0177_raw = \u0177 = ${num(predictDisplayPrediction(), 6)}`;
  return `<section class="chart-card wide">
    <div class="chart-head">
      <div><div class="chart-title">\u9884\u6d4b\u8ba1\u7b97\u8fc7\u7a0b</div><div class="chart-sub">\u8f93\u5165\u503c\u3001\u6807\u51c6\u5316\u6362\u7b97\u3001\u6a21\u578b\u4ee3\u5165\u548c\u9884\u6d4b\u8f93\u51fa</div></div>
    </div>
    <div style="padding:18px">
      <div class="formula">1. \u8bfb\u53d6\u8f93\u5165
\u8f93\u5165\u7c7b\u578b = ${predictData.input_mode === "standardized" ? "\u6807\u51c6\u7279\u5f81\u503c" : "\u539f\u59cb\u7279\u5f81\u503c"}
\u8f93\u5165\u503c = ${num(predictData.input_value, 6)}

2. \u6362\u7b97\u4e3a\u6a21\u578b\u8f93\u5165
\u5f53\u524d\u6a21\u578b\u4f7f\u7528\uff1a${modelType}
raw x = ${num(predictData.raw_value, 6)}
model x = ${num(predictData.model_x, 6)}
${conversion}

3. \u4ee3\u5165\u7ebf\u6027\u56de\u5f52\u6a21\u578b
\u0177_std = w * x_std + b
  = ${num(predictData.w, 6)} * ${num(predictData.model_x, 6)} + ${num(predictData.b, 6)}
  = ${num(predictModelPrediction(), 6)}

4. \u8fd8\u539f\u4e3a\u539f\u59cb MEDV
${yConversion}

5. \u56fe\u4e2d\u5bf9\u5e94
\u5de6\u56fe\u5728\u6807\u51c6\u5316\u7a7a\u95f4\u663e\u793a\u9884\u6d4b\u70b9\uff1a(${num(predictData.model_x, 4)}, ${num(predictModelPrediction(), 4)})
\u53f3\u56fe\u5728\u539f\u59cb\u6570\u636e\u7a7a\u95f4\u663e\u793a\u9884\u6d4b\u70b9\uff1a(${num(predictData.raw_value, 4)}, ${num(predictDisplayPrediction(), 4)})</div>
    </div>
  </section>`;
}

function predictModelPrediction() {
  return Number(predictData?.prediction_std ?? predictData?.prediction ?? 0);
}

function predictDisplayPrediction() {
  return Number(predictData?.prediction_raw ?? predictData?.prediction ?? 0);
}

function predictCodeButtonHtml() {
  return `<button class="secondary-btn code-toggle-btn" type="button" data-predict-code="predict">查看预测代码</button>`;
}

function predictCodeSpec() {
  const trainState = currentTrainPredictionState();
  const feature = predictData?.feature || trainState?.feature || trainData?.feature || DEFAULT_FEATURE;
  const target = predictData?.target || trainData?.target || "MEDV";
  const inputMode = $("predictInputMode")?.value || predictData?.input_mode || "raw";
  const inputValue = $("predictInput")?.value || predictData?.input_value || "6.5";
  const frame = trainState?.frame || {};
  const w = predictData?.w ?? frame.w;
  const b = predictData?.b ?? frame.b;
  const mean = predictData?.mean;
  const std = predictData?.std;
  const targetMean = predictData?.target_mean;
  const targetStd = predictData?.target_std;
  const hasPrediction = Boolean(predictData);
  const rawToStd = inputMode === "standardized"
    ? "x_std = x_input"
    : "x_std = (x_input - feature_mean) / feature_std";
  const code = [
    `feature = "${feature}"`,
    `target = "${target}"`,
    `input_mode = "${inputMode}"`,
    `x_input = ${inputValue}`,
    "",
    `w = ${Number.isFinite(Number(w)) ? num(w, 6) : "w"}`,
    `b = ${Number.isFinite(Number(b)) ? num(b, 6) : "b"}`,
    "",
    "# 1. 使用训练时相同的统计量处理新输入",
    `feature_mean = ${Number.isFinite(Number(mean)) ? num(mean, 6) : "training_feature_mean"}`,
    `feature_std = ${Number.isFinite(Number(std)) ? num(std, 6) : "training_feature_std"}`,
    rawToStd,
    "",
    "# 2. 在线性回归模型中预测",
    "y_pred_std = w * x_std + b",
    "",
    "# 3. 如果训练目标也做过标准化，需要反标准化回 MEDV 原始尺度",
    `target_mean = ${Number.isFinite(Number(targetMean)) ? num(targetMean, 6) : "training_target_mean"}`,
    `target_std = ${Number.isFinite(Number(targetStd)) ? num(targetStd, 6) : "training_target_std"}`,
    "y_pred_raw = y_pred_std * target_std + target_mean",
    "",
    ...(hasPrediction ? [
      `# 当前模型输入 x_std = ${num(predictData.model_x, 6)}`,
      `# 当前标准化预测 y_pred_std = ${num(predictModelPrediction(), 6)}`,
      `# 当前原始尺度预测 MEDV = ${num(predictDisplayPrediction(), 6)}`,
    ] : [
      "# 点击“开始预测”后，这里会显示当前预测结果。",
    ]),
  ].join("\n");
  return {
    title: "模型预测",
    operation: `把 ${feature} 的新输入代入当前模型，并还原为 ${target} 原始尺度`,
    code,
    notes: [
      "预测新样本时，必须使用训练阶段保存下来的 mean 和 std。",
      "如果输入是原始特征值，先转换为模型使用的标准化输入 x_std。",
      "模型先输出标准化目标值 y_pred_std。",
      `最后使用 ${target} 的均值和标准差，把预测值还原到原始尺度。`,
    ],
  };
}

function predictCodeDrawerHtml(spec) {
  const notes = spec.notes.map((note, index) => `<li>${index + 1}. ${escapeHtml(note)}</li>`).join("");
  return `
    <div class="code-drawer-backdrop">
      <aside class="code-drawer" role="dialog" aria-modal="true" aria-label="预测代码">
        <div class="code-drawer-head">
          <div>
            <div class="code-kicker">当前预测代码</div>
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

function openPredictCodeDrawer() {
  closePredictCodeDrawer();
  document.body.insertAdjacentHTML("beforeend", predictCodeDrawerHtml(predictCodeSpec()));
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closePredictCodeDrawer();
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

function closePredictCodeDrawer() {
  document.querySelector(".code-drawer-backdrop")?.remove();
}

function bindPredictCodeButtons() {
  if (window.predictCodeButtonsBound) return;
  window.predictCodeButtonsBound = true;
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-predict-code]")) return;
    openPredictCodeDrawer();
  });
}
