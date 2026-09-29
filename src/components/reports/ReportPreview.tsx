"use client";

import { useState } from "react";
import { X, Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { downloadReportPdf } from "@/lib/reports-pdf";
import { buildReportModel } from "@/lib/report-model";

export type ReportCard = {
  id: string;
  title: string;
  boardName: string;
  priority: string;
  difficulty: string;
  status: string;
  description: string;
  completionNotes: string | null;
  startDate: string | null;
  completedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: { title: string; isDone: boolean }[];
};

export type ReportDoc = {
  id: string;
  title: string;
  type: string;
  summary: string | null;
  content: string;
  createdAt: string;
};

export type ReportPayload = {
  data: {
    period: { start: string; end: string };
    stats: { completed: number; inProgress: number; docs: number };
    completedCards: ReportCard[];
    inProgressCards: ReportCard[];
    docs: ReportDoc[];
  };
  meta: { userName: string | null; workspaceName: string };
  aiSummary: string | null;
};

export function ReportPreview({ report, onClose }: { report: ReportPayload; onClose: () => void }) {
  const [busy, setBusy] = useState<"word" | "pdf" | null>(null);
  const model = buildReportModel(report);
  const { data } = report;

  async function handleWord() {
    setBusy("word");
    try {
      const res = await fetch("/api/reports/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${data.period.start}_a_${data.period.end}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao gerar Word");
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    setBusy("pdf");
    try {
      await downloadReportPdf(report);
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Barra de ações */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0">
            <span className="text-sm font-medium text-slate-600">Pré-visualização do relatório</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleWord}
                disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Word
              </button>
              <button
                onClick={handlePdf}
                disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Baixar PDF
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Documento */}
          <div className="p-8 space-y-6">
            <header>
              <h1 className="text-2xl font-bold text-slate-900">{model.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{model.subtitle}</p>
              <div className="flex gap-3 mt-4">
                {model.stats.map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-100 px-4 py-2">
                    <div className="text-xl font-bold text-blue-600 tabular-nums">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </header>

            {model.summary.length > 0 && (
              <Section title="Resumo" icon={<Sparkles className="w-4 h-4" />}>
                <div className="space-y-1.5">
                  {model.summary.map((b, i) =>
                    b.kind === "heading" ? (
                      <h3 key={i} className="text-sm font-semibold text-slate-800 pt-2">{b.text}</h3>
                    ) : b.kind === "bullet" ? (
                      <p key={i} className="text-sm text-slate-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-blue-600">{b.text}</p>
                    ) : (
                      <p key={i} className="text-sm text-slate-700">{b.text}</p>
                    )
                  )}
                </div>
              </Section>
            )}

            {model.sections.map((section) => (
              <Section key={section.title} title={section.title}>
                {section.groups.map((g) => (
                  <div key={g.name} className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">
                      {g.name} <span className="text-slate-400 font-normal">({g.rows.length})</span>
                    </h3>
                    <ul>
                      {g.rows.map((r, i) => (
                        <li key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                          <span className="flex-1 text-sm text-slate-700">{r.title}</span>
                          {r.priority && <span className={`text-xs font-semibold ${r.urgent ? "text-red-600" : "text-blue-600"}`}>{r.priority}</span>}
                          <span className="text-xs text-slate-400 shrink-0 w-28 text-right">{r.info}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>
            ))}

            {model.sections.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhum registro no período.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-base font-bold text-blue-600 border-b-2 border-blue-600/70 pb-1 mb-3">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}
