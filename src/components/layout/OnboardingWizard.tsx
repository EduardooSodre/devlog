"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Briefcase, Building2, Check, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface Props {
  workspaceId: string;
}

const STEPS = ["cargo", "departamento"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard({ workspaceId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cargo");
  const [jobTitle, setJobTitle] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [creatingDept, setCreatingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/departments?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => {});
  }, [workspaceId]);

  const stepIndex = STEPS.indexOf(step);

  async function handleFinish() {
    setSubmitting(true);
    try {
      let departmentId = selectedDeptId ?? undefined;

      if (creatingDept && newDeptName.trim()) {
        const res = await fetch("/api/workspaces/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, name: newDeptName.trim() }),
        });
        if (!res.ok) throw new Error();
        departmentId = undefined; // criar já adiciona o criador como membro
      }

      const res = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle: jobTitle.trim() || undefined, departmentId }),
      });
      if (!res.ok) throw new Error();

      toast.success("Tudo pronto!");
      router.refresh();
    } catch {
      toast.error("Erro ao concluir. Tente de novo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 pt-6 pb-4 text-center border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Bem-vindo(a) ao DevLog!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Só mais alguns detalhes pra deixar tudo pronto.
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[220px]">
          {step === "cargo" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="w-4 h-4 text-primary" />
                Qual é o seu cargo?
              </div>
              <input
                autoFocus
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setStep("departamento")}
                placeholder="Ex.: Desenvolvedor, Gerente de TI, Analista…"
                className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Ajuda a organizar quem é quem no workspace. Pode deixar em branco e preencher depois.
              </p>
            </div>
          )}

          {step === "departamento" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                Faz parte de algum departamento?
              </div>

              {departments.length > 0 && !creatingDept && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {departments.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeptId(d.id === selectedDeptId ? null : d.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-colors text-left",
                        selectedDeptId === d.id
                          ? "border-primary/50 bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {d.name}
                      {selectedDeptId === d.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}

              {creatingDept ? (
                <input
                  autoFocus
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Nome do departamento…"
                  className="w-full h-11 bg-background border border-primary/40 rounded-xl px-4 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              ) : (
                <button
                  onClick={() => {
                    setCreatingDept(true);
                    setSelectedDeptId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-dashed border-border hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" /> Criar novo departamento
                </button>
              )}

              <p className="text-xs text-muted-foreground">
                Opcional — dá pra pular e organizar isso depois em Configurações.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50">
          {step === "departamento" ? (
            <button
              onClick={() => setStep("cargo")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar
            </button>
          ) : (
            <span />
          )}

          {step === "cargo" ? (
            <button
              onClick={() => setStep("departamento")}
              className="bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
