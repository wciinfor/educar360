import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { redirect } from "next/navigation";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  Building2,
  History,
} from "lucide-react";

// Mock das assinaturas com valores e planos da grade oficial
const SUBSCRIPTIONS_DATA = [
  {
    id: "sub-101",
    tenant_id: "t-001-colegio-horizonte",
    tenant_name: "Colégio Horizonte Saber",
    tenant_slug: "horizonte-saber",
    plan_name: "Profissional",
    plan_code: "profissional",
    status: "active",
    amount_cents: 49900, // R$ 499/mês oficial
    trial_starts_at: "2026-08-01T00:00:00Z",
    trial_ends_at: "2026-08-15T00:00:00Z",
    current_period_start: "2026-09-10T00:00:00Z",
    current_period_end: "2026-10-10T00:00:00Z",
    next_due_date: "2026-10-10",
    payment_status: "up_to_date",
    asaas_customer_id: "cus_000005423891",
    asaas_subscription_id: "sub_000009847123",
    created_at: "2026-08-01T10:00:00Z",
    history: [
      {
        id: "h-1",
        event_type: "RENEWED",
        date: "2026-09-10",
        description: "Assinatura renovada no ASAAS (Plano Profissional - R$ 499,00)",
        user: "Sistema ASAAS (Webhook)",
      },
      {
        id: "h-2",
        event_type: "PLAN_CHANGED",
        date: "2026-08-15",
        description: "Conversão de Trial para Plano Profissional (Até 500 alunos)",
        user: "Admin Operador",
      },
    ],
  },
  {
    id: "sub-102",
    tenant_id: "t-002-instituto-inovare",
    tenant_name: "Instituto Educacional Inovare",
    tenant_slug: "instituto-inovare",
    plan_name: "Start",
    plan_code: "start",
    status: "trial",
    amount_cents: 19900, // R$ 199/mês oficial
    trial_starts_at: "2026-09-14T00:00:00Z",
    trial_ends_at: "2026-09-28T00:00:00Z",
    current_period_start: "2026-09-14T00:00:00Z",
    current_period_end: "2026-09-28T00:00:00Z",
    next_due_date: "2026-09-28",
    payment_status: "pending",
    asaas_customer_id: "cus_000007891234",
    asaas_subscription_id: null,
    created_at: "2026-09-14T08:30:00Z",
    history: [
      {
        id: "h-4",
        event_type: "TRIAL_STARTED",
        date: "2026-09-14",
        description: "Início do período gratuito de 14 dias (Plano Start - Até 100 alunos)",
        user: "Auto Onboarding",
      },
    ],
  },
  {
    id: "sub-103",
    tenant_id: "t-003-escola-alvorada",
    tenant_name: "Escola e Colégio Alvorada",
    tenant_slug: "colegio-alvorada",
    plan_name: "Essencial",
    plan_code: "essencial",
    status: "suspended",
    amount_cents: 29900, // R$ 299/mês oficial
    trial_starts_at: "2026-05-10T00:00:00Z",
    trial_ends_at: "2026-05-24T00:00:00Z",
    current_period_start: "2026-08-05T00:00:00Z",
    current_period_end: "2026-09-05T00:00:00Z",
    next_due_date: "2026-09-05",
    payment_status: "overdue",
    asaas_customer_id: "cus_000003216549",
    asaas_subscription_id: "sub_000006549871",
    created_at: "2026-05-10T14:20:00Z",
    history: [
      {
        id: "h-5",
        event_type: "SUSPENDED",
        date: "2026-09-12",
        description: "Acesso suspenso automaticamente após 7 dias de fatura ASAAS vencida",
        user: "Monitor ASAAS",
      },
    ],
  },
  {
    id: "sub-104",
    tenant_id: "t-004-complexo-vanguard",
    tenant_name: "Complexo Educacional Vanguard",
    tenant_slug: "vanguard-educacao",
    plan_name: "Enterprise",
    plan_code: "enterprise",
    status: "active",
    amount_cents: 0, // Sob consulta
    trial_starts_at: null,
    trial_ends_at: null,
    current_period_start: "2026-09-01T00:00:00Z",
    current_period_end: "2026-10-01T00:00:00Z",
    next_due_date: "2026-10-01",
    payment_status: "up_to_date",
    asaas_customer_id: "cus_000001122334",
    asaas_subscription_id: "sub_manual_contract",
    created_at: "2026-03-01T09:00:00Z",
    history: [
      {
        id: "h-7",
        event_type: "CONTRACT_SIGNED",
        date: "2026-03-01",
        description: "Contrato Enterprise firmado sob medida para 890 alunos (sem cobrança automática de gateway)",
        user: "Diretoria Comercial",
      },
    ],
  },
];

export default async function SubscriptionsAdminPage() {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
          </span>
        );
      case "trial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Trial
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Suspensa
          </span>
        );
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              Assinaturas & Faturamento SaaS
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-zinc-200 text-zinc-700 rounded-full">
              {SUBSCRIPTIONS_DATA.length} contratos
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Controle financeiro da plataforma sob a grade comercial oficial (Start, Essencial, Profissional e Enterprise).
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 shadow-xs">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Gateway Oficial: <strong className="text-zinc-900">ASAAS</strong></span>
        </div>
      </div>

      {/* Lista detalhada das assinaturas */}
      <div className="space-y-4">
        {SUBSCRIPTIONS_DATA.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-200 bg-zinc-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900 text-base">{sub.tenant_name}</h3>
                    {getStatusBadge(sub.status)}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    Tenant: {sub.tenant_slug}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Mensalidade</span>
                <span className="text-lg font-extrabold text-zinc-900 font-mono">
                  {sub.amount_cents > 0
                    ? (sub.amount_cents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "Sob Consulta"}
                  {sub.amount_cents > 0 && <span className="text-xs font-normal text-zinc-400">/mês</span>}
                </span>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-zinc-100 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-400 font-medium">Plano Contratado</span>
                <div className="font-semibold text-zinc-800 text-sm">{sub.plan_name}</div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-medium">Período de Trial</span>
                <div className="font-medium text-zinc-700">
                  {sub.status === "trial" && sub.trial_ends_at
                    ? `Até ${new Date(sub.trial_ends_at).toLocaleDateString("pt-BR")}`
                    : "Não aplicável / Concluído"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-medium">Próximo Vencimento</span>
                <div className="font-semibold text-zinc-800 text-sm">
                  {sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-medium">Gateway ASAAS</span>
                <div className="font-mono text-zinc-700 text-[11px] truncate">
                  Customer: <strong>{sub.asaas_customer_id || "Manual"}</strong>
                </div>
              </div>
            </div>

            {/* Histórico */}
            <div className="p-4 bg-zinc-50/40">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Histórico de Alterações
                </span>
              </div>

              <div className="space-y-1.5">
                {sub.history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white rounded-lg border border-zinc-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-zinc-800 font-medium">{item.description}</span>
                    <span className="text-zinc-400 text-[11px] shrink-0">
                      {item.user} &bull; {new Date(item.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
