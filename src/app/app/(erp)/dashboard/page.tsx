import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { ROLE_DEFINITIONS } from "@/lib/rbac/permissions";
import {
  School,
  Users,
  ShieldCheck,
  Building2,
  Database,
  Lock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getTenantSession();

  if (!session) {
    return null;
  }

  const roleConfig = ROLE_DEFINITIONS[session.role];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner de Boas-Vindas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Fundação Multi-Tenant Ativa
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Olá, {session.profile.full_name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Você está operando no ambiente isolado da instituição{" "}
            <strong className="text-slate-700">{session.tenant.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <div className="font-semibold text-slate-800">{roleConfig?.label}</div>
            <div className="text-[11px] text-slate-500">Papel RBAC atribuído</div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas & Isolamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Instituição (Tenant)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Slug: <code className="text-indigo-600 font-mono">{session.tenant.slug}</code>
            </p>
            <p className="text-xs text-slate-500">
              ID: <code className="text-slate-600 font-mono text-[10px]">{session.tenant.id}</code>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Isolamento Rigoroso</h3>
            <p className="text-xs text-slate-500 mt-1">
              Todas as queries vinculadas à chave estrangeira <code className="text-emerald-700 font-mono">tenant_id</code> e protegidas por PostgreSQL Row-Level Security.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Arquitetura Modular</h3>
            <p className="text-xs text-slate-500 mt-1">
              Secretaria, Acadêmico, Matrículas, Financeiro, Comunicação e Portais preparados com namespaces isolados.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Resumo de Vínculos do Usuário */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Instituições Vinculadas à Sua Conta
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {session.allUserTenants.length} instituição(ões)
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {session.allUserTenants.map((item) => (
            <div
              key={item.tenant.id}
              className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <School className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {item.tenant.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    CNPJ: {item.tenant.cnpj || "Não cadastrado"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {item.role}
                </span>
                {item.tenant.id === session.tenant.id && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Ativo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
