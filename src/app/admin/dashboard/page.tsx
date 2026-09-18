import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { Building2, Layers, DollarSign, Activity, Users, ShieldAlert } from "lucide-react";

export default async function PlatformDashboardPage() {
  const session = await getPlatformAdminSession();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner de Boas-Vindas */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Ambiente da Plataforma (SaaS Backoffice)
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">
            Painel Central do Educar360
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gestão consolidada de todas as instituições de ensino, infraestrutura multi-tenant e planos de assinatura.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-xs text-zinc-600">
          <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold text-zinc-800">{session?.profile.full_name}</div>
            <div className="text-[11px] text-zinc-500">Acesso Global Super Admin</div>
          </div>
        </div>
      </div>

      {/* Métricas Globais da Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total de Escolas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">1 (Fundação)</div>
          <span className="text-[11px] text-emerald-600 font-medium">Multi-tenant ativo</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">MRR Consolidado</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">R$ 0,00</div>
          <span className="text-[11px] text-zinc-400">Assinaturas ativas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Planos SaaS</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900">3 Planos</div>
          <span className="text-[11px] text-zinc-400">Básico, Pro e Enterprise</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Status do RLS</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">100% Ativo</div>
          <span className="text-[11px] text-zinc-400">Isolamento rigoroso</span>
        </div>
      </div>

      {/* Caixa Informativa sobre Segregação de Papéis */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-zinc-900">Regras de Segregação do Backoffice</h3>
        <ul className="text-xs text-zinc-600 space-y-2 list-disc pl-5">
          <li>
            <strong>Super Administrador</strong>: Usuário com flag <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">is_platform_admin = true</code>. Não é atrelado a nenhuma escola e não consome dados através do contexto de inquilino.
          </li>
          <li>
            <strong>Usuários de Escolas</strong>: Não possuem autorização nem acesso ao ambiente <code className="text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">admin.educar360.com.br</code> ou <code className="text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">/admin</code>.
          </li>
          <li>
            <strong>Operações Globais</strong>: Criação, bloqueio, faturamento de assinaturas e manutenção das instâncias das escolas ocorrem exclusivamente nesta interface.
          </li>
        </ul>
      </div>
    </div>
  );
}
