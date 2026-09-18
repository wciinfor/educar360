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
  Smartphone,
  Lock,
  Database,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
  HeartHandshake,
  BookOpen,
  TrendingUp,
  Headphones,
  Check
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
      a: "Sim, com rigor absoluto. O Educar360 foi construído com arquitetura multi-tenant onde cada escola é um tenant independente com Row-Level Security (RLS) no PostgreSQL. Nenhuma outra instituição ou usuário comum tem acesso aos seus dados.",
    },
    {
      q: "Qual a diferença entre os planos Start, Essencial, Profissional e Enterprise?",
      a: "O Start (R$ 199/mês) atende até 100 alunos com foco em Secretaria e Acadêmico. O Essencial (R$ 299/mês) expande para até 200 alunos. O Profissional (R$ 499/mês) atende até 500 alunos com módulo financeiro integrado. O Enterprise é sob consulta para redes acima de 500 alunos.",
    },
    {
      q: "É possível migrar dados de alunos e turmas de planilhas ou sistemas antigos?",
      a: "Sim. Oferecemos suporte guiado de importação de alunos, responsáveis e turmas para que sua escola não precise recadastrar nada manualmente.",
    },
    {
      q: "Os pais e professores têm acessos e portais separados?",
      a: "Sim. O sistema conta com controle de acesso granular (RBAC) com visões dedicadas para Professores, Pais/Responsáveis e Alunos, totalmente responsivo para celulares.",
    },
    {
      q: "Como funciona a contratação do Plano Enterprise?",
      a: "Para instituições com mais de 500 alunos ou redes com múltiplas unidades, disponibilizamos contrato sob medida e condições especiais sob consulta.",
    },
  ];

  return (
    <div className="space-y-20 sm:space-y-28 pb-16 overflow-hidden">
      {/* 1. HERO SECTION EMOCIONAL + VISUAL BASEADO NO DESIGN */}
      <section className="relative pt-6 sm:pt-12 lg:pt-16 pb-6 overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute top-0 right-0 w-full max-w-4xl h-[600px] bg-radial from-sky-100/60 via-indigo-50/30 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* LADO ESQUERDO: TEXTO E CTAS */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50/70 text-blue-800 text-xs sm:text-sm font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>O ERP Escolar SaaS de Próxima Geração</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]"
              >
                Mais tempo <br />
                para educar. <br />
                <span className="text-blue-700">
                  Menos burocracia para você.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed"
              >
                O Educar360 simplifica a gestão da sua escola para que sua equipe possa dedicar mais tempo ao que realmente importa: a educação.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 pt-2"
              >
                <a
                  href="#trial-form"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 text-base hover:scale-[1.02] cursor-pointer"
                >
                  <span>Testar Grátis por 14 dias</span>
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="#planos"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all text-sm text-center"
                >
                  Conhecer os planos
                </a>
              </motion.div>
            </div>

            {/* LADO DIREITO: COMPOSIÇÃO FOTOGRAFIA + MOCKUP + CARDS FLUTUANTES */}
            <div className="lg:col-span-7 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative"
              >
                {/* Imagem Principal de Pessoas (Alunos + Professora) */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100 aspect-[4/3] max-h-[460px] w-full">
                  <Image
                    src="/images/landing/hero_escola_alunos_professor.jpg"
                    alt="Professora e estudantes em ambiente escolar moderno"
                    fill
                    priority
                    className="object-cover object-top"
                  />
                  {/* Gradiente sutil para legibilidade dos cards */}
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Badge Flutuante 1: Frase de Impacto Superior Direita */}
                <div className="hidden sm:flex items-center gap-2 absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-white shadow-xl">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold tracking-wide">
                    Educação é construir novos futuros
                  </span>
                </div>

                {/* Mockup do Dashboard Sobreposto (Lado Inferior Direito) */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="absolute -bottom-10 right-2 sm:right-6 w-[70%] sm:w-[60%] max-w-[380px] bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xl shadow-blue-900/20"
                >
                  <div className="rounded-xl overflow-hidden border border-slate-100 relative group">
                    <Image
                      src="/images/mockups/educar360_hero_dashboard_mockup.jpg"
                      alt="Interface do Dashboard Educar360"
                      width={600}
                      height={340}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </motion.div>

                {/* Badge Flutuante 2: Gestão Completa (Acima do Mockup) */}
                <div className="hidden sm:flex items-center gap-3 absolute top-1/2 -right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/60 max-w-[210px]">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 leading-tight">Gestão completa</p>
                    <p className="text-[10px] text-slate-500">para uma educação que transforma</p>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FAIXA VISUAL DE CONFIANÇA E SEGURANÇA */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            <div className="pt-3 md:pt-0 flex flex-col items-center justify-center gap-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base">
                <Calendar className="w-4 h-4" />
                <span>14 dias grátis</span>
              </div>
              <p className="text-xs text-slate-500">sem cartão de crédito</p>
            </div>

            <div className="pt-3 md:pt-0 flex flex-col items-center justify-center gap-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base">
                <ShieldCheck className="w-4 h-4" />
                <span>Conformidade</span>
              </div>
              <p className="text-xs text-slate-500">com a LGPD e privacidade</p>
            </div>

            <div className="pt-3 md:pt-0 flex flex-col items-center justify-center gap-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base">
                <Database className="w-4 h-4" />
                <span>Multi-tenant</span>
              </div>
              <p className="text-xs text-slate-500">com PostgreSQL RLS</p>
            </div>

            <div className="pt-3 md:pt-0 flex flex-col items-center justify-center gap-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base">
                <Headphones className="w-4 h-4" />
                <span>Suporte dedicado</span>
              </div>
              <p className="text-xs text-slate-500">na implantação escolar</p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. MÓDULOS COMO EXPERIÊNCIAS VISUAIS (BENTO GRID MODERNO) */}
      <section id="modulos" className="max-w-7xl mx-auto px-6 scroll-mt-24 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tudo o que a sua escola precisa, em um só lugar
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            Módulos integrados para simplificar a gestão e impulsionar o seu crescimento.
          </p>
        </div>

        {/* 4 Cards Principais alinhados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card Secretaria */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Secretaria Escolar
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cadastre alunos, gerencie documentos, responsáveis e histórico escolar de forma organizada.
              </p>
            </div>
            <div>
              <a href="#secretaria" className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1">
                <span>Saiba mais</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card Financeiro */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Financeiro & Mensalidades
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Controle de mensalidades, acompanhamento de pagamentos e visão panorâmica da receita.
              </p>
            </div>
            <div>
              <a href="#financeiro" className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                <span>Saiba mais</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card Diário */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Diário do Professor
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Registro de aulas, turmas e acompanhamento de desempenho e faltas dos alunos.
              </p>
            </div>
            <div>
              <a href="#diferenciais" className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1">
                <span>Saiba mais</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card Portais */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Portal da Família
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Comunicados institucionais e acesso mobile prático para os pais e responsáveis.
              </p>
              <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                Em desenvolvimento ativo
              </span>
            </div>
            <div>
              <a href="#portais" className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
                <span>Saiba mais</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SEÇÃO EMOCIONAL: EDUCAÇÃO COM GESTÃO INTELIGENTE (FOTO + CARDS) */}
      <section id="diferenciais" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="bg-slate-50 border border-slate-200/70 rounded-3xl p-8 sm:p-12 lg:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Imagem com badge flutuante */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white aspect-[4/3] relative">
                <Image
                  src="/images/landing/sala_aula_moderna_brasil.jpg"
                  alt="Professor e alunos em sala de aula moderna"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Badge Flutuante no canto */}
              <div className="hidden sm:flex items-center gap-2.5 absolute -top-4 -left-4 bg-white p-3 rounded-xl border border-slate-200 shadow-lg max-w-[220px]">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-800 leading-tight">
                  Escolas mais organizadas. Alunos com mais oportunidades.
                </p>
              </div>

              <div className="mt-4 text-center sm:text-left">
                <span className="text-xs font-medium text-blue-800 italic">
                  Tecnologia a serviço da educação
                </span>
              </div>
            </div>

            {/* Conteúdo textual */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Educação com gestão inteligente
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  O Educar360 foi desenvolvido para atender às necessidades de escolas que desejam crescer com organização, segurança e eficiência. Uma plataforma moderna, intuitiva e acessível, para que toda a equipe foque no que realmente importa: o aprendizado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Ambiente 100% online e seguro</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Isolamento total dos dados por instituição</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Interface simples e intuitiva</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Suporte especializado na implantação</span>
                </div>
              </div>

              {/* Card de propósito */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  Mais que um sistema, um parceiro na sua missão de educar.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. SEÇÃO SECRETARIA COM FOTOGRAFIA DE GESTORA + MOCKUP */}
      <section id="secretaria" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Módulo Secretaria</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Ficha do Aluno estruturada para a rotina da sua escola
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              O módulo Secretaria do Educar360 centraliza dados pessoais, documentos (CPF/RG), certidões, contatos de emergência e histórico de cada estudante em poucos cliques.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Vínculo Aluno ↔ Responsáveis N:N</h4>
                  <p className="text-xs text-slate-500">Mãe, pai ou tutor legal vinculados a um ou mais alunos com indicação de responsável financeiro e pedagógico.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Isolamento Multi-Tenant Garantido</h4>
                  <p className="text-xs text-slate-500">Todas as consultas e edições possuem isolamento rigoroso via Row-Level Security no PostgreSQL.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Busca e Filtros Instantâneos</h4>
                  <p className="text-xs text-slate-500">Localize cadastros por nome, CPF ou status ativo/inativo sem lentidão.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#trial-form"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
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

      {/* 6. SEÇÃO FINANCEIRO + MOCKUP */}
      <section id="financeiro" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
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
              <CreditCard className="w-3.5 h-3.5" />
              <span>Módulo Financeiro</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Previsibilidade de caixa e gestão organizada de mensalidades
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              O módulo Financeiro Escolar centraliza o controle de mensalidades, oferecendo visão clara do status de pagamento por aluno e o panorama financeiro da instituição.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Controle por Aluno</h4>
                  <p className="text-xs text-slate-500">Acompanhe parcelas pagas, pendentes ou em atraso com histórico organizado.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Visão Panorâmica da Receita</h4>
                  <p className="text-xs text-slate-500">Painel com totais por turma e período letivo para o planejamento financeiro.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Isolamento Financeiro por Tenant</h4>
                  <p className="text-xs text-slate-500">Dados protegidos e isolados por instituição via Row-Level Security.</p>
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

      {/* 7. SEÇÃO PORTAIS (FUNDO AZUL PROFUNDO + MOBILE MOCKUP) */}
      <section id="portais" className="max-w-7xl mx-auto px-6 scroll-mt-24">
        <div className="bg-blue-950 rounded-3xl p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Portal da Família</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                A escola conectada aos pais onde quer que estejam
              </h2>

              <p className="text-sm sm:text-base text-blue-200 leading-relaxed">
                Projetado com arquitetura Mobile-First, o portal dos responsáveis foi desenhado para aproximar a escola das famílias com segurança e facilidade.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Experiência pensada para smartphones</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Acesso seguro com credenciais por perfil</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Controle de acesso granular RBAC</span>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="#trial-form"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all"
                >
                  <span>Solicitar Acesso no Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="max-w-[300px] sm:max-w-[340px] p-2 bg-blue-900/60 rounded-[36px] border border-blue-800 shadow-2xl">
                <div className="rounded-[28px] overflow-hidden border border-blue-700">
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

      {/* 8. PLANOS COMERCIAIS OFICIAIS (BASEADO NO DESIGN DE REFERÊNCIA) */}
      <section id="planos" className="max-w-7xl mx-auto px-6 scroll-mt-24 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Planos para cada fase da sua escola
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            Escolha o plano ideal e comece agora. Todos incluem 14 dias grátis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {OFFICIAL_SAAS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 border flex flex-col justify-between space-y-6 transition-all duration-300 ${
                plan.highlight
                  ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-600/10 relative -translate-y-1"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md">
                  {plan.badgeLabel || "Mais Escolhido"}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                    {plan.studentsFormatted}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 pt-1 pb-3 border-b border-slate-100">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {plan.priceFormatted}
                  </span>
                  {plan.price_cents > 0 ? (
                    <span className="text-xs text-slate-400 font-medium">/mês</span>
                  ) : null}
                </div>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-600 font-medium">
                  {plan.features.slice(0, 4).map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="#trial-form"
                className={`w-full py-3.5 rounded-xl font-bold text-xs text-center transition-all ${
                  plan.highlight
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                {plan.price_cents === 0 ? "Falar com um consultor" : "Testar Grátis"}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FORMULÁRIO DE CAPTAÇÃO (TRIAL) */}
      <section id="trial-form" className="max-w-4xl mx-auto px-6 scroll-mt-24">
        <LeadForm />
      </section>

      {/* 10. FAQ (PERGUNTAS FREQUENTES) */}
      <section id="faq" className="max-w-3xl mx-auto px-6 scroll-mt-24 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-blue-700 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-700" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. CTA FINAL FORTE COM FUNDO AZUL PROFUNDO (IDÊNTICO À REFERÊNCIA) */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-blue-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            <div className="space-y-3 text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comece hoje sem riscos</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Pronto para transformar a gestão da sua escola?
              </h2>

              <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
                Teste o Educar360 por 14 dias, sem cartão de crédito, e descubra como é fácil gerenciar sua instituição com mais tecnologia, segurança e tranquilidade.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <a
                href="#trial-form"
                className="px-8 py-4 rounded-xl font-bold text-base text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/30 transition-all flex items-center gap-2 hover:scale-105"
              >
                <span>Testar Grátis por 14 dias</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <span className="text-[11px] text-blue-300">
                Sem cartão de crédito · Cancelamento a qualquer momento
              </span>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}