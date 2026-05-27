"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X, CheckCircle2, Clock, Flag, Calendar, Paperclip,
  MessageSquare, Loader2, ChevronDown, Upload, Trash2,
} from "lucide-react";
import { cn, priorityConfig, formatDateTime } from "@/lib/utils";
import type { KanbanCardWithDetails } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Props {
  card: KanbanCardWithDetails;
  onClose: () => void;
  onUpdate: (updated: KanbanCardWithDetails) => void;
  onDelete: (cardId: string) => void;
}

const priorities = ["low", "medium", "high", "urgent"] as const;

export function CardModal({ card, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState(card.priority);
  const [completionNotes, setCompletionNotes] = useState(card.completionNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [tab, setTab] = useState<"details" | "attachments" | "completion">("details");
  const [attachments, setAttachments] = useState(card.attachments ?? []);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file);

      const res = await fetch("/api/kanban/cards/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          type: "screenshot",
          fileName: uploaded.originalFilename || file.name,
          fileUrl: uploaded.url,
          fileKey: uploaded.publicId,
          fileSize: uploaded.bytes,
          mimeType: file.type,
        }),
      });

      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setAttachments((prev) => [...prev, data]);
      toast.success("Imagem anexada!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  const isDone = card.status === "done";

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/kanban/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, title, description, priority }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      onUpdate({ ...card, ...data, attachments });
      toast.success("Card salvo!");
    } catch {
      toast.error("Erro ao salvar card");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch("/api/kanban/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          status: isDone ? "todo" : "done",
          completionNotes: isDone ? "" : completionNotes,
          completedAt: isDone ? null : new Date().toISOString(),
        }),
      });
      const { data } = await res.json();
      if (!res.ok) throw new Error();
      onUpdate({ ...card, ...data, attachments });
      toast.success(isDone ? "Card reaberto!" : "Card concluído! 🎉");
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setCompleting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      const res = await fetch(`/api/kanban/cards?id=${card.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onDelete(card.id);
      toast.success("Card excluído");
    } catch {
      toast.error("Erro ao excluir card");
    }
  }

  // handleFileUpload removido (substituído pelo Cloudinary widget)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border z-50 flex flex-col animate-slide-in-right overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex-1 mr-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-semibold bg-transparent focus:outline-none border-b border-transparent focus:border-primary transition-colors pb-0.5"
            />
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  isDone
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isDone ? "✓ Concluído" : "Em andamento"}
              </span>
              {card.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(card.completedAt)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-border flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {(["details", "attachments", "completion"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "text-sm py-3 px-1 mr-5 border-b-2 transition-colors",
                tab === t
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "details" && "Detalhes"}
              {t === "attachments" && "Anexos"}
              {t === "completion" && "Conclusão"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="space-y-5">
              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        priority === p
                          ? `${priorityConfig[p].bg} ${priorityConfig[p].color} ${priorityConfig[p].border}`
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[p].dot)} />
                      {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a tarefa…"
                  rows={6}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Due date (display only — add date picker if needed) */}
              {card.dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Prazo: {formatDateTime(card.dueDate)}
                </div>
              )}
            </div>
          )}

          {/* ── Attachments tab ── */}
          {tab === "attachments" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Anexe screenshots, fotos de antes/depois ou outros arquivos.
              </p>

              {/* Upload nativo */}
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                uploading
                  ? "border-primary/50 bg-primary/5 cursor-wait"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}>
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Enviando…</span>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Clique para anexar imagem</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WebP</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>

              {/* Lista de anexos */}
              {attachments.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Nenhum anexo ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl"
                    >
                      {/* Preview da imagem */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.type === "before" ? "📸 Antes" : att.type === "after" ? "📸 Depois" : "📎 Screenshot"}
                        </p>
                      </div>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex-shrink-0"
                      >
                        Ver
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Completion tab ── */}
          {tab === "completion" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Adicione observações sobre o que foi feito antes de marcar como concluído.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Notas de conclusão
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="O que foi feito? Alguma observação importante? Dificuldades encontradas?"
                  rows={8}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                />
              </div>

              {isDone && card.completedAt && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Concluído em {formatDateTime(card.completedAt)}
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={completing}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
                  isDone
                    ? "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    : "bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-lg shadow-emerald-500/20"
                )}
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isDone ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isDone ? "Reabrir tarefa" : "Marcar como concluído"}
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono">
              #{card.id.slice(0, 8)}
            </span>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Excluir card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
