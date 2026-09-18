import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert, Layers } from "lucide-react";

export default async function Page() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // RBAC Guard
  if (!canAccessModule(session.role, "secretaria")) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo</h2>
        <p className="text-sm text-slate-600">
          O seu perfil (<strong>{session.role}</strong>) não possui permissão para acessar o módulo <strong>Módulo Secretaria</strong> nesta instituição escolar.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Módulo Secretaria</h1>
            <p className="text-sm text-slate-500">Gestão cadastral de alunos, documentação escolar, turmas e certidões.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">Módulo Registrado na Arquitetura Modular</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Fundação, permissão RBAC e contexto de tenant (<code className="text-indigo-600">{session.tenant.name}</code>) devidamente configurados. O desenvolvimento de contratos de negócio deste módulo ocorrerá na próxima fase.
          </p>
        </div>
      </div>
    </div>
  );
}
