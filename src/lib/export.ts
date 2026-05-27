import type { DocEntry } from "@/types";

export function docToMarkdown(doc: {
  title: string;
  summary?: string | null;
  content?: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}): string {
  const lines = [
    `# ${doc.title}`,
    "",
    `**Tipo:** ${doc.type}`,
    `**Criado:** ${doc.createdAt.toISOString()}`,
    `**Atualizado:** ${doc.updatedAt.toISOString()}`,
  ];

  if (doc.summary) {
    lines.push("", `> ${doc.summary}`);
  }

  if (doc.content) {
    lines.push("", "---", "", stripHtml(doc.content));
  }

  return lines.join("\n");
}

export function docToHtml(doc: {
  title: string;
  summary?: string | null;
  content?: string | null;
  type: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1 { font-size: 1.75rem; }
    .meta { color: #666; font-size: 0.875rem; }
    .summary { border-left: 3px solid #4f6ef7; padding-left: 1rem; color: #444; }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  <p class="meta">Tipo: ${escapeHtml(doc.type)}</p>
  ${doc.summary ? `<p class="summary">${escapeHtml(doc.summary)}</p>` : ""}
  <article>${doc.content ?? ""}</article>
  <script>window.onload = () => window.print()</script>
</body>
</html>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
