"use client";

import React, { useState } from "react";
import { Tenant, Profile, UserRole } from "@/types/database";
import { TenantTrialInfo } from "@/lib/tenant/trial";
import { TenantInstitutionData } from "@/types/configuracoes";
import { completeInstitutionRegistrationAction, requestPlanUpgradeAction } from "@/app/actions/configuracoes";
import { OFFICIAL_SAAS_PLANS, getPlanByCode } from "@/lib/plans/constants";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  School,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  CreditCard,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  LogOut,
  ChevronDown,
  Check,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import clsx from "clsx";

interface TrialExpiradoClientProps {
  tenant: Tenant;
  profile: Profile;
  trialInfo: TenantTrialInfo;
  initialInstitution: TenantInstitutionData;
  userRole: UserRole;
  userTenants: Array<{ tenant: Tenant; role: UserRole }>;
}

export function TrialExpiradoClient({
  tenant,
  profile,
  trialInfo,
  initialInstitution,
  userRole,
  userTenants,
}: TrialExpiradoClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentTrialInfo, setCurrentTrialInfo] = useState<TenantTrialInfo>(trialInfo);
  const [currentStep, setCurrentStep] = useState<"cadastro" | "planos">(
    trialInfo.registration.isComplete ? "planos" : "cadastro"
  );

  // Formulário Cadastral Obrigatório
  const [formData, setFormData] = useState({
    cnpj: initialInstitution.cnpj || "",
    name: initialInstitution.name || tenant.name || "",
    trade_name: initialInstitution.trade_name || tenant.trade_name || tenant.name || "",
    email: initialInstitution.email || tenant.email || profile.email || "",
    phone: initialInstitution.phone || tenant.phone || profile.phone || "",
    responsible_name:
      initialInstitution.responsible_name ||
      tenant.settings?.responsible_name ||
      tenant.settings?.contact_name ||
      profile.full_name ||
      "",
  });

  const [savingRegistration, setSavingRegistration] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Seleção e Contratação de Plano
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("profissional");
  const [contracting, setContracting] = useState(false);
  const [contractFeedback, setContractFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dropdown de tenants & menu
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);

  function maskCnpj(val: string) {
    const raw = val.replace(/\D/g, "").slice(0, 14);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return raw.replace(/^(\d{2})(\d+)/, "$1.$2");
    if (raw.length <= 8) return raw.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
    if (raw.length <= 12) return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
  }

  function maskPhone(val: string) {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return raw.replace(/^(\d{2})(\d+)/, "($1) $2");
    if (raw.length <= 10) return raw.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
    return raw.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/app/login");
    router.refresh();
  };

  const handleSwitchTenant = (targetTenantId: string) => {
    document.cookie = `educar360_active_tenant=${targetTenantId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.href = "/app/dashboard";
  };

  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRegistration(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await completeInstitutionRegistrationAction({
        cnpj: formData.cnpj,
        name: formData.name,
        trade_name: formData.trade_name,
        email: formData.email,
        phone: formData.phone,
        responsible_name: formData.responsible_name,
      });

      if (!res.success) {
        setRegError(res.error || "Erro ao salvar cadastro institucional.");
      } else {
        setRegSuccess("Dados cadastrais salvos e validados com sucesso!");
        setCurrentTrialInfo((prev) => ({
          ...prev,
          registration: {
            ...prev.registration,
            isComplete: true,
            completedCount: 6,
            percentage: 100,
            missingFields: [],
          },
        }));
        setTimeout(() => {
          setCurrentStep("planos");
        }, 800);
      }
    } catch (err: any) {
      setRegError(err?.message || "Erro ao comunicar com o servidor.");
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleContractPlan = async (planCode: string) => {
    setContracting(true);
    setContractFeedback(null);

    try {
      const res = await requestPlanUpgradeAction(planCode);
      if (res.success) {
        setContractFeedback({
          type: "success",
          message:
            res.message ||
            "Solicitação de contratação registrada com sucesso! Nossa equipe do Educar360 entrará em contato para formalização imediata.",
        });
      } else {
        setContractFeedback({
          type: "error",
          message: res.error || "Erro ao solicitar contratação do plano.",
        });
      }
    } catch (err: any) {
      setContractFeedback({
        type: "error",
        message: err?.message || "Falha na comunicação com o servidor.",
      });
    } finally {
      setContracting(false);
    }
  };

  const selectedPlanConfig = getPlanByCode(selectedPlanCode) || OFFICIAL_SAAS_PLANS[2];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar de Segurança e Sessão */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-wide block leading-tight">
              Educar360
            </span>
            <span className="text-[11px] text-slate-400">
              {tenant.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternar Escola se houver mais de uma */}
          {userTenants.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trocar Escola</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1.5 z-40">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Suas Instituições
                  </div>
                  {userTenants.map((ut) => (
                    <button
                      key={ut.tenant.id}
                      onClick={() => handleSwitchTenant(ut.tenant.id)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-700/60 text-xs text-slate-200 transition-colors"
                    >
                      <span className="truncate">{ut.tenant.name}</span>
                      {ut.tenant.id === tenant.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Banner de Status Bloqueado */}
        <div className="w-full text-center max-w-2xl mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Período de Avaliação Gratuita Expirado (14 Dias)
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Continue gerenciando a sua escola com o Educar360
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            O período de teste gratuito de 14 dias da instituição <strong>{tenant.name}</strong> encerrou em{" "}
            <span className="text-slate-200 font-semibold">{currentTrialInfo.formattedEndDate}</span>. Todos os seus dados, turmas e configurações continuam preservados com segurança.
          </p>
        </div>

        {/* Stepper Superior */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8 w-full max-w-md select-none">
          <button
            type="button"
            onClick={() => setCurrentStep("cadastro")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              currentStep === "cadastro"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30"
                : currentTrialInfo.registration.isComplete
                ? "bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-700"
                : "bg-slate-800/60 text-slate-400 border-slate-700"
            )}
          >
            {currentTrialInfo.registration.isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
            )}
            <span>1. Dados Cadastrais</span>
          </button>

          <div className="w-6 h-0.5 bg-slate-700"></div>

          <button
            type="button"
            onClick={() => {
              if (currentTrialInfo.registration.isComplete) {
                setCurrentStep("planos");
              }
            }}
            disabled={!currentTrialInfo.registration.isComplete}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 disabled:cursor-not-allowed",
              currentStep === "planos"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            )}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
            <span>2. Escolha do Plano</span>
          </button>
        </div>

        {/* ETAPA 1: ATUALIZAÇÃO CADASTRAL OBRIGATÓRIA */}
        {currentStep === "cadastro" && (
          <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" />
                Atualização Cadastral Prioritária
              </div>
              <h2 className="text-lg font-bold text-white">
                Preencha os dados institucionais obrigatórios
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Para emissão correta de notas fiscais, contratos e ativação da assinatura, informe os 6 campos prioritários da instituição.
              </p>
            </div>

            {regError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveRegistration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CNPJ da Instituição *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: maskCnpj(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Razão Social / Nome Oficial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome empresarial registrado"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome popular da escola"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contato@escola.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp Institucional *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Responsável Legal / Gestor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do diretor(a) ou mantenedor(a)"
                    value={formData.responsible_name}
                    onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingRegistration}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingRegistration ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando Dados...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar e Escolher Plano</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ETAPA 2: ESCOLHA DO PLANO OFICIAL */}
        {currentStep === "planos" && (
          <div className="w-full space-y-8">
            {/* Confirmação de Cadastro Completo */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-300 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Cadastro Institucional Validado:</strong> {tenant.name} • CNPJ:{" "}
                  <span className="font-mono">{formData.cnpj || tenant.cnpj || "Validado"}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep("cadastro")}
                className="text-[11px] text-emerald-400 hover:underline font-semibold"
              >
                Editar dados cadastrais
              </button>
            </div>

            {contractFeedback && (
              <div
                className={clsx(
                  "p-4 rounded-2xl border text-xs flex items-start gap-3",
                  contractFeedback.type === "success"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                    : "bg-rose-500/15 border-rose-500/30 text-rose-200"
                )}
              >
                {contractFeedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {contractFeedback.type === "success" ? "Solicitação Confirmada" : "Atenção"}
                  </p>
                  <p className="mt-0.5 leading-relaxed">{contractFeedback.message}</p>
                </div>
              </div>
            )}

            {/* Grid dos Planos Oficiais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              {OFFICIAL_SAAS_PLANS.map((plan) => {
                const isSelected = selectedPlanCode === plan.code;

                return (
                  <div
                    key={plan.code}
                    onClick={() => setSelectedPlanCode(plan.code)}
                    className={clsx(
                      "rounded-2xl p-5 border transition-all flex flex-col justify-between cursor-pointer relative",
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-600/20 ring-2 ring-indigo-500"
                        : "bg-slate-800/70 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                    )}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        Mais Escolhido
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white text-base">{plan.name}</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {plan.studentsFormatted}
                        </span>
                      </div>

                      <div className="mb-4">
                        <span className="text-2xl font-black text-white">
                          {plan.priceFormatted}
                        </span>
                        {plan.price_cents > 0 && (
                          <span className="text-xs text-slate-400 ml-1">/mês</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-4 min-h-[36px] line-clamp-2">
                        {plan.description}
                      </p>

                      <ul className="space-y-2 border-t border-slate-700/60 pt-4 mb-6 text-xs text-slate-300">
                        {plan.features.slice(0, 5).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanCode(plan.code);
                        handleContractPlan(plan.code);
                      }}
                      disabled={contracting}
                      className={clsx(
                        "w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                        isSelected
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                      )}
                    >
                      {contracting && isSelected ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <span>Contratar {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bloco de Suporte Comercial */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Precisa de uma proposta personalizada ou suporte imediato?
                  </h4>
                  <p className="text-xs text-slate-400">
                    Nossa equipe de consultores educacionais está disponível para auxiliar na ativação da sua escola.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <a
                  href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20reativar%20minha%20escola%20no%20Educar360."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Falar no WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
