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

export interface StudentRangeConfig {
  value: string;
  label: string;
  minStudents: number;
  maxStudents: number | null;
  defaultPlanCode: string;
}

export const OFFICIAL_STUDENT_RANGES: StudentRangeConfig[] = [
  {
    value: "Até 100 alunos",
    label: "Até 100 alunos (Start)",
    minStudents: 1,
    maxStudents: 100,
    defaultPlanCode: "start",
  },
  {
    value: "101 a 200 alunos",
    label: "101 a 200 alunos (Essencial)",
    minStudents: 101,
    maxStudents: 200,
    defaultPlanCode: "essencial",
  },
  {
    value: "201 a 500 alunos",
    label: "201 a 500 alunos (Profissional)",
    minStudents: 201,
    maxStudents: 500,
    defaultPlanCode: "profissional",
  },
  {
    value: "Mais de 500 alunos",
    label: "Mais de 500 alunos (Enterprise - a partir de 501)",
    minStudents: 501,
    maxStudents: null,
    defaultPlanCode: "enterprise",
  },
];

/**
 * Obtém o valor numérico mínimo de alunos a partir do texto/código da faixa informada.
 */
export function getRangeMinStudents(rangeValue?: string | null): number {
  if (!rangeValue) return 1;
  const normalized = rangeValue.toLowerCase();
  
  if (
    normalized.includes("501") ||
    normalized.includes("mais de 500") ||
    normalized.includes("acima de 500") ||
    normalized.includes("700") ||
    normalized.includes("enterprise")
  ) {
    if (normalized.includes("200 a 500") || normalized.includes("201 a 500")) return 201;
    return 501;
  }
  
  if (normalized.includes("201") || normalized.includes("200 a 500") || normalized.includes("300")) {
    return 201;
  }
  
  if (normalized.includes("101") || normalized.includes("100 a 200")) {
    return 101;
  }

  return 1;
}

/**
 * Verifica se um plano é compatível com a quantidade/faixa de alunos informada.
 * Regra: Não permite escolher um plano cujo limite máximo seja inferior ao mínimo da faixa.
 */
export function isPlanCompatibleWithRange(planCode: string, rangeValue?: string | null): boolean {
  if (!planCode || planCode === "indeciso") return true;
  const plan = getPlanByCode(planCode);
  if (!plan) return false;

  const minStudents = getRangeMinStudents(rangeValue);
  
  // Se o plano tem limite máximo (Start: 100, Essencial: 200, Profissional: 500)
  // e esse limite for inferior ao mínimo da faixa, é incompatível.
  if (plan.max_students !== null && plan.max_students < minStudents) {
    return false;
  }
  
  return true;
}

/**
 * Retorna todos os planos oficiais compatíveis com uma faixa de alunos.
 */
export function getCompatiblePlansForRange(rangeValue?: string | null): CommercialPlanConfig[] {
  return OFFICIAL_SAAS_PLANS.filter((plan) => isPlanCompatibleWithRange(plan.code, rangeValue));
}

/**
 * Retorna o plano mais adequado/recomendado para a faixa informada.
 */
export function getRecommendedPlanForRange(rangeValue?: string | null): string {
  const minStudents = getRangeMinStudents(rangeValue);
  const matchedRange = OFFICIAL_STUDENT_RANGES.find((r) => r.minStudents === minStudents);
  if (matchedRange) return matchedRange.defaultPlanCode;
  
  if (minStudents >= 501) return "enterprise";
  if (minStudents >= 201) return "profissional";
  if (minStudents >= 101) return "essencial";
  return "start";
}

