import React from "react";
import Link from "next/link";
import { School, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Institucional */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
              <School className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-tight">
                Educar360
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
                ERP Escolar Inteligente
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <a href="#solucoes" className="hover:text-white transition-colors">Soluções</a>
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Área da Escola
            </Link>
            <Link
              href="/app/login"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Acessar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo da Landing */}
      <main className="flex-1">{children}</main>

      {/* Footer Institucional */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-500" />
            <span>&copy; {new Date().getFullYear()} Educar360 SaaS. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/app/login" className="hover:text-slate-400">Portal Escolar</Link>
            <Link href="/admin/login" className="hover:text-slate-400">Backoffice da Plataforma</Link>
            <a href="#" className="hover:text-slate-400">Termos de Uso</a>
            <a href="#" className="hover:text-slate-400">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
