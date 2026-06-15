async page => {
  const outDir = "output/playwright/layout-audit";

  const sleep = ms => page.waitForTimeout(ms);
  const waitQuiet = async () => {
    try {
      await page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch (_) {}
    await sleep(600);
  };

  const clickPage = async name => {
    await page.locator(`[data-page="${name}"]`).click();
    await waitQuiet();
  };

  const audit = async name => {
    const result = await page.evaluate(pageName => {
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const visible = el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
      };
      const label = el => {
        const id = el.id ? `#${el.id}` : "";
        const cls = String(el.className || "").trim().split(/\s+/).slice(0, 3).join(".");
        const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
        return `${el.tagName.toLowerCase()}${id}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
      };
      const outside = [];
      const clippedText = [];
      const smallCards = [];
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        if (!visible(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 2 || rect.left < -2 || rect.bottom > vh + 2 || rect.top < -2) {
          const fixed = ["fixed", "sticky"].includes(getComputedStyle(el).position);
          const inScrollableMain = Boolean(el.closest("#main, .main, main, #rightPanel"));
          if (!fixed && !inScrollableMain) outside.push({ item: label(el), rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } });
        }
        const style = getComputedStyle(el);
        const isTextLike = /^(DIV|SPAN|BUTTON|STRONG|P|H1|H2|H3|H4|H5|TD|TH|LABEL)$/.test(el.tagName);
        if (isTextLike && style.overflow !== "visible" && (el.scrollWidth > el.clientWidth + 3 || el.scrollHeight > el.clientHeight + 3)) {
          clippedText.push({ item: label(el), scroll: [el.scrollWidth, el.scrollHeight], client: [el.clientWidth, el.clientHeight] });
        }
        if (el.matches(".chart-card, .control-card, .preprocess-dashboard-card, .nb-eval-card, .content-card")) {
          if (rect.width < 120 || rect.height < 60) smallCards.push({ item: label(el), rect: { w: rect.width, h: rect.height } });
        }
      }
      const main = document.querySelector("#main, main, .main");
      const right = document.querySelector("#rightPanel");
      const bodyOverflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {
        pageName,
        title: document.title,
        viewport: [vw, vh],
        bodyOverflowX,
        bodyScroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        mainScroll: main ? [main.clientWidth, main.clientHeight, main.scrollWidth, main.scrollHeight] : null,
        rightScroll: right ? [right.clientWidth, right.clientHeight, right.scrollWidth, right.scrollHeight] : null,
        outside: outside.slice(0, 20),
        clippedText: clippedText.slice(0, 20),
        smallCards: smallCards.slice(0, 20),
        visibleHeadings: Array.from(document.querySelectorAll("h1,h2,h3,.chart-title,.right-title")).filter(visible).map(el => label(el)).slice(0, 20),
      };
    }, name);
    await page.screenshot({ path: `${outDir}/${name}-${page.viewportSize().width}x${page.viewportSize().height}.png`, fullPage: true });
    return result;
  };

  await page.goto("http://127.0.0.1:5000/?audit=" + Date.now(), { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });

  const desktop = [];
  await page.setViewportSize({ width: 1365, height: 768 });
  await waitQuiet();

  await clickPage("preprocess");
  desktop.push(await audit("preprocess-initial"));
  const loadBtn = page.locator("#loadDatasetBtn");
  if (await loadBtn.count()) {
    await loadBtn.click();
    await waitQuiet();
    await sleep(1500);
  }
  desktop.push(await audit("preprocess-loaded"));

  await clickPage("train_eval");
  desktop.push(await audit("train-initial"));
  const trainBtn = page.locator("#nbStartTrainBtn");
  if (await trainBtn.count()) {
    await trainBtn.click();
    await waitQuiet();
    await sleep(1500);
  }
  desktop.push(await audit("train-trained"));

  await clickPage("evaluate");
  desktop.push(await audit("evaluate"));

  await clickPage("predict");
  await waitQuiet();
  await sleep(1500);
  desktop.push(await audit("predict"));

  await clickPage("experiment_test");
  desktop.push(await audit("experiment-test"));

  const mobile = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await waitQuiet();
  for (const name of ["preprocess", "train_eval", "evaluate", "predict", "experiment_test"]) {
    await clickPage(name);
    await sleep(800);
    mobile.push(await audit(`mobile-${name}`));
  }

  return { desktop, mobile, outDir };
}
