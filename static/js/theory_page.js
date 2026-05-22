// Theory Page: editable student-facing slide decks.

const THEORY_DECK_OVERRIDE_URL = "/api/theory_deck_overrides";
const THEORY_PAGE_STATE = {
  pageId: "basic",
  currentSlide: 0,
  dirty: false,
  editing: false,
  deck: null,
  slideScaleObserver: null,
  selectedId: null,
  selectedIds: [],
  historyPast: [],
  historyFuture: [],
  snapToGrid: false,
  historyLocked: false,
  serverOverrides: {},
  saveTimer: null,
  saving: false,
  editVersion: 0,
  chartRuntime: {},
};

const THEORY_HISTORY_LIMIT = 50;
const THEORY_SLIDE_WIDTH = 960;
const THEORY_GRID_SIZE = 8;
const THEORY_SLIDE_EDGE_X = 50;
const THEORY_SLIDE_EDGE_Y = 36;
const THEORY_SLIDE_GAP_X = 28;
const THEORY_SLIDE_GAP_Y = 16;
const THEORY_SLIDE_TITLE_WIDTH = 440;
const THEORY_SLIDE_IMAGE_WIDTH = 400;
const THEORY_SLIDE_IMAGE_X = 510;
const THEORY_SLIDE_TEXT_WIDTH = 420;

const SAFE_FONTS = [
  ["", "默认字体"],
  ['"Microsoft YaHei", sans-serif', "微软雅黑"],
  ['SimSun, serif', "宋体"],
  ['SimHei, sans-serif', "黑体"],
  ["Arial, sans-serif", "Arial"],
  ['"Times New Roman", serif', "Times New Roman"],
  ["Consolas, monospace", "Consolas"],
];

const THEORY_KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css";
const THEORY_KATEX_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js";
const THEORY_FORMULA_STYLE_ID = "theory-formula-style";
const THEORY_KATEX_STYLE_ID = "theory-katex-style";
const THEORY_KATEX_SCRIPT_ID = "theory-katex-script";
const THEORY_DEFAULT_FORMULA = "\\hat{y}=wx+b";
const THEORY_DEFAULT_INLINE_FORMULA = `$${THEORY_DEFAULT_FORMULA}$`;

const THEORY_PAGE_IDS = ["basic", "purpose", "knowledge", "dataset", "model", "criterion", "optimization", "evaluation", "result", "thinking"];
const THEORY_PAGE_CONFIGS = window.THEORY_PAGE_CONFIGS || {};
window.THEORY_PAGE_CONFIGS = THEORY_PAGE_CONFIGS;

function theoryPageConfig(pageId) {
  return THEORY_PAGE_CONFIGS[pageId] || null;
}

function theoryTopic(pageId) {
  return theoryPageConfig(pageId)?.topic || null;
}

function theoryScenario(pageId) {
  return theoryPageConfig(pageId)?.scenario || null;
}

function theoryStudentDeck(pageId) {
  return theoryPageConfig(pageId)?.studentDeck || null;
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeComponent(type, data = {}) {
  return {
    id: data.id || uid(type),
    type,
    kind: data.kind || "",
    label: data.label || "",
    text: data.text || "",
    title: data.title || "",
    body: data.body || "",
    items: data.items ? clone(data.items) : [],
    style: data.style ? { ...data.style } : {},
    position: data.position ? { ...data.position } : null,
    src: data.src || "",
    alt: data.alt || "",
    chartSpec: data.chartSpec ? clone(data.chartSpec) : null,
  };
}

function withDeckPosition(component, left, top, width, height, zIndex = 1) {
  return {
    ...component,
    position: {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: typeof height === "number" ? `${height}px` : height,
      zIndex
    }
  };
}

function makeDeckBadge(text) {
  return makeComponent("eyebrow", {
    text,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "999px",
      background: "#eef4ff",
      color: "#204ecf",
      fontSize: "13px",
      fontWeight: "800",
      letterSpacing: "0.08em",
      border: "1px solid rgba(32,78,207,0.12)",
      boxShadow: "0 8px 18px rgba(32,78,207,0.08)"
    }
  });
}

function makeDeckTitle(text) {
  return makeComponent("h1", {
    text,
    style: {
      fontSize: "56px",
      fontWeight: "900",
      lineHeight: "1.04",
      color: "#0f172a",
      margin: "0",
      letterSpacing: "-0.03em"
    }
  });
}

function makeDeckSection(text) {
  return makeComponent("h2", {
    text,
    style: {
      fontSize: "30px",
      fontWeight: "900",
      lineHeight: "1.18",
      color: "#0f172a",
      margin: "0",
      letterSpacing: "-0.02em"
    }
  });
}

function makeDeckText(text, style = {}) {
  return makeComponent("p", {
    text,
    style: {
      fontSize: "18px",
      lineHeight: "1.78",
      color: "#334155",
      margin: "0",
      whiteSpace: "pre-wrap",
      ...style
    }
  });
}

function makeDeckCard(title, body) {
  return makeComponent("cards", {
    items: [{
      id: uid("card"),
      title,
      body,
      style: {},
      titleStyle: {
        fontSize: "18px",
        fontWeight: "800",
        color: "#0f172a"
      },
      bodyStyle: {
        fontSize: "15px",
        lineHeight: "1.68",
        color: "#475569"
      }
    }]
  });
}

function chartLabel(kind, alt) {
  const labels = {
    learningflow: "学习流程",
    scatter: "散点关系",
    error: "误差示意",
    normalize: "标准化示意",
    datasetmap: "数据结构示意",
    fitanimate: "拟合过程",
    loss: "损失定义",
    losstrain: "损失下降",
    metriccards: "指标对比",
    hill: "梯度下降",
    contour: "参数路径",
    lrcompare: "学习率对比",
    resultflow: "结果链路",
    multifactor: "多特征关系",
    concepts: "核心概念",
    pipeline: "流程示意"
  };
  return labels[kind] || alt || "示意图";
}

function makeChartImage(kind, alt) {
  return makeComponent("visual", {
    kind,
    label: chartLabel(kind, alt),
    text: `${alt || chartLabel(kind, alt)}\n课堂示意图`,
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-start",
      textAlign: "left",
      whiteSpace: "pre-wrap",
      fontSize: "20px",
      fontWeight: "800",
      lineHeight: "1.42",
      color: "#0f172a",
      background: "linear-gradient(180deg, rgba(249,251,255,0.98), rgba(238,244,255,0.94))",
      border: "1px solid rgba(148,163,184,0.22)",
      borderRadius: "28px",
      boxShadow: "0 22px 50px rgba(15,23,42,0.10)"
    }
  });
}

function makeDeckChart(kind, text, chartSpec = {}) {
  return makeComponent("chart", {
    kind,
    label: chartSpec.label || chartLabel(kind, text),
    text: text || chartSpec.caption || chartLabel(kind, text),
    chartSpec,
    style: chartSpec.captionStyle ? { ...chartSpec.captionStyle } : {},
  });
}

function theoryChartTheme(kind) {
  const blue = "#2563eb";
  const sky = "#60a5fa";
  const slate = "#0f172a";
  const amber = "#f59e0b";
  const emerald = "#10b981";
  const rose = "#f43f5e";
  const violet = "#6366f1";
  if (kind === "learningflow") {
    return { blue, sky, slate, amber, emerald, rose, violet };
  }
  return { blue, sky, slate, amber, emerald, rose, violet };
}

function makeLearningFlowChartOption(chartSpec = {}, options = {}) {
  const theme = theoryChartTheme("learningflow");
  const steps = (Array.isArray(chartSpec.steps) && chartSpec.steps.length ? chartSpec.steps : [
    { name: "读懂数据", desc: "识别特征、目标值和样本含义", color: theme.blue },
    { name: "建立模型", desc: "理解 y = wx + b 如何完成预测", color: theme.violet },
    { name: "判断结果", desc: "用误差和指标解释模型效果", color: theme.amber },
  ]).map((step, index) => ({
    x: step.x ?? (18 + index * 31),
    y: step.y ?? (index === 1 ? 44 : 58),
    name: step.name || `步骤 ${index + 1}`,
    desc: step.desc || "",
    color: step.color || [theme.blue, theme.violet, theme.amber, theme.emerald][index % 4],
  }));
  const lineData = [];
  const pulseData = [];
  for (let i = 0; i < steps.length - 1; i += 1) {
    const from = steps[i];
    const to = steps[i + 1];
    lineData.push({
      coords: [[from.x, from.y], [to.x, to.y]],
      lineStyle: { color: from.color, width: 3, opacity: 0.8 },
    });
    pulseData.push({
      coords: [[from.x, from.y], [to.x, to.y]],
      lineStyle: { color: to.color, width: 0, opacity: 0 },
    });
  }
  return {
    animation: !options.staticMode,
    animationDuration: 900,
    animationDurationUpdate: 600,
    grid: { left: 8, right: 8, top: 18, bottom: 14, containLabel: false },
    xAxis: { min: 0, max: 100, show: false, type: "value" },
    yAxis: { min: 0, max: 100, show: false, type: "value" },
    series: [
      {
        type: "lines",
        coordinateSystem: "cartesian2d",
        z: 1,
        polyline: false,
        effect: options.staticMode ? { show: false } : {
          show: true,
          period: 3.8,
          trailLength: 0.16,
          symbol: "circle",
          symbolSize: 10,
          color: theme.sky,
        },
        lineStyle: {
          width: 3,
          curveness: 0.18,
          opacity: 0.9,
          color: theme.blue,
        },
        data: pulseData,
      },
      {
        type: "lines",
        coordinateSystem: "cartesian2d",
        z: 2,
        polyline: false,
        lineStyle: {
          width: 3,
          curveness: 0.18,
          opacity: 0.75,
          color: theme.blue,
        },
        data: lineData,
      },
      {
        type: "scatter",
        coordinateSystem: "cartesian2d",
        z: 3,
        symbolSize: 72,
        itemStyle: {
          shadowBlur: 24,
          shadowColor: "rgba(37,99,235,0.18)",
        },
        label: {
          show: true,
          formatter: params => `{name|${params.data.name}}\n{desc|${params.data.desc || ""}}`,
          rich: {
            name: { fontSize: 15, fontWeight: 800, color: theme.slate, lineHeight: 22 },
            desc: { fontSize: 11, color: "#475569", lineHeight: 16 },
          },
        },
        data: steps.map(step => ({
          value: [step.x, step.y],
          name: step.name,
          desc: step.desc,
          itemStyle: {
            color: "#ffffff",
            borderColor: step.color,
            borderWidth: 3,
          },
        })),
      }
    ],
    graphic: steps.map((step, index) => ({
      type: "text",
      left: `${step.x}%`,
      top: `${Math.max(10, step.y - 20)}%`,
      z: 10,
      style: {
        text: String(index + 1).padStart(2, "0"),
        fill: step.color,
        fontSize: 28,
        fontWeight: 800,
        textAlign: "center",
      }
    })),
  };
}

function resolveTheoryChartOption(component, options = {}) {
  const kind = component.chartSpec?.kind || component.kind || "learningflow";
  if (kind === "learningflow") return makeLearningFlowChartOption(component.chartSpec || {}, options);
  return makeLearningFlowChartOption(component.chartSpec || {}, options);
}

function makeStudentTitleSlide(spec, pageId) {
  return {
    id: uid("slide"),
    layout: "default",
    components: [
      withDeckPosition(makeDeckBadge("理论部分"), 50, 36, 116, 32, 2),
      withDeckPosition(makeDeckTitle(spec.title || theoryTopic(pageId)?.title || "理论内容"), 50, 88, 430, 110, 2),
      withDeckPosition(makeDeckText(spec.subtitle || "", { fontSize: "18px" }), 50, 218, 420, 72, 2),
      withDeckPosition(makeChartImage(spec.heroKind || pageId, `${spec.title || "理论页"}概览`), 530, 88, 330, 280, 1)
    ]
  };
}

function makeStudentSlide(slideSpec = {}) {
  const components = [
    withDeckPosition(makeDeckSection(slideSpec.title || "理论内容"), 50, 48, 430, 48, 2)
  ];

  if (slideSpec.cards?.length) {
    components.push(withDeckPosition(makeComponent("cards", {
      items: slideSpec.cards.map(([title, body]) => ({
        id: uid("card"),
        title,
        body,
        style: {},
        titleStyle: { fontSize: "18px", fontWeight: "700", color: "#172033" },
        bodyStyle: { fontSize: "14px", lineHeight: "1.6", color: "#475569" }
      }))
    }), 50, 132, 840, "auto", 2));
  }

  if (slideSpec.formula) {
    components.push(withDeckPosition(makeComponent("formula", {
      text: slideSpec.formula,
      style: {
        whiteSpace: "pre-wrap",
        fontSize: "24px",
        lineHeight: "1.7",
        color: "#172033"
      }
    }), 50, 144, 430, 200, 2));
  } else if (slideSpec.text) {
    components.push(withDeckPosition(makeDeckText(slideSpec.text, { fontSize: "18px" }), 50, 144, 430, 190, 2));
  }

  if (slideSpec.chart) {
    const chartKind = slideSpec.chart.kind || slideSpec.chart.chartKind || "learningflow";
    components.push(withDeckPosition(makeDeckChart(chartKind, slideSpec.chart.caption || slideSpec.note || slideSpec.title || "图表示意", slideSpec.chart), 550, 136, 310, 220, 1));
  }

  if (slideSpec.image) {
    components.push(withDeckPosition(makeChartImage(slideSpec.image, slideSpec.note || slideSpec.title || "示意图"), 550, 136, 310, 220, 1));
  }

  if (slideSpec.note) {
    components.push(withDeckPosition(makeComponent("callout", {
      text: slideSpec.note,
      style: {
        fontSize: "15px",
        lineHeight: "1.65",
        color: "#7c5c00",
        background: "#fff6d6",
        border: "1px solid #f3d370",
        borderRadius: "18px",
        padding: "14px 18px",
        whiteSpace: "pre-wrap"
      }
    }), slideSpec.image ? 550 : 50, slideSpec.cards?.length ? 420 : 382, slideSpec.image ? 310 : 840, "auto", 2));
  }

  return {
    id: uid("slide"),
    layout: "default",
    components
  };
}

function buildBasicInfoSinglePageDeck(spec, pageId) {
  return {
    id: pageId,
    title: spec.title,
    subtitle: spec.subtitle,
    slides: [
      {
        id: uid("slide"),
        layout: "default",
        components: [
          withDeckPosition(makeDeckBadge("理论部分"), 50, 36, 116, 32, 2),
          withDeckPosition(makeDeckTitle(spec.title), 50, 88, 420, 96, 2),
          withDeckPosition(makeDeckText(spec.subtitle, { fontSize: "18px", lineHeight: "1.72", color: "#475569" }), 50, 208, 420, 56, 2),
          withDeckPosition(makeDeckCard("实验名称", "简单线性回归房价预测实验"), 50, 308, 404, 92, 2),
          withDeckPosition(makeDeckCard("实验时长", "建议 2 学时，约 90 分钟。"), 470, 308, 404, 92, 2),
          withDeckPosition(makeDeckCard("实验难度", "基础级。适合初次接触回归建模的学生。"), 50, 416, 404, 92, 2),
          withDeckPosition(makeDeckCard("实验环境", "Python 3.10+、Flask、NumPy、Pandas；浏览器端使用 ECharts 与 GridStack。"), 470, 416, 404, 92, 2)
        ]
      }
    ]
  };
}

function buildPurposeSinglePageDeck(spec, pageId) {
  return {
    id: pageId,
    title: spec.title,
    subtitle: spec.subtitle,
    slides: [
      {
        id: uid("slide"),
        layout: "default",
        components: [
          withDeckPosition(makeDeckBadge("理论部分"), 50, 36, 116, 32, 2),
          withDeckPosition(makeDeckTitle(spec.title), 50, 88, 420, 96, 2),
          withDeckPosition(makeDeckText("学生通过本实验学会看懂数据、理解模型、解释训练结果。", { fontSize: "18px", lineHeight: "1.72", color: "#475569" }), 50, 208, 420, 56, 2),
          withDeckPosition(makeDeckCard("看懂数据", "区分特征、标签和房价预测目标。"), 49, 277, 479, 84, 2),
          withDeckPosition(makeDeckCard("理解模型", "知道直线怎样把输入变成预测值。"), 336, 398, 268, 65, 2),
          withDeckPosition(makeDeckCard("解释结果", "能用误差和指标判断模型效果。"), 50, 404, 270, 84, 2)
        ]
      }
    ]
  };
}

function buildPurposeSinglePageDeckWithChart(spec, pageId) {
  const deck = buildPurposeSinglePageDeck(spec, pageId);
  const slide = deck.slides?.[0];
  if (!slide) return deck;
  slide.components = slide.components.filter(component => component.type !== "visual" && component.type !== "chart");
  return deck;
}

function buildStudentTheoryDeck(pageId) {
  const spec = theoryStudentDeck(pageId) || theoryStudentDeck("basic");
  if (pageId === "basic") return buildBasicInfoSinglePageDeck(spec, pageId);
  if (pageId === "purpose") return buildPurposeSinglePageDeckWithChart(spec, pageId);
  const slides = spec.includeTitleSlide === true
    ? [makeStudentTitleSlide(spec, pageId), ...spec.slides.map(makeStudentSlide)]
    : spec.slides.map(makeStudentSlide);
  return {
    id: pageId,
    title: spec.title,
    subtitle: spec.subtitle,
    slides
  };
}

function makeTemplateDeck(pageId) {
  if (theoryStudentDeck(pageId)) return buildStudentTheoryDeck(pageId);
  const topic = { ...(theoryTopic(pageId) || theoryTopic("dataset") || {}), pageId };
  const scenario = theoryScenario(pageId) || theoryScenario("dataset") || {};
  if (pageId === "basic") return buildBasicDeckRefined(pageId, topic, scenario);
  if (pageId === "purpose") return buildPurposeDeckRefined(pageId, topic, scenario);
  if (pageId === "knowledge") return buildKnowledgeDeckRefined(pageId, topic, scenario);
  if (pageId === "dataset") return buildDatasetDeckRefined(pageId, topic, scenario);
  if (pageId === "model") return buildModelDeckRefined(pageId, topic, scenario);
  if (pageId === "criterion") return buildCriterionDeckRefined(pageId, topic, scenario);
  if (pageId === "optimization") return buildOptimizationDeckRefined(pageId, topic, scenario);
  if (pageId === "evaluation") return buildEvaluationDeckRefined(pageId, topic, scenario);
  if (pageId === "result") return buildResultDeckRefined(pageId, topic, scenario);
  if (pageId === "thinking") return buildThinkingDeckRefined(pageId, topic, scenario);
  return {
    id: pageId,
    title: topic.title,
    subtitle: topic.subtitle,
    slides: [
      makeTitleSlide(topic, scenario),
      makeStackImageSlideRefined(
        "问题场景与任务定义",
        [makeDeckText((scenario.leadIn || "") + " " + (topic.subtitle || ""))],
        makeChartImage("pipeline", topic.title + " 概念流程示意"),
        topic.prompt || "保留核心概念、公式和图表解释。"
      ),
      makeDiscussionSlide("讨论问题与结论整理", scenario)
    ]
  };
}

const theoryPages = Object.fromEntries(THEORY_PAGE_IDS.filter(pageId => theoryPageConfig(pageId)).map(pageId => [pageId, makeTemplateDeck(pageId)]));

async function loadTheoryDeckOverrides() {
  try {
    const resp = await fetch(THEORY_DECK_OVERRIDE_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error("load failed");
    const data = await resp.json();
    THEORY_PAGE_STATE.serverOverrides = data?.overrides && typeof data.overrides === "object" ? data.overrides : {};
  } catch (err) {
    THEORY_PAGE_STATE.serverOverrides = {};
    setTheoryStatus("项目课件加载失败");
  }
}

async function renderTheory(page) {
  document.querySelector(".shell").classList.add("theory");
  const pageId = theoryPages[page] ? page : "dataset";
  await loadTheoryDeckOverrides();
  THEORY_PAGE_STATE.pageId = pageId;
  THEORY_PAGE_STATE.currentSlide = 0;
  THEORY_PAGE_STATE.dirty = false;
  THEORY_PAGE_STATE.editing = false;
  THEORY_PAGE_STATE.selectedId = null;
  THEORY_PAGE_STATE.selectedIds = [];
  THEORY_PAGE_STATE.historyPast = [];
  THEORY_PAGE_STATE.historyFuture = [];
  THEORY_PAGE_STATE.snapToGrid = false;
  THEORY_PAGE_STATE.historyLocked = false;
  THEORY_PAGE_STATE.editVersion = 0;
  THEORY_PAGE_STATE.deck = loadDeckForPage(pageId);
  $("rightPanel").innerHTML = "";
  renderTheoryDeckDetail(pageId);
}

function renderTheoryEntry(pageId) {
  const deck = theoryPages[pageId] || theoryPages.dataset;
  return `
    <section class="content-card theory-entry-card">
      <div class="theory-entry-head">
        <div>
          <div class="eyebrow">理论部分</div>
          <h2>${escapeHtml(deck.title || "当前理论页")}</h2>
        </div>
        <div class="theory-entry-actions">
          <button class="theory-entry-detail" type="button" data-theory-detail="${escapeHtml(pageId)}">详情</button>
          <button class="theory-entry-detail theory-entry-deck" type="button" data-theory-deck="${escapeHtml(pageId)}">课件</button>
        </div>
      </div>
      <p>${escapeHtml(deck.subtitle || "点击课件进入可编辑内容页。")}</p>
    </section>
  `;
}

function renderTheoryDetail(pageId) {
  $("main").innerHTML = `
    <div class="theory-detail-toolbar" data-html2canvas-ignore="true">
      <button class="theory-entry-detail theory-entry-deck" type="button" data-theory-deck="${escapeHtml(pageId)}">返回课件</button>
    </div>
    ${renderTheoryHtmlSlot(pageId)}
  `;
  const deckBtn = document.querySelector("[data-theory-deck]");
  if (deckBtn) deckBtn.addEventListener("click", () => renderTheoryDeckDetail(pageId));
  loadTheoryHtml(pageId);
}

function renderTheoryHtmlSlot(pageId) {
  const src = `/static/theory-html/${pageId}.html`;
  return `<div class="html-lesson hidden" data-theory-html="${escapeHtml(src)}"><iframe title="理论讲义"></iframe></div>`;
}
async function loadTheoryHtml(pageId) {
  const wrap = document.querySelector("[data-theory-html]");
  if (!wrap) return;
  try {
    const resp = await fetch(wrap.dataset.theoryHtml, { cache: "no-store" });
    if (!resp.ok) {
      renderError("未找到该理论详情页。");
      return;
    }
    const iframe = wrap.querySelector("iframe");
    iframe.setAttribute("scrolling", "no");
    iframe.onload = () => {
      fitTheoryIframe(iframe);
    };
    iframe.srcdoc = await resp.text();
    wrap.classList.remove("hidden");
  } catch (err) {
    renderError("理论详情页加载失败。");
  }
}

function fitTheoryIframe(iframe) {
  const resize = () => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc?.body) return;
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
      const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, doc.body.offsetHeight, doc.documentElement.offsetHeight);
      iframe.style.height = `${height + 20}px`;
    } catch (err) {
      iframe.style.height = "680px";
    }
  };
  resize();
  setTimeout(resize, 100);
  setTimeout(resize, 500);
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (doc && "ResizeObserver" in window) new ResizeObserver(resize).observe(doc.body);
  } catch (err) {}
}

function renderTheoryDeckDetail(pageId) {
  THEORY_PAGE_STATE.pageId = pageId;
  THEORY_PAGE_STATE.editing = false;
  THEORY_PAGE_STATE.dirty = false;
  THEORY_PAGE_STATE.selectedId = null;
  THEORY_PAGE_STATE.selectedIds = [];
  THEORY_PAGE_STATE.historyPast = [];
  THEORY_PAGE_STATE.historyFuture = [];
  THEORY_PAGE_STATE.editVersion = 0;
  if (!THEORY_PAGE_STATE.deck || THEORY_PAGE_STATE.deck.id !== pageId) {
    THEORY_PAGE_STATE.deck = loadDeckForPage(pageId);
  }
  $("main").innerHTML = renderTheoryDeck(pageId);
  bindTheoryDeck(pageId);
  setTheoryEditing(false);
  observeTheorySlideViewport();
  renderTheorySlide(THEORY_PAGE_STATE.currentSlide);
}

function observeTheorySlideViewport() {
  const viewport = $("theorySlideViewport");
  if (!viewport) return;
  if (THEORY_PAGE_STATE.slideScaleObserver) {
    THEORY_PAGE_STATE.slideScaleObserver.disconnect();
    THEORY_PAGE_STATE.slideScaleObserver = null;
  }
  updateTheorySlideScale();
  if ("ResizeObserver" in window) {
    THEORY_PAGE_STATE.slideScaleObserver = new ResizeObserver(updateTheorySlideScale);
    THEORY_PAGE_STATE.slideScaleObserver.observe(viewport);
  }
}

function updateTheorySlideScale() {
  const viewport = $("theorySlideViewport");
  if (!viewport) return;
  const width = viewport.getBoundingClientRect().width || viewport.clientWidth;
  if (!width) return;
  viewport.style.setProperty("--slide-scale", String(width / THEORY_SLIDE_WIDTH));
}

function renderTheoryDeck(pageId) {
  const deck = THEORY_PAGE_STATE.deck || theoryPages[pageId];
  return `
    <section class="theory-deck-shell" id="theoryDeck" data-theory-page="${escapeHtml(pageId)}">
      <nav class="theory-deck-toolbar" data-html2canvas-ignore="true" aria-label="理论幻灯片控制栏">
        <div class="theory-toolbar-group">
          <button class="theory-deck-btn" id="theoryPrevBtn" type="button" aria-label="上一页" title="上一页">‹</button>
          <span class="theory-page-indicator" id="theoryPageIndicator">1 / ${deck.slides.length}</span>
          <button class="theory-deck-btn" id="theoryNextBtn" type="button" aria-label="下一页" title="下一页">›</button>
        </div>
        <div class="theory-toolbar-group">
          <span class="theory-deck-title">${escapeHtml(deck.title)}</span>
          <span class="theory-deck-status" id="theoryDeckStatus">只读模式</span>
        </div>
        <div class="theory-toolbar-group">
          <button class="theory-entry-detail theory-entry-deck" type="button" data-theory-detail="${escapeHtml(pageId)}">详情</button>
          <button class="theory-export-btn theory-edit-btn" id="theoryEditBtn" type="button">编辑课件</button>
          <button class="theory-export-btn theory-cancel-btn" id="theoryCancelBtn" type="button" hidden>不保存</button>
          <button class="theory-export-btn theory-save-btn" id="theorySaveBtn" type="button" hidden>保存修改</button>
          <button class="theory-export-btn" id="theoryExportBtn" type="button">导出 PDF</button>
        </div>
      </nav>
      <div class="theory-editor-tools" id="theoryEditorTools" data-html2canvas-ignore="true" hidden>
        <div class="theory-tool-group">
          <button type="button" id="theoryUndoBtn" disabled>撤销</button>
          <button type="button" id="theoryRedoBtn" disabled>重做</button>
          <button type="button" id="theoryDuplicateBtn" disabled>复制</button>
        </div>
        <div class="theory-tool-group">
          <button type="button" id="theoryAddSlideBtn">新增页</button>
          <button type="button" id="theoryDeleteSlideBtn">删除页</button>
          <button type="button" id="theoryDeleteComponentBtn" disabled>删除组件</button>
        </div>
        <div class="theory-tool-group">
          <button type="button" data-insert-component="text">插入文本</button>
          <button type="button" data-insert-component="card">插入卡片</button>
          <button type="button" data-insert-component="bullets">插入要点</button>
          <button type="button" data-insert-component="callout">插入提示</button>
          <button type="button" data-insert-component="formula">插入公式</button>
          <button type="button" id="theoryImageBtn">插入图片</button>
          <input id="theoryImageInput" type="file" accept="image/*" hidden>
        </div>
        <div class="theory-tool-group">
          <button type="button" id="theorySnapBtn" aria-pressed="false">网格吸附</button>
        </div>
        <div class="theory-tool-group theory-font-tools">
          <select id="theoryFontFamily" aria-label="字体">${SAFE_FONTS.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}</select>
          <select id="theoryFontSize" aria-label="字号">${[12, 14, 16, 18, 20, 24, 28, 32, 40, 52, 64].map(size => `<option value="${size}px">${size}</option>`).join("")}</select>
          <button type="button" id="theoryBoldBtn">B</button>
          <button type="button" id="theoryItalicBtn"><i>I</i></button>
          <input id="theoryColorInput" type="color" value="#172033" aria-label="文字颜色">
          <select id="theoryAlignSelect" aria-label="对齐">
            <option value="">默认对齐</option>
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
          <span class="theory-tool-hint" id="theoryToolHint">请选择组件</span>
        </div>
      </div>
      <div class="theory-slide-viewport" id="theorySlideViewport">
        ${deck.slides.map((slide, index) => renderTheorySlideMarkup(slide, index)).join("")}
      </div>
    </section>
  `;
}
function renderTheorySlideMarkup(slide, index) {
  return `
    <article class="theory-slide ${slide.layout ? `theory-slide-${escapeHtml(slide.layout)}` : ""}" data-slide-id="${escapeHtml(slide.id)}" data-theory-slide="${index}" aria-label="第 ${index + 1} 页">
      ${slide.components.map(component => renderComponent(component)).join("")}
    </article>
  `;
}
function renderComponent(component) {
  const type = component.type || "text";
  const style = component.position ? `left:${component.position.left || "0px"};top:${component.position.top || "0px"};width:${component.position.width || "240px"};height:${component.position.height || "auto"};z-index:${component.position.zIndex || 1};` : "";
  const freeClass = component.position ? " is-free-positioned" : "";
  let content = "";
  if (type === "cards") {
    if (component.items.length === 1) {
      const item = component.items[0];
      content = `
        <div class="theory-info-card theory-info-card-standalone${item.position ? " is-free-positioned" : ""}" data-edit-unit-id="${escapeHtml(component.id)}:${escapeHtml(item.id)}" data-edit-unit-type="card" style="${positionToCss(item.position)}">
          ${editableTag("strong", `${component.id}:${item.id}:title`, item.title || "卡片标题", item.titleStyle || item.style)}
          ${editableTag("span", `${component.id}:${item.id}:body`, item.body || "卡片正文", item.bodyStyle || item.style)}
        </div>`;
    } else {
      content = `<div class="theory-card-grid">${component.items.map(item => `
      <div class="theory-info-card${item.position ? " is-free-positioned" : ""}" data-edit-unit-id="${escapeHtml(component.id)}:${escapeHtml(item.id)}" data-edit-unit-type="card" style="${positionToCss(item.position)}">
        ${editableTag("strong", `${component.id}:${item.id}:title`, item.title || "卡片标题", item.titleStyle || item.style)}
        ${editableTag("span", `${component.id}:${item.id}:body`, item.body || "卡片正文", item.bodyStyle || item.style)}
      </div>`).join("")}</div>`;
    }
  } else if (type === "bullets") {
    if (component.items.length === 1) {
      const item = component.items[0];
      content = `
        <div class="theory-list-item theory-list-item-standalone${item.position ? " is-free-positioned" : ""}" data-edit-unit-id="${escapeHtml(component.id)}:${escapeHtml(item.id)}" data-edit-unit-type="bullet" style="${positionToCss(item.position)}">
          ${editableTag("span", `${component.id}:${item.id}:text`, item.text || "要点内容", item.style)}
        </div>`;
    } else {
      content = `<ul class="theory-bullet-grid">${component.items.map(item => `<li class="theory-list-item${item.position ? " is-free-positioned" : ""}" data-edit-unit-id="${escapeHtml(component.id)}:${escapeHtml(item.id)}" data-edit-unit-type="bullet" style="${positionToCss(item.position)}">${editableTag("span", `${component.id}:${item.id}:text`, item.text || "要点内容", item.style)}</li>`).join("")}</ul>`;
    }
  } else if (type === "image") {
    const src = component.src || "";
    const alt = component.alt || "课件图片";
    content = `<figure class="theory-image-frame">${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">` : `<div class="theory-image-placeholder">图片</div>`}${editableTag("figcaption", `${component.id}:alt`, alt, component.style, "theory-image-caption")}</figure>`;
  } else if (type === "chart") {
    content = `
      <figure class="theory-chart-frame">
        <div class="theory-chart-canvas" data-chart-id="${escapeHtml(component.id)}"></div>
        ${editableTag("figcaption", `${component.id}:text`, component.text || component.label || "图表示意", component.style, "theory-chart-caption")}
      </figure>`;
  } else if (type === "formula") {
    content = renderFormulaComponent(component);
  } else if (type === "callout") {
    content = editableTag("div", `${component.id}:text`, component.text || "提示内容", component.style, "theory-callout");
  } else if (type === "visual") {
    content = editableTag("div", `${component.id}:text`, component.text || "内容示意区", component.style, "theory-visual-panel");
  } else {
    const tag = type === "h1" ? "h1" : type === "h2" ? "h2" : "p";
    const extra = type === "eyebrow" ? "theory-eyebrow" : "";
    content = editableTag(tag === "p" && type === "eyebrow" ? "div" : tag, `${component.id}:text`, component.text || "文本内容", component.style, extra);
  }
  const visualAttrs = type === "visual"
    ? ` data-visual-kind="${escapeHtml(component.kind || "")}" data-visual-label="${escapeHtml(component.label || "")}"`
    : "";
  return `
    <div class="theory-component theory-component-${escapeHtml(type)}${freeClass}" data-component-id="${escapeHtml(component.id)}" data-component-type="${escapeHtml(type)}"${visualAttrs} style="${style}">
      ${renderEditHandles()}
      ${content}
    </div>
  `;
}

function renderEditHandles() {
  return `
    <button class="theory-drag-handle" type="button" data-drag-handle data-html2canvas-ignore="true" aria-label="拖动组件"></button>
    ${["n", "ne", "e", "se", "s", "sw", "w", "nw"].map(handle => `<button class="theory-resize-handle theory-resize-${handle}" type="button" data-resize-handle="${handle}" data-html2canvas-ignore="true" aria-label="${resizeHandleLabel(handle)}"></button>`).join("")}
  `;
}
function positionToCss(position) {
  if (!position) return "";
  return `left:${position.left || "0px"};top:${position.top || "0px"};width:${position.width || "240px"};height:${position.height || "auto"};z-index:${position.zIndex || 1};`;
}

function resizeHandleLabel(handle) {
  const labels = {
    n: "向上缩放",
    ne: "向右上缩放",
    e: "向右缩放",
    se: "向右下缩放",
    s: "向下缩放",
    sw: "向左下缩放",
    w: "向左缩放",
    nw: "向左上缩放",
  };
  return labels[handle] || "缩放组件";
}

function editableTag(tag, editId, text, style = {}, extraClass = "") {
  const rawText = String(text ?? "");
  return `<${tag} class="theory-editable ${extraClass}" contenteditable="false" spellcheck="false" data-edit-id="${escapeHtml(editId)}" data-raw-text="${escapeHtml(rawText)}" style="${styleToCss(style)}">${renderTextWithInlineMath(rawText)}</${tag}>`;
}

function renderTextWithInlineMath(text) {
  const source = String(text ?? "");
  if (!source.includes("$")) return escapeTextSegment(source);
  ensureTheoryFormulaSupport();
  const pattern = /\$([^$]+?)\$/g;
  let html = "";
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    html += escapeTextSegment(source.slice(lastIndex, match.index));
    html += renderInlineLatexToHtml(match[1]);
    lastIndex = pattern.lastIndex;
  }
  html += escapeTextSegment(source.slice(lastIndex));
  return html;
}

function renderBoldAndItalicText(text) {
  const escaped = escapeHtml(text);
  const bolded = escaped.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  const italicized = bolded.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  return italicized;
}

function escapeTextSegment(value) {
  return renderBoldAndItalicText(value).replace(/\n/g, "<br>");
}

function renderFormulaComponent(component) {
  ensureTheoryFormulaSupport();
  const latex = normalizeFormulaLatex(component.text || THEORY_DEFAULT_FORMULA);
  const style = {
    fontSize: "28px",
    lineHeight: "1.8",
    color: "#0f172a",
    textAlign: "center",
    ...component.style,
  };
  const editId = `${component.id}:text`;
  return `
    <div class="theory-formula-box" data-formula-box="${escapeHtml(editId)}" style="${styleToCss(style)}">
      <div class="theory-formula-preview" data-formula-preview="${escapeHtml(editId)}" aria-label="公式预览">${renderLatexToHtml(latex)}</div>
      <div class="theory-editable theory-formula-source" contenteditable="false" spellcheck="false" data-edit-id="${escapeHtml(editId)}" data-formula-source="true" aria-label="LaTeX 公式源码">${escapeHtml(latex)}</div>
    </div>`;
}

function normalizeFormulaLatex(value) {
  const text = String(value || "").trim();
  if (!text) return THEORY_DEFAULT_FORMULA;
  if (/\by_hat\b/.test(text)) return text.replace(/\by_hat\b/g, "\\hat{y}").replace(/\s*\*\s*/g, "");
  return text;
}

function ensureTheoryFormulaSupport() {
  ensureTheoryFormulaStyles();
  if (typeof document === "undefined") return;
  if (!document.getElementById(THEORY_KATEX_STYLE_ID)) {
    const link = document.createElement("link");
    link.id = THEORY_KATEX_STYLE_ID;
    link.rel = "stylesheet";
    link.href = THEORY_KATEX_CSS_URL;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
  if (window.katex?.renderToString || document.getElementById(THEORY_KATEX_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = THEORY_KATEX_SCRIPT_ID;
  script.src = THEORY_KATEX_SCRIPT_URL;
  script.defer = true;
  script.crossOrigin = "anonymous";
  script.onload = () => queueTheoryFormulaRender();
  script.onerror = () => queueTheoryFormulaRender();
  document.head.appendChild(script);
}

function ensureTheoryFormulaStyles() {
  if (typeof document === "undefined" || document.getElementById(THEORY_FORMULA_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = THEORY_FORMULA_STYLE_ID;
  style.textContent = `
    .theory-component-formula .theory-formula-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
      min-height: 86px;
      padding: 18px 22px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94));
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .theory-component-formula .theory-formula-preview {
      width: 100%;
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: inherit;
      overflow-wrap: anywhere;
    }
    .theory-component-formula .theory-formula-source {
      display: none;
      width: 100%;
      min-height: 34px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px dashed rgba(37,99,235,0.28);
      background: rgba(239,246,255,0.74);
      color: #1e293b;
      font-family: Consolas, "SFMono-Regular", "Courier New", monospace;
      font-size: 15px;
      line-height: 1.55;
      text-align: left;
      white-space: pre-wrap;
      outline: none;
      box-sizing: border-box;
    }
    .theory-deck-shell.is-editing .theory-component-formula .theory-formula-source {
      display: block;
    }
    .theory-deck-shell.is-editing .theory-component-formula .theory-formula-box {
      justify-content: flex-start;
    }
    .theory-component-formula .theory-formula-source:focus {
      border-color: rgba(37,99,235,0.55);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
      background: #ffffff;
    }
    .theory-component-formula .katex-display {
      margin: 0;
      width: 100%;
    }
    .theory-formula-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.12em;
      font-family: "Times New Roman", "Cambria Math", serif;
      font-size: 1.08em;
      line-height: 1.8;
      color: inherit;
      white-space: normal;
    }
    .theory-inline-formula {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 0.12em;
      vertical-align: -0.08em;
      line-height: 1;
    }
    .theory-editable .katex {
      font-size: 1.04em;
    }
    .theory-editable[data-inline-math-editing="true"] {
      white-space: pre-wrap;
    }
    .theory-math-frac {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      margin: 0 0.12em;
      line-height: 1.12;
    }
    .theory-math-frac > span:first-child {
      border-bottom: 1.5px solid currentColor;
      padding: 0 0.18em 0.06em;
    }
    .theory-math-frac > span:last-child {
      padding: 0.06em 0.18em 0;
      font-size: 0.88em;
    }
    .theory-math-large {
      font-size: 1.45em;
      line-height: 1;
      vertical-align: middle;
    }
    .theory-math-hat {
      text-decoration: overline;
      text-decoration-thickness: 0.06em;
      text-decoration-skip-ink: none;
    }
  `;
  document.head.appendChild(style);
}

function renderLatexToHtml(latex) {
  const source = normalizeFormulaLatex(latex);
  if (window.katex?.renderToString) {
    try {
      return window.katex.renderToString(source, {
        throwOnError: false,
        displayMode: true,
        strict: "ignore",
      });
    } catch (err) {}
  }
  return `<span class="theory-formula-fallback">${renderLatexFallback(source)}</span>`;
}

function renderInlineLatexToHtml(latex) {
  const source = normalizeFormulaLatex(latex);
  if (window.katex?.renderToString) {
    try {
      return window.katex.renderToString(source, {
        throwOnError: false,
        displayMode: false,
        strict: "ignore",
      });
    } catch (err) {}
  }
  return `<span class="theory-inline-formula theory-formula-fallback">${renderLatexFallback(source)}</span>`;
}

function renderLatexFallback(latex) {
  let html = escapeHtml(normalizeFormulaLatex(latex));
  html = html
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\pm/g, "±")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\hat\{([^{}]+)\}/g, `<span class="theory-math-hat">$1</span>`)
    .replace(/\\bar\{([^{}]+)\}/g, `<span class="theory-math-hat">$1</span>`)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, `<span class="theory-math-frac"><span>$1</span><span>$2</span></span>`)
    .replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, `<span class="theory-math-large">∑</span><sub>$1</sub><sup>$2</sup>`)
    .replace(/\^\{([^{}]+)\}/g, `<sup>$1</sup>`)
    .replace(/_\{([^{}]+)\}/g, `<sub>$1</sub>`)
    .replace(/\^([A-Za-z0-9])/g, `<sup>$1</sup>`)
    .replace(/_([A-Za-z0-9])/g, `<sub>$1</sub>`)
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\mu/g, "μ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\varepsilon|\\epsilon/g, "ε");
  return html;
}

function queueTheoryFormulaRender() {
  window.requestAnimationFrame(() => renderTheoryFormulaPreviews());
}

function renderTheoryFormulaPreviews() {
  const sourceNodes = Array.from(document.querySelectorAll(".theory-formula-source[data-edit-id]"));
  const inlineNodes = Array.from(document.querySelectorAll(".theory-editable[data-raw-text]"))
    .filter(node => !node.classList.contains("theory-formula-source") && node.dataset.inlineMathEditing !== "true");
  if (!sourceNodes.length && !inlineNodes.length) return;
  ensureTheoryFormulaSupport();
  sourceNodes.forEach(sourceNode => {
    updateTheoryFormulaPreview(sourceNode);
  });
  inlineNodes.forEach(node => {
    node.innerHTML = renderTextWithInlineMath(node.dataset.rawText || node.innerText || node.textContent || "");
  });
}

function updateTheoryFormulaPreview(sourceNode) {
  const latex = normalizeFormulaLatex(sourceNode.innerText || sourceNode.textContent || sourceNode.dataset.formulaLatex || THEORY_DEFAULT_FORMULA);
  sourceNode.dataset.formulaLatex = latex;
  const box = sourceNode.closest(".theory-formula-box");
  const preview = box?.querySelector(".theory-formula-preview");
  if (!preview) return;
  preview.innerHTML = renderLatexToHtml(latex);
}

function styleToCss(style = {}) {
  return Object.entries(style).filter(([, value]) => value).map(([key, value]) => `${camelToKebab(key)}:${String(value).replace(/"/g, "&quot;")}`).join(";");
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

function loadDeckForPage(pageId) {
  const saved = readSavedState(pageId);
  const templateDeck = theoryPages[pageId] || theoryPages.dataset;
  if (saved?.deckOverride?.slides?.length) {
    return normalizeTheoryDeckForRuntime(pageId, mergeTheoryDeckWithTemplate(saved.deckOverride, templateDeck));
  }
  return normalizeTheoryDeckForRuntime(pageId, templateDeck);
}

function mergeTheoryDeckWithTemplate(deckOverride, templateDeck) {
  if (!templateDeck?.slides?.length) return deckOverride;
  const merged = clone(deckOverride);
  merged.slides = (merged.slides || []).map((slide, index) => {
    if (!isSparseTheorySlide(slide)) return slide;
    return clone(templateDeck.slides[index] || slide);
  });
  return merged;
}

function isSparseTheorySlide(slide) {
  const components = slide?.components || [];
  if (!components.length) return true;
  if (components.length > 1) return false;
  const component = components[0];
  const text = String(component.text || component.title || component.body || "").trim();
  const hasItems = Array.isArray(component.items) && component.items.some(item => String(item.title || item.body || item.text || "").trim());
  const mediaTypes = ["image", "chart", "visual"];
  if (hasItems || mediaTypes.includes(component.type)) return false;
  return ["h1", "h2", "h3", "p", "text"].includes(component.type || "text") && Boolean(text);
}

function normalizeTheoryDeckForRuntime(pageId, deck) {
  const nextDeck = clone(deck);
  if (pageId !== "purpose") return nextDeck;
  const slide = nextDeck.slides?.[0];
  if (!slide) return nextDeck;
  slide.components = slide.components.filter(component => component.type !== "visual" && component.type !== "image" && component.type !== "chart");
  return nextDeck;
}

function readSavedState(pageId) {
  const override = THEORY_PAGE_STATE.serverOverrides?.[pageId];
  if (!override?.slides?.length) return null;
  return { deckOverride: clone(override) };
}

function bindTheoryDeck(pageId) {
  $("theoryPrevBtn")?.addEventListener("click", () => renderTheorySlide(THEORY_PAGE_STATE.currentSlide - 1));
  $("theoryNextBtn")?.addEventListener("click", () => renderTheorySlide(THEORY_PAGE_STATE.currentSlide + 1));
  $("theoryEditBtn")?.addEventListener("click", () => {
    playTheoryModeTransition("editing");
    setTheoryEditing(true);
  });
  $("theoryCancelBtn")?.addEventListener("click", () => {
    clearTheoryAutosave();
    THEORY_PAGE_STATE.deck = loadDeckForPage(pageId);
    THEORY_PAGE_STATE.currentSlide = Math.min(THEORY_PAGE_STATE.currentSlide, THEORY_PAGE_STATE.deck.slides.length - 1);
    renderTheoryDeckDetail(pageId);
  });
  $("theorySaveBtn")?.addEventListener("click", async () => {
    commitDomToState();
    await saveTheoryEdits(pageId, { source: "manual" });
    playTheoryModeTransition("readonly");
    setTheoryEditing(false);
  });
  $("theoryExportBtn")?.addEventListener("click", () => exportTheoryPdf(pageId));
  document.querySelector("[data-theory-detail]")?.addEventListener("click", () => renderTheoryDetail(pageId));
  $("theoryAddSlideBtn")?.addEventListener("click", addTheorySlide);
  $("theoryDeleteSlideBtn")?.addEventListener("click", deleteTheorySlide);
  $("theoryDeleteComponentBtn")?.addEventListener("click", deleteSelectedComponents);
  $("theoryUndoBtn")?.addEventListener("click", undoDeckChange);
  $("theoryRedoBtn")?.addEventListener("click", redoDeckChange);
  $("theoryDuplicateBtn")?.addEventListener("click", duplicateSelectedComponents);
  $("theorySnapBtn")?.addEventListener("click", toggleSnapToGrid);
  $("theoryImageBtn")?.addEventListener("click", () => $("theoryImageInput")?.click());
  $("theoryImageInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) insertImageComponent(file);
    event.target.value = "";
  });
  document.querySelectorAll("[data-insert-component]").forEach(button => {
    button.addEventListener("pointerdown", event => {
      if (button.dataset.insertComponent === "formula") event.preventDefault();
    });
    button.addEventListener("click", () => {
      const insertType = button.dataset.insertComponent;
      if (insertType === "formula" && insertInlineFormulaAtSelection()) return;
      insertTheoryComponent(insertType);
    });
  });
  bindFontTools();
  bindEditableEvents(pageId);
  bindTheoryDragAndDrop(pageId);
  applyLegacyEdits(pageId);
}

function bindEditableEvents(pageId) {
  const deck = $("theoryDeck");
  if (!deck) return;
  deck.querySelectorAll(".theory-component").forEach(component => {
    component.addEventListener("pointerdown", event => {
      if (!THEORY_PAGE_STATE.editing || event.target.closest("[data-edit-unit-id], [data-drag-handle], [data-resize-handle]")) return;
      if (event.target.closest(".theory-editable")) return;
      selectTheoryComponent(component, event.target.closest(".theory-editable"), event.shiftKey);
    });
  });
  deck.querySelectorAll("[data-edit-unit-id]").forEach(unit => {
    unit.addEventListener("pointerdown", event => {
      if (!THEORY_PAGE_STATE.editing || event.target.closest("[data-drag-handle], [data-resize-handle]")) return;
      event.stopPropagation();
    });
  });
  deck.querySelectorAll(".theory-editable").forEach(node => {
    node.addEventListener("focus", () => {
      const component = node.closest(".theory-component");
      if (component && THEORY_PAGE_STATE.selectedIds.includes(component.dataset.componentId)) {
        document.querySelectorAll(".theory-editable.is-selected").forEach(item => item.classList.remove("is-selected"));
        node.classList.add("is-selected");
        THEORY_PAGE_STATE.selectedId = node.dataset.editId || component.dataset.componentId;
        updateFontTools();
        updateEditorToolState();
      } else {
        selectTheoryComponent(component, node);
      }
      enterInlineMathEdit(node);
      node.dataset.historyPending = "true";
    });
    node.addEventListener("beforeinput", () => {
      if (node.dataset.historyPending === "true") {
        pushDeckHistory("text");
        node.dataset.historyPending = "false";
      }
    });
    node.addEventListener("input", () => {
      if (node.classList.contains("theory-formula-source")) updateTheoryFormulaPreview(node);
      else syncInlineMathRawText(node);
      markTheoryDirty();
    });
    node.addEventListener("blur", () => {
      if (node.classList.contains("theory-formula-source")) updateTheoryFormulaPreview(node);
      else exitInlineMathEdit(node);
      delete node.dataset.historyPending;
      commitDomToState();
    });
    node.addEventListener("dblclick", event => {
      if (!THEORY_PAGE_STATE.editing) return;
      event.stopPropagation();
      focusEditableText(node);
    });
  });
}

function enterInlineMathEdit(node) {
  if (!node || node.classList.contains("theory-formula-source")) return;
  if (node.dataset.inlineMathEditing === "true") return;
  const rawText = node.dataset.rawText ?? node.innerText ?? node.textContent ?? "";
  node.dataset.rawText = rawText;
  node.textContent = rawText;
  node.dataset.inlineMathEditing = "true";
}

function syncInlineMathRawText(node) {
  if (!node || node.classList.contains("theory-formula-source")) return;
  node.dataset.rawText = node.innerText || node.textContent || "";
}

function exitInlineMathEdit(node) {
  if (!node || node.classList.contains("theory-formula-source")) return;
  const rawText = node.innerText || node.textContent || node.dataset.rawText || "";
  node.dataset.rawText = rawText;
  delete node.dataset.inlineMathEditing;
  node.innerHTML = renderTextWithInlineMath(rawText);
}

function insertInlineFormulaAtSelection() {
  if (!THEORY_PAGE_STATE.editing) return false;
  const target = inlineFormulaInsertionTarget();
  if (!target) return false;
  pushDeckHistory("insert-inline-formula");
  enterInlineMathEdit(target);
  insertTextIntoEditable(target, ` ${THEORY_DEFAULT_INLINE_FORMULA} `);
  syncInlineMathRawText(target);
  selectTheoryComponent(target.closest(".theory-component"), target);
  markTheoryDirty();
  commitDomToState();
  setTheoryStatus("已在文本中插入公式");
  return true;
}

function inlineFormulaInsertionTarget() {
  const selected = window.getSelection();
  if (selected?.rangeCount) {
    const range = selected.getRangeAt(0);
    const node = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    const editable = node?.closest?.(".theory-slide.active .theory-editable");
    if (isInlineFormulaEditable(editable)) return editable;
  }
  const active = document.activeElement?.closest?.(".theory-slide.active .theory-editable");
  if (isInlineFormulaEditable(active)) return active;
  const selectedEditable = document.querySelector(".theory-slide.active .theory-editable.is-selected");
  if (isInlineFormulaEditable(selectedEditable)) return selectedEditable;
  return null;
}

function isInlineFormulaEditable(node) {
  return Boolean(node
    && node.classList?.contains("theory-editable")
    && !node.classList.contains("theory-formula-source")
    && !node.closest(".theory-component-formula"));
}

function insertTextIntoEditable(node, text) {
  node.focus();
  const selection = window.getSelection();
  let range = null;
  if (selection?.rangeCount) {
    const candidate = selection.getRangeAt(0);
    if (node.contains(candidate.commonAncestorContainer)) range = candidate;
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
  }
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function focusEditableText(node) {
  node.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function renderTheorySlide(index) {
  const slides = Array.from(document.querySelectorAll(".theory-slide"));
  if (!slides.length) return;
  updateTheorySlideScale();
  THEORY_PAGE_STATE.currentSlide = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === THEORY_PAGE_STATE.currentSlide;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  $("theoryPageIndicator").textContent = `${THEORY_PAGE_STATE.currentSlide + 1} / ${slides.length}`;
  $("theoryPrevBtn").disabled = THEORY_PAGE_STATE.currentSlide === 0;
  $("theoryNextBtn").disabled = THEORY_PAGE_STATE.currentSlide === slides.length - 1;
  const deleteBtn = $("theoryDeleteSlideBtn");
  if (deleteBtn) deleteBtn.disabled = slides.length <= 1;
  updateEditorToolState();
  queueTheoryChartRender();
  queueTheoryFormulaRender();
}

document.addEventListener("keydown", event => {
  const deck = $("theoryDeck");
  if (!deck || !document.querySelector(".shell.theory")) return;
  if (event.target.closest?.(".theory-editable")) return;
  if (THEORY_PAGE_STATE.editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redoDeckChange();
    else undoDeckChange();
    return;
  }
  if (THEORY_PAGE_STATE.editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redoDeckChange();
    return;
  }
  if (THEORY_PAGE_STATE.editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelectedComponents();
    return;
  }
  if (THEORY_PAGE_STATE.editing && (event.key === "Delete" || event.key === "Backspace")) {
    if (deleteSelectedComponents()) event.preventDefault();
    return;
  }
  if (event.key === "ArrowLeft") renderTheorySlide(THEORY_PAGE_STATE.currentSlide - 1);
  if (event.key === "ArrowRight") renderTheorySlide(THEORY_PAGE_STATE.currentSlide + 1);
});

window.addEventListener("resize", updateTheorySlideScale);

function setTheoryEditing(enabled) {
  const wasEditing = THEORY_PAGE_STATE.editing;
  THEORY_PAGE_STATE.editing = Boolean(enabled);
  const deck = $("theoryDeck");
  if (!deck) return;
  if (THEORY_PAGE_STATE.editing && !wasEditing) {
    THEORY_PAGE_STATE.historyPast = [];
    THEORY_PAGE_STATE.historyFuture = [];
    THEORY_PAGE_STATE.selectedIds = [];
    THEORY_PAGE_STATE.selectedId = null;
  }
  deck.classList.toggle("is-editing", THEORY_PAGE_STATE.editing);
  $("theoryEditorTools").hidden = !THEORY_PAGE_STATE.editing;
  updateTheorySlideScale();
  $("theoryEditBtn").hidden = THEORY_PAGE_STATE.editing;
  $("theoryCancelBtn").hidden = !THEORY_PAGE_STATE.editing;
  $("theorySaveBtn").hidden = !THEORY_PAGE_STATE.editing;
  deck.querySelectorAll(".theory-editable").forEach(node => {
    node.setAttribute("contenteditable", String(THEORY_PAGE_STATE.editing));
  });
  renderTheoryFormulaPreviews();
  if (!THEORY_PAGE_STATE.editing) clearSelection();
  setTheoryStatus(THEORY_PAGE_STATE.editing ? "编辑模式" : "只读模式");
  updateFontTools();
  updateEditorToolState();
  renderTheorySlide(THEORY_PAGE_STATE.currentSlide);
}

function markTheoryDirty() {
  if (!THEORY_PAGE_STATE.editing) return;
  THEORY_PAGE_STATE.dirty = true;
  THEORY_PAGE_STATE.editVersion += 1;
  setTheoryStatus("有未同步修改");
  scheduleTheoryAutosave();
}

function clearTheoryAutosave() {
  if (THEORY_PAGE_STATE.saveTimer) {
    window.clearTimeout(THEORY_PAGE_STATE.saveTimer);
    THEORY_PAGE_STATE.saveTimer = null;
  }
}

function scheduleTheoryAutosave() {
  clearTheoryAutosave();
  THEORY_PAGE_STATE.saveTimer = window.setTimeout(() => {
    THEORY_PAGE_STATE.saveTimer = null;
    void flushTheoryAutosave(THEORY_PAGE_STATE.pageId);
  }, THEORY_AUTOSAVE_DELAY_MS);
}

async function flushTheoryAutosave(pageId) {
  if (!THEORY_PAGE_STATE.editing || !THEORY_PAGE_STATE.dirty || THEORY_PAGE_STATE.saving) return;
  commitDomToState();
  await saveTheoryEdits(pageId, { source: "autosave" });
}

function setTheoryStatus(text) {
  const status = $("theoryDeckStatus");
  if (status) status.textContent = text;
}

function updateEditorToolState() {
  const selectedCount = selectedComponents().length;
  const setDisabled = (selector, disabled) => {
    document.querySelectorAll(selector).forEach(node => {
      node.disabled = disabled;
    });
  };
  setDisabled("#theoryUndoBtn", !THEORY_PAGE_STATE.editing || !THEORY_PAGE_STATE.historyPast.length);
  setDisabled("#theoryRedoBtn", !THEORY_PAGE_STATE.editing || !THEORY_PAGE_STATE.historyFuture.length);
  setDisabled("#theoryDuplicateBtn, #theoryDeleteComponentBtn", !THEORY_PAGE_STATE.editing);
  const snapBtn = $("theorySnapBtn");
  if (snapBtn) {
    snapBtn.classList.toggle("is-active", THEORY_PAGE_STATE.snapToGrid);
    snapBtn.setAttribute("aria-pressed", String(THEORY_PAGE_STATE.snapToGrid));
  }
  const hint = $("theoryToolHint");
  if (hint && THEORY_PAGE_STATE.editing) {
    hint.textContent = selectedCount ? ("已选择 " + selectedCount + " 个组件") : "请选择组件";
  }
}

function pushDeckHistory(reason = "edit") {
  if (!THEORY_PAGE_STATE.editing || THEORY_PAGE_STATE.historyLocked) return;
  commitDomToState();
  THEORY_PAGE_STATE.historyPast.push(clone(THEORY_PAGE_STATE.deck));
  if (THEORY_PAGE_STATE.historyPast.length > THEORY_HISTORY_LIMIT) THEORY_PAGE_STATE.historyPast.shift();
  THEORY_PAGE_STATE.historyFuture = [];
  updateEditorToolState();
}

function undoDeckChange() {
  if (!THEORY_PAGE_STATE.editing || !THEORY_PAGE_STATE.historyPast.length) return;
  commitDomToState();
  const previous = THEORY_PAGE_STATE.historyPast.pop();
  THEORY_PAGE_STATE.historyFuture.push(clone(THEORY_PAGE_STATE.deck));
  THEORY_PAGE_STATE.historyLocked = true;
  THEORY_PAGE_STATE.deck = previous;
  THEORY_PAGE_STATE.currentSlide = Math.min(THEORY_PAGE_STATE.currentSlide, THEORY_PAGE_STATE.deck.slides.length - 1);
  THEORY_PAGE_STATE.selectedIds = [];
  refreshDeckDom(true);
  THEORY_PAGE_STATE.historyLocked = false;
  markTheoryDirty();
  updateEditorToolState();
}

function redoDeckChange() {
  if (!THEORY_PAGE_STATE.editing || !THEORY_PAGE_STATE.historyFuture.length) return;
  commitDomToState();
  const next = THEORY_PAGE_STATE.historyFuture.pop();
  THEORY_PAGE_STATE.historyPast.push(clone(THEORY_PAGE_STATE.deck));
  THEORY_PAGE_STATE.historyLocked = true;
  THEORY_PAGE_STATE.deck = next;
  THEORY_PAGE_STATE.currentSlide = Math.min(THEORY_PAGE_STATE.currentSlide, THEORY_PAGE_STATE.deck.slides.length - 1);
  THEORY_PAGE_STATE.selectedIds = [];
  refreshDeckDom(true);
  THEORY_PAGE_STATE.historyLocked = false;
  markTheoryDirty();
  updateEditorToolState();
}

function playTheoryModeTransition(mode) {
  const deck = $("theoryDeck");
  if (!deck) return;
  deck.classList.remove("mode-shift-editing", "mode-shift-readonly");
  void deck.offsetWidth;
  deck.classList.add(mode === "editing" ? "mode-shift-editing" : "mode-shift-readonly");
  window.setTimeout(() => deck.classList.remove("mode-shift-editing", "mode-shift-readonly"), 360);
}

function addTheorySlide() {
  pushDeckHistory("add-slide");
  commitDomToState();
  const newSlide = {
    id: uid("slide"),
    layout: "default",
    components: [
      makeDeckSection("新增页面"),
      makeDeckText("点击编辑文字，也可以插入更多组件并拖动排版。")
    ]
  };
  THEORY_PAGE_STATE.deck.slides.splice(THEORY_PAGE_STATE.currentSlide + 1, 0, newSlide);
  THEORY_PAGE_STATE.currentSlide += 1;
  refreshDeckDom(true);
  markTheoryDirty();
}

function deleteTheorySlide() {
  commitDomToState();
  if (THEORY_PAGE_STATE.deck.slides.length <= 1) return;
  pushDeckHistory("delete-slide");
  THEORY_PAGE_STATE.deck.slides.splice(THEORY_PAGE_STATE.currentSlide, 1);
  THEORY_PAGE_STATE.currentSlide = Math.max(0, THEORY_PAGE_STATE.currentSlide - 1);
  refreshDeckDom(true);
  markTheoryDirty();
}

function deleteSelectedComponents() {
  if (!THEORY_PAGE_STATE.editing) return false;
  const componentIds = selectedComponents().map(component => component.dataset.componentId);
  if (!componentIds.length) {
    setTheoryStatus("请先选择要删除的组件");
    return false;
  }
  pushDeckHistory("delete-components");
  commitDomToState();
  const slide = THEORY_PAGE_STATE.deck.slides[THEORY_PAGE_STATE.currentSlide];
  if (!slide) return false;
  const before = slide.components.length;
  slide.components = slide.components.filter(item => !componentIds.includes(item.id));
  if (slide.components.length === before) return false;
  THEORY_PAGE_STATE.selectedId = null;
  THEORY_PAGE_STATE.selectedIds = [];
  refreshDeckDom(true);
  markTheoryDirty();
  setTheoryStatus("已删除组件，记得保存修改");
  return true;
}

function insertTheoryComponent(type) {
  pushDeckHistory("insert-component");
  commitDomToState();
  const slide = THEORY_PAGE_STATE.deck.slides[THEORY_PAGE_STATE.currentSlide];
  if (!slide) return;
  const position = defaultInsertPosition();
  const component = newInsertedComponent(type, position);
  slide.components.push(component);
  refreshDeckDom(true);
  selectTheoryComponent(document.querySelector("[data-component-id=\"" + cssEscape(component.id) + "\"]"));
  markTheoryDirty();
}

function duplicateSelectedComponents() {
  const ids = THEORY_PAGE_STATE.selectedIds.filter(Boolean);
  if (!THEORY_PAGE_STATE.editing) return;
  if (!ids.length) {
    setTheoryStatus("请先选择要复制的组件");
    return;
  }
  pushDeckHistory("duplicate");
  selectedComponents().forEach(component => ensureFreePositioned(component, component.closest(".theory-slide")));
  commitDomToState();
  const slide = THEORY_PAGE_STATE.deck.slides[THEORY_PAGE_STATE.currentSlide];
  if (!slide) return;
  const newIds = [];
  ids.forEach(id => {
    const source = slide.components.find(component => component.id === id);
    if (!source) return;
    const copy = cloneComponentWithNewIds(source);
    copy.position = offsetPosition(copy.position || defaultInsertPosition(), 72, 48);
    copy.position.zIndex = nextZIndex();
    slide.components.push(copy);
    newIds.push(copy.id);
  });
  THEORY_PAGE_STATE.selectedIds = newIds;
  refreshDeckDom(true);
  markTheoryDirty();
}

function cloneComponentWithNewIds(component) {
  const copy = clone(component);
  copy.id = uid(copy.type || "component");
  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map(item => ({ ...item, id: uid("item") }));
  }
  return copy;
}

function offsetPosition(position, dx, dy) {
  return {
    ...position,
    left: (parsePx(position.left) + dx) + "px",
    top: (parsePx(position.top) + dy) + "px",
  };
}

function changeLayerSelected(action) {
  const components = selectedComponents();
  if (!THEORY_PAGE_STATE.editing) return;
  if (!components.length) {
    setTheoryStatus("请先选择要调整图层的组件");
    return;
  }
  pushDeckHistory("layer-" + action);
  const all = Array.from(document.querySelectorAll(".theory-slide.active > .theory-component"));
  const zValues = all.map(node => parseInt(node.style.zIndex || "1", 10)).filter(Number.isFinite);
  const maxZ = Math.max(1, ...zValues);
  const minZ = Math.min(1, ...zValues);
  components.forEach(component => {
    ensureFreePositioned(component, component.closest(".theory-slide"));
    const current = parseInt(component.style.zIndex || "1", 10) || 1;
    if (action === "front") component.style.zIndex = String(maxZ + 10);
    if (action === "back") component.style.zIndex = String(Math.max(1, minZ - 1));
    if (action === "forward") component.style.zIndex = String(current + 1);
    if (action === "backward") component.style.zIndex = String(Math.max(1, current - 1));
  });
  commitDomToState();
  markTheoryDirty();
}

function alignSelectedComponents(mode) {
  const components = selectedComponents();
  if (!THEORY_PAGE_STATE.editing) return;
  if (components.length < 2) {
    setTheoryStatus("请选择至少 2 个组件再对齐");
    return;
  }
  pushDeckHistory("align-" + mode);
  const slide = document.querySelector(".theory-slide.active");
  components.forEach(component => ensureFreePositioned(component, slide));
  const rects = components.map(component => componentBox(component));
  const left = Math.min(...rects.map(rect => rect.left));
  const right = Math.max(...rects.map(rect => rect.left + rect.width));
  const top = Math.min(...rects.map(rect => rect.top));
  const bottom = Math.max(...rects.map(rect => rect.top + rect.height));
  const hCenter = left + (right - left) / 2;
  const vCenter = top + (bottom - top) / 2;
  components.forEach(component => {
    const box = componentBox(component);
    if (mode === "left") component.style.left = snapValue(left) + "px";
    if (mode === "hcenter") component.style.left = snapValue(hCenter - box.width / 2) + "px";
    if (mode === "right") component.style.left = snapValue(right - box.width) + "px";
    if (mode === "top") component.style.top = snapValue(top) + "px";
    if (mode === "vcenter") component.style.top = snapValue(vCenter - box.height / 2) + "px";
    if (mode === "bottom") component.style.top = snapValue(bottom - box.height) + "px";
  });
  commitDomToState();
  markTheoryDirty();
}

function distributeSelectedComponents(axis) {
  const components = selectedComponents();
  if (!THEORY_PAGE_STATE.editing) return;
  if (components.length < 3) {
    setTheoryStatus("请选择至少 3 个组件再分布");
    return;
  }
  pushDeckHistory("distribute-" + axis);
  const slide = document.querySelector(".theory-slide.active");
  components.forEach(component => ensureFreePositioned(component, slide));
  const sorted = components
    .map(component => ({ component, box: componentBox(component) }))
    .sort((a, b) => axis === "x" ? a.box.left - b.box.left : a.box.top - b.box.top);
  const first = sorted[0].box;
  const last = sorted[sorted.length - 1].box;
  if (axis === "x") {
    const start = first.left + first.width / 2;
    const end = last.left + last.width / 2;
    const step = (end - start) / (sorted.length - 1);
    sorted.forEach((entry, index) => {
      entry.component.style.left = snapValue(start + step * index - entry.box.width / 2) + "px";
    });
  } else {
    const start = first.top + first.height / 2;
    const end = last.top + last.height / 2;
    const step = (end - start) / (sorted.length - 1);
    sorted.forEach((entry, index) => {
      entry.component.style.top = snapValue(start + step * index - entry.box.height / 2) + "px";
    });
  }
  commitDomToState();
  markTheoryDirty();
}

function componentBox(component) {
  return {
    left: parsePx(component.style.left),
    top: parsePx(component.style.top),
    width: component.offsetWidth,
    height: component.offsetHeight,
  };
}

function parsePx(value) {
  const parsed = parseFloat(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toggleSnapToGrid() {
  if (!THEORY_PAGE_STATE.editing) return;
  THEORY_PAGE_STATE.snapToGrid = !THEORY_PAGE_STATE.snapToGrid;
  updateEditorToolState();
  setTheoryStatus(THEORY_PAGE_STATE.snapToGrid ? "网格吸附已开启" : "网格吸附已关闭");
}

function insertImageComponent(file) {
  if (!THEORY_PAGE_STATE.editing || !file?.type?.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    pushDeckHistory("insert-image");
    commitDomToState();
    const slide = THEORY_PAGE_STATE.deck.slides[THEORY_PAGE_STATE.currentSlide];
    if (!slide) return;
    const position = { ...defaultInsertPosition(), width: "360px", height: "220px" };
    const component = makeComponent("image", {
      src: String(reader.result || ""),
      alt: file.name || "课件图片",
      position,
    });
    slide.components.push(component);
    THEORY_PAGE_STATE.selectedIds = [component.id];
    refreshDeckDom(true);
    markTheoryDirty();
  };
  reader.onerror = () => setTheoryStatus("图片读取失败");
  reader.readAsDataURL(file);
}

function newInsertedComponent(type, position) {
  if (type === "card") {
    return makeComponent("cards", { position, items: [{ id: uid("card"), title: "新卡片", body: "填写卡片说明。", style: {} }] });
  }
  if (type === "bullets") {
    return makeComponent("bullets", { position, items: [{ id: uid("item"), text: "新要点", style: {} }, { id: uid("item"), text: "补充说明", style: {} }] });
  }
  if (type === "callout") return makeComponent("callout", { text: "新的补充说明。", position });
  if (type === "formula") {
    const formulaPosition = {
      ...position,
      width: position?.width || "380px",
      height: position?.height || "150px",
    };
    return makeComponent("formula", {
      text: THEORY_DEFAULT_FORMULA,
      position: formulaPosition,
      style: {
        fontSize: "28px",
        lineHeight: "1.8",
        color: "#0f172a",
        textAlign: "center",
      }
    });
  }
  return makeComponent("p", { text: "新的文本框", position });
}

function defaultInsertPosition() {
  const slide = document.querySelector(".theory-slide.active");
  const width = 320;
  if (!slide) return { left: "120px", top: "120px", width: width + "px", zIndex: nextZIndex() };
  return {
    left: Math.max(24, (slide.clientWidth - width) / 2) + "px",
    top: Math.max(24, slide.clientHeight * 0.22) + "px",
    width: width + "px",
    zIndex: nextZIndex()
  };
}

function nextZIndex() {
  return String(Date.now() % 100000);
}

function snapValue(value) {
  if (!THEORY_PAGE_STATE.snapToGrid) return Math.round(value);
  return Math.round(value / THEORY_GRID_SIZE) * THEORY_GRID_SIZE;
}

function refreshDeckDom(keepEditing) {
  const viewport = $("theorySlideViewport");
  if (!viewport) return;
  disposeTheoryCharts();
  viewport.innerHTML = THEORY_PAGE_STATE.deck.slides.map((slide, index) => renderTheorySlideMarkup(slide, index)).join("");
  updateTheorySlideScale();
  bindEditableEvents(THEORY_PAGE_STATE.pageId);
  bindTheoryDragAndDrop(THEORY_PAGE_STATE.pageId);
  setTheoryEditing(keepEditing);
  renderTheorySlide(THEORY_PAGE_STATE.currentSlide);
  restoreSelection();
  queueTheoryChartRender();
}

function disposeTheoryCharts() {
  const runtimes = THEORY_PAGE_STATE.chartRuntime || {};
  Object.values(runtimes).forEach(runtime => {
    try {
      runtime?.instance?.dispose?.();
    } catch (err) {}
  });
  THEORY_PAGE_STATE.chartRuntime = {};
}

function queueTheoryChartRender(options = {}) {
  window.requestAnimationFrame(() => {
    renderTheoryCharts(options);
  });
}

function renderTheoryCharts(options = {}) {
  if (typeof echarts === "undefined") return;
  const runtimes = THEORY_PAGE_STATE.chartRuntime || {};
  document.querySelectorAll(".theory-chart-canvas").forEach(node => {
    const componentId = node.dataset.chartId;
    const component = findComponentById(componentId);
    if (!component) return;
    const existing = runtimes[componentId];
    let instance = existing?.instance || null;
    if (!instance) {
      instance = echarts.init(node, null, { renderer: "canvas" });
    } else if (instance.getDom() !== node) {
      try {
        instance.dispose();
      } catch (err) {}
      instance = echarts.init(node, null, { renderer: "canvas" });
    }
    const option = resolveTheoryChartOption(component, options);
    instance.setOption(option, true);
    instance.resize();
    runtimes[componentId] = { instance };
  });
  THEORY_PAGE_STATE.chartRuntime = runtimes;
}

function waitForTheoryCharts() {
  return new Promise(resolve => {
    window.setTimeout(resolve, 120);
  });
}

function restoreSelection() {
  const ids = [...THEORY_PAGE_STATE.selectedIds];
  THEORY_PAGE_STATE.selectedIds = [];
  ids.forEach(id => {
    const component = document.querySelector(".theory-slide.active [data-component-id=\"" + cssEscape(id) + "\"]");
    if (!component) return;
    component.classList.add("is-selected");
    if (!THEORY_PAGE_STATE.selectedIds.includes(id)) THEORY_PAGE_STATE.selectedIds.push(id);
  });
  updateFontTools();
  updateEditorToolState();
}

function selectTheoryComponent(component, editable = null, append = false) {
  if (!THEORY_PAGE_STATE.editing || !component) return;
  const componentId = component.dataset.componentId;
  if (!append) clearSelection();
  if (append && THEORY_PAGE_STATE.selectedIds.includes(componentId)) {
    component.classList.remove("is-selected");
    component.querySelectorAll(".theory-editable.is-selected").forEach(node => node.classList.remove("is-selected"));
    THEORY_PAGE_STATE.selectedIds = THEORY_PAGE_STATE.selectedIds.filter(id => id !== componentId);
    THEORY_PAGE_STATE.selectedId = THEORY_PAGE_STATE.selectedIds[THEORY_PAGE_STATE.selectedIds.length - 1] || null;
    updateFontTools();
    updateEditorToolState();
    return;
  }
  component.classList.add("is-selected");
  const target = editable || component.querySelector(".theory-editable");
  if (target) target.classList.add("is-selected");
  if (!THEORY_PAGE_STATE.selectedIds.includes(componentId)) THEORY_PAGE_STATE.selectedIds.push(componentId);
  THEORY_PAGE_STATE.selectedId = target?.dataset.editId || componentId;
  updateFontTools();
  updateEditorToolState();
}

function clearSelection() {
  document.querySelectorAll(".is-selected").forEach(node => node.classList.remove("is-selected"));
  THEORY_PAGE_STATE.selectedId = null;
  THEORY_PAGE_STATE.selectedIds = [];
  updateEditorToolState();
}

function selectedComponents() {
  if (!THEORY_PAGE_STATE.editing) return [];
  return THEORY_PAGE_STATE.selectedIds
    .map(id => document.querySelector(".theory-slide.active [data-component-id=\"" + cssEscape(id) + "\"]"))
    .filter(Boolean);
}

function selectedEditables() {
  const components = selectedComponents();
  if (components.length > 1) return components.flatMap(component => Array.from(component.querySelectorAll(".theory-editable")));
  const selectedEditable = document.querySelector(".theory-slide.active .theory-editable.is-selected");
  if (selectedEditable) return [selectedEditable];
  return components.flatMap(component => Array.from(component.querySelectorAll(".theory-editable")));
}

function bindFontTools() {
  $("theoryFontFamily")?.addEventListener("change", event => applyTextStyle("fontFamily", event.target.value));
  $("theoryFontSize")?.addEventListener("change", event => applyTextStyle("fontSize", event.target.value));
  
  const boldBtn = $("theoryBoldBtn");
  if (boldBtn) {
    boldBtn.addEventListener("mousedown", event => {
      event.preventDefault(); // Keep focus and selection on the editing contenteditable
    });
    boldBtn.addEventListener("click", () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const activeEl = document.querySelector(".theory-slide.active .theory-editable[data-inline-math-editing='true']") || document.activeElement;
        if (activeEl && activeEl.classList.contains("theory-editable") && activeEl.getAttribute("contenteditable") === "true") {
          if (activeEl.contains(range.startContainer) && activeEl.contains(range.endContainer) && range.toString().trim() !== "") {
            pushDeckHistory("text-bold-part");
            toggleSelectedTextBold(selection, range, activeEl);
            return;
          }
        }
      }
      toggleTextStyle("fontWeight", "700", "");
    });
  }

  const italicBtn = $("theoryItalicBtn");
  if (italicBtn) {
    italicBtn.addEventListener("mousedown", event => {
      event.preventDefault(); // Keep focus and selection on the editing contenteditable
    });
    italicBtn.addEventListener("click", () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const activeEl = document.querySelector(".theory-slide.active .theory-editable[data-inline-math-editing='true']") || document.activeElement;
        if (activeEl && activeEl.classList.contains("theory-editable") && activeEl.getAttribute("contenteditable") === "true") {
          if (activeEl.contains(range.startContainer) && activeEl.contains(range.endContainer) && range.toString().trim() !== "") {
            pushDeckHistory("text-italic-part");
            toggleSelectedTextItalic(selection, range, activeEl);
            return;
          }
        }
      }
      toggleTextStyle("fontStyle", "italic", "");
    });
  }

  $("theoryColorInput")?.addEventListener("input", event => applyTextStyle("color", event.target.value));
  $("theoryAlignSelect")?.addEventListener("change", event => applyTextStyle("textAlign", event.target.value));
  updateFontTools();
}

function toggleSelectedTextBold(selection, range, activeEl) {
  const selectedText = range.toString();
  let replacement = "";
  if (selectedText.startsWith("**") && selectedText.endsWith("**")) {
    replacement = selectedText.slice(2, -2);
  } else {
    replacement = `**${selectedText}**`;
  }
  range.deleteContents();
  const textNode = document.createTextNode(replacement);
  range.insertNode(textNode);
  
  const newRange = document.createRange();
  newRange.setStart(textNode, 0);
  newRange.setEnd(textNode, textNode.length);
  selection.removeAllRanges();
  selection.addRange(newRange);

  syncInlineMathRawText(activeEl);
  markTheoryDirty();
  commitDomToState();
}

function toggleSelectedTextItalic(selection, range, activeEl) {
  const selectedText = range.toString();
  let replacement = "";
  if (selectedText.startsWith("*") && selectedText.endsWith("*") && !selectedText.startsWith("**")) {
    replacement = selectedText.slice(1, -1);
  } else {
    replacement = `*${selectedText}*`;
  }
  range.deleteContents();
  const textNode = document.createTextNode(replacement);
  range.insertNode(textNode);
  
  const newRange = document.createRange();
  newRange.setStart(textNode, 0);
  newRange.setEnd(textNode, textNode.length);
  selection.removeAllRanges();
  selection.addRange(newRange);

  syncInlineMathRawText(activeEl);
  markTheoryDirty();
  commitDomToState();
}

function applyTextStyle(prop, value) {
  const targets = selectedEditables();
  if (!targets.length) return;
  pushDeckHistory("text-style");
  targets.forEach(node => {
    node.style[prop] = value;
    if (node.classList.contains("theory-formula-source")) {
      const box = node.closest(".theory-formula-box");
      if (box) box.style[prop] = value;
    }
  });
  markTheoryDirty();
  updateFontTools();
}

function toggleTextStyle(prop, onValue, offValue) {
  const targets = selectedEditables();
  if (!targets.length) return;
  pushDeckHistory("text-style");
  const shouldTurnOff = targets.every(node => node.style[prop] === onValue);
  targets.forEach(node => {
    node.style[prop] = shouldTurnOff ? offValue : onValue;
    if (node.classList.contains("theory-formula-source")) {
      const box = node.closest(".theory-formula-box");
      if (box) box.style[prop] = shouldTurnOff ? offValue : onValue;
    }
  });
  markTheoryDirty();
  updateFontTools();
}

function updateFontTools() {
  const targets = selectedEditables();
  const disabled = !THEORY_PAGE_STATE.editing || !targets.length;
  ["theoryFontFamily", "theoryFontSize", "theoryBoldBtn", "theoryItalicBtn", "theoryColorInput", "theoryAlignSelect"].forEach(id => {
    const control = $(id);
    if (control) control.disabled = disabled;
  });
  $("theoryToolHint").textContent = disabled ? "请选择组件" : "正在编辑所选组件";
  const deleteComponentBtn = $("theoryDeleteComponentBtn");
  if (deleteComponentBtn) deleteComponentBtn.disabled = disabled;
  if (disabled) return;
  const style = targets[0].style;
  $("theoryFontFamily").value = style.fontFamily || "";
  $("theoryFontSize").value = style.fontSize || "";
  $("theoryColorInput").value = rgbToHex(style.color || "#172033");
  $("theoryAlignSelect").value = style.textAlign || "";
}

function rgbToHex(value) {
  if (!value || value.startsWith("#")) return value || "#172033";
  const match = value.match(/\d+/g);
  if (!match) return "#172033";
  return "#" + match.slice(0, 3).map(n => Number(n).toString(16).padStart(2, "0")).join("");
}

function bindTheoryDragAndDrop(pageId) {
  const deck = $("theoryDeck");
  if (!deck) return;
  deck.querySelectorAll("[data-drag-handle]").forEach(handle => {
    const component = handle.closest("[data-component-id]");
    if (!component) return;
    handle.addEventListener("pointerdown", event => startFreeDrag(event, component, pageId));
  });
  deck.querySelectorAll("[data-resize-handle]").forEach(handle => {
    const component = handle.closest("[data-component-id]");
    if (!component) return;
    handle.addEventListener("pointerdown", event => startResizeComponent(event, component, pageId, handle.dataset.resizeHandle || "se"));
  });
}

function startFreeDrag(event, component, pageId) {
  if (!THEORY_PAGE_STATE.editing || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  queueDragSession(event, () => startFreeDragSession(component, pageId, event.clientX, event.clientY, event));
}

function startFreeDragSession(component, pageId, startX, startY, sourceEvent) {
  const slide = component.closest(".theory-slide");
  if (!slide || !THEORY_PAGE_STATE.editing) return;
  const componentId = component.dataset.componentId;
  const keepMultiSelection = sourceEvent?.shiftKey || sourceEvent?.ctrlKey || sourceEvent?.metaKey;
  if (componentId && (!THEORY_PAGE_STATE.selectedIds.includes(componentId) || !keepMultiSelection)) {
    selectTheoryComponent(component, null, false);
  }
  pushDeckHistory("drag");

  const boundary = dragBoundaryFor(component, slide);
  freezeEditableSiblings(boundary, slide);
  ensureFreePositioned(component, boundary);
  const movingComponents = componentId && selectedComponents().length ? selectedComponents() : [component];
  movingComponents.forEach(item => ensureFreePositioned(item, dragBoundaryFor(item, slide)));
  const startPositions = movingComponents.map(item => ({
    item,
    left: parseFloat(item.style.left || "0"),
    top: parseFloat(item.style.top || "0"),
  }));
  movingComponents.forEach(item => {
    item.classList.add("is-dragging");
    item.style.zIndex = nextZIndex();
  });
  handlePointerCapture(sourceEvent);

  const onMove = moveEvent => {
    startPositions.forEach(({ item, left, top }) => {
      const itemBoundary = dragBoundaryFor(item, slide);
      const bounds = freeDragBounds(item, itemBoundary);
      item.style.left = snapValue(clampNumber(left + moveEvent.clientX - startX, bounds.minLeft, bounds.maxLeft)) + "px";
      item.style.top = snapValue(clampNumber(top + moveEvent.clientY - startY, bounds.minTop, bounds.maxTop)) + "px";
    });
  };
  const onEnd = () => {
    movingComponents.forEach(item => item.classList.remove("is-dragging"));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    markTheoryDirty();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd, { once: true });
  window.addEventListener("pointercancel", onEnd, { once: true });
}

function queueDragSession(event, startSession) {
  const startX = event.clientX;
  const startY = event.clientY;
  let started = false;
  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
  };
  const onMove = moveEvent => {
    if (started) return;
    const moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
    if (moved < 4) return;
    started = true;
    cleanup();
    startSession();
  };
  const onEnd = () => {
    cleanup();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd, { once: true });
  window.addEventListener("pointercancel", onEnd, { once: true });
}

function startResizeComponent(event, component, pageId, direction = "se") {
  if (!THEORY_PAGE_STATE.editing || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  queueDragSession(event, () => startResizeSession(component, pageId, direction, event.clientX, event.clientY, event));
}

function startResizeSession(component, pageId, direction, startX, startY, sourceEvent) {
  const slide = component.closest(".theory-slide");
  if (!slide || !THEORY_PAGE_STATE.editing) return;
  if (component.dataset.componentId) selectTheoryComponent(component);
  pushDeckHistory("resize");
  const boundary = dragBoundaryFor(component, slide);
  freezeEditableSiblings(boundary, slide);
  ensureFreePositioned(component, boundary);

  const startWidth = component.offsetWidth;
  const startHeight = component.offsetHeight;
  const left = parseFloat(component.style.left || "0");
  const top = parseFloat(component.style.top || "0");
  const minWidth = Math.min(120, Math.max(72, slide.clientWidth * 0.18));
  const minHeight = Math.min(72, Math.max(48, slide.clientHeight * 0.12));
  component.classList.add("is-resizing");
  component.style.zIndex = nextZIndex();
  handlePointerCapture(sourceEvent);

  const onMove = moveEvent => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    const next = resizeBoxByDirection({
      direction,
      left,
      top,
      width: startWidth,
      height: startHeight,
      dx,
      dy,
      minWidth,
      minHeight,
      maxRight: boundary.clientWidth,
      maxBottom: boundary.clientHeight,
    });
    component.style.left = snapValue(next.left) + "px";
    component.style.top = snapValue(next.top) + "px";
    component.style.width = snapValue(next.width) + "px";
    component.style.height = snapValue(next.height) + "px";
  };
  const onEnd = () => {
    component.classList.remove("is-resizing");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    markTheoryDirty();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd, { once: true });
  window.addEventListener("pointercancel", onEnd, { once: true });
}

function resizeBoxByDirection(box) {
  const horizontal = box.direction.includes("e") || box.direction.includes("w");
  const vertical = box.direction.includes("n") || box.direction.includes("s");
  let left = box.left;
  let top = box.top;
  let width = box.width;
  let height = box.height;

  if (horizontal && box.direction.includes("e")) {
    width = clampNumber(box.width + box.dx, box.minWidth, box.maxRight - box.left);
  }
  if (horizontal && box.direction.includes("w")) {
    const maxLeft = box.left + box.width - box.minWidth;
    left = clampNumber(box.left + box.dx, 0, maxLeft);
    width = box.width + box.left - left;
  }
  if (vertical && box.direction.includes("s")) {
    height = clampNumber(box.height + box.dy, box.minHeight, box.maxBottom - box.top);
  }
  if (vertical && box.direction.includes("n")) {
    const maxTop = box.top + box.height - box.minHeight;
    top = clampNumber(box.top + box.dy, 0, maxTop);
    height = box.height + box.top - top;
  }

  return { left, top, width, height };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function freeDragBounds(item, boundary) {
  const visibleGrip = 32;
  const width = Math.max(visibleGrip, item.offsetWidth || 0);
  const height = Math.max(visibleGrip, item.offsetHeight || 0);
  return {
    minLeft: Math.min(0, visibleGrip - width),
    maxLeft: Math.max(0, boundary.clientWidth - visibleGrip),
    minTop: Math.min(0, visibleGrip - height),
    maxTop: Math.max(0, boundary.clientHeight - visibleGrip),
  };
}

function dragBoundaryFor(component, slide) {
  return slide;
}

function freezeEditableSiblings(boundary, slide) {
  const siblings = draggableSiblingsForBoundary(boundary, slide);
  if (!siblings.length) return;
  const boundaryRect = boundary.getBoundingClientRect();
  const snapshots = siblings
    .filter(item => !item.classList.contains("is-free-positioned"))
    .map(item => freePositionSnapshot(item, boundary, boundaryRect));
  if (boundary !== slide) {
    boundary.style.minHeight = Math.ceil(boundaryRect.height) + "px";
  }
  snapshots.forEach(snapshot => applyFreePositionSnapshot(snapshot));
}

function draggableSiblingsForBoundary(boundary, slide) {
  if (boundary === slide) {
    return Array.from(slide.querySelectorAll(":scope > .theory-component"));
  }
  if (boundary.classList.contains("theory-card-grid")) {
    return Array.from(boundary.querySelectorAll(":scope > .theory-info-card"));
  }
  if (boundary.classList.contains("theory-bullet-grid")) {
    return Array.from(boundary.querySelectorAll(":scope > .theory-list-item"));
  }
  return [];
}

function ensureFreePositioned(component, boundary) {
  if (component.classList.contains("is-free-positioned")) return;
  applyFreePositionSnapshot(freePositionSnapshot(component, boundary));
}

function freePositionSnapshot(component, boundary, boundaryRect = boundary.getBoundingClientRect()) {
  const componentRect = component.getBoundingClientRect();
  const computed = window.getComputedStyle(boundary);
  const innerLeft = boundary.clientLeft + (parseFloat(computed.paddingLeft) || 0);
  const innerTop = boundary.clientTop + (parseFloat(computed.paddingTop) || 0);
  return {
    item: component,
    left: componentRect.left - boundaryRect.left - innerLeft,
    top: componentRect.top - boundaryRect.top - innerTop,
    width: componentRect.width,
    height: componentRect.height,
  };
}

function applyFreePositionSnapshot(snapshot) {
  const component = snapshot.item;
  component.classList.add("is-free-positioned");
  component.style.left = snapshot.left + "px";
  component.style.top = snapshot.top + "px";
  component.style.width = snapshot.width + "px";
  component.style.height = snapshot.height + "px";
}

function handlePointerCapture(event) {
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  } catch (err) {}
}

function commitDomToState() {
  const deck = THEORY_PAGE_STATE.deck;
  const viewport = $("theorySlideViewport");
  if (!deck || !viewport) return;
  deck.slides = Array.from(viewport.querySelectorAll(".theory-slide")).map(slideEl => {
    const existing = deck.slides.find(slide => slide.id === slideEl.dataset.slideId) || { id: slideEl.dataset.slideId, layout: "default", components: [] };
    return {
      id: existing.id,
      layout: existing.layout || "default",
      components: Array.from(slideEl.querySelectorAll(":scope > .theory-component")).map(componentEl => collectComponent(componentEl))
    };
  });
}

function collectComponent(componentEl) {
  const existing = findComponentById(componentEl.dataset.componentId);
  const component = existing ? clone(existing) : makeComponent(componentEl.dataset.componentType || "p", { id: componentEl.dataset.componentId });
  component.position = componentEl.classList.contains("is-free-positioned")
    ? { left: componentEl.style.left, top: componentEl.style.top, width: componentEl.style.width, height: componentEl.style.height, zIndex: componentEl.style.zIndex }
    : null;
  if (component.type === "cards") {
    component.items = component.items.map(item => ({
      ...item,
      title: textFor(component.id + ":" + item.id + ":title"),
      body: textFor(component.id + ":" + item.id + ":body"),
      titleStyle: styleFor(component.id + ":" + item.id + ":title"),
      bodyStyle: styleFor(component.id + ":" + item.id + ":body"),
      position: positionForEditUnit(component.id + ":" + item.id)
    }));
  } else if (component.type === "bullets") {
    component.items = component.items.map(item => ({
      ...item,
      text: textFor(component.id + ":" + item.id + ":text"),
      style: styleFor(component.id + ":" + item.id + ":text"),
      position: positionForEditUnit(component.id + ":" + item.id)
    }));
  } else if (component.type === "image") {
    component.alt = textFor(component.id + ":alt") || component.alt || "课件图片";
    component.style = styleFor(component.id + ":alt");
  } else {
    component.text = textFor(component.id + ":text");
    component.style = component.type === "formula"
      ? formulaStyleFor(component.id + ":text")
      : styleFor(component.id + ":text");
  }
  return component;
}

function positionForEditUnit(unitId) {
  const node = document.querySelector("[data-edit-unit-id=\"" + cssEscape(unitId) + "\"]");
  if (!node || !node.classList.contains("is-free-positioned")) return null;
  return {
    left: node.style.left,
    top: node.style.top,
    width: node.style.width,
    height: node.style.height,
    zIndex: node.style.zIndex
  };
}

function findComponentById(componentId) {
  return THEORY_PAGE_STATE.deck?.slides.flatMap(slide => slide.components).find(component => component.id === componentId);
}

function textFor(editId) {
  const node = document.querySelector("[data-edit-id=\"" + cssEscape(editId) + "\"]");
  if (!node) return "";
  if (node.classList.contains("theory-formula-source")) {
    const latex = normalizeFormulaLatex(node.innerText || node.textContent || node.dataset.formulaLatex || THEORY_DEFAULT_FORMULA);
    node.dataset.formulaLatex = latex;
    return latex;
  }
  if (node.dataset.inlineMathEditing === "true") syncInlineMathRawText(node);
  return node.dataset.rawText ?? node.innerText ?? node.textContent ?? "";
}

function formulaStyleFor(editId) {
  const sourceNode = document.querySelector("[data-edit-id=\"" + cssEscape(editId) + "\"]");
  const box = sourceNode?.closest(".theory-formula-box");
  const node = box || sourceNode;
  if (!node) return {};
  return {
    fontFamily: node.style.fontFamily || "",
    fontSize: node.style.fontSize || "",
    fontWeight: node.style.fontWeight || "",
    fontStyle: node.style.fontStyle || "",
    color: node.style.color || "",
    textAlign: node.style.textAlign || "",
    lineHeight: node.style.lineHeight || "",
  };
}

function styleFor(editId) {
  const node = document.querySelector("[data-edit-id=\"" + cssEscape(editId) + "\"]");
  if (!node) return {};
  return {
    fontFamily: node.style.fontFamily || "",
    fontSize: node.style.fontSize || "",
    fontWeight: node.style.fontWeight || "",
    fontStyle: node.style.fontStyle || "",
    color: node.style.color || "",
    textAlign: node.style.textAlign || "",
  };
}

async function saveTheoryEdits(pageId, options = {}) {
  const saveVersion = THEORY_PAGE_STATE.editVersion;
  THEORY_PAGE_STATE.saving = true;
  try {
    const resp = await fetch(THEORY_DECK_OVERRIDE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        deck: THEORY_PAGE_STATE.deck,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "save failed");
    THEORY_PAGE_STATE.serverOverrides[pageId] = clone(data.deck);
    if (THEORY_PAGE_STATE.editVersion === saveVersion) {
      THEORY_PAGE_STATE.dirty = false;
      setTheoryStatus(options.source === "manual" ? "已同步到项目文件" : "已自动同步到项目文件");
    } else {
      setTheoryStatus("继续同步最新修改");
      scheduleTheoryAutosave();
    }
  } catch (err) {
    setTheoryStatus("项目文件同步失败");
  } finally {
    THEORY_PAGE_STATE.saving = false;
  }
}

function applyLegacyEdits(pageId) {
  return;
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

async function exportTheoryPdf(pageId) {
  const deck = $("theoryDeck");
  const viewport = $("theorySlideViewport");
  const exportBtn = $("theoryExportBtn");
  if (!deck || !viewport || !exportBtn) return;
  if (typeof html2pdf === "undefined") {
    setTheoryStatus("导出库未加载，请联网后重试");
    return;
  }
  const activeBeforeExport = THEORY_PAGE_STATE.currentSlide;
  exportBtn.disabled = true;
  exportBtn.textContent = "生成中...";
  setTheoryStatus("正在生成 PDF");
  deck.classList.add("theory-exporting");
  document.querySelectorAll(".theory-slide").forEach(slide => {
    slide.classList.add("active");
    slide.setAttribute("aria-hidden", "false");
  });
  try {
    renderTheoryCharts({ staticMode: true });
    await waitForTheoryCharts();
    await html2pdf().set({
      margin: 0,
      filename: (THEORY_PAGE_STATE.deck.title || "theory") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: null },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ["css", "legacy"], after: ".theory-slide" }
    }).from(viewport).save();
    setTheoryStatus("PDF 已导出");
  } catch (err) {
    setTheoryStatus("PDF 导出失败");
  } finally {
    deck.classList.remove("theory-exporting");
    exportBtn.disabled = false;
    exportBtn.textContent = "导出 PDF";
    renderTheoryCharts({ staticMode: false });
    renderTheorySlide(activeBeforeExport);
  }
}





























function markTheoryDirty() {
  if (!THEORY_PAGE_STATE.editing) return;
  THEORY_PAGE_STATE.dirty = true;
  THEORY_PAGE_STATE.editVersion += 1;
  setTheoryStatus("有未保存修改");
}

function scheduleTheoryAutosave() {}

async function flushTheoryAutosave() {}

async function saveTheoryEdits(pageId) {
  const saveVersion = THEORY_PAGE_STATE.editVersion;
  THEORY_PAGE_STATE.saving = true;
  try {
    const resp = await fetch(THEORY_DECK_OVERRIDE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        deck: THEORY_PAGE_STATE.deck,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "save failed");
    THEORY_PAGE_STATE.serverOverrides[pageId] = clone(data.deck);
    if (THEORY_PAGE_STATE.editVersion === saveVersion) {
      THEORY_PAGE_STATE.dirty = false;
      setTheoryStatus("已保存到项目文件");
    } else {
      setTheoryStatus("仍有未保存修改");
    }
  } catch (err) {
    setTheoryStatus("保存到项目文件失败");
  } finally {
    THEORY_PAGE_STATE.saving = false;
  }
}



