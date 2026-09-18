import React from "react";
import Link from "next/link";
import { School, ArrowRight, ShieldCheck } from "lucide-react";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header Institucional Premium */}
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block leading-none">
                Educar<span className="text-indigo-600">360</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                ERP Escolar Inteligente
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 font-medium">
            <a href="#modulos" className="hover:text-indigo-600 transition-colors">
              Módulos
            </a>
            <a href="#secretaria" className="hover:text-indigo-600 transition-colors">
              Secretaria & Fichas
            </a>
            <a href="#financeiro" className="hover:text-indigo-600 transition-colors">
              Financeiro
            </a>
            <a href="#portais" className="hover:text-indigo-600 transition-colors">
              Portal dos Pais
            </a>
            <a href="#planos" className="hover:text-indigo-600 transition-colors">
              Planos & Preços
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
            >
              Área da Escola
            </Link>
            <a
              href="#trial-form"
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 hover:translate-y-[-1px]"
            >
              <span>Testar Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo da Landing */}
      <main className="flex-1">{children}</main>

      {/* Footer Institucional Sofisticado */}
      <footer className="border-t border-slate-200 bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <School className="w-4 h-4" />
                </div>
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Educar<span className="text-indigo-600">360</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Plataforma SaaS de gestão integrada para instituições escolares de educação básica. Secretaria, Acadêmico, Financeiro e Portais em uma única arquitetura em nuvem.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 w-fit">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-tenant RLS • LGPD Compliant</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Módulos do Sistema
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><a href="#secretaria" className="hover:text-indigo-600 transition-colors">Secretaria Digital</a></li>
                <li><a href="#modulos" className="hover:text-indigo-600 transition-colors">Diário do Professor</a></li>
                <li><a href="#financeiro" className="hover:text-indigo-600 transition-colors">Financeiro & Mensalidades</a></li>
                <li><a href="#portais" className="hover:text-indigo-600 transition-colors">Portal da Família (Mobile)</a></li>
                <li><a href="#modulos" className="hover:text-indigo-600 transition-colors">Matrículas & Contratos</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Planos & Condições
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><a href="#planos" className="hover:text-indigo-600 transition-colors">Start (Até 100 alunos)</a></li>
                <li><a href="#planos" className="hover:text-indigo-600 transition-colors">Essencial (Até 200 alunos)</a></li>
                <li><a href="#planos" className="hover:text-indigo-600 transition-colors">Profissional (Até 500 alunos)</a></li>
                <li><a href="#planos" className="hover:text-indigo-600 transition-colors">Enterprise (Grandes Redes)</a></li>
                <li><a href="#trial-form" className="hover:text-indigo-600 transition-colors">14 Dias de Trial Grátis</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Acessos da Plataforma
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link href="/app/login" className="hover:text-indigo-600 font-medium transition-colors">
                    Login da Escola (Painel)
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-indigo-600 transition-colors">
                    Backoffice da Plataforma
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-indigo-600 transition-colors">
                    Perguntas Frequentes
                  </a>
                </li>
                <li>
                  <a href="#trial-form" className="hover:text-indigo-600 transition-colors">
                    Solicitar Demonstração
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} Educar360 Tecnologia Educacional Ltda. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-600 cursor-pointer">Termos de Uso</span>
              <span className="hover:text-slate-600 cursor-pointer">Política de Privacidade</span>
              <span className="hover:text-slate-600 cursor-pointer">Segurança de Dados</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
