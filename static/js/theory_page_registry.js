window.THEORY_PAGE_CONFIGS = window.THEORY_PAGE_CONFIGS || {};

window.registerTheoryPageConfig = function registerTheoryPageConfig(pageId, config) {
  if (!pageId || !config || typeof config !== "object") return;
  window.THEORY_PAGE_CONFIGS[pageId] = config;
};
