"use client";

import React, { useState } from "react";
import { Lead } from "@/types/lead";
import { OFFICIAL_SAAS_PLANS, getPlanByCode } from "@/lib/plans/constants";
import { convertLeadToTenantAction } from "@/app/actions/admin-convert-lead";
import {
  Building2,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
  School,
  Globe,
} from "lucide-react";

interface ConvertLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export function ConvertLeadModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: ConvertLeadModalProps) {
  const [selectedPlanCode, setSelectedPlanCode] = useState(
    lead.plan_interest && lead.plan_interest !== "indeciso"
      ? lead.plan_interest
      : "profissional"
  );
  const [customSlug, setCustomSlug] = useState(
    lead.school_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = getPlanByCode(selectedPlanCode) || OFFICIAL_SAAS_PLANS[2];

  const today = new Date();
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const handleConvert = async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await convertLeadToTenantAction({
      leadId: lead.id,
      planCode: selectedPlanCode,
      customSlug: customSlug,
    });

    if (res.success) {
      onSuccess(res);
    } else {
      setErrorMsg(res.error || "Não foi possível converter o lead.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 flex items-start justify-between gap-4 bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                Converter Lead em Escola (Tenant)
              </h3>
              <p className="text-xs text-zinc-500">
                Ativação de ambiente escolar em Trial de 14 dias
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-700">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resumo da Instituição */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Dados da Instituição Escolar
            </span>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Escola:</span>
              <strong className="text-zinc-900 text-sm">{lead.school_name}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Contato / Responsável:</span>
              <span className="text-zinc-800">{lead.contact_name} ({lead.role_in_school || "Gestor"})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">E-mail:</span>
              <span className="text-zinc-800">{lead.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Porte Declarado:</span>
              <span className="text-zinc-800">{lead.students_range || "Não informado"}</span>
            </div>
          </div>

          {/* Identificador Único do Tenant (Slug) - NÃO SUBDOMÍNIO */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-800">
              Identificador Único da Escola (Slug):
            </label>
            <div className="flex items-center rounded-xl border border-zinc-300 bg-white overflow-hidden px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))}
                placeholder="colegio-horizonte"
                className="w-full text-xs font-mono text-zinc-900 outline-none"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Identificador interno amigável do tenant. O acesso de todos os usuários ocorre unificadamente pelo endereço <strong className="text-zinc-700">app.educar360.com.br</strong>.
            </p>
          </div>

          {/* Seleção do Plano Comercial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-800">
              Plano SaaS Vinculado:
            </label>
            <select
              value={selectedPlanCode}
              onChange={(e) => setSelectedPlanCode(e.target.value)}
              className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {OFFICIAL_SAAS_PLANS.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} — {plan.priceFormatted}{plan.price_cents > 0 ? "/mês" : ""} ({plan.studentsFormatted})
                </option>
              ))}
            </select>
          </div>

          {/* Resumo do Período de Trial */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Período de Avaliação (Trial Gratuito de 14 Dias)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-emerald-900">
              <div>
                <span className="text-emerald-700 block">Início do Trial:</span>
                <strong>Hoje ({today.toLocaleDateString("pt-BR")})</strong>
              </div>
              <div>
                <span className="text-emerald-700 block">Encerramento do Trial:</span>
                <strong>{endDate.toLocaleDateString("pt-BR")}</strong>
              </div>
            </div>
            <p className="text-[10px] text-emerald-700/90 pt-1">
              * A escola terá acesso com status <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">trial</code>. Nenhuma cobrança será realizada neste momento.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConvert}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando conversão...</span>
              </>
            ) : (
              <>
                <span>Confirmar Conversão & Ativar Trial</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
