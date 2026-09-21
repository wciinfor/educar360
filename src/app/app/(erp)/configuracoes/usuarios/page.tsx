import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getTenantUsersAction } from "@/app/actions/configuracoes";
import { UsersManagementClient } from "@/components/configuracoes/UsersManagementClient";
import {
  ShieldCheck,
  DollarSign,
  FileText,
  TrendingUp,
  Headphones,
} from "lucide-react";

const SYSTEM_ROLES = [
  {
    role: "admin_escola",
    title: "Administrador / Diretoria",
    desc: "Acesso integral aos módulos, configurações, relatórios e permissões institucionais.",
    icon: ShieldCheck,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  {
    role: "financeiro",
    title: "Financeiro / Tesouraria",
    desc: "Cobranças, emissão de boletos, conciliação de mensalidades, inadimplência e gateway.",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    role: "secretaria",
    title: "Secretaria Escolar",
    desc: "Matrículas, prontuários de alunos, transferências, turmas e documentações oficiais.",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    role: "comercial",
    title: "Comercial / Captação",
    desc: "Prospecção de novos alunos, acompanhamento de interessados, campanhas e visitas escolares.",
    icon: TrendingUp,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    role: "recepcao",
    title: "Recepção / Atendimento",
    desc: "Triagem na portaria/secretaria, atendimento inicial a responsáveis e visitantes.",
    icon: Headphones,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
];

export default async function ConfiguracoesUsuariosPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  const usersResult = await getTenantUsersAction();
  const initialUsers = usersResult.success && usersResult.data ? usersResult.data : [];

  return (
    <div className="space-y-8">
      {/* Componente Interativo de Gestão de Usuários */}
      <UsersManagementClient
        initialUsers={initialUsers}
        currentUserId={session.user.id}
        currentUserRole={session.role}
      />

      {/* Grade com os 5 Perfis Suportados para Referência do Administrador */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Guia de Perfis & Alçadas da Instituição
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYSTEM_ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.role}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${r.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{r.title}</h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      código: {r.role}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

