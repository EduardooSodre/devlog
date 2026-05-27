"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Upload, X, Loader2, Camera,
  Wrench, Zap, Bug, StickyNote, FileText, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { TipTapEditor } from "@/components/docs/TipTapEditor";

const docTypes = [
  { key: "refactoring", label: "Refatoração", desc: "Antes & depois de código", icon: <Wrench className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  { key: "feature", label: "Feature", desc: "Nova funcionalidade", icon: <Zap className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  { key: "bugfix", label: "Bugfix", desc: "Correção de bug", icon: <Bug className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  { key: "adjustment", label: "Ajuste", desc: "Pequena mudança", icon: <StickyNote className="w-4 h-4" />, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  { key: "note", label: "Nota", desc: "Anotação livre", icon: <FileText className="w-4 h-4" />, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  { key: "meeting", label: "Reunião", desc: "Decisão / alinhamento", icon: <MessageSquare className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
];

type ImagePreview = {
  url: string;
  previewUrl: string;
  type: "before" | "after" | "screenshot";
  fileName: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  uploading?: boolean;
};

export function NewDocForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>, imgType: "before" | "after" | "screenshot") {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const tempEntry: ImagePreview = { url: "", previewUrl, type: imgType, fileName: file.name, uploading: true };
      setImages((prev) => [...prev, tempEntry]);

      try {
        const uploaded = await uploadToCloudinary(file);
        setImages((prev) =>
          prev.map((img) =>
            img.previewUrl === previewUrl
              ? { ...img, url: uploaded.url, fileKey: uploaded.publicId, fileSize: uploaded.bytes, mimeType: file.type, uploading: false }
              : img
          )
        );
      } catch (err: unknown) {
        toast.error(`Erro ao enviar ${file.name}`);
        setImages((prev) => prev.filter((img) => img.previewUrl !== previewUrl));
        URL.revokeObjectURL(previewUrl);
      }
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const entry = prev[idx];
      if (entry.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), summary, content, type, workspaceId }),
      });

      const { data, error } = await res.json();
      if (!res.ok) throw new Error(typeof error === "string" ? error : "Erro ao salvar");

      const docId = data.id;

      for (const img of images) {
        if (!img.url) continue;
        await fetch("/api/docs/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId,
            type: img.type,
            fileName: img.fileName,
            fileUrl: img.url,
            fileKey: img.fileKey,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
          }),
        });
      }

      toast.success("Documentação criada!");
      router.push(`/docs/${docId}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar documentação");
    } finally {
      setSaving(false);
    }
  }

  const beforeImages = images.filter((i) => i.type === "before");
  const afterImages = images.filter((i) => i.type === "after");
  const screenshots = images.filter((i) => i.type === "screenshot");

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para documentações
      </Link>

      <h1 className="text-2xl font-bold mb-6">Nova entrada</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-3 block">Tipo</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {docTypes.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                  type === t.key ? `${t.bg} ${t.border} ${t.color}` : "border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                <span className={type === t.key ? t.color : ""}>{t.icon}</span>
                <div>
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-xs opacity-70">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Título *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 bg-card border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Resumo</label>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={200}
            className="w-full h-11 bg-card border border-border rounded-xl px-4 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Conteúdo</label>
          <TipTapEditor content={content} onChange={setContent} />
        </div>

        {(type === "refactoring" || type === "bugfix" || type === "adjustment") && (
          <div>
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Fotos Antes & Depois
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(["before", "after"] as const).map((side) => (
                <div key={side} className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{side === "before" ? "Antes" : "Depois"}</span>
                  <div className="min-h-24 border-2 border-dashed border-border rounded-xl p-2">
                    <label className="flex flex-col items-center justify-center h-16 cursor-pointer text-muted-foreground hover:text-foreground">
                      <Upload className="w-4 h-4 mb-1" />
                      <span className="text-xs">Adicionar</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageAdd(e, side)} />
                    </label>
                    {(side === "before" ? beforeImages : afterImages).map((img, idx) => (
                      <ImagePreviewCard key={idx} img={img} onRemove={() => removeImage(images.indexOf(img))} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Screenshots (opcional)</label>
          <div className="flex flex-wrap gap-2">
            {screenshots.map((img, idx) => (
              <ImagePreviewCard key={idx} img={img} small onRemove={() => removeImage(images.indexOf(img))} />
            ))}
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl cursor-pointer text-xs text-muted-foreground">
              <Upload className="w-3.5 h-3.5" /> Adicionar
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageAdd(e, "screenshot")} />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Link href="/docs" className="px-4 py-2.5 text-sm text-muted-foreground">Cancelar</Link>
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar entrada
          </button>
        </div>
      </form>
    </div>
  );
}

function ImagePreviewCard({ img, onRemove, small }: { img: ImagePreview; onRemove: () => void; small?: boolean }) {
  return (
    <div className={cn("relative group", small ? "w-16 h-16" : "w-full mt-2")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.previewUrl || img.url} alt="" className={cn("rounded-lg object-cover border", small ? "w-16 h-16" : "w-full max-h-32", img.uploading && "opacity-50")} />
      {img.uploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}
      {!img.uploading && (
        <button type="button" onClick={onRemove} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
