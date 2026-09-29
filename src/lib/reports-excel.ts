/**
 * Monta o .xlsx do relatório de trabalho. Cuidado principal: nunca cortar texto —
 * nem na horizontal (coluna larga o bastante pro maior conteúdo) nem na vertical
 * (wrapText ligado + sem fixar altura de linha, pra o Excel auto-ajustar ao abrir).
 */

import ExcelJS from "exceljs";
import type { ReportData } from "@/lib/reports";
import { PRIORITY_LABELS, DIFFICULTY_LABELS, STATUS_LABELS, DOC_TYPE_LABELS, formatDateOnly, subtasksText } from "@/lib/report-labels";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F6EF7" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true };
const MIN_COL_WIDTH = 12;
const MAX_COL_WIDTH = 60;

// Limite de uma célula do Excel é 32767 caracteres.
const cap = (t: string) => (t.length > 32000 ? t.slice(0, 32000) + "…" : t);

function widthFor(values: string[], header: string): number {
  const longest = values.reduce((max, v) => Math.max(max, v.length), header.length);
  return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, longest + 2));
}

function addTable(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: { header: string; key: string }[],
  rows: Record<string, string>[]
) {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: widthFor(rows.map((r) => r[c.key] ?? ""), c.header) }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow(row);
    excelRow.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
    if (i % 2 === 1) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      });
    }
  });

  return sheet;
}

export async function buildReportWorkbook(
  data: ReportData,
  meta: { userName: string | null; workspaceName: string; aiSummary: string | null }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DevLog";
  workbook.created = new Date();

  // ── Resumo ──
  const summarySheet = workbook.addWorksheet("Resumo");
  summarySheet.columns = [{ key: "a", width: 28 }, { key: "b", width: 90 }];
  const summaryRows: [string, string][] = [
    ["Colaborador", meta.userName ?? "—"],
    ["Workspace", meta.workspaceName],
    ["Período", `${formatDateOnly(data.period.start)} a ${formatDateOnly(data.period.end)}`],
    ["Tarefas concluídas", String(data.stats.completed)],
    ["Tarefas em andamento", String(data.stats.inProgress)],
    ["Documentações registradas", String(data.stats.docs)],
  ];
  summaryRows.forEach(([label, value]) => {
    const row = summarySheet.addRow({ a: label, b: value });
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });

  if (meta.aiSummary) {
    summarySheet.addRow([]);
    const titleRow = summarySheet.addRow({ a: "Resumo gerado por IA" });
    titleRow.getCell(1).font = { bold: true, size: 13 };
    const contentRow = summarySheet.addRow({ a: meta.aiSummary });
    summarySheet.mergeCells(contentRow.number, 1, contentRow.number, 2);
    contentRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
  }

  // ── Concluídas ──
  addTable(
    workbook,
    "Concluídas",
    [
      { header: "Tarefa", key: "title" },
      { header: "Board", key: "board" },
      { header: "Prioridade", key: "priority" },
      { header: "Dificuldade", key: "difficulty" },
      { header: "Iniciada em", key: "startDate" },
      { header: "Concluída em", key: "completedAt" },
      { header: "Descrição", key: "description" },
      { header: "Subtarefas", key: "subtasks" },
      { header: "Observações", key: "notes" },
    ],
    data.completedCards.map((c) => ({
      title: c.title,
      board: c.boardName,
      priority: PRIORITY_LABELS[c.priority] ?? c.priority,
      difficulty: DIFFICULTY_LABELS[c.difficulty] ?? c.difficulty,
      startDate: c.startDate ? formatDateOnly(c.startDate) : "—",
      completedAt: c.completedAt ? formatDateOnly(c.completedAt) : "—",
      description: cap(c.description),
      subtasks: cap(subtasksText(c.subtasks)),
      notes: cap(c.completionNotes ?? ""),
    }))
  );

  // ── Em andamento ──
  addTable(
    workbook,
    "Em Andamento",
    [
      { header: "Tarefa", key: "title" },
      { header: "Board", key: "board" },
      { header: "Status", key: "status" },
      { header: "Prioridade", key: "priority" },
      { header: "Criada em", key: "createdAt" },
      { header: "Prazo", key: "dueDate" },
      { header: "Última atualização", key: "updatedAt" },
      { header: "Descrição", key: "description" },
      { header: "Subtarefas", key: "subtasks" },
    ],
    data.inProgressCards.map((c) => ({
      title: c.title,
      board: c.boardName,
      status: STATUS_LABELS[c.status] ?? c.status,
      priority: PRIORITY_LABELS[c.priority] ?? c.priority,
      createdAt: formatDateOnly(c.createdAt),
      dueDate: c.dueDate ? formatDateOnly(c.dueDate) : "—",
      updatedAt: formatDateOnly(c.updatedAt),
      description: cap(c.description),
      subtasks: cap(subtasksText(c.subtasks)),
    }))
  );

  // ── Documentações ──
  addTable(
    workbook,
    "Documentações",
    [
      { header: "Título", key: "title" },
      { header: "Tipo", key: "type" },
      { header: "Resumo", key: "summary" },
      { header: "Conteúdo", key: "content" },
      { header: "Criada em", key: "createdAt" },
    ],
    data.docs.map((d) => ({
      title: d.title,
      type: DOC_TYPE_LABELS[d.type] ?? d.type,
      summary: cap(d.summary ?? ""),
      content: cap(d.content),
      createdAt: formatDateOnly(d.createdAt),
    }))
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
