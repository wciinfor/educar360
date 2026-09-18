import React from "react";
import Link from "next/link";
import { School, ShieldCheck } from "lucide-react";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Header branco elegante e minimalista */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-800 transition-colors">
              <School className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              Educar<span className="text-emerald-500">360</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600 font-medium">
            <a href="#modulos" className="hover:text-blue-900 transition-colors">Solucoes</a>
            <a href="#planos" className="hover:text-blue-900 transition-colors">Planos</a>
            <a href="#diferenciais" className="hover:text-blue-900 transition-colors">Diferenciais</a>
            <a href="#faq" className="hover:text-blue-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/app/login" className="hidden sm:block px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-900 transition-colors">
              Entrar
            </Link>
            <a href="#trial-form" className="px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 transition-all">
              Testar Gratis
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-blue-950 text-white py-14 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <School className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-lg font-black tracking-tight text-white">
                  Educar<span className="text-emerald-400">360</span>
                </span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Plataforma SaaS de gestao integrada para instituicoes de educacao basica.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Multi-tenant RLS · LGPD</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Modulos</h4>
              <ul className="space-y-2 text-xs text-blue-300">
                <li><a href="#secretaria" className="hover:text-white transition-colors">Secretaria Escolar</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Diario do Professor</a></li>
                <li><a href="#financeiro" className="hover:text-white transition-colors">Financeiro</a></li>
                <li><a href="#portais" className="hover:text-white transition-colors">Portal da Familia</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Planos</h4>
              <ul className="space-y-2 text-xs text-blue-300">
                <li><a href="#planos" className="hover:text-white transition-colors">Start — Ate 100 alunos</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Essencial — Ate 200 alunos</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Profissional — Ate 500 alunos</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Enterprise — Redes de ensino</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Plataforma</h4>
              <ul className="space-y-2 text-xs text-blue-300">
                <li><Link href="/app/login" className="hover:text-white transition-colors">Area da Escola</Link></li>
                <li><Link href="/admin/login" className="hover:text-white transition-colors">Backoffice</Link></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
                <li><a href="#trial-form" className="hover:text-white transition-colors">Solicitar Trial</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-400">
            <p>&copy; {new Date().getFullYear()} Educar360. Todos os direitos reservados.</p>
            <span className="text-emerald-400 font-semibold">Educacao hoje. Novos futuros amanha.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
