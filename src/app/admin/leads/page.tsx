import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { redirect } from "next/navigation";
import { getLeadsAction } from "@/app/actions/admin-leads";
import { LeadsClient } from "./LeadsClient";
import { Lead } from "@/types/lead";

// Mock representativo para inicialização em ambiente de testes enquanto o banco remoto não tiver submissões reais
const MOCK_INITIAL_LEADS: Lead[] = [
  {
    id: "lead-001",
    school_name: "Colégio Futuro Brilhante",
    contact_name: "Renata Vasconcelos",
    email: "renata.diretoria@futurobrilhante.com.br",
    phone: "(11) 97123-4567",
    role_in_school: "Diretor(a) / Mantenedor(a)",
    students_range: "100 a 300 alunos",
    plan_interest: "profissional",
    message: "Gostaríamos de modernizar nosso sistema de boletins e automatizar a cobrança de mensalidades para o próximo semestre.",
    status: "new",
    internal_notes: "Aguardando primeiro contato telefônico agendado para o período da tarde.",
    assigned_to: null,
    created_at: "2026-09-18T08:30:00Z",
  },
  {
    id: "lead-002",
    school_name: "Escola Infantil Pequenos Passos",
    contact_name: "Marcos Paulo Silva",
    email: "marcos@pequenospassos.com.br",
    phone: "(21) 98877-6655",
    role_in_school: "Gestor(a) Financeiro",
    students_range: "Até 100 alunos",
    plan_interest: "essencial",
    message: "Precisamos de uma solução simples para emitir contratos e controlar a lista de presença.",
    status: "contacted",
    internal_notes: "Ligação realizada em 18/09. Demonstração agendada para sexta-feira às 10h.",
    assigned_to: null,
    created_at: "2026-09-17T15:45:00Z",
  },
  {
    id: "lead-003",
    school_name: "Centro Educacional Integração",
    contact_name: "Dra. Beatriz Mendes",
    email: "beatriz.mendes@ceintegracao.edu.br",
    phone: "(31) 99122-3344",
    role_in_school: "Diretor(a) / Mantenedor(a)",
    students_range: "300 a 700 alunos",
    plan_interest: "profissional",
    message: "Queremos integrar os portais dos professores com o financeiro escolar.",
    status: "qualified",
    internal_notes: "Escola possui 480 alunos. Apresentação técnica do ERP realizada com ótima receptividade.",
    assigned_to: null,
    created_at: "2026-09-16T11:20:00Z",
  },
  {
    id: "lead-004",
    school_name: "Rede de Ensino Evolução",
    contact_name: "Prof. Fernando Albuquerque",
    email: "fernando@redevoucao.com.br",
    phone: "(41) 98455-1234",
    role_in_school: "Diretor(a) / Mantenedor(a)",
    students_range: "Mais de 700 alunos",
    plan_interest: "enterprise",
    message: "Temos 3 unidades escolares e buscamos centralizar a auditoria de matrículas.",
    status: "converted",
    internal_notes: "Contrato assinado em Setembro/2026. Provisionado como Tenant no Backoffice.",
    assigned_to: null,
    created_at: "2026-09-10T09:15:00Z",
  },
  {
    id: "lead-005",
    school_name: "Cursos Livres Teste",
    contact_name: "Lucas Teste",
    email: "teste@gmail.com",
    phone: "(11) 90000-0000",
    role_in_school: "Outro",
    students_range: "Até 100 alunos",
    plan_interest: "essencial",
    message: "Apenas conhecendo o site.",
    status: "discarded",
    internal_notes: "Não é instituição escolar de educação básica. Descartado da prospecção.",
    assigned_to: null,
    created_at: "2026-09-08T14:10:00Z",
  },
];

export default async function LeadsAdminPage() {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Tenta carregar do Supabase com fallback seguro para os dados mockados
  const res = await getLeadsAction();
  const leads = res.success && res.data.length > 0 ? res.data : MOCK_INITIAL_LEADS;

  return <LeadsClient initialLeads={leads} />;
}
