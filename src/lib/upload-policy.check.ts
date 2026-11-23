// Rodar: npx tsx src/lib/upload-policy.check.ts
import assert from "node:assert";
import { checkUpload } from "./upload-policy";

const MB = 1024 * 1024;
for (const [name, mime] of [
  ["relatorio.pdf", "application/pdf"],
  ["contrato.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["planilha.xlsx", ""],
  ["fotos.zip", "application/zip"],
  ["print.png", "image/png"],
  ["notas.txt", "text/plain"],
]) assert.strictEqual(checkUpload(name, mime, MB), null, name);

for (const [name, mime] of [
  ["pagina.html", "text/html"],
  ["Logo.SVG", "image/svg+xml"],
  ["setup.exe", "application/x-msdownload"],
  ["disfarce.pdf", "text/html"],   // extensão inofensiva, MIME ativo
  ["disfarce", "image/svg+xml"],
]) assert.ok(checkUpload(name, mime, MB), name);

assert.ok(checkUpload("grande.pdf", "application/pdf", 11 * MB));
assert.strictEqual(checkUpload("video.mp4", "video/mp4", 15 * MB), null);
assert.ok(checkUpload("video.mp4", "video/mp4", 21 * MB));
console.log("upload-policy ok");
