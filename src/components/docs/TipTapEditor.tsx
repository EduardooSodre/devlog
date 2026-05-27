"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Heading2, Code, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function TipTapEditor({ content, onChange, placeholder, className }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Escreva aqui…" }),
      Image,
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className={cn("tiptap-editor border border-border rounded-xl overflow-hidden bg-card", className)}>
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-border bg-background/50">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="w-4 h-4" />, "Negrito")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="w-4 h-4" />, "Itálico")}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="w-4 h-4" />, "Título")}
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="w-4 h-4" />, "Lista")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="w-4 h-4" />, "Lista numerada")}
        {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), <Code className="w-4 h-4" />, "Código")}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="w-4 h-4" />, "Citação")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
