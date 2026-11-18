/**
 * DevLog — Landing Page (server component, sem JS no cliente).
 * Usuário logado nem chega aqui: o middleware redireciona "/" → "/dashboard".
 */

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Kanban,
  Camera,
  FileText,
  Sparkles,
  Users,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      {/* ── Fundo ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-grid-pattern bg-grid-md opacity-25"
        style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 75%)" }}
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(231 90% 65%) 0%, transparent 65%)" }}
      />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <nav className="flex items-center justify-between px-4 sm:px-8 h-16 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">DevLog</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-4 pt-20 sm:pt-28 pb-16 max-w-4xl mx-auto animate-slide-up">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
          Kanban + diário de dev + relatórios
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
          Tudo o que você entregou,
          <br />
          <span className="text-gradient">documentado sem esforço</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Organize as tarefas no Kanban, registre o antes e depois de cada refatoração e
          gere em segundos o relatório do mês — em PDF ou Word, com um resumo pronto pro seu gestor.
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
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

        <ul className="mt-8 flex items-center justify-center gap-x-6 gap-y-2 flex-wrap text-xs sm:text-sm text-muted-foreground">
          {["Grátis para começar", "Entre com Google ou GitHub", "Times e departamentos"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Prévia do produto ── */}
      <section className="relative z-10 px-4 sm:px-8 pb-28 max-w-5xl mx-auto">
        <BoardPreview />
      </section>

      {/* ── Recursos ── */}
      <section id="recursos" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-28 scroll-mt-20">
        <SectionTitle
          eyebrow="Recursos"
          title="Do card ao relatório, no mesmo lugar"
          subtitle="Pare de juntar prints, commits e planilhas no fim do mês."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-28 scroll-mt-20">
        <SectionTitle eyebrow="Como funciona" title="Três passos, zero planilha" />
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative bg-card border border-border rounded-2xl p-6">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <h3 className="font-semibold mt-3 mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CTA final ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card px-6 py-14 sm:px-12 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(ellipse at top, hsl(231 90% 65% / 0.35), transparent 60%)" }}
          />
          <h2 className="relative text-2xl sm:text-4xl font-bold tracking-tight mb-4">
            Seu próximo relatório já pode sair pronto
          </h2>
          <p className="relative text-muted-foreground max-w-xl mx-auto mb-8">
            Crie sua conta, convide o time e comece a registrar hoje. Leva menos de um minuto.
          </p>
          <Link
            href="/register"
            className="relative group inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
          >
            Começar grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Rodapé ── */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span>DevLog © {new Date().getFullYear()}</span>
          </div>
          <span>Feito para devs que se importam com o próprio crescimento.</span>
        </div>
      </footer>
    </main>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <p className="text-xs font-mono uppercase tracking-widest text-primary mb-3">{eyebrow}</p>
      <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-3">{subtitle}</p>}
    </div>
  );
}

/** Kanban de mentira, só HTML/CSS — mostra o produto sem depender de screenshot. */
function BoardPreview() {
  const columns = [
    {
      name: "A fazer",
      dot: "bg-muted-foreground",
      cards: [
        { title: "Migrar auth para NextAuth v5", tag: "Backend", tagCls: "bg-amber-400/10 text-amber-400" },
        { title: "Tela de onboarding", tag: "Frontend", tagCls: "bg-cyan-400/10 text-cyan-400" },
      ],
    },
    {
      name: "Em andamento",
      dot: "bg-primary",
      cards: [{ title: "Relatório mensal em PDF", tag: "Relatórios", tagCls: "bg-primary/10 text-primary", progress: 60 }],
    },
    {
      name: "Concluído",
      dot: "bg-emerald-400",
      cards: [
        { title: "Refatorar query de dashboard", tag: "Antes & depois", tagCls: "bg-emerald-400/10 text-emerald-400", done: true },
        { title: "Fluxo de esqueci a senha", tag: "Auth", tagCls: "bg-emerald-400/10 text-emerald-400", done: true },
      ],
    },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-border to-transparent" />
      <div className="relative rounded-2xl bg-card/95 backdrop-blur shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-10 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs font-mono text-muted-foreground truncate">devlog / projetos / sprint-novembro</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
          {columns.map((col) => (
            <div key={col.name} className="rounded-xl bg-background/60 border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-3 text-xs font-medium text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                {col.name}
                <span className="ml-auto font-mono">{col.cards.length}</span>
              </div>
              <div className="space-y-2">
                {col.cards.map((c) => (
                  <div key={c.title} className="rounded-lg bg-card border border-border p-3 text-left">
                    <p className={`text-sm mb-2 ${"done" in c && c.done ? "text-muted-foreground line-through" : ""}`}>
                      {c.title}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.tagCls}`}>{c.tag}</span>
                    {"progress" in c && (
                      <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: <Kanban className="w-5 h-5" />,
    title: "Quadro Kanban",
    description: "Organize tarefas por projeto, arraste entre colunas e acompanhe prazos e responsáveis.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Antes & depois",
    description: "Anexe screenshots ao concluir uma tarefa e mostre claramente o que mudou e por quê.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Diário de dev",
    description: "Notas com editor formatado: features, bugfixes e decisões de arquitetura num histórico só.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Relatórios em PDF e Word",
    description: "Escolha o período e baixe um relatório compacto com tudo que foi entregue.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Resumo com IA",
    description: "Um parágrafo direto, em linguagem de gestor, sobre o que você fez no período.",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-400/10",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Times e departamentos",
    description: "Convide colegas por e-mail, separe por departamento e controle quem vê cada projeto.",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
];

const steps = [
  {
    title: "Crie seu workspace",
    description: "Entre com Google, GitHub ou e-mail. Colegas do mesmo domínio podem cair no mesmo workspace.",
  },
  {
    title: "Registre enquanto trabalha",
    description: "Mova os cards, anexe o antes e depois e escreva uma nota rápida ao concluir.",
  },
  {
    title: "Gere o relatório",
    description: "No fim do mês, escolha o período e baixe o PDF ou Word com o resumo pronto.",
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
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className={`relative w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} mb-4`}>
        {icon}
      </div>
      <h3 className="relative font-semibold mb-2">{title}</h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
