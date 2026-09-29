/**
 * Monta o .docx do relatório a partir do modelo compartilhado (report-model.ts).
 * Estrutura pensada pra leitura rápida: resumo no topo, depois uma tabela por projeto.
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } from "docx";
import type { ReportPayload } from "@/components/reports/ReportPreview";
import { buildReportModel } from "@/lib/report-model";

const BLUE = "4F6EF7";
const MUTED = "64748B";
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const HAIR = { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" };

const heading = (text: string) =>
  new Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } },
    children: [new TextRun({ text, bold: true, size: 26, color: BLUE })],
  });

export async function buildReportDocx(report: ReportPayload): Promise<Buffer> {
  const model = buildReportModel(report);
  const body: (Paragraph | Table)[] = [];

  body.push(new Paragraph({ children: [new TextRun({ text: model.title, bold: true, size: 40 })] }));
  body.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: model.subtitle, size: 22, color: MUTED })] }));
  body.push(
    new Paragraph({
      spacing: { after: 120 },
      children: model.stats.flatMap((s, i) => [
        new TextRun({ text: `${i ? "     " : ""}${s.value} `, bold: true, size: 30, color: BLUE }),
        new TextRun({ text: s.label, size: 20, color: MUTED }),
      ]),
    })
  );

  if (model.summary.length) {
    body.push(heading("Resumo"));
    for (const b of model.summary) {
      if (b.kind === "heading") body.push(new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: b.text, bold: true, size: 22 })] }));
      else if (b.kind === "bullet") body.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: b.text, size: 21 })] }));
      else body.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: b.text, size: 22 })] }));
    }
  }

  for (const section of model.sections) {
    body.push(heading(section.title));
    for (const g of section.groups) {
      body.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 60 }, children: [new TextRun({ text: `${g.name}  (${g.rows.length})`, bold: true, size: 23 })] }));
      body.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: NONE, bottom: HAIR, left: NONE, right: NONE, insideHorizontal: HAIR, insideVertical: NONE },
          rows: g.rows.map(
            (r) =>
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, borders: { top: NONE, bottom: HAIR, left: NONE, right: NONE }, children: [new Paragraph({ children: [new TextRun({ text: r.title, size: 20 })] })] }),
                  new TableCell({
                    width: { size: 14, type: WidthType.PERCENTAGE },
                    borders: { top: NONE, bottom: HAIR, left: NONE, right: NONE },
                    children: [new Paragraph({ children: r.priority ? [new TextRun({ text: r.priority, bold: true, size: 18, color: r.urgent ? "DC2626" : BLUE })] : [] })],
                  }),
                  new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: { top: NONE, bottom: HAIR, left: NONE, right: NONE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: r.info, size: 18, color: MUTED })] })] }),
                ],
              })
          ),
        })
      );
    }
  }

  const doc = new Document({
    creator: "DevLog",
    title: model.title,
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: body }],
  });
  return Packer.toBuffer(doc);
}
