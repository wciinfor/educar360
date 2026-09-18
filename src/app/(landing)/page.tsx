import React from "react";
import Link from "next/link";
import { LeadForm } from "@/components/landing/LeadForm";
import { OFFICIAL_SAAS_PLANS } from "@/lib/plans/constants";
import {
  School,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Users,
  CreditCard,
  GraduationCap,
  ArrowRight,
  HelpCircle,
  Laptop,
  MessageSquare,
  Lock,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  const faqs = [
    {
      q: "Como funciona o período de trial gratuito de 14 dias?",
      a: "Você tem acesso irrestrito aos módulos da plataforma por 14 dias para testar na prática com sua equipe. Não exigimos cartão de crédito para iniciar.",
    },
    {
      q: "O que acontece com os dados da minha escola? Eles ficam isolados?",
      a: "Sim, com rigor absoluto. O Educar360 foi construído com arquitetura multi-tenant onde cada escola é um tenant independente com Row-Level Security (RLS) no PostgreSQL. Nenhuma outra instituição ou usuário comum tem acesso aos seus dados.",
    },
    {
      q: "Qual a diferença entre os planos Start, Essencial, Profissional e Enterprise?",
      a: "O Start (R$ 199/mês) atende até 100 alunos com foco em Secretaria e Acadêmico. O Essencial (R$ 299/mês) expande para até 200 alunos com controle de contratos e portal dos pais. O Profissional (R$ 499/mês) atende até 500 alunos com módulo financeiro integrado e portais completos. O Enterprise é sob consulta para redes e instituições acima de 500 alunos.",
    },
    {
      q: "É possível migrar dados de alunos e turmas de planilhas ou sistemas antigos?",
      a: "Sim. Oferecemos ferramentas e suporte guiado de importação de alunos, responsáveis e turmas para que sua escola não precise recadastrar nada manualmente.",
    },
    {
      q: "Os pais e professores têm acessos e portais separados?",
      a: "Exatamente. O sistema possui controle de acesso granular (RBAC) com visão dedicada para Professores (diário e notas), Pais/Responsáveis (boletins e financeiro) e Alunos (tarefas e horários).",
    },
    {
      q: "Como funciona a contratação do Plano Enterprise?",
      a: "Para instituições com mais de 500 alunos ou redes de ensino, realizamos uma análise técnica e comercial personalizada, disponibilizando contrato sob medida sem cobrança automática.",
    },
  ];

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs sm:text-sm font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            O ERP Escolar SaaS de Próxima Geração
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Gestão Escolar Completa, <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Integrada e 100% Isolada
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            Elimine planilhas desconexas, reduza a inadimplência e conecte Secretaria, Acadêmico, Matrículas, Financeiro e Portais em uma única plataforma na nuvem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#trial-form"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-base"
            >
              <span>Experimentar Grátis por 14 Dias</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#planos"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all text-base"
            >
              Conhecer Planos a Partir de R$ 199/mês
            </a>
          </div>

          <div className="pt-8 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Isolamento Estrito por Tenant</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Conformidade com LGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Ativação Rápida em Minutos</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BENEFÍCIOS PARA PEQUENAS E MÉDIAS ESCOLAS */}
      <section id="beneficios" className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Por que escolher o Educar360
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Criado para resolver as dores reais da sua instituição
          </h2>
          <p className="text-sm text-slate-400">
            Mais tempo para a equipe focar no que realmente importa: a educação dos alunos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-950/70 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Fim das Planilhas Dispersas</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Diga adeus a dezenas de arquivos do Excel perdidos. Todos os prontuários, notas, histórico escolar e dados cadastrais centralizados e atualizados em tempo real.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Redução da Inadimplência</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Gestão automatizada de cobranças com envio de lembretes e régua preventiva, facilitando a pontualidade no pagamento de mensalidades.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-8 rounded-3xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Comunicação Oficial com os Pais</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Substitua recados na agenda por notificações instantâneas no portal. Histórico de avisos, ocorrências e circulares com total registro e transparência.
            </p>
          </div>
        </div>
      </section>

      {/* 3. PRINCIPAIS FUNCIONALIDADES */}
      <section id="modulos" className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Módulos Especializados
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tudo o que sua escola precisa em uma suíte 360°
          </h2>
          <p className="text-sm text-slate-400">
            Arquitetura modular integrada para atender cada departamento da instituição.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Secretaria Escolar",
              desc: "Emissão de certidões, fichas individuais, históricos escolares, livro de matrícula e controle cadastral completo de alunos e responsáveis.",
              icon: GraduationCap,
              tag: "Documentação ágil",
            },
            {
              title: "Gestão Acadêmica",
              desc: "Diário de classe digital para professores, matrizes curriculares, frequência, cálculo automático de médias e boletins de notas.",
              icon: School,
              tag: "Corpo Docente",
            },
            {
              title: "Matrículas & Captação",
              desc: "Funil de admissão de novos alunos, processos de rematrícula automatizados e emissão de contratos escolares personalizados.",
              icon: Users,
              tag: "Crescimento Escolar",
            },
            {
              title: "Financeiro Escolar",
              desc: "Controle de mensalidades, faturamento por turma, acompanhamento de acordos, baixas e visão panorâmica de receitas da escola.",
              icon: CreditCard,
              tag: "Controle de Caixa",
            },
            {
              title: "Comunicação & Avisos",
              desc: "Canal oficial de recados, circulares pedagógicas, comunicados urgentes e registros de ocorrências disciplinares.",
              icon: MessageSquare,
              tag: "Família e Escola",
            },
            {
              title: "Portais do Aluno, Pai e Professor",
              desc: "Acesso sob medida para cada papel através de computadores e celulares, com permissões estritas para cada usuário.",
              icon: Laptop,
              tag: "Multi-Perfil",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-slate-950 border border-slate-800 hover:border-indigo-500/40 p-7 rounded-3xl transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. COMO FUNCIONA */}
      <section className="bg-slate-950 py-20 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
              Simples e Transparente
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Como funciona a adoção do Educar360?
            </h2>
            <p className="text-sm text-slate-400">
              Da solicitação do trial ao uso diário em 4 passos descomplicados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Solicite o Trial",
                desc: "Preencha o formulário abaixo informando o porte de alunos da sua instituição.",
              },
              {
                step: "02",
                title: "Tenant Exclusivo",
                desc: "Nossa equipe ativa o ambiente isolado da sua escola em minutos.",
              },
              {
                step: "03",
                title: "Importação Fácil",
                desc: "Importe turmas e alunos com nosso suporte dedicado sem perda de dados.",
              },
              {
                step: "04",
                title: "Gestão Sem Limites",
                desc: "Equipe capacitada e escola funcionando com máxima eficiência e segurança.",
              },
            ].map((s) => (
              <div key={s.step} className="space-y-3 relative">
                <span className="text-4xl font-black text-slate-800 font-mono block">
                  {s.step}
                </span>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PLANOS SAAS - FONTE DE DADOS UNIFICADA */}
      <section id="planos" className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Estrutura Comercial Oficial
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Planos dimensionados para sua escola
          </h2>
          <p className="text-sm text-slate-400">
            Valores transparentes e proporcionais ao porte da sua instituição. 14 dias de teste grátis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {OFFICIAL_SAAS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 border flex flex-col justify-between space-y-6 ${
                plan.highlight
                  ? "bg-slate-950 border-2 border-indigo-500 shadow-2xl shadow-indigo-600/20 relative"
                  : "bg-slate-950 border-slate-800"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                  {plan.badgeLabel || "Mais Escolhido"}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                    {plan.studentsFormatted}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    {plan.priceFormatted}
                  </span>
                  {plan.price_cents > 0 ? (
                    <span className="text-xs text-slate-400">/mês</span>
                  ) : (
                    <span className="text-xs text-slate-400 ml-1">(sob medida)</span>
                  )}
                </div>

                <ul className="space-y-2.5 pt-4 text-xs text-slate-300">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="#trial-form"
                className={`w-full py-3 rounded-xl font-bold text-xs text-center transition-all ${
                  plan.highlight
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                {plan.price_cents === 0 ? "Falar com Consultor" : `Testar Plano ${plan.name}`}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FORMULÁRIO DE CAPTAÇÃO DE LEADS (TRIAL) */}
      <section id="trial-form" className="max-w-4xl mx-auto px-6 scroll-mt-24">
        <LeadForm />
      </section>

      {/* 7. FAQ (PERGUNTAS FREQUENTES) */}
      <section id="faq" className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-2"
            >
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-radial from-indigo-900 via-indigo-950 to-slate-950 border border-indigo-500/30 p-10 sm:p-16 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md">
            Comece Hoje Mesmo
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-2xl mx-auto">
            Pronto para modernizar a gestão da sua escola?
          </h2>
          <p className="text-sm sm:text-base text-indigo-200 max-w-xl mx-auto">
            Junte-se às instituições que confiam no Educar360 com planos sob medida a partir de R$ 199/mês.
          </p>
          <div className="pt-2">
            <a
              href="#trial-form"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-indigo-950 bg-white hover:bg-slate-100 shadow-xl transition-all"
            >
              <span>Solicitar Demonstração Gratuita</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
