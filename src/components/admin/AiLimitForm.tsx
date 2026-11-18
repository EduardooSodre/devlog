"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";

export function AiLimitForm({ initialLimit }: { initialLimit: number }) {
  const [value, setValue] = useState(String(initialLimit));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    const limit = parseInt(value, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      toast.error("Informe um número maior que zero");
      return;
    }
    setSaving(true);
    try {
      await api("/api/admin/settings", { method: "PUT", json: { aiReportDailyLimit: limit } });
      toast.success("Limite atualizado");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 block">Limite diário de relatórios com IA (por usuário)</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
