"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileBarChart2, Sparkles, Loader2, Trash2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayInBrasilia, addDaysToDateStr } from "@/lib/date-brasilia";
import { PERIOD_OPTIONS, rangeFor, type PeriodKind } from "@/lib/report-period";
import { ReportPreview, type ReportPayload } from "@/components/reports/ReportPreview";
import { formatDateOnly } from "@/lib/report-labels";

export type SavedReportItem = { id: string; periodStart: string; periodEnd: string; aiUsed: boolean; createdAt: string };

export function ReportGenerator({ workspaceId, saved }: { workspaceId: string; saved: SavedReportItem[] }) {
  const router = useRouter();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const today = todayInBrasilia();
  const [period, setPeriod] = useState<PeriodKind>("week");
  const [customStart, setCustomStart] = useState(addDaysToDateStr(today, -6));
  const [customEnd, setCustomEnd] = useState(today);
  const [useAI, setUseAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; remaining: number; limit: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportPayload | null>(null);

  useEffect(() => {
    fetch("/api/reports/ai-status")
      .then((res) => res.json())
      .then((json) => setAiStatus(json))
      .catch(() => setAiStatus({ configured: false, remaining: 0, limit: 0 }));
  }, []);

  async function handleGenerate() {
    const { start, end } = rangeFor(period, today, customStart, customEnd);
    if (start > end) {
      toast.error("Data inicial não pode ser depois da data final");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, start, end, useAI: useAI && !!aiStatus?.configured }),
      });
      if (!res.ok) throw new Error();
      const json: ReportPayload & { aiUsed: boolean; aiRemainingToday: number; savedId: string | null } = await res.json();
      setReport(json);
      if (useAI && !json.aiUsed) {
        toast.info("Relatório gerado sem IA — limite diário já utilizado");
      }
      setAiStatus((prev) => (prev ? { ...prev, remaining: json.aiRemainingToday } : prev));
      router.refresh(); // atualiza a lista de relatórios salvos
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  }

  const aiAvailable = !!aiStatus?.configured && aiStatus.remaining > 0;

  async function openSaved(id: string) {
    setOpeningId(id);
    try {
      const res = await fetch(`/api/reports/saved/${id}`);
      if (!res.ok) throw new Error();
      setReport(await res.json());
    } catch {
      toast.error("Erro ao abrir o relatório");
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteSaved(id: string) {
    if (!confirm("Apagar este relatório salvo?")) return;
    const res = await fetch(`/api/reports/saved/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Erro ao apagar");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <FileBarChart2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Exporte um resumo do seu trabalho para o gestor</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Período */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Período</label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  period === opt.id
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          )}
        </div>

        {/* IA */}
        {aiStatus && (
          <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", useAI ? "border-primary/40 bg-primary/5" : "border-border")}>
            <input
              type="checkbox"
              checked={useAI}
              disabled={!aiAvailable}
              onChange={(e) => setUseAI(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Gerar resumo com IA
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!aiStatus.configured
                  ? "IA indisponível: falta configurar a chave da OpenAI (OPENAI_API_KEY) no servidor. Você ainda pode exportar o relatório normalmente."
                  : aiAvailable
                    ? `Você ainda tem ${aiStatus.remaining} de ${aiStatus.limit} resumo(s) com IA hoje. O relatório fica salvo abaixo.`
                    : "IA já usada hoje — você ainda pode exportar o relatório normalmente."}
              </p>
            </div>
          </label>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart2 className="w-4 h-4" />}
          Gerar relatório
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-3">Relatórios gerados ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda. Os próximos ficam salvos aqui.</p>
        ) : (
          <ul className="bg-card border border-border rounded-xl divide-y divide-border">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {formatDateOnly(r.periodStart)}{r.periodStart === r.periodEnd ? "" : ` a ${formatDateOnly(r.periodEnd)}`}
                    {r.aiUsed && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                        <Sparkles className="w-3 h-3" /> IA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    gerado em {new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <button
                  onClick={() => openSaved(r.id)}
                  disabled={openingId === r.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-background disabled:opacity-50"
                >
                  {openingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />} Abrir
                </button>
                <button onClick={() => deleteSaved(r.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-background" title="Apagar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {report && <ReportPreview report={report} onClose={() => setReport(null)} />}
    </div>
  );
}
