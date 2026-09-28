"use client";

import { useState } from "react";
import { X, Download, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PRIORITY_LABELS, DIFFICULTY_LABELS, DOC_TYPE_LABELS, formatDateOnly } from "@/lib/report-labels";

export type ReportCard = {
  id: string;
  title: string;
  boardName: string;
  priority: string;
  difficulty: string;
  status: string;
  completionNotes: string | null;
  completedAt: string | null;
  dueDate: string | null;
  updatedAt: string;
};

export type ReportDoc = {
  id: string;
  title: string;
  type: string;
  summary: string | null;
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
  const [downloading, setDownloading] = useState(false);
  const { data, meta, aiSummary } = report;

  async function handleDownloadExcel() {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/export/xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, meta, aiSummary }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${data.period.start}_a_${data.period.end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao gerar Excel");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in no-print" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div id="report-print-area" className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0">
            <span className="text-sm font-medium text-slate-600">Pré-visualização do relatório</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Excel
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Baixar PDF
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document */}
          <div className="p-8 space-y-6">
            <header className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-bold text-slate-900">Resumo de Trabalho</h1>
              <p className="text-sm text-slate-500 mt-1">
                {meta.userName ?? "Colaborador"} · {meta.workspaceName} · {formatDateOnly(data.period.start)} a {formatDateOnly(data.period.end)}
              </p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Concluídas" value={data.stats.completed} color="text-emerald-600" bg="bg-emerald-50" />
              <StatCard label="Em andamento" value={data.stats.inProgress} color="text-blue-600" bg="bg-blue-50" />
              <StatCard label="Documentações" value={data.stats.docs} color="text-violet-600" bg="bg-violet-50" />
            </div>

            {aiSummary && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Resumo gerado por IA
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
              </div>
            )}

            <Section title={`Tarefas concluídas (${data.completedCards.length})`}>
              {data.completedCards.length === 0 ? (
                <EmptyRow />
              ) : (
                data.completedCards.map((c) => (
                  <li key={c.id} className="py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">{c.title}</span>
                      <span className="text-xs text-slate-400 shrink-0">{c.completedAt ? formatDateOnly(c.completedAt) : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>{c.boardName}</span>
                      <span>·</span>
                      <span>{PRIORITY_LABELS[c.priority] ?? c.priority}</span>
                      <span>·</span>
                      <span>{DIFFICULTY_LABELS[c.difficulty] ?? c.difficulty}</span>
                    </div>
                    {c.completionNotes && <p className="text-xs text-slate-500 mt-1 italic">{c.completionNotes}</p>}
                  </li>
                ))
              )}
            </Section>

            <Section title={`Em andamento (${data.inProgressCards.length})`}>
              {data.inProgressCards.length === 0 ? (
                <EmptyRow />
              ) : (
                data.inProgressCards.map((c) => (
                  <li key={c.id} className="py-2 border-b border-slate-100 last:border-0 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">{c.title}</span>
                    <span className="text-xs text-slate-400 shrink-0">{c.boardName}</span>
                  </li>
                ))
              )}
            </Section>

            <Section title={`Documentações (${data.docs.length})`}>
              {data.docs.length === 0 ? (
                <EmptyRow />
              ) : (
                data.docs.map((d) => (
                  <li key={d.id} className="py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">{d.title}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatDateOnly(d.createdAt)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{DOC_TYPE_LABELS[d.type] ?? d.type}</div>
                    {d.summary && <p className="text-xs text-slate-500 mt-1">{d.summary}</p>}
                  </li>
                ))
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl p-3 ${bg}`}>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-1">{title}</h2>
      <ul>{children}</ul>
    </div>
  );
}

function EmptyRow() {
  return <li className="py-3 text-sm text-slate-400 text-center">Nenhum registro no período.</li>;
}
