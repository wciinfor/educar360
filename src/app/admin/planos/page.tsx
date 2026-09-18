import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { redirect } from "next/navigation";
import { OFFICIAL_SAAS_PLANS } from "@/lib/plans/constants";
import {
  Layers,
  CheckCircle2,
  Users,
  Plus,
  Edit2,
  Sparkles,
  CreditCard,
  Building2,
  PhoneCall,
} from "lucide-react";

export default async function PlansAdminPage() {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              Planos SaaS da Plataforma
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-zinc-200 text-zinc-700 rounded-full">
              {OFFICIAL_SAAS_PLANS.length} modalidades oficiais
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Definição da grade comercial oficial de pacotes, limites de alunos, valores recorrentes e políticas de cobrança no ASAAS.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Plano</span>
        </button>
      </div>

      {/* Grid de Planos Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {OFFICIAL_SAAS_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border ${
              plan.highlight
                ? "border-emerald-500 shadow-md ring-1 ring-emerald-500 relative"
                : "border-zinc-200 shadow-xs"
            } p-5 flex flex-col justify-between space-y-5`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                Mais Escolhido
              </span>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider font-mono">
                    {plan.code}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                </div>
                {plan.badgeLabel && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600">
                    {plan.badgeLabel}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed min-h-[48px]">
                {plan.description}
              </p>

              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-900 font-mono">
                    {plan.priceFormatted}
                  </span>
                  {plan.price_cents > 0 ? (
                    <span className="text-xs text-zinc-400">/mês (ASAAS)</span>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic font-medium ml-1">
                      (Personalizado)
                    </span>
                  )}
                </div>
                {plan.price_cents === 0 && (
                  <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                    *Sem cobrança automática; proposta comercial direta
                  </span>
                )}
              </div>

              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  {plan.studentsFormatted}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Recursos
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100">
              <button
                type="button"
                className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Parâmetros
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
