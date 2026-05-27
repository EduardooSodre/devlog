import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { docEntries, tags, entryTags } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, FileText, Camera, Wrench, Bug, Zap, MessageSquare, StickyNote, Tag } from "lucide-react";
import { cn, formatRelative, docTypeConfig } from "@/lib/utils";
import { getActiveWorkspaceId } from "@/lib/workspace";

export const metadata = { title: "Documentação" };

const typeIcons: Record<string, React.ReactNode> = {
  refactoring: <Wrench className="w-4 h-4" />,
  feature: <Zap className="w-4 h-4" />,
  bugfix: <Bug className="w-4 h-4" />,
  adjustment: <StickyNote className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  meeting: <MessageSquare className="w-4 h-4" />,
};

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tag?: string }>;
}) {
  const { type, tag: tagId } = await searchParams;
  const session = await auth();
  const workspaceId = await getActiveWorkspaceId(session!.user.id);

  let docs = workspaceId
    ? await db.query.docEntries.findMany({
        where: eq(docEntries.workspaceId, workspaceId),
        with: { attachments: true, tags: { with: { tag: true } } },
        orderBy: [desc(docEntries.updatedAt)],
      })
    : [];

  if (tagId && workspaceId) {
    const tagged = await db
      .select({ docId: entryTags.docId })
      .from(entryTags)
      .where(eq(entryTags.tagId, tagId));
    const ids = new Set(tagged.map((t) => t.docId));
    docs = docs.filter((d) => ids.has(d.id));
  }

  const workspaceTags = workspaceId
    ? await db.query.tags.findMany({
        where: eq(tags.workspaceId, workspaceId),
        orderBy: (t, { asc }) => [asc(t.name)],
      })
    : [];

  const activeType = type ?? "all";
  const filtered = activeType === "all" ? docs : docs.filter((d) => d.type === activeType);

  const types = [
    { key: "all", label: "Tudo" },
    { key: "refactoring", label: "Refatorações" },
    { key: "feature", label: "Features" },
    { key: "bugfix", label: "Bugfixes" },
    { key: "adjustment", label: "Ajustes" },
    { key: "note", label: "Notas" },
    { key: "meeting", label: "Reuniões" },
  ];

  function buildHref(overrides: { type?: string; tag?: string }) {
    const params = new URLSearchParams();
    const t = overrides.type ?? (activeType !== "all" ? activeType : undefined);
    const tg = overrides.tag ?? (tagId && overrides.tag !== "" ? tagId : undefined);
    if (t && t !== "all") params.set("type", t);
    if (tg) params.set("tag", tg);
    const q = params.toString();
    return q ? `/docs?${q}` : "/docs";
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documentação</h1>
          <p className="text-muted-foreground text-sm mt-1">{docs.length} entradas no total</p>
        </div>
        <Link
          href="/docs/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova entrada
        </Link>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto pb-0">
        {types.map((t) => (
          <Link
            key={t.key}
            href={buildHref({ type: t.key === "all" ? "" : t.key })}
            className={cn(
              "text-sm px-3 py-2 border-b-2 transition-colors whitespace-nowrap",
              activeType === t.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {workspaceTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Link
            href={buildHref({ tag: "" })}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !tagId ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Todas as tags
          </Link>
          {workspaceTags.map((tg) => (
            <Link
              key={tg.id}
              href={buildHref({ tag: tg.id })}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                tagId === tg.id ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"
              )}
              style={tagId === tg.id ? undefined : { borderColor: `${tg.color}40` }}
            >
              {tg.name}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma documentação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const cfg = docTypeConfig[doc.type];
            const hasImages = (doc.attachments?.length ?? 0) > 0;
            return (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", cfg.bg)}>
                    <span className={cfg.color}>{typeIcons[doc.type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{doc.title}</h3>
                      {hasImages && <Camera className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    </div>
                    {doc.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{doc.summary}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
                      {doc.tags?.map((et) =>
                        et.tag ? (
                          <span key={et.tag.id} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                            {et.tag.name}
                          </span>
                        ) : null
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{formatRelative(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
