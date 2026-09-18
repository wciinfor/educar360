"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Sparkles,
  Database,
  Smartphone,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      q: "Como funciona o período de trial gratuito de 14 dias?",
      a: "Você tem acesso irrestrito aos módulos da plataforma por 14 dias para testar na prática com sua equipe. Não exigimos cartão de crédito para iniciar e todo o ambiente é configurado em poucos minutos.",
    },
    {
      q: "O que acontece com os dados da minha escola? Eles ficam isolados?",
      a: "Sim, com rigor absoluto. O Educar360 foi construído com arquitetura multi-tenant onde cada escola é um tenant independente com Row-Level Security (RLS) no PostgreSQL. Nenhuma outra instituição ou usuário comum tem acesso aos seus dados cadastrais, financeiros ou notas.",
    },
    {
      q: "Qual a diferença entre os planos Start, Essencial, Profissional e Enterprise?",
      a: "O Start (R$ 199/mês) atende até 100 alunos com foco em Secretaria e Acadêmico. O Essencial (R$ 299/mês) expande para até 200 alunos com controle de matrículas e portal dos pais. O Profissional (R$ 499/mês) atende até 500 alunos com módulo financeiro integrado e portais completos. O Enterprise é sob consulta para redes e instituições acima de 500 alunos.",
    },
    {
      q: "É possível migrar dados de alunos e turmas de planilhas ou sistemas antigos?",
      a: "Sim. Oferecemos suporte guiado de importação de alunos, responsáveis e turmas para que sua escola não precise recadastrar nada manualmente nem perca histórico.",
    },
    {
      q: "Os pais e professores têm acessos e portais separados?",
      a: "Exatamente. O sistema possui controle de acesso granular (RBAC) com visão dedicada para Professores (diário e notas), Pais/Responsáveis (boletins, frequência e financeiro) e Alunos (tarefas e horários), totalmente otimizado para celulares.",
    },
    {
      q: "Como funciona a contratação do Plano Enterprise?",
      a: "Para instituições com mais de 500 alunos ou redes de ensino com múltiplas unidades, realizamos uma análise técnica e comercial personalizada, disponibilizando contrato sob medida e faturamento sob consulta.",
    },
  ];

  return (
    <div className="space-y-24 sm:space-y-36 pb-16 overflow-hidden">
      {/* 1. HERO SECTION PREMIUM */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 pb-12 overflow-hidden">
        {/* Background glow sutil e grid pontilhado */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-radial from-indigo-100/70 via-sky-50/40 to-transparent blur-2xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200/80 bg-white/80 text-indigo-700 text-xs sm:text-sm font-semibold shadow-xs backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>O ERP Escolar SaaS de Próxima Geração</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-normal">Multi-Tenant Nativo</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]"
            >
              Gestão Escolar Completa, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-indigo-500 to-sky-600">
                Integrada e 100% Segura
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed"
            >
              Elimine planilhas desconexas, reduza a inadimplência e centralize Secretaria, Acadêmico, Financeiro e Portais da Família em uma única plataforma SaaS construída para a educação brasileira.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <a
                href="#trial-form"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2.5 text-base hover:scale-[1.02] cursor-pointer"
              >
                <span>Experimentar Grátis por 14 Dias</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#planos"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all text-base hover:border-slate-300"
              >
                Ver Planos a partir de R$ 199/mês
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-4 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-500 font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sem necessidade de cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ativação em menos de 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Isolamento Row-Level Security</span>
              </div>
            </motion.div>
          </div>

          {/* Mockup 1: Hero Dashboard em perspectiva elevada */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-12 sm:mt-16 relative mx-auto max-w-5xl"
          >
            <div className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-white/70 backdrop-blur-md border border-slate-200 shadow-2xl shadow-indigo-500/10">
              <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 relative group">
                <Image
                  src="/images/mockups/educar360_hero_dashboard_mockup.jpg"
                  alt="Painel de Controle Central do Educar360"
                  width={1920}
                  height={1080}
                  priority
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.01]"
                />
              </div>

              {/* Badges de Características Técnicas Reais */}
              <div className="hidden md:flex items-center gap-3 absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Gestão Financeira</p>
                  <p className="text-sm font-bold text-slate-900">Controle de mensalidades centralizado</p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 absolute -top-6 -right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Arquitetura de Segurança</p>
                  <p className="text-sm font-bold text-slate-900">Tenant 100% Isolado (RLS)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. BARRA DE CONFIANÇA E SEGURANÇA */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="pt-4 md:pt-0 space-y-1">
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Lock className="w-5 h-5" />
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl">LGPD</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Conformidade total com dados de menores</p>
            </div>

            <div className="pt-4 md:pt-0 space-y-1">
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Database className="w-5 h-5" />
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl">PostgreSQL RLS</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Isolamento rigoroso em nível de banco</p>
            </div>

            <div className="pt-4 md:pt-0 space-y-1">
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Zap className="w-5 h-5" />
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl">14 Dias Grátis</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Sem fidelidade e sem cartão inicial</p>
            </div>

            <div className="pt-4 md:pt-0 space-y-1">
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Users className="w-5 h-5" />
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl">Suporte Dedicado</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Ajuda na importação de turmas e alunos</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BENTO GRID DOS PRINCIPAIS MÓDULOS */}
      <section id="modulos" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ecossistema Integrado 360°</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Cada área da escola em perfeita sincronia
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            Chega de sistemas separados que não conversam entre si. O Educar360 unifica a rotina acadêmica, documental e financeira.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 - Secretaria (Grande) */}
          <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4 max-w-xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Secretaria Escolar Completa</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Prontuário completo do aluno, documentos pessoais, histórico escolar, livro de matrícula e vínculo inteligente de múltiplos responsáveis legais, pedagógicos e financeiros.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fichas individuais e certidões</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Vínculo de múltiplos responsáveis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Histórico de transferências</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Gestão de status ativo/inativo</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <a href="#secretaria" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5">
                <span>Ver detalhes da Secretaria</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2 - Financeiro */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Financeiro & Mensalidades</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Controle centralizado de faturamento por aluno, acompanhamento de pagamentos e visão panorâmica da receita da escola.
              </p>
            </div>
            <div className="pt-6">
              <a href="#financeiro" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5">
                <span>Conhecer o Financeiro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 3 - Diário & Acadêmico */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                <School className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Diário do Professor</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Lançamento de frequência e notas por turma, cálculo automático de médias e acompanhamento de desempenho dos alunos.
              </p>
            </div>
            <div className="pt-6">
              <span className="text-xs font-semibold text-slate-400">Integrado ao Módulo Acadêmico</span>
            </div>
          </div>

          {/* Card 4 - Portais dos Pais (Grande) */}
          <div className="md:col-span-2 bg-linear-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4 max-w-xl relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Portal da Família na Palma da Mão</h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Os responsáveis terão acesso ao acompanhamento escolar e comunicados diretamente pelo smartphone, estreitando o vínculo escola-família.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-indigo-200 font-medium">
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">Comunicados institucionais</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">Acesso via celular</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">Em desenvolvimento ativo</span>
              </div>
            </div>
            <div className="pt-6 relative z-10">
              <a href="#portais" className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1.5">
                <span>Ver mais sobre os portais</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO SECRETARIA + MOCKUP 2 */}
      <section id="secretaria" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Módulo Secretaria</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Ficha do Aluno estruturada para a realidade da sua escola
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              O módulo Secretaria do Educar360 centraliza dados pessoais, documentos (CPF/RG), certidões, contatos de emergência e histórico de saúde de cada estudante.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Vínculo Aluno ↔ Responsáveis N:N</h4>
                  <p className="text-xs text-slate-500">Mãe, pai ou tutor legal vinculados a um ou mais irmãos na mesma escola com indicação de responsável financeiro e pedagógico.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Isolamento Multi-Tenant Garantido</h4>
                  <p className="text-xs text-slate-500">Todas as consultas e edições possuem validação de tenant_id com proteção de políticas RLS em nível de banco de dados.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Busca e Filtros Instantâneos</h4>
                  <p className="text-xs text-slate-500">Localize qualquer matrícula por nome, CPF ou status ativo/inativo sem lentidão.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#trial-form"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <span>Experimentar Secretaria no Trial</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-2 sm:p-3 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60">
              <div className="rounded-2xl overflow-hidden border border-slate-100">
                <Image
                  src="/images/mockups/educar360_secretaria_ficha_mockup.jpg"
                  alt="Ficha de Cadastro do Aluno e Responsáveis no Educar360"
                  width={1280}
                  height={720}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SEÇÃO FINANCEIRO + MOCKUP 3 */}
      <section id="financeiro" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="p-2 sm:p-3 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60">
              <div className="rounded-2xl overflow-hidden border border-slate-100">
                <Image
                  src="/images/mockups/educar360_financeiro_mockup.jpg"
                  alt="Painel Financeiro e Controle de Mensalidades"
                  width={1280}
                  height={720}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Módulo Financeiro</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Previsibilidade de caixa e combate ativo à inadimplência
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              O módulo Financeiro Escolar centraliza o controle de mensalidades, oferecendo visão clara do status de pagamento por aluno e o panorama financeiro da instituição.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Controle de Mensalidades por Aluno</h4>
                  <p className="text-xs text-slate-500">Acompanhe o status de cada parcela por estudante — paga, pendente ou em atraso — com histórico completo.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Visão Panorâmica da Receita</h4>
                  <p className="text-xs text-slate-500">Painel com totais por turma e período letivo para facilitar o planejamento financeiro da instituição.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Isolamento Financeiro por Tenant</h4>
                  <p className="text-xs text-slate-500">Todos os dados financeiros são rigorosamente isolados por instituição via Row-Level Security no banco de dados.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#planos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <span>Ver Planos com Módulo Financeiro</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SEÇÃO PORTAIS + MOCKUP 4 MOBILE */}
      <section id="portais" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-14 lg:p-16 text-white relative overflow-hidden">
          {/* Efeitos de gradiente escuro refinado */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Portal da Família</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                A escola conectada aos pais onde quer que estejam
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Projetado com arquitetura Mobile-First, o portal dos responsáveis foi desenhado para conectar escola e família com acesso seguro e personalizado por perfil de usuário.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200 font-medium">Experiência Mobile-First para pais e responsáveis</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200 font-medium">Acesso com credenciais vinculadas ao aluno (multi-perfil)</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200 font-medium">Arquitetura com controle de acesso RBAC por perfil (pai, aluno, professor)</span>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="#trial-form"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all"
                >
                  <span>Solicitar Acesso ao Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="max-w-[340px] sm:max-w-[380px] p-2 bg-slate-800/80 rounded-[40px] border border-slate-700 shadow-2xl">
                <div className="rounded-[32px] overflow-hidden border border-slate-700">
                  <Image
                    src="/images/mockups/educar360_portal_pais_mobile.jpg"
                    alt="Portal dos Pais no Smartphone"
                    width={800}
                    height={1067}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PLANOS SAAS OFICIAIS */}
      <section id="planos" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span>Tabela Oficial de Preços</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Planos proporcionais ao tamanho da sua escola
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            Valores fixos mensais sem taxas ocultas por matrícula. Teste grátis por 14 dias com suporte incluso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {OFFICIAL_SAAS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 border flex flex-col justify-between space-y-6 transition-all duration-300 ${
                plan.highlight
                  ? "bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 relative -translate-y-1"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md">
                  {plan.badgeLabel || "Mais Escolhido"}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">
                    {plan.studentsFormatted}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 min-h-[36px] leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 pt-2 border-b border-slate-100 pb-4">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {plan.priceFormatted}
                  </span>
                  {plan.price_cents > 0 ? (
                    <span className="text-xs text-slate-400 font-medium">/mês</span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium ml-1">(sob medida)</span>
                  )}
                </div>

                <ul className="space-y-3 pt-2 text-xs text-slate-600 font-medium">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="#trial-form"
                className={`w-full py-3.5 rounded-xl font-bold text-xs text-center transition-all ${
                  plan.highlight
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 hover:translate-y-[-1px]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                {plan.price_cents === 0 ? "Falar com Consultor" : `Testar 14 Dias no Plano ${plan.name}`}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 8. FORMULÁRIO DE CAPTAÇÃO (TRIAL) */}
      <section id="trial-form" className="max-w-4xl mx-auto px-6 scroll-mt-24">
        <LeadForm />
      </section>

      {/* 9. FAQ (PERGUNTAS FREQUENTES) */}
      <section id="faq" className="max-w-3xl mx-auto px-6 scroll-mt-24">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tudo o que você precisa saber sobre a contratação e implantação do Educar360.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. CTA FINAL DE CONVERSÃO */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-linear-to-r from-indigo-700 via-indigo-600 to-sky-700 rounded-3xl p-10 sm:p-16 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comece Hoje Mesmo Sem Riscos</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
            Pronto para transformar a rotina da sua instituição?
          </h2>

          <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Inicie seu teste gratuito de 14 dias agora mesmo e veja como o Educar360 economiza horas da sua equipe e simplifica a gestão escolar.
          </p>

          <div className="pt-2">
            <a
              href="#trial-form"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-indigo-950 bg-white hover:bg-slate-100 shadow-xl transition-all hover:scale-105"
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

