const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, "relatorio-gestor-template.html");
  await page.goto("file://" + htmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
  const outPath = path.join(__dirname, "..", "RELATORIO-GESTOR.pdf");
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log("PDF gerado em: " + outPath);
})();
