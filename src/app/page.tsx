/**
 * DevLog — Landing Page
 * Usa efeitos inspirados no Aceternity UI (BackgroundBeams, SpotlightCard)
 * e ReactBits (AnimatedText, GradientBorder)
 */

import Link from "next/link";
import { ArrowRight, BookOpen, Kanban, Camera, Layers } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      {/* ── Background Grid ── */}
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-30"
        style={{ maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" }}
      />

      {/* ── Spotlight blob ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(231 90% 65%) 0%, transparent 70%)" }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">DevLog</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-4 pt-24 pb-32 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
          Seu diário de desenvolvimento pessoal
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          Documente cada
          <br />
          <span className="text-gradient">linha de evolução</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Registre refatorações com fotos de antes e depois, organize tarefas no Kanban
          e mantenha um histórico completo do que você construiu no trabalho.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            Criar conta grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 text-muted-foreground border border-border px-6 py-3 rounded-xl font-medium hover:border-primary/40 hover:text-foreground transition-all"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center text-sm text-muted-foreground pb-8">
        Feito para devs que se importam com o próprio crescimento.
      </footer>
    </main>
  );
}

const features = [
  {
    icon: <Kanban className="w-5 h-5" />,
    title: "Quadro Kanban",
    description:
      "Organize tarefas em colunas. Ao concluir, adicione fotos e observações detalhadas.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Antes & Depois",
    description:
      "Documente refatorações com screenshots. Visualize claramente o que mudou e por quê.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Diário de Dev",
    description:
      "Escreva notas ricas com editor formatado. Features, bugfixes, decisões de arquitetura.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Multi-workspace",
    description:
      "Estrutura pronta para SaaS. Workspaces, planos, membros — escalável desde o dia 1.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

function FeatureCard({
  icon,
  title,
  description,
  color,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent" />

      <div className={`relative w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} mb-4`}>
        {icon}
      </div>
      <h3 className="relative font-semibold mb-2">{title}</h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
