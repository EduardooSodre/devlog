/**
 * Monta o .xlsx do relatório de trabalho. Cuidado principal: nunca cortar texto —
 * nem na horizontal (coluna larga o bastante pro maior conteúdo) nem na vertical
 * (wrapText ligado + sem fixar altura de linha, pra o Excel auto-ajustar ao abrir).
 */

import ExcelJS from "exceljs";
import type { ReportData } from "@/lib/reports";
import { PRIORITY_LABELS, DIFFICULTY_LABELS, DOC_TYPE_LABELS, formatDateOnly } from "@/lib/report-labels";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F6EF7" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true };
const MIN_COL_WIDTH = 12;
const MAX_COL_WIDTH = 60;

function widthFor(values: string[], header: string): number {
  const longest = values.reduce((max, v) => Math.max(max, v.length), header.length);
  return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, longest + 2));
}

function addTable(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: { header: string; key: string; values: string[] }[],
  rows: Record<string, string>[]
) {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: widthFor(c.values, c.header) }));

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
      { header: "Tarefa", key: "title", values: data.completedCards.map((c) => c.title) },
      { header: "Board", key: "board", values: data.completedCards.map((c) => c.boardName) },
      { header: "Prioridade", key: "priority", values: data.completedCards.map((c) => PRIORITY_LABELS[c.priority] ?? c.priority) },
      { header: "Dificuldade", key: "difficulty", values: data.completedCards.map((c) => DIFFICULTY_LABELS[c.difficulty] ?? c.difficulty) },
      { header: "Concluída em", key: "completedAt", values: data.completedCards.map((c) => (c.completedAt ? formatDateOnly(c.completedAt) : "—")) },
      { header: "Observações", key: "notes", values: data.completedCards.map((c) => c.completionNotes ?? "") },
    ],
    data.completedCards.map((c) => ({
      title: c.title,
      board: c.boardName,
      priority: PRIORITY_LABELS[c.priority] ?? c.priority,
      difficulty: DIFFICULTY_LABELS[c.difficulty] ?? c.difficulty,
      completedAt: c.completedAt ? formatDateOnly(c.completedAt) : "—",
      notes: c.completionNotes ?? "",
    }))
  );

  // ── Em andamento ──
  addTable(
    workbook,
    "Em Andamento",
    [
      { header: "Tarefa", key: "title", values: data.inProgressCards.map((c) => c.title) },
      { header: "Board", key: "board", values: data.inProgressCards.map((c) => c.boardName) },
      { header: "Prioridade", key: "priority", values: data.inProgressCards.map((c) => PRIORITY_LABELS[c.priority] ?? c.priority) },
      { header: "Prazo", key: "dueDate", values: data.inProgressCards.map((c) => (c.dueDate ? formatDateOnly(c.dueDate) : "—")) },
      { header: "Última atualização", key: "updatedAt", values: data.inProgressCards.map((c) => formatDateOnly(c.updatedAt)) },
    ],
    data.inProgressCards.map((c) => ({
      title: c.title,
      board: c.boardName,
      priority: PRIORITY_LABELS[c.priority] ?? c.priority,
      dueDate: c.dueDate ? formatDateOnly(c.dueDate) : "—",
      updatedAt: formatDateOnly(c.updatedAt),
    }))
  );

  // ── Documentações ──
  addTable(
    workbook,
    "Documentações",
    [
      { header: "Título", key: "title", values: data.docs.map((d) => d.title) },
      { header: "Tipo", key: "type", values: data.docs.map((d) => DOC_TYPE_LABELS[d.type] ?? d.type) },
      { header: "Resumo", key: "summary", values: data.docs.map((d) => d.summary ?? "") },
      { header: "Criada em", key: "createdAt", values: data.docs.map((d) => formatDateOnly(d.createdAt)) },
    ],
    data.docs.map((d) => ({
      title: d.title,
      type: DOC_TYPE_LABELS[d.type] ?? d.type,
      summary: d.summary ?? "",
      createdAt: formatDateOnly(d.createdAt),
    }))
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
