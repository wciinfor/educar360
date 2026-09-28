"use client";

import React from "react";
import Link from "next/link";
import { useTenant } from "@/contexts/TenantContext";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";

/**
 * Badge discreto e profissional para inclusão no cabeçalho (Header)
 */
export function TrialHeaderBadge() {
  const { trialInfo } = useTenant();

  if (!trialInfo || !trialInfo.isTrial) {
    return null;
  }

  const {
    daysRemaining,
    formattedEndDate,
    urgencyLevel,
    registration,
    isExpired,
  } = trialInfo;

  if (isExpired) {
    return (
      <Link
        href="/app/trial-expirado"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors shadow-xs animate-pulse"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>Trial Expirado</span>
        <ArrowRight className="w-3 h-3 text-rose-500" />
      </Link>
    );
  }

  // Estilização progressiva
  let badgeStyles = "bg-indigo-50/80 border-indigo-200/80 text-indigo-900";
  let icon = <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  let labelText = `Teste gratuito — ${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`;

  if (urgencyLevel === "warning_1_day") {
    badgeStyles = "bg-rose-50 border-rose-200 text-rose-800 animate-pulse";
    icon = <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
    labelText = "Último dia de teste gratuito!";
  } else if (urgencyLevel === "warning_3_days") {
    badgeStyles = "bg-amber-50 border-amber-200 text-amber-900";
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    labelText = `Teste gratuito — ${daysRemaining} dias restantes`;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Contagem regressiva principal */}
      <div
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs",
          badgeStyles
        )}
        title={`Período de avaliação válido até ${formattedEndDate}`}
      >
        {icon}
        <span className="font-semibold">{labelText}</span>
        <span className="hidden md:inline text-[11px] opacity-75 border-l border-current/20 pl-2">
          até {formattedEndDate}
        </span>
      </div>

      {/* Indicador discreto de status do cadastro institucional */}
      <Link
        href="/app/configuracoes/geral"
        className={clsx(
          "hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors",
          registration.isComplete
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        )}
        title={
          registration.isComplete
            ? "Dados cadastrais da instituição completos"
            : `Cadastro pendente: ${registration.missingFields.join(", ")}`
        }
      >
        {registration.isComplete ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span className="font-medium">Cadastro completo</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span className="font-medium">Cadastro pendente ({registration.completedCount}/6)</span>
          </>
        )}
      </Link>
    </div>
  );
}

/**
 * Banner contextual no topo da aplicação quando há urgência ou cadastro pendente
 */
export function TrialLayoutBanner() {
  const { trialInfo } = useTenant();

  if (!trialInfo || !trialInfo.isTrial) {
    return null;
  }

  const {
    daysRemaining,
    formattedEndDate,
    urgencyLevel,
    registration,
    isExpired,
  } = trialInfo;

  // Não renderiza banner estendido se for normal e cadastro estiver completo
  if (urgencyLevel === "normal" && registration.isComplete) {
    return null;
  }

  if (isExpired) {
    return (
      <div className="bg-rose-600 text-white px-6 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-rose-700">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-200" />
          <span>
            <strong>Período de teste gratuito expirado.</strong> Para continuar gerenciando sua escola no Educar360, regularize seu cadastro e escolha um plano.
          </span>
        </div>
        <Link
          href="/app/trial-expirado"
          className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 font-semibold rounded-md transition-colors text-xs inline-flex items-center gap-1"
        >
          Regularizar Acesso
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (urgencyLevel === "warning_1_day") {
    return (
      <div className="bg-gradient-to-r from-rose-500 to-amber-600 text-white px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-white animate-pulse" />
          <span>
            <strong>Aviso de Último Dia:</strong> O teste gratuito da sua instituição encerra hoje ({formattedEndDate}). Escolha um plano para manter o acesso de todos os colaboradores sem interrupções.
          </span>
        </div>
        <Link
          href="/app/configuracoes/geral"
          className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 font-semibold rounded-md transition-colors text-xs inline-flex items-center gap-1"
        >
          Contratar Plano
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (urgencyLevel === "warning_3_days") {
    return (
      <div className="bg-amber-500 text-amber-950 px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-amber-600/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-900" />
          <span>
            <strong>Aviso de Expiração:</strong> Restam <strong>{daysRemaining} dias</strong> de teste gratuito ({formattedEndDate}). Conheça os planos e garanta a continuidade das operações da escola.
          </span>
        </div>
        <Link
          href="/app/configuracoes/geral"
          className="px-3 py-1 bg-amber-900 hover:bg-amber-950 text-white font-semibold rounded-md transition-colors text-xs inline-flex items-center gap-1"
        >
          Ver Planos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (!registration.isComplete) {
    return (
      <div className="bg-indigo-900 text-indigo-100 px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-indigo-300" />
          <span>
            <strong>Cadastro Institucional Pendente:</strong> Preencha os dados oficiais da sua escola (CNPJ, Razão Social e Responsável) para habilitar a emissão de documentos e contratação de planos ({registration.completedCount}/6 preenchidos).
          </span>
        </div>
        <Link
          href="/app/configuracoes/geral"
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors text-xs inline-flex items-center gap-1"
        >
          Completar Cadastro
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return null;
}
