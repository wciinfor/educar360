import { SaasPlan } from "@/types/platform";

export interface CommercialPlanConfig extends SaasPlan {
  highlight?: boolean;
  priceFormatted: string;
  badgeLabel?: string;
  studentsFormatted: string;
}

/**
 * Fonte de Verdade Unificada dos Planos Oficiais do Educar360
 * - Start: até 100 alunos — R$ 199/mês
 * - Essencial: até 200 alunos — R$ 299/mês
 * - Profissional: até 500 alunos — R$ 499/mês
 * - Enterprise: acima de 500 alunos — Sob Consulta (sem cobrança automática)
 */
export const OFFICIAL_SAAS_PLANS: CommercialPlanConfig[] = [
  {
    id: "plan-start",
    name: "Start",
    code: "start",
    description: "Ideal para pequenas escolas, creches e instituições em fase inicial com até 100 alunos.",
    price_cents: 19900,
    priceFormatted: "R$ 199",
    billing_cycle: "monthly",
    max_students: 100,
    studentsFormatted: "Até 100 alunos",
    is_active: true,
    badgeLabel: "Início Rápido",
    features: [
      "Até 100 alunos ativos",
      "Secretaria Escolar Digital",
      "Módulo Acadêmico & Diário",
      "Controle de Matrículas",
      "Portal do Aluno Responsivo",
      "Isolamento Estrito RLS",
      "Suporte via Chamados / Email",
    ],
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  },
  {
    id: "plan-essencial",
    name: "Essencial",
    code: "essencial",
    description: "Para escolas em crescimento com até 200 alunos que necessitam de mais robustez.",
    price_cents: 29900,
    priceFormatted: "R$ 299",
    billing_cycle: "monthly",
    max_students: 200,
    studentsFormatted: "Até 200 alunos",
    is_active: true,
    badgeLabel: "Econômico",
    features: [
      "Até 200 alunos ativos",
      "Todos os recursos do Start",
      "Matrículas & Contratos",
      "Controle de Frequência & Notas",
      "Portal do Aluno e Responsável",
      "Isolamento Rigoroso de Dados",
      "Suporte por Email e Chamados",
    ],
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  },
  {
    id: "plan-profissional",
    name: "Profissional",
    code: "profissional",
    description: "Para instituições consolidadas de até 500 alunos que exigem gestão financeira e comunicação integrada.",
    price_cents: 49900,
    priceFormatted: "R$ 499",
    billing_cycle: "monthly",
    max_students: 500,
    studentsFormatted: "Até 500 alunos",
    is_active: true,
    highlight: true,
    badgeLabel: "Mais Escolhido",
    features: [
      "Até 500 alunos ativos",
      "Todos os recursos do Essencial",
      "Módulo Financeiro & Boletos",
      "Comunicação Integrada com Pais",
      "Portais do Aluno, Pai e Professor",
      "Suporte Prioritário por WhatsApp",
    ],
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    code: "enterprise",
    description: "Para redes de ensino e instituições acima de 500 alunos com contratação sob consulta.",
    price_cents: 0, // Sob consulta
    priceFormatted: "Sob Consulta",
    billing_cycle: "monthly",
    max_students: null, // Acima de 500 alunos / ilimitado
    studentsFormatted: "Acima de 500 alunos",
    is_active: true,
    badgeLabel: "Redes & Grandes",
    features: [
      "Acima de 500 alunos",
      "Alunos e Usuários Ilimitados",
      "Múltiplas Unidades (Multi-Tenant)",
      "Trilha de Auditoria Avançada",
      "APIs & Webhooks de Integração",
      "Contratação e Faturamento sob Medida",
      "Gerente de Contas Dedicado",
    ],
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  },
];

export function getPlanByCode(code: string): CommercialPlanConfig | undefined {
  return OFFICIAL_SAAS_PLANS.find((p) => p.code === code);
}
