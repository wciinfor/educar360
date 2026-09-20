"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { getLandingBaseUrl } from "@/lib/urls";
import {
  Server,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Compass,
  Building2,
  Layers,
  BarChart3,
  ShieldAlert,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function PlatformLoginPage() {
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
        setErrorMsg(error.message || "Credenciais inválidas.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Valida se o usuário tem a role de super admin
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("id", data.user.id)
          .single();

        const profile = profileData as unknown as Profile | null;

        if (!profile || !profile.is_platform_admin) {
          await supabase.auth.signOut();
          setErrorMsg("Acesso negado. Esta conta não possui privilégios de Administrador da Plataforma.");
          setLoading(false);
          return;
        }

        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro inesperado ao conectar ao backoffice.");
    } finally {
      setLoading(false);
    }
  };

  const adminBenefits = [
    {
      title: "Visão estratégica",
      icon: Compass,
    },
    {
      title: "Gestão de instituições",
      icon: Building2,
    },
    {
      title: "Controle de assinaturas",
      icon: Layers,
    },
    {
      title: "Relatórios em tempo real",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-[#041a14] text-emerald-50 flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-emerald-600 selection:text-white">
      {/* Background Image & Ambient Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <Image
          src="/images/landing/bg_admin.png"
          alt="Educar360 Backoffice Background"
          fill
          priority
          quality={90}
          className="object-cover object-center opacity-90"
        />
        {/* Camada sutil de proteção e profundidade */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041a14]/75 via-[#041a14]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#041a14] via-transparent to-[#041a14]/45" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link href={landingUrl} className="flex items-center gap-3 group">
          <div className="bg-white px-3.5 py-2 rounded-xl shadow-md group-hover:shadow-lg transition-all">
            <Image
              src="/images/landing/logoh.png"
              alt="Educar360 Backoffice"
              width={160}
              height={40}
              priority
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>
        </Link>

        <Link
          href={landingUrl}
          className="inline-flex items-center gap-2 text-sm text-emerald-200/80 hover:text-white px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Voltar para o site</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-6 lg:px-10 py-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Platform Presentation */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <div className="w-12 h-1.5 bg-emerald-500 rounded-full mb-6" />

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bem-vindo ao <br />
              Backoffice <span className="text-emerald-400">Educar360</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-emerald-100/80 font-normal leading-relaxed max-w-lg">
              Gestão central da plataforma, acompanhamento de instituições, planos e resultados em um só lugar.
            </p>

            {/* Benefits List */}
            <div className="mt-8 space-y-3.5 max-w-md">
              {adminBenefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md shadow-sm hover:bg-white/[0.08] transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-emerald-50">
                      {benefit.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Slogan */}
            <div className="mt-10 pt-4 border-t border-white/10 flex items-center gap-3">
              <span className="w-6 h-0.5 bg-emerald-400 rounded-full" />
              <p className="italic text-emerald-200/90 text-sm tracking-wide">
                Tecnologia a serviço de uma educação melhor.
              </p>
            </div>
          </div>

          {/* Right Column: Clean White Admin Card */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-950/50 border border-slate-100 text-slate-900 relative">
              
              {/* Card Header Icon & Titles */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm mb-4">
                  <Server className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Acesso Administrativo
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Entre com seu e-mail de operador para acessar o Backoffice.
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
                    E-mail de Operador da Plataforma
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
                      placeholder="admin@educar360.com.br"
                      className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Senha de Acesso
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
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:border-transparent transition-all"
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
                          "Para redefinir credenciais administrativas de operador da plataforma, consulte a equipe de infraestrutura ou realize o reset via Supabase Auth Console."
                        )
                      }
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
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
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/25 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar no Backoffice</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Card Footer Security Badge */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-slate-400 text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                <span>Área estritamente restrita à equipe proprietária.</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="relative z-20 w-full bg-black/60 border-t border-white/10 backdrop-blur-md py-4 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-200/70">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2 py-1 rounded-lg shadow-xs">
              <Image
                src="/images/landing/logoh.png"
                alt="Educar360 Backoffice"
                width={110}
                height={28}
                className="h-5 w-auto object-contain"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href={landingUrl} className="hover:text-white transition-colors">
              Início
            </Link>
            <a
              href="mailto:suporte@educar360.com.br"
              className="hover:text-white transition-colors"
            >
              Suporte
            </a>
            <Link href={landingUrl} className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href={landingUrl} className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
          </div>

          <p className="text-emerald-200/70">
            &copy; {new Date().getFullYear()} Educar360. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
