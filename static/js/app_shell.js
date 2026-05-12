// App Shell.

function setPage(page) {
  persistActiveViewSelection();
  stopAuto();
  currentPage = page;
  setActive(page);
  destroyDataGrid();
  disposeCharts();
  $("topFeature").textContent = `当前特征 ${currentFeature()}`;
  if (page === "preprocess") {
    renderDataShell().then(loadDataView);
  } else if (page === "train_eval") {
    renderTrainShell();
  } else if (page === "predict") {
    renderPredictShell().then(loadPrediction);
  } else if (page === "student") {
    renderStudentShell();
  } else {
    renderTheory(page);
  }
}

function renderError(message) {
  $("main").innerHTML = `<section class="content-card"><h2>加载失败</h2><p>${escapeHtml(message)}</p></section>`;
}

document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => setPage(btn.dataset.page)));
const jumpExperiment = $("jumpExperiment");
if (jumpExperiment) jumpExperiment.addEventListener("click", () => setPage("preprocess"));
window.addEventListener("resize", () => {
  updateDataGridCellHeight();
  charts.forEach(ch => ch.resize());
});
setPage("basic");
