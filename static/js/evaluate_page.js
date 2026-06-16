// Evaluate Page.

const EVALUATE_METRICS = [
  { id: "rmse", label: "RMSE" },
  { id: "mae", label: "MAE" },
  { id: "r2", label: "R²" },
];
const EVALUATE_GUIDE_ID = "evaluate_metrics";
const EVALUATE_GUIDE_STEPS = new Set(["evaluate_fit", "evaluate_rmse", "evaluate_mae", "evaluate_r2"]);

function evaluateMetricMode() {
  const saved = viewStateStore.evaluateMetricModeV1;
  return EVALUATE_METRICS.some(item => item.id === saved) ? saved : "rmse";
}

function guideEnabledForEvaluate() {
  const state = guidePageState(EVALUATE_GUIDE_ID);
  return guideGlobalEnabled() && state.enabled && !state.dismissed && !state.completed;
}

function ensureEvaluateGuideStep() {
  const state = guidePageState(EVALUATE_GUIDE_ID);
  if (!EVALUATE_GUIDE_STEPS.has(state.step)) {
    setGuidePageState({ step: "evaluate_fit" }, EVALUATE_GUIDE_ID);
  }
}

function evaluatePanelHtml() {
  return `
    <div class="right-title">\u63a7\u5236\u9762\u677f</div>
    ${guideSwitchPanelHtml?.() || ""}
    <div class="control-card dataset-load-card">
      <h3>\u8bc4\u4f30\u6307\u6807\u4ee3\u7801</h3>
      ${evaluateCodeButtonHtml()}
    </div>`;
}

function defaultEvaluateGridLayout(view) {
  return ({
    evaluate_fit: { x: 0, y: 0, w: 2, h: 2 },
    evaluate_metric: { x: 2, y: 0, w: 2, h: 2 },
  })[view] || { x: 0, y: 0, w: 2, h: 2 };
}

function normalizeEvaluateGridLayout(view, layout) {
  const next = { ...defaultEvaluateGridLayout(view), ...layout };
  next.w = Math.max(1, Math.min(4, Number(next.w) || 2));
  next.h = Math.max(1, Number(next.h) || 2);
  next.x = Math.max(0, Math.min(4 - next.w, Number(next.x) || 0));
  next.y = Math.max(0, Number(next.y) || 0);
  return next;
}

function evaluateEmptyState() {
  closeEvaluateGuide();
  destroyDataGrid();
  disposeCharts();
  $("main").innerHTML = `
    <div class="empty-state">
      \u8bf7\u5148\u5728\u201c\u6a21\u578b\u8bad\u7ec3\u201d\u9875\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\uff0c\u8bc4\u4f30\u9875\u4f1a\u590d\u7528\u6700\u8fd1\u4e00\u6b21\u8bad\u7ec3\u5f97\u5230\u7684\u6a21\u578b\u53c2\u6570\u548c\u8bad\u7ec3\u4e0a\u4e0b\u6587\u3002
    </div>`;
}

async function renderEvaluateShell() {
  if (currentExperimentId() === "naive_bayes") {
    await renderNbEvaluateShell();
    return;
  }
  evaluatePageSchema = evaluatePageSchema || await loadPanelSchema("evaluate", {
    title: "\u6a21\u578b\u8bc4\u4f30",
    sections: [],
  });
  document.querySelector(".shell").classList.remove("theory");
  $("rightPanel").innerHTML = evaluatePanelHtml();
  bindGuideControls?.();
  bindEvaluateCodeButtons();
  if (!trainData) {
    evaluateEmptyState();
    return;
  }
  renderEvaluation();
}

function renderEvaluation() {
  if (!trainData) {
    evaluateEmptyState();
    return;
  }
  const grid = ensureEvaluateGrid();
  const viewsKey = evaluateMetricMode();
  if (evaluateRenderViewsKey !== viewsKey || !charts.get("chart_evaluate_fit") || !charts.get("chart_evaluate_metric")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "evaluate";
    grid.innerHTML = evaluateGridHtml();
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
    bindEvaluateMetricControls();
    evaluateRenderViewsKey = viewsKey;
  }

  const frameIndex = evaluateFrameIndex();
  const fit = charts.get("chart_evaluate_fit") || initChart("chart_evaluate_fit");
  fit.setOption(evaluateFitOption(frameIndex), true);

  const metric = charts.get("chart_evaluate_metric") || initChart("chart_evaluate_metric");
  metric.setOption(evaluateGaugeOnlyOption(evaluateMetricMode(), frameIndex), true);
  updateEvaluateExplanation();
  requestAnimationFrame(() => charts.forEach(ch => ch.resize()));
  scheduleEvaluateGuideUpdate(140);
}

function ensureEvaluateGrid() {
  if (!$("evaluateWrap")) {
    destroyDataGrid();
    disposeCharts();
    dataGridMode = "";
    $("main").innerHTML = `<div class="dashboard-grid grid-stack" id="evaluateWrap"></div>`;
    evaluateRenderViewsKey = "";
  }
  return $("evaluateWrap");
}

function evaluateGridHtml() {
  const saved = loadEvaluateGridLayout();
  const items = [
    { id: "evaluate_fit", layout: { x: 0, y: 0, w: 2, h: 2 }, html: evaluateFitCardHtml() },
    { id: "evaluate_metric", layout: { x: 2, y: 0, w: 2, h: 2 }, html: evaluateMetricCardHtml() },
  ];
  return items.map(item => {
    const layout = normalizeEvaluateGridLayout(item.id, saved[item.id] || item.layout);
    return `<div class="grid-stack-item" data-view="${escapeHtml(item.id)}" gs-x="${layout.x}" gs-y="${layout.y}" gs-w="${layout.w}" gs-h="${layout.h}" gs-min-w="1" gs-min-h="1"><div class="grid-stack-item-content">${item.html}</div></div>`;
  }).join("");
}

function evaluateFitCardHtml() {
  return `<section class="chart-card chart-interaction-prototype" data-chart-card="evaluate_fit">
    <div class="chart-head">
      <div><div class="chart-title">\u6807\u51c6\u5316\u6563\u70b9\u56fe</div><div class="chart-sub">\u540c\u6b65\u81ea\u5b9a\u4e49\u53c2\u6570\u8bad\u7ec3\u4e2d\u7684\u5f53\u524d\u6a21\u578b\u62df\u5408\u6548\u679c</div></div>
    </div>
    <div class="chart" id="chart_evaluate_fit"></div>
  </section>`;
}

function evaluateMetricCardHtml() {
  const mode = evaluateMetricMode();
  return `<section class="chart-card chart-interaction-prototype evaluation-metric-card" data-chart-card="evaluate_metric">
    <div class="chart-head">
      <div><div class="chart-title">\u8bc4\u4f30\u6307\u6807\u56fe</div><div class="chart-sub">\u5207\u6362 RMSE\u3001MAE \u548c R²\uff0c\u89c2\u5bdf\u5f53\u524d\u6a21\u578b\u7684\u8bc4\u4f30\u7ed3\u679c</div></div>
    </div>
    <div class="chart-toolbar">
      <div class="segmented-control" role="group" aria-label="\u8bc4\u4f30\u6307\u6807\u9009\u62e9">
        ${EVALUATE_METRICS.map(item => `<button class="seg-btn${item.id === mode ? " active" : ""}" type="button" data-evaluate-metric="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
    </div>
    <div class="chart" id="chart_evaluate_metric"></div>
    <div class="loss-formula-note evaluate-explanation-note" id="evaluateExplanationNote"></div>
  </section>`;
}

function bindEvaluateMetricControls() {
  document.querySelectorAll("[data-evaluate-metric]").forEach(btn => {
    btn.addEventListener("click", () => {
      viewStateStore.evaluateMetricModeV1 = btn.dataset.evaluateMetric;
      evaluateRenderViewsKey = "";
      renderEvaluation();
    });
  });
}

function evaluateGuideSpec() {
  const state = guidePageState(EVALUATE_GUIDE_ID);
  const step = state.step || "evaluate_fit";
  if (step === "evaluate_rmse") {
    return {
      step,
      target: '[data-chart-card="evaluate_metric"]',
      title: "查看 RMSE 指标",
      body: "默认先看 RMSE。它由 MSE 开平方得到，越小表示整体预测误差越小；因为会放大较大的误差，所以能提醒模型是否存在明显偏离点。",
      action: "下一步",
    };
  }
  if (step === "evaluate_mae") {
    return {
      step,
      target: '[data-chart-card="evaluate_metric"]',
      title: "切换到 MAE",
      body: "MAE 表示平均绝对误差，也越小越好。它比 RMSE 更平稳，不会像 RMSE 那样强烈放大个别大误差。",
      action: "下一步",
    };
  }
  if (step === "evaluate_r2") {
    return {
      step,
      target: '[data-chart-card="evaluate_metric"]',
      title: "切换到 R²",
      body: "R² 衡量模型对目标值变化的解释能力，越接近 1 表示拟合解释力越强。它不是误差单位，而是解释程度。",
      action: "完成本步引导",
    };
  }
  return {
    step: "evaluate_fit",
    target: '[data-chart-card="evaluate_fit"]',
    title: "查看当前训练模型",
    body: "这张标准化散点图复用上一节自定义参数训练得到的当前模型。红色线是当前回归线，绿色虚线是最优参考线，用来判断训练后的模型是否贴近样本趋势。",
    action: "下一步",
  };
}

function updateEvaluateGuide() {
  requestAnimationFrame(() => {
    if (currentPage !== "evaluate" || !guideEnabledForEvaluate()) {
      closeEvaluateGuide();
      return;
    }
    ensureEvaluateGuideStep();
    const spec = evaluateGuideSpec();
    const target = document.querySelector(spec.target);
    if (!target) return;
    renderEvaluateGuide(spec, target);
  });
}

function scheduleEvaluateGuideUpdate(delay = 120) {
  clearTimeout(scheduleEvaluateGuideUpdate.timer);
  scheduleEvaluateGuideUpdate.timer = setTimeout(() => {
    updateEvaluateGuide();
  }, delay);
}

function renderEvaluateGuide(spec, target) {
  closeEvaluateGuide();
  scrollTrainGuideTargetIntoView?.(target);
  target.classList.add("guide-highlight", "guide-highlight-large");
  document.body.insertAdjacentHTML("beforeend", `
    <div class="guide-backdrop" aria-hidden="true"></div>
    <div class="guide-focus-ring" aria-hidden="true"></div>
    <aside class="guide-popover" data-evaluate-guide-step="${escapeHtml(spec.step)}" role="dialog" aria-live="polite" aria-label="模型评估引导">
      <button class="guide-close" type="button" aria-label="关闭当前页面引导" data-guide-close="true">x</button>
      <div class="guide-kicker">学习引导</div>
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.body)}</p>
      <div class="guide-actions">
        <button class="primary-btn guide-next" type="button" data-guide-next="${escapeHtml(spec.step)}">${escapeHtml(spec.action)}</button>
        <button class="secondary-btn" type="button" data-guide-close="true">关闭引导</button>
      </div>
    </aside>`);

  positionGuideFocusRing(target, true);
  positionGuidePopover(target);
  requestAnimationFrame(() => {
    positionGuideFocusRing(target, true);
    positionGuidePopover(target);
  });
  setTimeout(() => {
    positionGuideFocusRing(target, true);
    positionGuidePopover(target);
  }, 120);

  const popover = document.querySelector(".guide-popover");
  popover?.addEventListener("click", event => {
    if (event.target.closest("[data-guide-close]")) {
      setGuidePageState({ enabled: false, dismissed: true, completed: false, step: "evaluate_fit" }, EVALUATE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeEvaluateGuide();
      return;
    }
    const next = event.target.closest("[data-guide-next]");
    if (!next) return;
    const step = next.dataset.guideNext;
    if (step === "evaluate_fit") {
      setEvaluateMetricMode("rmse");
      setGuidePageState({ step: "evaluate_rmse" }, EVALUATE_GUIDE_ID);
      scheduleEvaluateGuideUpdate(120);
    } else if (step === "evaluate_rmse") {
      setEvaluateMetricMode("mae");
      setGuidePageState({ step: "evaluate_mae" }, EVALUATE_GUIDE_ID);
      scheduleEvaluateGuideUpdate(120);
    } else if (step === "evaluate_mae") {
      setEvaluateMetricMode("r2");
      setGuidePageState({ step: "evaluate_r2" }, EVALUATE_GUIDE_ID);
      scheduleEvaluateGuideUpdate(120);
    } else if (step === "evaluate_r2") {
      setGuidePageState({ enabled: false, completed: true, dismissed: false, step: "evaluate_fit" }, EVALUATE_GUIDE_ID);
      const pageToggle = $("guidePageToggle");
      if (pageToggle) pageToggle.checked = false;
      closeEvaluateGuide();
      openCurrentPracticeTestAfterGuide?.();
    }
  });
}

function setEvaluateMetricMode(mode) {
  if (!EVALUATE_METRICS.some(item => item.id === mode)) return;
  viewStateStore.evaluateMetricModeV1 = mode;
  evaluateRenderViewsKey = "";
  renderEvaluation();
}

function closeEvaluateGuide() {
  clearTimeout(scheduleEvaluateGuideUpdate.timer);
  closePreprocessLoadGuide?.();
}

function evaluateFrameIndex() {
  if (!trainData?.history?.length) return 0;
  return Math.max(0, Math.min(currentFrame, trainData.history.length - 1));
}

function evaluateFitOption(frameIndex) {
  const frame = trainData.history[frameIndex];
  const points = trainData.scatter.x.map((x, i) => [x, trainData.scatter.y[i]]);
  return {
    tooltip: { trigger: "item" },
    legend: { top: 12 },
    grid: { left: 58, right: 24, top: 56, bottom: 48 },
    xAxis: { type: "value", name: trainData.x_column, nameLocation: "middle", nameGap: 28 },
    yAxis: { type: "value", name: trainData.target || "MEDV", nameLocation: "middle", nameGap: 38 },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" }
    ],
    series: [
      { name: "\u6837\u672c\u70b9", type: "scatter", data: points, symbolSize: 6, itemStyle: { color: "rgba(15,159,120,.62)" } },
      { name: "\u5f53\u524d\u56de\u5f52\u7ebf", type: "line", data: lineForParams(frame.w, frame.b), showSymbol: false, lineStyle: { color: "#d9354f", width: 3 } },
      { name: "\u6700\u4f18\u53c2\u8003\u7ebf", type: "line", data: lineForParams(trainData.best.w, trainData.best.b), showSymbol: false, lineStyle: { color: "#0f9f78", width: 2.6, type: "dashed" } }
    ]
  };
}

function evaluateGaugeOnlyOption(key, frameIndex) {
  const rows = trainData.history.slice(0, frameIndex + 1);
  const current = rows[rows.length - 1]?.[key] ?? 0;
  const config = metricGaugeConfig(key, rows);
  return {
    tooltip: {
      formatter: () => `${escapeHtml(config.label)}<br>${num(current, 4)}`
    },
    series: [
      {
        name: config.label,
        type: "gauge",
        center: ["50%", "54%"],
        radius: "82%",
        startAngle: 205,
        endAngle: -25,
        min: config.min,
        max: config.max,
        splitNumber: 5,
        progress: {
          show: true,
          width: 14,
          itemStyle: { color: config.color }
        },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [[1, "#e8ecf4"]]
          }
        },
        axisTick: { distance: -20, length: 5, lineStyle: { color: "#8b95a5", width: 1 } },
        splitLine: { distance: -22, length: 10, lineStyle: { color: "#8b95a5", width: 1.2 } },
        axisLabel: { distance: -6, color: "#6b7280", fontSize: 10 },
        pointer: { length: "58%", width: 5, itemStyle: { color: "#172033" } },
        anchor: { show: true, size: 8, itemStyle: { color: "#172033" } },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "28%"],
          fontSize: 24,
          fontWeight: 900,
          color: "#172033",
          formatter: () => Number(current).toFixed(2)
        },
        title: {
          offsetCenter: [0, "46%"],
          fontSize: 12,
          fontWeight: 800,
          color: "#6b7280"
        },
        data: [{ value: config.gaugeValue(current), name: config.label }]
      }
    ]
  };
}

function updateEvaluateExplanation() {
  const el = $("evaluateExplanationNote");
  if (!el || !trainData?.history?.length) return;
  const frame = trainData.history[evaluateFrameIndex()];
  const mode = evaluateMetricMode();
  const quality = evaluateQuality(frame);
  const value = mode === "rmse" ? frame.rmse : mode === "mae" ? frame.mae : frame.r2;
  const text = ({
    rmse: `RMSE = ${num(value, 4)}，越小表示整体预测偏差越小；它会放大较大的误差，所以能提醒模型是否存在明显偏离点。`,
    mae: `MAE = ${num(value, 4)}，越小表示平均绝对误差越小；它比 RMSE 更直观，表示一次预测通常会偏离多少。`,
    r2: `R² = ${num(value, 4)}，越接近 1 表示模型解释能力越强；接近 0 说明当前特征和直线对目标值解释有限。`,
  })[mode];
  el.innerHTML = `<span>\u5224\u65ad</span><strong>${escapeHtml(quality)}</strong><span>${escapeHtml(text)}</span>`;
}

function evaluateQuality(frame) {
  const r2 = Number(frame?.r2 ?? 0);
  if (r2 >= 0.7) return "\u62df\u5408\u8f83\u597d";
  if (r2 >= 0.3) return "\u62df\u5408\u4e00\u822c";
  return "\u62df\u5408\u8f83\u5f31";
}

function evaluateCodeButtonHtml() {
  return `<button class="secondary-btn code-toggle-btn" type="button" data-evaluate-code="metrics">查看评估代码</button>`;
}

function evaluateCodeSpec() {
  const mode = evaluateMetricMode();
  const frame = trainData?.history?.[evaluateFrameIndex()] || {};
  const feature = trainData?.feature || DEFAULT_FEATURE;
  const target = trainData?.target || "MEDV";
  const metricLabel = EVALUATE_METRICS.find(item => item.id === mode)?.label || "RMSE";
  const value = mode === "rmse" ? frame.rmse : mode === "mae" ? frame.mae : frame.r2;
  const metricCode = {
    rmse: [
      "mse = np.mean((y - y_pred) ** 2)",
      "rmse = np.sqrt(mse)",
      `# current_rmse = ${Number.isFinite(Number(value)) ? num(value, 6) : "--"}`,
    ],
    mae: [
      "mae = np.mean(np.abs(y - y_pred))",
      `# current_mae = ${Number.isFinite(Number(value)) ? num(value, 6) : "--"}`,
    ],
    r2: [
      "ss_res = np.sum((y - y_pred) ** 2)",
      "ss_tot = np.sum((y - np.mean(y)) ** 2)",
      "r2 = 1 - ss_res / ss_tot",
      `# current_r2 = ${Number.isFinite(Number(value)) ? num(value, 6) : "--"}`,
    ],
  }[mode];
  return {
    title: `模型评估：${metricLabel}`,
    operation: `计算当前模型在 ${feature} -> ${target} 上的 ${metricLabel} 指标`,
    code: [
      `feature = "${feature}"`,
      `target = "${target}"`,
      "",
      "x = scaled_data[feature]",
      "y = scaled_data[target]",
      "",
      `w = ${Number.isFinite(Number(frame.w)) ? num(frame.w, 6) : "w"}`,
      `b = ${Number.isFinite(Number(frame.b)) ? num(frame.b, 6) : "b"}`,
      "y_pred = w * x + b",
      "",
      ...metricCode,
    ].join("\n"),
    notes: [
      "评估页复用当前训练页得到的 w、b 和当前训练帧。",
      "RMSE 是 MSE 开平方，单位和目标值一致。",
      "MAE 是平均绝对误差，对异常点没有 RMSE 那么敏感。",
      "R² 衡量模型相比“直接预测平均值”提升了多少。",
    ],
  };
}

function evaluateCodeDrawerHtml(spec) {
  const notes = spec.notes.map((note, index) => `<li>${index + 1}. ${escapeHtml(note)}</li>`).join("");
  return `
    <div class="code-drawer-backdrop">
      <aside class="code-drawer" role="dialog" aria-modal="true" aria-label="评估代码">
        <div class="code-drawer-head">
          <div>
            <div class="code-kicker">当前评估代码</div>
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

function openEvaluateCodeDrawer() {
  closeEvaluateCodeDrawer();
  document.body.insertAdjacentHTML("beforeend", evaluateCodeDrawerHtml(evaluateCodeSpec()));
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closeEvaluateCodeDrawer();
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

function closeEvaluateCodeDrawer() {
  document.querySelector(".code-drawer-backdrop")?.remove();
}

function bindEvaluateCodeButtons() {
  if (window.evaluateCodeButtonsBound) return;
  window.evaluateCodeButtonsBound = true;
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-evaluate-code]")) return;
    if (currentExperimentId() === "naive_bayes") {
      openNbEvaluateCodeDrawer();
    } else {
      openEvaluateCodeDrawer();
    }
  });
}

// --------------------------------------------------------------------------
// 朴素贝叶斯模型评估（动态分类阈值沙盒与 ECharts ROC/PR 曲线）
// --------------------------------------------------------------------------

let nbEvalThreshold = 0.50;
let nbEvalChartType = "roc";
let nbCachedRocPoints = null;
let nbCachedPrPoints = null;
let nbCachedAuc = null;

function nbEvalClassName(index) {
  return nbTrainData?.target_names?.[index] || `类别 ${index}`;
}

function nbEvalClassIcon(name, index) {
  const text = String(name || "").toLowerCase();
  if (text.includes("auto") || text.includes("car")) return "🚗";
  if (text.includes("space")) return "🚀";
  return index === 0 ? "①" : "②";
}

function nbEvalPositiveIndex() {
  const index = Number(nbTrainData?.positive_label_index);
  return Number.isInteger(index) ? index : 1;
}

function nbEvalNegativeIndex() {
  return nbEvalPositiveIndex() === 0 ? 1 : 0;
}

function nbEvalLabelSet() {
  const posIndex = nbEvalPositiveIndex();
  const negIndex = nbEvalNegativeIndex();
  const posName = nbEvalClassName(posIndex);
  const negName = nbEvalClassName(negIndex);
  return {
    posIndex,
    negIndex,
    posName,
    negName,
    posIcon: nbEvalClassIcon(posName, posIndex),
    negIcon: nbEvalClassIcon(negName, negIndex),
  };
}

async function renderNbEvaluateShell() {
  document.querySelector(".shell").classList.remove("theory");
  
  clearPageTopSlot();
  destroyDataGrid();
  disposeCharts();
  
  if (!nbTrainData) {
    $("rightPanel").innerHTML = `
      <div class="right-title">操作提示</div>
      <div class="control-card">
        <p style="font-size: 13px; color: #868e96; line-height: 1.5; margin: 0;">评估页已锁。您需要先在第一步中点击开始训练以拟合模型，随后才可查看模型评估指标与变化曲线。</p>
      </div>
    `;
    $("main").innerHTML = `
      <section class="preprocess-prompt-card" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: #fff; border-radius: 8px; margin: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #495057;">请先训练模型</h3>
        <p style="font-size: 13px; color: #868e96; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">当前步骤依赖已训练的贝叶斯模型。请前往【模型训练】页面，点击【开始训练】按钮，拟合好分类器后再来进行评估。</p>
      </section>
    `;
    return;
  }
  
  // 注入教学版评估页面专用样式
  if (!document.getElementById("nbEvalStyles")) {
    const style = document.createElement("style");
    style.id = "nbEvalStyles";
    style.innerHTML = `
      .nb-eval-container {
        display: grid;
        grid-template-columns: 1.10fr 0.90fr;
        gap: 16px;
        box-sizing: border-box;
      }
      .nb-eval-card {
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        margin-bottom: 16px;
        padding: 16px;
      }
      .nb-eval-card h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #343a40;
      }
      .nb-eval-card h4 {
        margin: 0 0 12px 0;
        font-size: 12px;
        font-weight: 500;
        color: #868e96;
        line-height: 1.4;
      }
      .nb-slider-container {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
      }
      .nb-slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: bold;
        color: #495057;
      }
      .nb-slider-input {
        width: 100%;
        cursor: pointer;
        height: 6px;
        border-radius: 3px;
        outline: none;
      }
      .nb-cm-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-top: 10px;
      }
      .nb-cm-cell {
        border-radius: 6px;
        padding: 12px;
        text-align: center;
        border: 1px solid #dee2e6;
        transition: all 0.2s ease;
      }
      .nb-cm-cell.correct {
        background: #f4faf5;
        border-color: #c3e6cb;
        color: #155724;
      }
      .nb-cm-cell.mistake {
        background: #fff9f4;
        border-color: #ffe8d6;
        color: #d9534f;
      }
      .nb-cm-cell-val {
        font-size: 20px;
        font-weight: 900;
        margin-bottom: 2px;
      }
      .nb-cm-cell-lbl {
        font-size: 11px;
        color: #6c757d;
      }
      .nb-metric-indicator-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      .nb-metric-card {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 8px;
        text-align: center;
      }
      .nb-metric-card strong {
        display: block;
        font-size: 18px;
        font-weight: 800;
        color: #2b5c8f;
      }
      .nb-metric-card span {
        display: block;
        font-size: 10px;
        color: #868e96;
        margin-top: 4px;
        white-space: nowrap;
      }
      .nb-scenario-btn {
        background: #fff;
        border: 1px solid #ced4da;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;
        color: #495057;
      }
      .nb-scenario-btn:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }
      .nb-scenario-btn.active {
        background: #2b5c8f;
        color: #fff;
        border-color: #2b5c8f;
        font-weight: 600;
      }
      .nb-token-positive {
        background: rgba(37, 99, 235, 0.14);
        border-bottom: 2px solid rgba(37, 99, 235, 0.45);
      }
      .nb-token-negative {
        background: rgba(16, 185, 129, 0.14);
        border-bottom: 2px solid rgba(16, 185, 129, 0.45);
      }
      .nb-token-oov {
        color: #64748b;
        border-bottom: 1px dashed #94a3b8;
        cursor: help;
      }
      .nb-token-removed {
        text-decoration: line-through !important;
        opacity: 0.55 !important;
        background: rgba(239, 68, 68, 0.12) !important;
        border-bottom: 2px solid rgba(239, 68, 68, 0.45) !important;
      }
      .nb-table tbody tr.nb-row-active td {
        background-color: rgba(245, 158, 11, 0.08);
      }
    `;
    document.head.appendChild(style);
  }

  // 确保重置曲线缓存
  nbCachedRocPoints = null;
  nbCachedPrPoints = null;
  nbCachedAuc = null;
  const labels = nbEvalLabelSet();

  // 渲染右侧面板
  $("rightPanel").innerHTML = `
    <div class="right-title">评估控制面板</div>
    <div class="control-card">
      <h3>核心评估代码</h3>
      <button class="secondary-btn code-toggle-btn" type="button" data-evaluate-code="nb_metrics" style="width:100%; margin:0; padding:10px 0; font-size:13px; font-weight:600;">查看评估代码</button>
    </div>
  `;

  // 渲染主工作区
  $("main").innerHTML = `
    <div style="padding: 10px 18px 24px 18px; overflow-y: auto; height: 100%; box-sizing: border-box;">
      <div style="background: #e7f5ff; border: 1px solid #a5d8ff; color: #0b7285; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px; line-height: 1.5;">
        💡 当前评估以二分类为基础。混淆矩阵展示两个类别之间的错分情况，阈值分析展示正类概率变化对预测结果的影响。
      </div>
      <div class="nb-eval-container">
        
        <!-- 左栏：阈值调节 & 动态混淆矩阵 -->
        <div>
          <div class="nb-eval-card">
            <h3>分类阈值调节沙盒</h3>
            <p style="margin: 4px 0 10px 0; font-size: 11.5px; color: #4b5563; line-height: 1.45;">
              当前阈值分析以 <strong style="color: #2b8a3e;">${escapeHtml(labels.posName)}</strong> 作为正类，展示模型在二分类场景下的概率判定变化。
            </p>
            <h4>拖动滑块改变分类后验概率阈值，观察混淆矩阵及各项指标的实时漂移。</h4>
            
            <div class="nb-slider-container">
              <div class="nb-slider-header">
                <span>分类决策阈值 (θ):</span>
                <span id="nbEvalThresholdVal" style="font-size:16px; color:#2b5c8f; font-family:monospace;">0.50</span>
              </div>
              <input type="range" class="nb-slider-input" id="nbEvalThresholdSlider" min="0.00" max="1.00" step="0.01" value="0.50">
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#868e96; margin-top:4px;">
                <span>低阈值：更容易判为 ${labels.posIcon} ${escapeHtml(labels.posName)}</span>
                <span>高阈值：更容易保留 ${labels.negIcon} ${escapeHtml(labels.negName)}</span>
              </div>
            </div>
            
            <div style="margin-bottom: 4px;">
              <span style="font-size:11px; color:#6c757d; font-weight:bold; display:block; margin-bottom:6px;">业务快捷场景：</span>
              <div style="display:flex; gap:8px;">
                <button class="nb-scenario-btn" id="nbScenarioConserv">${escapeHtml(labels.posName)} 高召回</button>
                <button class="nb-scenario-btn active" id="nbScenarioDefault">默认均衡 (0.50)</button>
                <button class="nb-scenario-btn" id="nbScenarioPrecise">${escapeHtml(labels.posName)} 高精确</button>
              </div>
            </div>
          </div>
          
          <div class="nb-eval-card" style="margin-bottom:0;">
            <h3>阈值评估联动指标</h3>
            <div class="nb-metric-indicator-grid">
              <div class="nb-metric-card"><strong id="nbEvalAcc">--</strong><span>准确率 (Accuracy)</span></div>
              <div class="nb-metric-card"><strong id="nbEvalPrec">--</strong><span>精确率 (Precision)</span></div>
              <div class="nb-metric-card"><strong id="nbEvalRecall">--</strong><span>召回率 (Recall)</span></div>
              <div class="nb-metric-card"><strong id="nbEvalF1">--</strong><span>F1 值 (F1-score)</span></div>
            </div>
            
            <h3 style="margin-top: 16px;">动态混淆矩阵 (分类测试集)</h3>
            <div class="nb-confusion-table-container" style="margin-top:10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; border: 1px solid #dee2e6;">
                <thead>
                  <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 10px; border: 1px solid #dee2e6; font-weight: 600;">真实类别 \ 预测</th>
                    <th style="padding: 10px; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">预测 ${escapeHtml(labels.negName)}</th>
                    <th style="padding: 10px; border: 1px solid #dee2e6; font-weight: 600; color: #2b5c8f;">预测 ${escapeHtml(labels.posName)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; background: #f8f9fa; font-weight: 600; text-align: left;">${escapeHtml(labels.negName)}</td>
                    <td style="padding: 12px; border: 1px solid #dee2e6; background: #f4faf5; color: #155724; font-weight: bold; font-size: 16px;" id="nbCellTN">--</td>
                    <td style="padding: 12px; border: 1px solid #dee2e6; background: #fff9f4; color: #d9534f; font-weight: bold; font-size: 16px;" id="nbCellFP">--</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; background: #f8f9fa; font-weight: 600; text-align: left;">${escapeHtml(labels.posName)}</td>
                    <td style="padding: 12px; border: 1px solid #dee2e6; background: #fff9f4; color: #d9534f; font-weight: bold; font-size: 16px;" id="nbCellFN">--</td>
                    <td style="padding: 12px; border: 1px solid #dee2e6; background: #f4faf5; color: #155724; font-weight: bold; font-size: 16px;" id="nbCellTP">--</td>
                  </tr>
                </tbody>
              </table>
              <div style="display: flex; gap: 12px; font-size: 10.5px; color: #868e96; margin-top: 8px; justify-content: center;">
                <span>• TN = 真阴性 (正确分类为 ${escapeHtml(labels.negName)})</span>
                <span>• TP = 真阳性 (正确分类为 ${escapeHtml(labels.posName)})</span>
              </div>
              <div style="display: flex; gap: 12px; font-size: 10.5px; color: #868e96; margin-top: 2px; justify-content: center;">
                <span>• FP = 假阳性 (误判为 ${escapeHtml(labels.posName)})</span>
                <span>• FN = 假阴性 (漏报 ${escapeHtml(labels.posName)})</span>
              </div>
            </div>
            
            <div style="background:#eef4fa; border-left: 4px solid #2b5c8f; border-radius:4px; padding:10px 12px; margin-top:16px; font-size:11px; line-height:1.5; color:#555;" id="nbEvalSceneText">
              当前为默认均衡阈值 0.50。
            </div>
          </div>
        </div>
        
        <!-- 右栏：ECharts ROC/PR 曲线 -->
        <div>
          <section class="chart-card" style="margin: 0 0 16px 0;">
            <div class="chart-head">
              <div>
                <div class="chart-title">交互式分类评估曲线</div>
                <div class="chart-sub">红点随左侧滑块阈值在曲线轨道上平滑移动</div>
              </div>
            </div>
            <div class="chart-toolbar">
              <div class="segmented-control" role="group" aria-label="评估曲线切换">
                <button class="seg-btn active" type="button" id="nbBtnShowRoc">ROC 曲线</button>
                <button class="seg-btn" type="button" id="nbBtnShowPr">P-R 曲线</button>
              </div>
            </div>
            <div class="chart" id="chart_nb_evaluate_curve" style="height: 340px; min-height: 340px; margin-bottom:5px;"></div>
            <div style="padding: 0 18px 5px 18px; text-align: center; font-size: 12px; color: #495057; font-weight: bold;" id="nbEvalCurveStats">
              <!-- AUC 统计 -->
            </div>
          </section>
        </div>

        <!-- 下方全宽：错分样本分析 -->
        <div class="nb-eval-card" style="grid-column: 1 / -1; margin-top: 16px;">
          <h3>错分样本分析 (Misclassified Samples Analysis)</h3>
          <h4 style="margin-bottom:8px;">对错分样本页执行“移除后重算”，可以观察某些强判别词是否把文本推向了错误类别。</h4>
          <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:12px; border-radius:6px; font-size:12px; line-height:1.5; color:#475569; margin-bottom:12px;" id="nbEvalMisclassifiedNotice">
            已加载错分样本解释。请观察后验概率和贡献词分组。
          </div>
          <div id="nbEvalMisclassifiedList">
            <!-- 错分样本列表 -->
          </div>
        </div>
        
      </div>
    </div>
  `;

  // 绑定事件
  $("nbEvalThresholdSlider").addEventListener("input", function() {
    nbEvalThreshold = parseFloat(this.value);
    $("nbEvalThresholdVal").textContent = nbEvalThreshold.toFixed(2);
    updateNbEvalMetrics();
  });

  $("nbScenarioConserv").addEventListener("click", () => selectNbScenario(0.10, "nbScenarioConserv"));
  $("nbScenarioDefault").addEventListener("click", () => selectNbScenario(0.50, "nbScenarioDefault"));
  $("nbScenarioPrecise").addEventListener("click", () => selectNbScenario(0.90, "nbScenarioPrecise"));

  $("nbBtnShowRoc").addEventListener("click", function() {
    nbEvalChartType = "roc";
    document.querySelectorAll(".segmented-control button").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    drawNbEvalCurve();
  });

  $("nbBtnShowPr").addEventListener("click", function() {
    nbEvalChartType = "pr";
    document.querySelectorAll(".segmented-control button").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    drawNbEvalCurve();
  });

  // 首次渲染
  updateNbEvalMetrics();
  renderNbMisclassifiedSamples();
}

function updateNbEvalMetrics() {
  if (!nbTrainData || !nbTrainData.eval_samples) return;
  const samples = nbTrainData.eval_samples;
  const theta = nbEvalThreshold;
  const labels = nbEvalLabelSet();
  
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const true_label = s.true_label;
    const prob = s.prob_positive;
    const pred_label = (prob >= theta) ? labels.posIndex : labels.negIndex;
    
    if (true_label === labels.posIndex && pred_label === labels.posIndex) tp++;
    else if (true_label === labels.negIndex && pred_label === labels.posIndex) fp++;
    else if (true_label === labels.negIndex && pred_label === labels.negIndex) tn++;
    else if (true_label === labels.posIndex && pred_label === labels.negIndex) fn++;
  }
  
  const acc = (tp + tn) / samples.length;
  const prec = (tp + fp > 0) ? (tp / (tp + fp)) : 1.0;
  const recall = (tp + fn > 0) ? (tp / (tp + fn)) : 0.0;
  const f1 = (prec + recall > 0) ? (2 * prec * recall / (prec + recall)) : 0.0;
  
  $("nbCellTP").textContent = tp;
  $("nbCellFP").textContent = fp;
  $("nbCellTN").textContent = tn;
  $("nbCellFN").textContent = fn;
  
  $("nbEvalAcc").textContent = (acc * 100).toFixed(1) + "%";
  $("nbEvalPrec").textContent = (prec * 100).toFixed(1) + "%";
  $("nbEvalRecall").textContent = (recall * 100).toFixed(1) + "%";
  $("nbEvalF1").textContent = (f1 * 100).toFixed(1) + "%";
  
  let sceneDesc = "";
  if (theta <= 0.20) {
    sceneDesc = `📢 <strong>${escapeHtml(labels.posName)} 高召回</strong>：阈值 θ = ${theta.toFixed(2)}。系统更容易判为 ${escapeHtml(labels.posName)}，召回率通常更高，但 ${escapeHtml(labels.negName)} 被误判为 ${escapeHtml(labels.posName)} 的假阳性 FP 会增加。`;
  } else if (theta >= 0.80) {
    sceneDesc = `📢 <strong>${escapeHtml(labels.posName)} 高精确</strong>：阈值 θ = ${theta.toFixed(2)}。系统更谨慎地判为 ${escapeHtml(labels.posName)}，精确率通常更高，但 ${escapeHtml(labels.posName)} 被漏判为 ${escapeHtml(labels.negName)} 的假阴性 FN 会增加。`;
  } else {
    sceneDesc = `📢 <strong>均衡模式（默认）</strong>：阈值 θ = ${theta.toFixed(2)}。在 ${escapeHtml(labels.posName)} 的精确率与召回率之间取折中，整体分类 F1-score 更稳定。`;
  }
  $("nbEvalSceneText").innerHTML = sceneDesc;
  
  drawNbEvalCurve(true);
}

function selectNbScenario(val, btnId) {
  nbEvalThreshold = val;
  $("nbEvalThresholdSlider").value = val;
  $("nbEvalThresholdVal").textContent = val.toFixed(2);
  
  document.querySelectorAll(".nb-scenario-btn").forEach(b => b.classList.remove("active"));
  $(btnId).classList.add("active");
  
  updateNbEvalMetrics();
}

function calculateNbEvalCurves() {
  if (!nbTrainData || !nbTrainData.eval_samples) return;
  const samples = nbTrainData.eval_samples;
  const labels = nbEvalLabelSet();
  
  const roc = [];
  const pr = [];
  
  // 计算 AUC
  let pos = samples.filter(x => x.true_label === labels.posIndex);
  let neg = samples.filter(x => x.true_label === labels.negIndex);
  let aucSum = 0;
  if (pos.length > 0 && neg.length > 0) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < neg.length; j++) {
        if (pos[i].prob_positive > neg[j].prob_positive) {
          aucSum += 1.0;
        } else if (pos[i].prob_positive === neg[j].prob_positive) {
          aucSum += 0.5;
        }
      }
    }
    nbCachedAuc = aucSum / (pos.length * neg.length);
  } else {
    nbCachedAuc = 0.5;
  }
  
  // 采集 101 个阈值点
  for (let t = 0; t <= 100; t++) {
    const theta = t / 100;
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const true_label = s.true_label;
      const prob = s.prob_positive;
      const pred_label = (prob >= theta) ? labels.posIndex : labels.negIndex;
      
      if (true_label === labels.posIndex && pred_label === labels.posIndex) tp++;
      else if (true_label === labels.negIndex && pred_label === labels.posIndex) fp++;
      else if (true_label === labels.negIndex && pred_label === labels.negIndex) tn++;
      else if (true_label === labels.posIndex && pred_label === labels.negIndex) fn++;
    }
    
    const tpr = (tp + fn > 0) ? (tp / (tp + fn)) : 0.0;
    const fpr = (fp + tn > 0) ? (fp / (fp + tn)) : 0.0;
    const prec = (tp + fp > 0) ? (tp / (tp + fp)) : 1.0;
    const recall = tpr;
    
    roc.push([fpr, tpr, theta]);
    pr.push([recall, prec, theta]);
  }
  
  nbCachedRocPoints = roc.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  nbCachedPrPoints = pr.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function drawNbEvalCurve(onlyUpdateDot = false) {
  const curveDom = $("chart_nb_evaluate_curve");
  if (!curveDom || !nbTrainData) return;
  
  if (!nbCachedRocPoints || !nbCachedPrPoints) {
    calculateNbEvalCurves();
  }
  
  const isRoc = nbEvalChartType === "roc";
  const points = isRoc ? nbCachedRocPoints : nbCachedPrPoints;
  const lineData = points.map(p => [p[0], p[1]]);
  
  // 计算当前点
  const theta = nbEvalThreshold;
  const labels = nbEvalLabelSet();
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const samples = nbTrainData.eval_samples;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const true_label = s.true_label;
    const prob = s.prob_positive;
    const pred_label = (prob >= theta) ? labels.posIndex : labels.negIndex;
    
    if (true_label === labels.posIndex && pred_label === labels.posIndex) tp++;
    else if (true_label === labels.negIndex && pred_label === labels.posIndex) fp++;
    else if (true_label === labels.negIndex && pred_label === labels.negIndex) tn++;
    else if (true_label === labels.posIndex && pred_label === labels.negIndex) fn++;
  }
  
  const tpr = (tp + fn > 0) ? (tp / (tp + fn)) : 0.0;
  const fpr = (fp + tn > 0) ? (fp / (fp + tn)) : 0.0;
  const prec = (tp + fp > 0) ? (tp / (tp + fp)) : 1.0;
  const recall = tpr;
  
  const curX = isRoc ? fpr : recall;
  const curY = isRoc ? tpr : prec;
  
  if (isRoc) {
    $("nbEvalCurveStats").innerHTML = `ROC 曲线下方面积 (AUC): <span style="color:#d9354f; font-size:14px; font-weight:800;">${nbCachedAuc.toFixed(4)}</span>`;
  } else {
    let apSum = 0;
    const sorted = [...samples].sort((a,b) => b.prob_positive - a.prob_positive);
    let correctCount = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].true_label === labels.posIndex) {
        correctCount++;
        apSum += correctCount / (i + 1);
      }
    }
    const ap = correctCount > 0 ? apSum / correctCount : 0.0;
    $("nbEvalCurveStats").innerHTML = `平均精确率 (Average Precision, AP): <span style="color:#2b5c8f; font-size:14px; font-weight:800;">${ap.toFixed(4)}</span>`;
  }
  
  if (onlyUpdateDot) {
    const ch = echarts.getInstanceByDom(curveDom);
    if (ch) {
      ch.setOption({
        series: [
          {},
          { data: [[curX, curY]] }
        ]
      });
      return;
    }
  }
  
  const oldCh = echarts.getInstanceByDom(curveDom);
  if (oldCh) oldCh.dispose();
  
  const ch = echarts.init(curveDom);
  const color = isRoc ? '#d9354f' : '#2b5c8f';
  const title = isRoc ? 'ROC 曲线' : 'P-R (Precision-Recall) 曲线';
  const xName = isRoc ? '假阳性率 FPR' : '召回率 Recall';
  const yName = isRoc ? '真阳性率 TPR' : '精确率 Precision';
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: { left: '12%', right: '8%', top: '8%', bottom: '15%' },
    xAxis: {
      type: 'value',
      name: xName,
      nameLocation: 'middle',
      nameGap: 24,
      min: 0,
      max: 1.0,
      splitLine: { show: true, lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'value',
      name: yName,
      nameLocation: 'middle',
      nameGap: 28,
      min: 0,
      max: 1.05,
      splitLine: { show: true, lineStyle: { type: 'dashed' } }
    },
    series: [
      {
        name: title,
        type: 'line',
        data: lineData,
        showSymbol: false,
        lineStyle: { color: color, width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color },
            { offset: 1, color: '#ffffff' }
          ]),
          opacity: 0.12
        }
      },
      {
        name: '当前决策点',
        type: 'effectScatter',
        data: [[curX, curY]],
        symbolSize: 10,
        rippleEffect: { scale: 3, brushType: 'stroke' },
        itemStyle: { color: '#e74c3c' },
        tooltip: {
          formatter: () => `<strong>当前阈值点:</strong><br>阈值 θ: ${theta.toFixed(2)}<br>${isRoc ? 'FPR' : 'Recall'}: ${curX.toFixed(3)}<br>${isRoc ? 'TPR' : 'Precision'}: ${curY.toFixed(3)}`
        }
      }
    ]
  };
  
  if (isRoc) {
    option.series.push({
      name: '随机猜测线',
      type: 'line',
      data: [[0, 0], [1, 1]],
      showSymbol: false,
      lineStyle: { type: 'dashed', color: '#868e96', width: 1.5 }
    });
  }
  
  ch.setOption(option);
  charts.set("chart_nb_evaluate_curve", ch);
}

function openNbEvaluateCodeDrawer() {
  closeEvaluateCodeDrawer();
  
  const theta = nbEvalThreshold;
  const prec = parseFloat($("nbEvalPrec").textContent) / 100;
  const recall = parseFloat($("nbEvalRecall").textContent) / 100;
  const f1 = parseFloat($("nbEvalF1").textContent) / 100;
  const acc = parseFloat($("nbEvalAcc").textContent) / 100;
  const targetNames = nbTrainData.target_names;
  const labels = nbEvalLabelSet();
  
  const spec = {
    title: "模型评估（分类阈值调整与计算）",
    operation: `在决策阈值 θ = ${theta.toFixed(2)} 下计算测试集各项指标`,
    code: `
# 朴素贝叶斯分类决策与评估计算过程

import numpy as np
from sklearn.metrics import classification_report, roc_curve, auc

# 1. 拟合与预测概率
# X_test_tfidf 为特征矩阵，clf 为训练好的 MultinomialNB 实例
y_prob_positive = clf.predict_proba(X_test_tfidf)[:, ${labels.posIndex}] # 取得属于 ${labels.posName} 的后验概率

# 2. 动态调节分类决策阈值
threshold = ${theta.toFixed(2)}
y_pred_dynamic = np.where(y_prob_positive >= threshold, ${labels.posIndex}, ${labels.negIndex})

# 3. 计算混淆矩阵 (Confusion Matrix) 实时数值
# y_test 为测试集真实标签
tp = np.sum((y_test == ${labels.posIndex}) & (y_pred_dynamic == ${labels.posIndex}))
fp = np.sum((y_test == ${labels.negIndex}) & (y_pred_dynamic == ${labels.posIndex}))
fn = np.sum((y_test == ${labels.posIndex}) & (y_pred_dynamic == ${labels.negIndex}))
tn = np.sum((y_test == ${labels.negIndex}) & (y_pred_dynamic == ${labels.negIndex}))

# 4. 指标计算与当前数值展示
accuracy = (tp + tn) / len(y_test)
# 当前准确率 accuracy = ${acc.toFixed(4)}

precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
# 当前精确率 precision = ${prec.toFixed(4)}

recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
# 当前召回率 recall = ${recall.toFixed(4)}

f1_score = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
# 当前 F1 值 f1_score = ${f1.toFixed(4)}

# 5. ROC 曲线与 AUC 计算
fpr_arr, tpr_arr, thresholds = roc_curve(y_test, y_prob_positive, pos_label=${labels.posIndex})
roc_auc = auc(fpr_arr, tpr_arr)
# 测试集全局 AUC 面积 = ${nbCachedAuc.toFixed(4)}
    `.trim(),
    notes: [
      `模型预测输出每个类别的后验概率，阈值 θ 就是分类器的“评判标准”。`,
      `提升阈值使得判为 ${labels.posName} 变严格，通常会提高 Precision (降低误报)，但 Recall 会降低 (漏报多)。`,
      `ROC 曲线是不依赖单一阈值的全局性能曲线。对角线代表随机猜测，越往左上角凸起说明分类性能越好。`,
      `AUC 是 ROC 曲线下的面积，在 [0.5, 1.0] 之间，越接近 1.0 分类器分类越完美。`
    ]
  };
  
  document.body.insertAdjacentHTML("beforeend", evaluateCodeDrawerHtml(spec));
  
  const drawer = document.querySelector(".code-drawer-backdrop");
  drawer?.addEventListener("click", event => {
    if (!event.target.closest("[data-code-close]")) return;
    closeEvaluateCodeDrawer();
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

function renderNbMisclassifiedSamples() {
  const listEl = $("nbEvalMisclassifiedList");
  if (!listEl) return;
  
  const samples = nbTrainData.misclassified_samples || [];
  if (samples.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; font-style:italic; padding:20px 0; font-size:12px;">太棒了！测试集中没有错分样本。</div>`;
    return;
  }
  
  let html = `
    <table class="nb-table" style="width: 100%; font-size: 13px;">
      <thead>
        <tr>
          <th>样本编号</th>
          <th>真实类别</th>
          <th>预测类别</th>
          <th>预测置信度</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  samples.forEach((sample, index) => {
    const predClass = sample.predicted_label;
    const confidence = ((sample.posterior_probs[predClass] || 0) * 100).toFixed(1) + "%";
    
    html += `
      <tr style="cursor:pointer;" onclick="toggleMisclassifiedDetail(${index})">
        <td class="font-mono">#${sample.raw_index}</td>
        <td><span style="color:#d9354f; font-weight:bold;">${escapeHtml(sample.true_label)}</span></td>
        <td><span style="color:#2563eb; font-weight:bold;">${escapeHtml(sample.predicted_label)}</span></td>
        <td class="font-mono">${confidence}</td>
        <td><button class="secondary-btn" style="padding:4px 8px; font-size:11px;">查看原因</button></td>
      </tr>
      <tr id="nbMisclassDetail_${index}" style="display:none; background-color:#fafafa;">
        <td colspan="5" style="padding: 16px; border-top: none;">
          <div class="nb-misclass-detail-container" style="display:flex; flex-direction:column; gap:16px;">
            
            <!-- 原始文本展示 (带高亮) -->
            <div>
              <h4 style="font-size:12.5px; font-weight:bold; color:#1e293b; margin:0 0 6px 0;">原始文本 (具有词表外词及拉力高亮)</h4>
              <div class="nb-misclass-highlight-text" style="font-size:12.5px; line-height:1.7; color:#334155; padding:12px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; max-height:220px; overflow-y:auto; white-space:pre-wrap; font-family:monospace;">
                <!-- 高亮分词内容 -->
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
              <!-- 后验概率与对数得分拆解 -->
              <div>
                <h4 style="font-size:12.5px; font-weight:bold; color:#1e293b; margin:0 0 6px 0;">后验概率与对数得分拆解</h4>
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:10px;">
                  <div style="font-size:11.5px; line-height:1.6; color:#475569;">
                    <strong>对数得分计算：</strong><br>
                    • score(${escapeHtml(nbTrainData.negative_class)}) = log P(${escapeHtml(nbTrainData.negative_class)}) + Σ log P(word | ${escapeHtml(nbTrainData.negative_class)})<br>
                    &nbsp;&nbsp;= ${sample.prior_scores[nbTrainData.negative_class].toFixed(2)} + (${sample.likelihood_scores[nbTrainData.negative_class].toFixed(2)}) = <strong>${sample.raw_scores[nbTrainData.negative_class].toFixed(4)}</strong><br>
                    • score(${escapeHtml(nbTrainData.positive_class)}) = log P(${escapeHtml(nbTrainData.positive_class)}) + Σ log P(word | ${escapeHtml(nbTrainData.positive_class)})<br>
                    &nbsp;&nbsp;= ${sample.prior_scores[nbTrainData.positive_class].toFixed(2)} + (${sample.likelihood_scores[nbTrainData.positive_class].toFixed(2)}) = <strong>${sample.raw_scores[nbTrainData.positive_class].toFixed(4)}</strong><br>
                    <span style="font-size:10.5px; color:#868e96; display:block; margin-top:4px;">💡 预测类别为对数得分较大的类别，联合对数得分是在对数空间累加先验概率与各词的条件概率所得。</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; margin-top:4px;">
                    <div style="flex:1;">
                      <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                        <span>${escapeHtml(nbTrainData.negative_class)} (阴性)</span>
                        <strong>${(sample.posterior_probs[nbTrainData.negative_class]*100).toFixed(1)}%</strong>
                      </div>
                      <div style="background:#e9ecef; height:8px; border-radius:4px; overflow:hidden;">
                        <div style="width:${sample.posterior_probs[nbTrainData.negative_class]*100}%; background:#10b981; height:100%;"></div>
                      </div>
                    </div>
                    <div style="flex:1;">
                      <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                        <span>${escapeHtml(nbTrainData.positive_class)} (阳性)</span>
                        <strong>${(sample.posterior_probs[nbTrainData.positive_class]*100).toFixed(1)}%</strong>
                      </div>
                      <div style="background:#e9ecef; height:8px; border-radius:4px; overflow:hidden;">
                        <div style="width:${sample.posterior_probs[nbTrainData.positive_class]*100}%; background:#8b5cf6; height:100%;"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 错误原因推导与特征词拉力 -->
              <div>
                <h4 style="font-size:12.5px; font-weight:bold; color:#1e293b; margin:0 0 6px 0;">错误诊断与贡献词分组</h4>
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                  <div style="background:#fff5f5; border:1px solid #ffe3e3; color:#e03131; padding:8px; border-radius:4px; font-size:11.5px; line-height:1.5;">
                    <strong>诊断分析：</strong> <span class="nb-misclass-error-reason">分析中...</span>
                  </div>
                  <div class="nb-misclass-recalc-result" id="nbMisclassRecalc_${index}" style="display:none; padding:8px; border-radius:4px; font-size:11.5px; line-height:1.5; margin-top:8px;">
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11.5px; margin-top:4px;">
                    <div>
                      <strong style="color:#2b8a3e;">支持真实类 (${escapeHtml(sample.true_label)}) 词 (Top 3):</strong>
                      <div class="nb-misclass-true-words" style="margin-top:4px; display:flex; flex-direction:column; gap:3px;"></div>
                    </div>
                    <div>
                      <strong style="color:#8b5cf6;">支持预测类 (${escapeHtml(sample.predicted_label)}) 词 (Top 3):</strong>
                      <div class="nb-misclass-pred-words" style="margin-top:4px; display:flex; flex-direction:column; gap:3px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  listEl.innerHTML = html;
}

window.toggleMisclassifiedDetail = function(index, removed_word = null) {
  const row = $(`nbMisclassDetail_${index}`);
  if (!row) return;
  
  if (row.style.display === "none" || removed_word) {
    const samples = nbTrainData.misclassified_samples || [];
    if (!removed_word) {
      for (let i = 0; i < samples.length; i++) {
        const otherRow = $(`nbMisclassDetail_${i}`);
        if (otherRow && i !== index) otherRow.style.display = "none";
      }
    }
    
    row.style.display = "table-row";
    
    const sample = samples[index];
    const trueLabel = sample.true_label;
    const predLabel = sample.predicted_label;
    
    const trueWords = sample.support_true_words || [];
    const predWords = sample.support_pred_words || [];
    
    const strongPredWords = predWords.filter(w => w.abs_delta >= 0.8).map(w => w.word);
    
    let reasonText = "";
    
    const probTrue = sample.posterior_probs[trueLabel] || 0;
    const probPred = sample.posterior_probs[predLabel] || 0;
    
    if (Math.abs(probTrue - probPred) < 0.15) {
      reasonText = "两个类别后验概率接近，该样本位于模型决策边界附近。";
    } else if (strongPredWords.length >= 2) {
      reasonText = `该样本中存在多个更支持预测类别的词（如 ${strongPredWords.slice(0, 3).join("、")}），模型因此将文本推向预测类别。`;
    } else if (trueWords.length <= 1) {
      reasonText = "该样本中支持真实类别的有效词较少，模型对真实类别的证据不足。";
    } else {
      reasonText = "该样本中存在多个更支持预测类别的词，模型因此将文本推向预测类别。";
    }
    
    const reasonEl = row.querySelector(".nb-misclass-error-reason");
    if (reasonEl) reasonEl.textContent = reasonText;
    
    const trueWordsContainer = row.querySelector(".nb-misclass-true-words");
    if (trueWordsContainer) {
      if (trueWords.length === 0) {
        trueWordsContainer.innerHTML = `<span style="color:#868e96; font-style:italic;">(无)</span>`;
      } else {
        trueWordsContainer.innerHTML = trueWords.slice(0, 3).map(w => {
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:monospace; background:#eafaf4; color:#0f766e; padding:3px 6px; border-radius:3px; margin-bottom:3px; font-size:11px;">
              <span>${escapeHtml(w.word)} (Δ=${w.delta.toFixed(2)})</span>
              <button class="secondary-btn" style="padding:1px 4px; font-size:9.5px; margin:0;" onclick="event.stopPropagation(); runNbEvalPredictWithoutWord(${index}, '${escapeHtml(w.word)}')">移除后重算</button>
            </div>
          `;
        }).join("");
      }
    }
    
    const predWordsContainer = row.querySelector(".nb-misclass-pred-words");
    if (predWordsContainer) {
      if (predWords.length === 0) {
        predWordsContainer.innerHTML = `<span style="color:#868e96; font-style:italic;">(无)</span>`;
      } else {
        predWordsContainer.innerHTML = predWords.slice(0, 3).map(w => {
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:monospace; background:#f5f3ff; color:#6d28d9; padding:3px 6px; border-radius:3px; margin-bottom:3px; font-size:11px;">
              <span>${escapeHtml(w.word)} (Δ=${w.delta.toFixed(2)})</span>
              <button class="secondary-btn" style="padding:1px 4px; font-size:9.5px; margin:0;" onclick="event.stopPropagation(); runNbEvalPredictWithoutWord(${index}, '${escapeHtml(w.word)}')">移除后重算</button>
            </div>
          `;
        }).join("");
      }
    }
    
    const highlightContainer = row.querySelector(".nb-misclass-highlight-text");
    if (highlightContainer && sample.highlighted_tokens) {
      const rawText = sample.full_text;
      const highlightedTokens = sample.highlighted_tokens || [];
      const positiveClass = nbTrainData.positive_class;
      
      highlightedTokens.sort((a, b) => a.start - b.start);
      
      let lastIdx = 0;
      let html = "";
      for (let item of highlightedTokens) {
        if (item.start > lastIdx) {
          html += escapeHtml(rawText.substring(lastIdx, item.start));
        }
        const tokenText = rawText.substring(item.start, item.end);
        if (item.status === 'valid') {
          const isRemoved = (removed_word && item.token.toLowerCase() === removed_word.toLowerCase());
          if (isRemoved) {
            const tooltip = `单词：${item.token}\n状态：已临时移除并重新计算\n（移除该词后重新计算了模型分类结果）`;
            html += `<span class="nb-token-removed nb-tooltip-trigger" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
          } else {
            const isPos = item.support_class === positiveClass;
            const className = isPos ? 'nb-token-positive' : 'nb-token-negative';
            
            const opacity = Math.min(0.45, 0.10 + (item.abs_delta / 8.0) * 0.35);
            const borderOpacity = Math.min(0.85, 0.35 + (item.abs_delta / 8.0) * 0.50);
            const colorStyle = isPos ? 
              `background: rgba(37, 99, 235, ${opacity}); border-bottom: 2px solid rgba(37, 99, 235, ${borderOpacity}); cursor: help;` :
              `background: rgba(16, 185, 129, ${opacity}); border-bottom: 2px solid rgba(16, 185, 129, ${borderOpacity}); cursor: help;`;
            
            const tooltip = `单词：${item.token}\n状态：有效词\n支持类别：${item.support_class}\nΔ(w)：${item.delta > 0 ? '+' : ''}${item.delta.toFixed(4)}\nlog P(w|${nbTrainData.negative_class})：${item.log_prob_negative.toFixed(4)}\nlog P(w|${nbTrainData.positive_class})：${item.log_prob_positive.toFixed(4)}`;
            
            html += `<span class="${className} nb-tooltip-trigger" style="${colorStyle}" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
          }
        } else if (item.status === 'oov') {
          const tooltip = `单词：${item.token}\n状态：词表外词\n说明：该词未进入模型词表，预测时未参与计算。`;
          html += `<span class="nb-token-oov nb-tooltip-trigger" data-word="${escapeHtml(item.token.toLowerCase())}" title="${escapeHtml(tooltip)}">${escapeHtml(tokenText)}</span>`;
        } else {
          html += escapeHtml(tokenText);
        }
        lastIdx = item.end;
      }
      if (lastIdx < rawText.length) {
        html += escapeHtml(rawText.substring(lastIdx));
      }
      highlightContainer.innerHTML = html;
    }
  } else {
    row.style.display = "none";
  }
};

async function runNbEvalPredictWithoutWord(index, word) {
  const recalcEl = $("nbMisclassRecalc_" + index);
  if (!recalcEl) return;

  recalcEl.style.display = "block";
  recalcEl.style.background = "#f1f3f5";
  recalcEl.style.border = "1px solid #dee2e6";
  recalcEl.style.color = "#495057";
  recalcEl.innerHTML = `正在重新预测，请稍候...`;

  try {
    const sample = nbTrainData.misclassified_samples[index];
    const payload = {
      dataset_id: nbTrainData.dataset_id,
      sample_index: sample.index,
      removed_word: word
    };

    const res = await runAction("predict_without_word", payload);

    const originalPred = res.original.predicted_label;
    const afterPred = res.after_removal.predicted_label;
    const trueLabel = sample.true_label;
    const corrected = (afterPred === trueLabel);

    const originalTrueProb = res.original.posterior_probs[trueLabel];
    const afterTrueProb = res.after_removal.posterior_probs[trueLabel];

    let messageText = "";
    let alertBg = "";
    let alertBorder = "";
    let alertColor = "";

    if (corrected) {
      messageText = `移除该词后，模型预测回真实类别，说明该词是导致错分的重要误导词。`;
      alertBg = "#e6fcf5";
      alertBorder = "1px solid #c3fae8";
      alertColor = "#099268";
    } else {
      messageText = `移除该词后，模型预测结果仍未改变，说明该样本的错误由多个词共同造成。`;
      alertBg = "#fff5f5";
      alertBorder = "1px solid #ffe3e3";
      alertColor = "#e03131";
    }

    recalcEl.style.background = alertBg;
    recalcEl.style.border = alertBorder;
    recalcEl.style.color = alertColor;

    recalcEl.innerHTML = `
      <div><strong>移除词项重算结果：</strong></div>
      <div>• 移除词：<strong style="font-family: monospace;">${escapeHtml(res.removed_word)}</strong>（在该文本中出现过 ${res.removed_count} 次）</div>
      <div>• 类别概率变化：P(${escapeHtml(trueLabel)} | doc) 从 <strong>${(originalTrueProb * 100).toFixed(1)}%</strong> 变动至 <strong>${(afterTrueProb * 100).toFixed(1)}%</strong></div>
      <div>• 预测决策变化：预测类别由 <strong>${escapeHtml(originalPred)}</strong> 变为 <strong>${escapeHtml(afterPred)}</strong>（真实类别为：<strong>${escapeHtml(trueLabel)}</strong>）</div>
      <div style="margin-top: 6px; font-weight: bold; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 6px;">
        📢 诊断结果：${messageText}
      </div>
    `;

    toggleMisclassifiedDetail(index, word);

  } catch (err) {
    recalcEl.style.background = "#fff5f5";
    recalcEl.style.border = "1px solid #ffe3e3";
    recalcEl.style.color = "#e03131";
    recalcEl.innerHTML = `❌ 重新预测失败：${escapeHtml(err.message)}`;
  }
}

window.runNbEvalPredictWithoutWord = runNbEvalPredictWithoutWord;
