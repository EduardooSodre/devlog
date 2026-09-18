/**
 * Sugestão automática de departamento a partir do cargo digitado no onboarding.
 * É um "melhor palpite" por palavra-chave, não uma verdade absoluta — por isso o
 * fluxo nunca entra a pessoa direto no departamento sugerido, só pré-seleciona e
 * deixa ela pedir entrada (ou trocar). ponytail: lista fixa de palavras-chave;
 * se a empresa precisar de sugestões configuráveis por workspace, isso vira uma
 * tabela no banco — hoje não há sinal de que precise.
 */
const DEPARTMENT_KEYWORDS: { department: string; keywords: string[] }[] = [
  {
    department: "T.I.",
    keywords: [
      "desenvolvedor", "desenvolvedora", "programador", "programadora", "engenheiro de software",
      "engenheira de software", "dev", "ti", "t.i.", "infraestrutura", "suporte técnico",
      "analista de sistemas", "devops", "sysadmin", "banco de dados", "dba", "segurança da informação",
      "qa", "tester", "front-end", "frontend", "back-end", "backend", "full stack", "fullstack",
    ],
  },
  {
    department: "Orçamentos",
    keywords: ["orçamento", "orçamentos", "analista de orçamento", "analista orçamentário", "controller", "planejamento financeiro"],
  },
  {
    department: "Suprimentos",
    keywords: ["contrato", "contratos", "suprimentos", "compras", "licitação", "licitações", "procurement", "fornecedores"],
  },
  {
    department: "Financeiro",
    keywords: ["financeiro", "contas a pagar", "contas a receber", "tesouraria", "contador", "contadora", "contabilidade", "fiscal"],
  },
  {
    department: "Recursos Humanos",
    keywords: ["rh", "recursos humanos", "recrutamento", "departamento pessoal", "folha de pagamento", "people", "gente e gestão"],
  },
  {
    department: "Jurídico",
    keywords: ["jurídico", "advogado", "advogada", "legal", "compliance"],
  },
  {
    department: "Marketing",
    keywords: ["marketing", "comunicação", "social media", "growth", "branding", "publicidade"],
  },
  {
    department: "Comercial",
    keywords: ["vendas", "comercial", "account manager", "customer success", "sdr", "sales"],
  },
  {
    department: "Operações",
    keywords: ["operações", "logística", "operacional", "produção", "manutenção"],
  },
];

/** Retorna o nome do departamento sugerido para um cargo, ou null se nada bateu. */
export function suggestDepartmentName(jobTitle: string): string | null {
  const normalized = jobTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos pra casar "orçamento" com "orcamento" etc.

  for (const { department, keywords } of DEPARTMENT_KEYWORDS) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (normalized.includes(normalizedKeyword)) return department;
    }
  }
  return null;
}
