"use client";

import React, { useState } from "react";
import { setupTenantFirstAdminAction } from "@/app/actions/admin-first-access";
import { getActivationUrl } from "@/lib/urls";
import {
  UserPlus,
  Mail,
  User,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  School,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";

interface SetupFirstAccessModalProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    settings?: Record<string, any>;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetupFirstAccessModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}: SetupFirstAccessModalProps) {
  const [fullName, setFullName] = useState(
    tenant.settings?.contact_name || ""
  );
  const [email, setEmail] = useState(tenant.email || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado após criação com sucesso (token de convite desacoplado)
  const [createdAdmin, setCreatedAdmin] = useState<{
    admin_name: string;
    admin_email: string;
    invite_token: string;
    access_domain: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await setupTenantFirstAdminAction({
      tenantId: tenant.id,
      fullName: fullName,
      email: email,
    });

    if (res.success && res.invite_token) {
      setCreatedAdmin({
        admin_name: res.admin_name || fullName,
        admin_email: res.admin_email || email,
        invite_token: res.invite_token,
        access_domain: res.access_domain || "app.educar360.com.br",
      });
      onSuccess();
    } else {
      setErrorMsg(res.error || "Erro ao configurar primeiro acesso.");
    }
    setLoading(false);
  };

  const copyInviteLink = () => {
    if (!createdAdmin) return;
    const link = getActivationUrl(createdAdmin.invite_token, createdAdmin.admin_email);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-start justify-between gap-4 bg-zinc-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                Configurar Primeiro Acesso da Escola
              </h3>
              <p className="text-xs text-zinc-500">
                Cadastro do primeiro gestor escolar com papel <strong className="text-indigo-600">admin_escola</strong>
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-700">
          {createdAdmin ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Administrador Escolar Configurado com Sucesso!</span>
                </div>
                <p className="text-xs text-emerald-900">
                  O usuário <strong>{createdAdmin.admin_name}</strong> ({createdAdmin.admin_email}) foi provisionado como <strong>admin_escola</strong> vinculado exclusivamente à instituição <strong>{tenant.name}</strong>.
                </p>
                <div className="p-2 bg-emerald-100/60 rounded-lg text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700" />
                  <span>Usuário com isolamento total: sem qualquer privilégio no Backoffice (/admin).</span>
                </div>
              </div>

              {/* Mecanismo Desacoplado de Convite */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Chave de Convite e Primeiro Acesso (Desacoplada)
                </span>
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-700">
                  <KeyRound className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate flex-1">{createdAdmin.invite_token}</span>
                </div>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="w-full py-2 px-3 rounded-xl border border-zinc-300 hover:bg-white text-xs font-semibold text-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Link de Acesso Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link de Ativação Escolar</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-zinc-400 text-center">
                  * O envio automatizado de e-mails será acoplado em etapa posterior.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Dados da Escola Alvo */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Instituição Escolar Alvo
                </span>
                <div className="font-bold text-sm text-zinc-900">{tenant.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Slug: {tenant.slug} &bull; Acesso: app.educar360.com.br
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1">
                  Nome Completo do Gestor Escolar *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Maria das Graças Oliveira"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1">
                  E-mail Institucional de Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="diretoria@escola.com.br"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Papel RBAC: admin_escola (Diretoria / Gestão)</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Permite gestão completa dos módulos internos da escola (Secretaria, Acadêmico, etc.) com vínculo exclusivo a esta instituição. Não possui acesso ao Backoffice da Plataforma.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando Administrador...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Administrador & Gerar Acesso</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
