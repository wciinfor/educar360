"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { validateInviteTokenAction, activateTenantAdminAction } from "@/app/actions/activate-invite";
import { createClient } from "@/lib/supabase/client";
import { InviteDetails } from "@/types/invite";
import {
  School,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building2,
  User,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

function ActivateAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || searchParams.get("invite") || "";

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setLoadingInvite(false);
      return;
    }

    const checkToken = async () => {
      setLoadingInvite(true);
      const res = await validateInviteTokenAction(token);
      setInviteData(res);
      setLoadingInvite(false);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas informadas não coincidem.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await activateTenantAdminAction(token, password);

      if (!res.success || !res.email) {
        setErrorMsg(res.error || "Falha ao ativar a conta.");
        setSubmitting(false);
        return;
      }

      setSuccessMsg("Senha configurada com sucesso! Conectando ao painel escolar...");

      // Autentica automaticamente a sessão no navegador
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: res.email,
        password: password,
      });

      if (signInErr) {
        // Redireciona para tela de login caso o login automático falhe
        window.location.href = `/app/login?email=${encodeURIComponent(res.email)}&activated=true`;
        return;
      }

      // Redireciona para o dashboard com o tenant ativo garantindo sincronização de cookies
      window.location.href = "/app/dashboard";
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro inesperado ao ativar a conta.");
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="text-center py-16 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Verificando dados do convite escolar...</p>
      </div>
    );
  }

  // Token inválido ou ausente
  if (!token || !inviteData?.valid) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Convite Inválido ou Já Utilizado</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {inviteData?.message ||
            "O link de ativação fornecido não é válido ou o primeiro acesso já foi configurado para este administrador."}
        </p>
        <div className="pt-2">
          <Link
            href="/app/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <span>Ir para o Login da Escola</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Primeiro Acesso &bull; Administrador Escolar</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Ativar Conta da Escola
        </h2>
        <p className="text-xs text-slate-400">
          Defina sua senha pessoal para acessar a plataforma da sua instituição.
        </p>
      </div>

      {/* Cartão de Identificação da Instituição e do Gestor */}
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Instituição:</span>
          <strong className="text-white text-sm flex items-center gap-1.5">
            <School className="w-4 h-4 text-indigo-400" />
            {inviteData.school_name}
          </strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Gestor Convidado:</span>
          <span className="text-slate-200 font-medium">{inviteData.admin_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">E-mail de Acesso:</span>
          <span className="text-indigo-300 font-mono">{inviteData.admin_email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Papel Atribuído:</span>
          <span className="text-emerald-400 font-semibold uppercase">Diretoria / admin_escola</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulário de Criação de Senha */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Crie sua Senha de Acesso *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="No mínimo 6 caracteres"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Confirme sua Senha *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha criada"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ativando sua conta e conectando...</span>
              </>
            ) : (
              <>
                <span>Ativar Minha Conta & Acessar a Escola</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 flex flex-col items-center">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/images/landing/logov_escuro.png"
            alt="Educar360 - Ambiente Escolar Oficial"
            width={180}
            height={80}
            priority
            className="h-20 w-auto object-contain mx-auto"
          />
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="text-center py-12 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Carregando dados de ativação...
            </div>
          }
        >
          <ActivateAccountContent />
        </Suspense>
      </div>
    </div>
  );
}
