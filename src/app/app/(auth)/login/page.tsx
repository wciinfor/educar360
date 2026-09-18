"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { School, Lock, Mail, ArrowRight, AlertCircle, Building2 } from "lucide-react";

export default function TenantLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Credenciais inválidas. Tente novamente.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Verifica se o usuário tem vínculo ativo com alguma instituição escolar
        const { data: tenantUsers } = await supabase
          .from("tenant_users")
          .select("id, is_active")
          .eq("user_id", data.user.id)
          .eq("is_active", true);

        if (!tenantUsers || tenantUsers.length === 0) {
          // Se for super admin, orienta a acessar o backoffice
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_platform_admin")
            .eq("id", data.user.id)
            .single();

          const profile = profileData as unknown as Profile | null;

          if (profile?.is_platform_admin) {
            router.push("/admin/dashboard");
            return;
          }

          await supabase.auth.signOut();
          setErrorMsg("Sua conta não possui vínculo ativo com nenhuma instituição de ensino cadastrada.");
          setLoading(false);
          return;
        }

        router.push("/app/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocorreu um erro inesperado ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Portal Escolar Educar360
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Acesso exclusivo para Gestores, Professores, Pais e Alunos
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail institucional / cadastrado
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@escola.com.br"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Senha de acesso
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Entrando..." : "Entrar na Escola"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center flex items-center justify-center gap-1.5 text-slate-500 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ambiente seguro com isolamento por instituição</span>
          </div>
        </div>
      </div>
    </div>
  );
}
