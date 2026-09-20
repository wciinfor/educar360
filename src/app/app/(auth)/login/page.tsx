"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { getLandingBaseUrl } from "@/lib/urls";
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function TenantLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const landingUrl = getLandingBaseUrl();

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

  const benefits = [
    {
      title: "Gestão acadêmica",
      icon: BookOpen,
    },
    {
      title: "Comunicação integrada",
      icon: MessageSquare,
    },
    {
      title: "Mais tempo para o que importa",
      icon: Sparkles,
    },
    {
      title: "Educação com mais resultados",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#071330] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-blue-600 selection:text-white">
      {/* Background Image & Ambient Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <Image
          src="/images/landing/bg_app.png"
          alt="Educar360 Portal Escolar Background"
          fill
          priority
          quality={90}
          className="object-cover object-center opacity-90"
        />
        {/* Camada sutil de proteção e profundidade */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071330]/70 via-[#071330]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071330] via-transparent to-[#071330]/40" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link href={landingUrl} className="flex items-center gap-3 group">
          <Image
            src="/images/landing/logoh_cont.png"
            alt="Educar360 - Gestão escolar sem limites"
            width={180}
            height={46}
            priority
            className="h-10 sm:h-11 w-auto object-contain drop-shadow-md group-hover:scale-[1.02] transition-transform"
          />
        </Link>

        <Link
          href={landingUrl}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Voltar para o site</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-6 lg:px-10 py-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Brand & Value Proposition */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <div className="w-12 h-1.5 bg-blue-500 rounded-full mb-6" />

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bem-vindo ao <br />
              Portal Escolar <span className="text-blue-400">Educar360</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-lg">
              Uma gestão mais simples, moderna e completa para a sua escola. Conectando professores, secretaria, pais e alunos.
            </p>

            {/* Benefits List with dark translucent pills */}
            <div className="mt-8 space-y-3.5 max-w-md">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-md shadow-sm hover:bg-white/[0.09] transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-200">
                      {benefit.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Inspiring Bottom Phrase */}
            <div className="mt-10 pt-4 border-t border-white/10 flex items-center gap-3">
              <span className="w-6 h-0.5 bg-blue-400 rounded-full" />
              <p className="italic text-slate-300 text-sm tracking-wide">
                &ldquo;Juntos por uma educação sem limites.&rdquo;
              </p>
            </div>
          </div>

          {/* Right Column: Modern White Login Card */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-blue-950/40 border border-slate-100 text-slate-900 relative">
              
              {/* Card Header Icon & Titles */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm mb-4">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Acesso à sua Escola
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Entre com seu e-mail institucional para acessar o Educar360.
                </p>
              </div>

              {/* Form */}
              <form className="mt-7 space-y-5" onSubmit={handleLogin}>
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail institucional
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@escola.com.br"
                      className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Senha
                    </label>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Para recuperar sua senha escolar, entre em contato com a secretaria ou o administrador da sua instituição de ensino."
                        )
                      }
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Entrando na Escola...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar na Escola</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Card Footer Security Badge */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Ambiente seguro com isolamento por instituição.</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modern Clean Footer */}
      <footer className="relative z-20 w-full bg-slate-900/80 border-t border-white/10 backdrop-blur-md py-4 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Image
              src="/images/landing/logoh_cont.png"
              alt="Educar360"
              width={120}
              height={32}
              className="h-6 w-auto object-contain drop-shadow-xs"
            />
          </div>

          <div className="flex items-center gap-6">
            <Link href={landingUrl} className="hover:text-slate-200 transition-colors">
              Início
            </Link>
            <a
              href="mailto:suporte@educar360.com.br"
              className="hover:text-slate-200 transition-colors"
            >
              Suporte
            </a>
            <Link href={landingUrl} className="hover:text-slate-200 transition-colors">
              Termos de Uso
            </Link>
            <Link href={landingUrl} className="hover:text-slate-200 transition-colors">
              Política de Privacidade
            </Link>
          </div>

          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} Educar360. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
