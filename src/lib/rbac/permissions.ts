import { UserRole } from "@/types/database";

export type SchoolModule =
  | "dashboard"
  | "secretaria"
  | "academico"
  | "matriculas"
  | "financeiro"
  | "comunicacao"
  | "portais"
  | "configuracoes";

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  allowedModules: SchoolModule[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleConfig> = {
  admin_escola: {
    role: "admin_escola",
    label: "Diretoria / Gestão",
    description: "Acesso administrativo completo à instituição escolar.",
    allowedModules: [
      "dashboard",
      "secretaria",
      "academico",
      "matriculas",
      "financeiro",
      "comunicacao",
      "portais",
      "configuracoes",
    ],
  },
  coordenacao: {
    role: "coordenacao",
    label: "Coordenação Pedagógica",
    description: "Gestão pedagógica, corpo docente, turmas e acompanhamento acadêmico.",
    allowedModules: [
      "dashboard",
      "secretaria",
      "academico",
      "matriculas",
      "comunicacao",
      "portais",
    ],
  },
  secretaria: {
    role: "secretaria",
    label: "Secretaria Escolar",
    description: "Emissão de documentos, registros de alunos e matrículas.",
    allowedModules: [
      "dashboard",
      "secretaria",
      "academico",
      "matriculas",
      "comunicacao",
    ],
  },
  financeiro: {
    role: "financeiro",
    label: "Setor Financeiro",
    description: "Controle de mensalidades, faturamento, conciliação e inadimplência.",
    allowedModules: [
      "dashboard",
      "matriculas",
      "financeiro",
      "comunicacao",
    ],
  },
  comercial: {
    role: "comercial",
    label: "Equipe Comercial",
    description: "Prospecção, conversão de novos alunos, captação e matrículas.",
    allowedModules: [
      "dashboard",
      "matriculas",
      "comunicacao",
    ],
  },
  recepcao: {
    role: "recepcao",
    label: "Recepção / Atendimento",
    description: "Atendimento inicial aos pais, visitantes e triagem na secretaria escolar.",
    allowedModules: [
      "dashboard",
      "secretaria",
      "comunicacao",
    ],
  },
  professor: {
    role: "professor",
    label: "Corpo Docente",
    description: "Diário de classe, notas, frequências e plano de aula.",
    allowedModules: [
      "dashboard",
      "academico",
      "comunicacao",
      "portais",
    ],
  },
  responsavel: {
    role: "responsavel",
    label: "Responsável Legal",
    description: "Acompanhamento do dependente, boletim, avisos e 2ª via de boletos.",
    allowedModules: [
      "dashboard",
      "comunicacao",
      "portais",
    ],
  },
  aluno: {
    role: "aluno",
    label: "Aluno",
    description: "Acesso a tarefas, horários, material didático e notas.",
    allowedModules: [
      "dashboard",
      "comunicacao",
      "portais",
    ],
  },
};

export function canAccessModule(role: UserRole | null | undefined, mod: SchoolModule): boolean {
  if (!role) return false;
  const config = ROLE_DEFINITIONS[role];
  if (!config) return false;
  return config.allowedModules.includes(mod);
}
