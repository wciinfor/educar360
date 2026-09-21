import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert, Settings } from "lucide-react";
import { ConfigSubnav } from "@/components/configuracoes/ConfigSubnav";

export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // RBAC Guard para o módulo Configurações
  if (!canAccessModule(session.role, "configuracoes")) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo</h2>
        <p className="text-sm text-slate-600">
          O seu perfil (<strong>{session.role}</strong>) não possui permissão para acessar o módulo <strong>Configurações da Instituição</strong> nesta instituição escolar.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Institucional de Configurações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Configurações da Instituição
            </h1>
            <p className="text-xs text-slate-500">
              Gestão de parâmetros institucionais, gateways, equipe e identidade estudantil de{" "}
              <strong className="text-slate-700">{session.tenant.name}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Navegação Secundária (Geral, Usuários, Carteirinha) */}
      <ConfigSubnav />

      {/* Conteúdo da Aba Ativa */}
      <div>{children}</div>
    </div>
  );
}
