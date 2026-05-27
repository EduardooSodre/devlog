import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, Camera, Download } from "lucide-react";
import { cn, formatDateTime, docTypeConfig } from "@/lib/utils";
import { DeleteDocButton } from "@/components/docs/DeleteDocButton";

export default async function DocDetailPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const session = await auth();
  const doc = await db.query.docEntries.findFirst({
    where: eq(docEntries.id, docId),
    with: {
      attachments: { orderBy: (a, { asc }) => [asc(a.order)] },
      author: { columns: { id: true, name: true, image: true } },
      workspace: true,
    },
  });

  if (!doc || doc.authorId !== session!.user.id) notFound();

  const cfg = docTypeConfig[doc.type as keyof typeof docTypeConfig];
  const beforeImages = doc.attachments.filter((a) => a.type === "before");
  const afterImages = doc.attachments.filter((a) => a.type === "after");
  const screenshots = doc.attachments.filter((a) => a.type === "screenshot");

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/docs"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Documentações
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.bg, cfg.color, cfg.border)}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateTime(doc.updatedAt)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">{doc.title}</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link
              href={`/docs/${doc.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
            >
              <Edit className="w-3.5 h-3.5" /> Editar
            </Link>
            {doc.workspace.plan !== "free" && (
              <>
                <a
                  href={`/api/docs/${doc.id}/export?format=markdown`}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> MD
                </a>
                <a
                  href={`/api/docs/${doc.id}/export?format=html`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              </>
            )}
            <DeleteDocButton docId={doc.id} />
          </div>
        </div>
        {doc.summary && (
          <p className="text-muted-foreground mt-2">{doc.summary}</p>
        )}
      </div>

      {/* Before / After section */}
      {(beforeImages.length > 0 || afterImages.length > 0) && (
        <div className="mb-8 p-5 bg-card border border-border rounded-2xl">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-primary" /> Antes &amp; Depois
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Antes
              </p>
              {beforeImages.length === 0 ? (
                <div className="h-24 border border-dashed border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                  Nenhuma imagem
                </div>
              ) : (
                <div className="space-y-2">
                  {beforeImages.map((img) => (
                    <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.fileUrl}
                        alt={img.caption ?? img.fileName}
                        className="w-full rounded-xl border border-border hover:opacity-90 transition-opacity"
                      />
                      {img.caption && (
                        <p className="text-xs text-muted-foreground mt-1">{img.caption}</p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Depois
              </p>
              {afterImages.length === 0 ? (
                <div className="h-24 border border-dashed border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                  Nenhuma imagem
                </div>
              ) : (
                <div className="space-y-2">
                  {afterImages.map((img) => (
                    <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.fileUrl}
                        alt={img.caption ?? img.fileName}
                        className="w-full rounded-xl border border-border hover:opacity-90 transition-opacity"
                      />
                      {img.caption && (
                        <p className="text-xs text-muted-foreground mt-1">{img.caption}</p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {doc.content && (
        <div className="prose prose-invert prose-sm max-w-none mb-8">
          <div
            className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </div>
      )}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Screenshots</h2>
          <div className="grid grid-cols-2 gap-3">
            {screenshots.map((img) => (
              <a key={img.id} href={img.fileUrl} target="_blank" rel="noreferrer" className="group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.fileUrl}
                  alt={img.fileName}
                  className="w-full rounded-xl border border-border group-hover:border-primary/40 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-4">
        <span>Criado em {formatDateTime(doc.createdAt)}</span>
        <span className="font-mono">#{doc.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}
