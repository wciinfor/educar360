"use client";

import React, { useState } from "react";
import {
  TenantInstitutionData,
  SchoolGatewayConfig,
  SchoolGatewayProvider,
  GatewayEnvironment,
  TenantPlanUsage,
  TenantSaasInvoiceItem,
} from "@/types/configuracoes";
import {
  updateInstitutionDataAction,
  saveSchoolGatewayAction,
  requestPlanUpgradeAction,
} from "@/app/actions/configuracoes";
import { OFFICIAL_SAAS_PLANS } from "@/lib/plans/constants";
import {
  Building2,
  CreditCard,
  Layers,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  Check,
} from "lucide-react";
import clsx from "clsx";

interface GeralTabsClientProps {
  initialInstitution: TenantInstitutionData;
  initialGateway: SchoolGatewayConfig;
  initialPlanUsage: TenantPlanUsage;
  initialInvoices: TenantSaasInvoiceItem[];
  userRole: string;
}

type TabKey = "dados" | "gateway" | "plano" | "faturas";

export function GeralTabsClient({
  initialInstitution,
  initialGateway,
  initialPlanUsage,
  initialInvoices,
  userRole,
}: GeralTabsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("dados");
  const isAdmin = userRole === "admin_escola";

  // ==========================================
  // ESTADO ABA 1: DADOS DA INSTITUIÇÃO
  // ==========================================
  const [institution, setInstitution] = useState<TenantInstitutionData>(initialInstitution);
  const [savingInst, setSavingInst] = useState(false);
  const [instFeedback, setInstFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingInst(true);
    setInstFeedback(null);

    const res = await updateInstitutionDataAction(institution);
    if (res.success) {
      setInstFeedback({ type: "success", text: "Dados cadastrais atualizados com sucesso!" });
    } else {
      setInstFeedback({ type: "error", text: res.error || "Erro ao salvar alterações." });
    }
    setSavingInst(false);
  };

  // ==========================================
  // ESTADO ABA 2: GATEWAY ESCOLAR
  // ==========================================
  const [gateway, setGateway] = useState<SchoolGatewayConfig>(initialGateway);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [savingGw, setSavingGw] = useState(false);
  const [gwFeedback, setGwFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingGw(true);
    setGwFeedback(null);

    const res = await saveSchoolGatewayAction({
      provider: gateway.provider,
      environment: gateway.environment,
      is_active: gateway.is_active,
      apiKey: apiKeyInput.trim() || undefined,
      clientId: clientIdInput.trim() || undefined,
      clientSecret: clientSecretInput.trim() || undefined,
    });

    if (res.success) {
      setGateway((prev) => ({
        ...prev,
        has_credentials: Boolean(apiKeyInput || clientSecretInput || prev.has_credentials),
        masked_api_key: apiKeyInput ? `${apiKeyInput.slice(0, 6)}...****` : prev.masked_api_key,
      }));
      setApiKeyInput("");
      setClientSecretInput("");
      setGwFeedback({ type: "success", text: "Configurações do gateway escolar salvas com sucesso!" });
    } else {
      setGwFeedback({ type: "error", text: res.error || "Erro ao atualizar gateway." });
    }
    setSavingGw(false);
  };

  // ==========================================
  // ESTADO ABA 3: PLANOS & UPGRADE
  // ==========================================
  const [requestingUpgrade, setRequestingUpgrade] = useState<string | null>(null);
  const [planFeedback, setPlanFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRequestUpgrade = async (planCode: string) => {
    if (!isAdmin) return;
    setRequestingUpgrade(planCode);
    setPlanFeedback(null);

    const res = await requestPlanUpgradeAction(planCode);
    if (res.success) {
      setPlanFeedback({ type: "success", text: res.message || "Solicitação registrada!" });
    } else {
      setPlanFeedback({ type: "error", text: res.error || "Erro ao solicitar upgrade." });
    }
    setRequestingUpgrade(null);
  };

  return (
    <div className="space-y-6">
      {/* Abas Secundárias do Submenu Geral */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 rounded-2xl shadow-xs overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveTab("dados")}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "dados"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Dados da Instituição</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gateway")}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "gateway"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <CreditCard className="w-4 h-4" />
          <span>Gateway de Pagamentos</span>
          {gateway.is_active && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plano")}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "plano"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Plano SaaS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faturas")}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "faturas"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Receipt className="w-4 h-4" />
          <span>Faturas do SaaS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DADOS DA INSTITUIÇÃO */}
      {/* ========================================================================= */}
      {activeTab === "dados" && (
        <form onSubmit={handleSaveInstitution} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Identificação Cadastral</h3>
                <p className="text-xs text-slate-500">
                  Dados formais utilizados em contratos de matrícula, cabeçalhos de boletins e declarações.
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg">
                Slug: {institution.slug}
              </span>
            </div>

            {instFeedback && (
              <div
                className={clsx(
                  "p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium",
                  instFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                )}
              >
                {instFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{instFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razão Social / Nome Oficial *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={institution.name}
                  onChange={(e) => setInstitution({ ...institution, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={institution.trade_name || ""}
                  onChange={(e) => setInstitution({ ...institution, trade_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="00.000.000/0000-00"
                  value={institution.cnpj || ""}
                  onChange={(e) => setInstitution({ ...institution, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={institution.email || ""}
                  onChange={(e) => setInstitution({ ...institution, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone / WhatsApp Principal
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="(00) 00000-0000"
                  value={institution.phone || ""}
                  onChange={(e) => setInstitution({ ...institution, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL da Logomarca (ou link de imagem)
                </label>
                <input
                  type="url"
                  disabled={!isAdmin}
                  placeholder="https://exemplo.com.br/logo.png"
                  value={institution.logo_url || ""}
                  onChange={(e) => setInstitution({ ...institution, logo_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Endereço Institucional */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Endereço Físico da Unidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Logradouro (Rua, Av, Travessa)
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={institution.address_street || ""}
                    onChange={(e) =>
                      setInstitution({ ...institution, address_street: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={institution.address_number || ""}
                    onChange={(e) =>
                      setInstitution({ ...institution, address_number: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={institution.address_neighborhood || ""}
                    onChange={(e) =>
                      setInstitution({ ...institution, address_neighborhood: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={institution.address_city || ""}
                    onChange={(e) =>
                      setInstitution({ ...institution, address_city: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    UF / Estado
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    disabled={!isAdmin}
                    placeholder="SP"
                    value={institution.address_state || ""}
                    onChange={(e) =>
                      setInstitution({ ...institution, address_state: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60 uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Ação de Salvar */}
            {isAdmin && (
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingInst}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingInst ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando dados...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Dados Cadastrais</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: GATEWAY DE PAGAMENTOS DA ESCOLA (ASAAS / EFÍ) */}
      {/* ========================================================================= */}
      {activeTab === "gateway" && (
        <form onSubmit={handleSaveGateway} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gateway de Cobrança Escolar
                </h3>
                <p className="text-xs text-slate-500">
                  Configuração da conta bancária integrada para recebimento de mensalidades e taxas escolares.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
                    gateway.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  )}
                >
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      gateway.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    )}
                  />
                  {gateway.is_active ? "Gateway Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            {/* Aviso de Isolamento Crítico */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Segregação Estrita de Recebíveis:</strong> As credenciais cadastradas aqui são utilizadas
                <strong> exclusivamente para emitir cobranças escolares para os seus alunos/responsáveis</strong>.
                Não possuem nenhuma relação com a assinatura que sua escola paga à Educar360.
              </div>
            </div>

            {gwFeedback && (
              <div
                className={clsx(
                  "p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium",
                  gwFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                )}
              >
                {gwFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{gwFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Provedor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provedor de Pagamento
                </label>
                <select
                  disabled={!isAdmin}
                  value={gateway.provider}
                  onChange={(e) =>
                    setGateway({ ...gateway, provider: e.target.value as SchoolGatewayProvider })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="asaas">ASAAS Pagamentos (Recomendado)</option>
                  <option value="efi">Efí Bank (Gerencianet)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {gateway.provider === "asaas"
                    ? "Emite boletos com registro imediato, PIX dinâmico e cartão de crédito."
                    : "Permite emissão de carnês físicos e boletos com registro automático no Efí."}
                </span>
              </div>

              {/* Ambiente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ambiente de Operação
                </label>
                <select
                  disabled={!isAdmin}
                  value={gateway.environment}
                  onChange={(e) =>
                    setGateway({
                      ...gateway,
                      environment: e.target.value as GatewayEnvironment,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="sandbox">Sandbox (Ambiente de Testes / Homologação)</option>
                  <option value="production">Produção Real (Transações Bancárias Ativas)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Recomendamos testar primeiro em Sandbox antes de ativar a conta real.
                </span>
              </div>
            </div>

            {/* Credenciais Seguras */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {gateway.provider === "asaas" ? "API Key do ASAAS" : "Client Secret / Chave Efí"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                >
                  {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSecrets ? "Ocultar" : "Mostrar digitação"}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  disabled={!isAdmin}
                  placeholder={
                    gateway.has_credentials
                      ? gateway.masked_api_key || "••••••••••••••••••••••••••••••••"
                      : "Insira a chave de integração fornecida pelo gateway"
                  }
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                />
              </div>

              {gateway.provider === "efi" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client ID (Efí)
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    placeholder="Client_Id_..."
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              )}

              {gateway.has_credentials && !apiKeyInput && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Credenciais já salvas de forma segura no servidor. Deixe em branco para manter.</span>
                </div>
              )}
            </div>

            {/* Checkbox Ativação */}
            <div className="pt-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={gateway.is_active}
                  onChange={(e) => setGateway({ ...gateway, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Ativar este gateway para emissão de mensalidades e boletos na Secretaria/Financeiro
                </span>
              </label>
            </div>

            {/* Ação */}
            {isAdmin && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingGw}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingGw ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando credenciais...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Configuração do Gateway</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: PLANOS SAAS DA ESCOLA (UPGRADE & LIMITES) */}
      {/* ========================================================================= */}
      {activeTab === "plano" && (
        <div className="space-y-6">
          {/* Card do Plano Ativo e Barra de Uso */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-mono">
                  Plano Atual da Sua Instituição
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {initialPlanUsage.plan.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {initialPlanUsage.plan.description}
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {initialPlanUsage.amount_cents > 0
                    ? (initialPlanUsage.amount_cents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "Sob Consulta"}
                </span>
                <span className="text-xs text-slate-400 block">/mês</span>
              </div>
            </div>

            {/* Barra de Progresso de Alunos */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Consumo de Vagas de Alunos:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {initialPlanUsage.active_students_count} de{" "}
                  {initialPlanUsage.max_students ? `${initialPlanUsage.max_students} alunos` : "Ilimitados"}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all",
                    initialPlanUsage.usage_percentage > 90
                      ? "bg-rose-500"
                      : initialPlanUsage.usage_percentage > 75
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                  )}
                  style={{ width: `${Math.max(5, initialPlanUsage.usage_percentage)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Alunos com matrícula ativa cadastrados no módulo Secretaria.
              </p>
            </div>
          </div>

          {planFeedback && (
            <div
              className={clsx(
                "p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium",
                planFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              )}
            >
              {planFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{planFeedback.text}</span>
            </div>
          )}

          {/* Grade Comparativa de Planos para Solicitação de Upgrade */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Opções de Upgrade Disponíveis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {OFFICIAL_SAAS_PLANS.map((p) => {
                const isCurrent = p.code === initialPlanUsage.plan.code;

                return (
                  <div
                    key={p.id}
                    className={clsx(
                      "bg-white p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs",
                      isCurrent ? "border-indigo-600 ring-2 ring-indigo-600/20" : "border-slate-200"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="text-base font-bold text-slate-900">{p.name}</h5>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black text-slate-900 font-mono mt-2">
                        {p.priceFormatted}
                        {p.price_cents > 0 && <span className="text-xs text-slate-400 font-normal">/mês</span>}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {p.studentsFormatted}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent || requestingUpgrade === p.code || !isAdmin}
                      onClick={() => handleRequestUpgrade(p.code)}
                      className={clsx(
                        "w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-default"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer"
                      )}
                    >
                      {requestingUpgrade === p.code ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Solicitando...</span>
                        </>
                      ) : isCurrent ? (
                        <span>Plano Ativo</span>
                      ) : (
                        <span>Solicitar Upgrade</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: FATURAS SAAS DO TENANT (SOMENTE LEITURA) */}
      {/* ========================================================================= */}
      {activeTab === "faturas" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Histórico de Faturas do SaaS Educar360
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização somente leitura das cobranças de assinatura da sua instituição.
                </p>
              </div>
            </div>

            {/* Tabela de Faturas */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Comprovante / Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {initialInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.period_label || "Mensalidade Educar360"}
                      </td>
                      <td className="py-3.5 px-4">
                        {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {(inv.amount_cents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Paga
                          </span>
                        ) : inv.status === "overdue" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Vencida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" /> Em Aberto
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {inv.asaas_invoice_url ? (
                          <a
                            href={inv.asaas_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <span>Visualizar Fatura</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
