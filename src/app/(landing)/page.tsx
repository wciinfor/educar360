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
      q: "Como funciona o período de teste gratuito de 14 dias?",
      a: "Você tem acesso irrestrito a todos os módulos do sistema por 14 dias para testar na prática com sua equipe. Não exigimos cartão de crédito para iniciar e todo o ambiente é configurado em poucos minutos.",
    },
    {
      q: "Os dados da minha escola ficam realmente seguros e protegidos?",
      a: "Sim, com total privacidade e isolamento. O Educar360 protege as informações de cada instituição de forma independente e criptografada, em total conformidade com a LGPD. Nenhuma outra escola tem acesso aos seus dados cadastrais, financeiros ou notas.",
    },
    {
      q: "Qual a diferença entre os planos Start, Essencial, Profissional e Enterprise?",
      a: "O Start (R$ 199/mês) atende até 100 alunos com foco em Secretaria e Acadêmico. O Essencial (R$ 299/mês) expande para até 200 alunos. O Profissional (R$ 499/mês) atende até 500 alunos com módulo financeiro integrado. O Enterprise é sob medida para redes de ensino acima de 500 alunos.",
    },
    {
      q: "É possível migrar dados de alunos e turmas de planilhas ou sistemas antigos?",
      a: "Sim. Oferecemos suporte guiado de importação de alunos, responsáveis e turmas para que sua escola não precise recadastrar nada manualmente.",
    },
    {
      q: "Os pais e professores têm acessos separados no sistema?",
      a: "Sim. O sistema possui perfis de acesso exclusivos para Professores (diário e frequência), Pais/Responsáveis (acompanhamento dos filhos) e Alunos, totalmente otimizado para celulares.",
    },
    {
      q: "Como funciona a contratação do Plano Enterprise?",
      a: "Para instituições com mais de 500 alunos ou redes de ensino com múltiplas unidades, disponibilizamos proposta personalizada e condições exclusivas sob consulta.",
    },
  ];

  return (
    <div className="overflow-hidden min-h-screen flex flex-col">
      {/* BARRA DE MENU SUPERIOR */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group shrink-0 py-2">
            <Image
              src="/images/landing/logoh.png"
              alt="Educar360 - Gestão escolar sem limites"
              width={180}
              height={44}
              priority
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Navegação central com aba Início ativa */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 font-medium h-full">
            <Link
              href="/"
              className="text-blue-600 font-bold relative py-6 border-b-2 border-blue-600 -mb-[1px]"
            >
              Início
            </Link>
            <a href="#modulos" className="hover:text-blue-700 transition-colors py-6">
              Soluções
            </a>
            <a href="#planos" className="hover:text-blue-700 transition-colors py-6">
              Planos
            </a>
            <a href="#diferenciais" className="hover:text-blue-700 transition-colors py-6">
              Diferenciais
            </a>
            <a href="#faq" className="hover:text-blue-700 transition-colors py-6">
              FAQ
            </a>
          </nav>

          {/* Ações */}
          <div className="flex items-center">
            <Link
              href="/app/login"
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <span>Acesso ao sistema</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION INTEGRADA COM FORMATO COMPACTO E ELEGANTE */}
      <section 
        className="relative pt-6 sm:pt-10 lg:pt-12 pb-8 sm:pb-12 lg:pb-14 overflow-hidden bg-no-repeat min-h-[500px] sm:min-h-[540px] md:min-h-[580px] lg:min-h-[620px] flex items-center bg-cover bg-[center_top] sm:bg-[right_top]"
        style={{ 
          backgroundImage: "url('/images/landing/hero3.png')",
        }}
      >
        {/* Camada de fade suave à esquerda para garantir legibilidade 100% nítida de todo o texto */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-[60%] bg-linear-to-r from-white via-white/95 sm:via-white/85 to-transparent pointer-events-none z-1" />
        {/* Proteção superior para telas mobile/tablet */}
        <div className="absolute inset-0 bg-linear-to-b from-white/90 via-white/70 to-transparent lg:hidden pointer-events-none z-1" />

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="max-w-xl md:max-w-2xl space-y-4 text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200/90 bg-white/95 backdrop-blur-sm text-blue-700 text-xs sm:text-sm font-semibold shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>O Sistema de Gestão Escolar Completo</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.12]"
            >
              Mais tempo <br />
              para educar. <br />
              <span className="text-blue-700">
                Menos burocracia para você.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-slate-700 sm:text-slate-600 font-normal leading-relaxed max-w-lg"
            >
              O Educar360 é a plataforma de gestão escolar completa para instituições de ensino que desejam organização, segurança e crescimento, em um ambiente 100% online e seguro para a sua escola.
            </motion.p>

            {/* Botões de Ação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 pt-1"
            >
              <a
                href="#trial-form"
                className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base hover:scale-[1.02] cursor-pointer"
              >
                <span>Testar Grátis por 14 dias</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#planos"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all text-sm text-center"
              >
                Conhecer os planos
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. FAIXA VISUAL DE CONFIANÇA E BENEFÍCIOS (CARD INDEPENDENTE IMEDIATAMENTE ABAIXO DO HERO) */}
      <section className="max-w-7xl mx-auto px-6 relative z-10 mt-6 sm:mt-8 mb-12 sm:mb-16">
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
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
                <span>Dados Isolados</span>
              </div>
              <p className="text-xs text-slate-500">privacidade total por escola</p>
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

      {/* CONTAINER DAS DEMAIS SEÇÕES COM ESPAÇAMENTO CONTROLADO */}
      <div className="space-y-20 sm:space-y-28">
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
                  <h4 className="text-sm font-bold text-slate-900">Privacidade e Segurança Total</h4>
                  <p className="text-xs text-slate-500">Todas as informações da sua instituição são protegidas com controle rigoroso de acesso e criptografia.</p>
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
                  <h4 className="text-sm font-bold text-slate-900">Informações Protegidas e Exclusivas</h4>
                  <p className="text-xs text-slate-500">Dados financeiros restritos exclusivamente aos administradores da sua instituição.</p>
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
                Desenvolvido para smartphones, o portal dos responsáveis aproxima a escola das famílias com praticidade e total segurança.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Experiência pensada para celulares</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Acesso seguro com login individual por responsável</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-100">Perfis exclusivos para professores, pais e alunos</span>
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
      </div>

      {/* 11. ENCERRAMENTO VISUAL: CTA FINAL SUPER COMPACTO */}
      <section className="w-full bg-blue-950 text-white relative overflow-hidden py-6 sm:py-7 mt-10 sm:mt-14 border-t border-blue-900/60">
        {/* Efeitos de iluminação sutil de fundo */}
        <div className="absolute top-0 right-1/4 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8">
            
            <div className="space-y-1.5 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 text-[10px] font-semibold backdrop-blur-xs border border-white/10">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Comece hoje sem riscos</span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                Pronto para transformar a gestão da sua escola?
              </h2>

              <p className="text-xs text-blue-200 leading-relaxed max-w-xl">
                Teste o Educar360 por 14 dias, sem cartão de crédito, e descubra como é fácil gerenciar sua instituição com mais tecnologia, segurança e tranquilidade.
              </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 shrink-0 w-full sm:w-auto">
              <a
                href="#trial-form"
                className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
              >
                <span>Testar Grátis por 14 dias</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="text-[10px] text-blue-300">
                Sem cartão de crédito · Cancelamento a qualquer momento
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 12. FOOTER COMPLETO E PROFISSIONAL DA LANDING PAGE */}
      <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800/90 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            
            {/* Coluna Institucional / Logo */}
            <div className="lg:col-span-2 space-y-5">
              <Link href="/" className="inline-block bg-white rounded-xl p-2.5 shadow-sm">
                <Image
                  src="/images/landing/logoh.png"
                  alt="Educar360 - Gestão escolar sem limites"
                  width={160}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Plataforma de gestão escolar completa e moderna para escolas e redes de ensino que buscam organização, eficiência pedagógica e crescimento sustentável.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                <ShieldCheck className="w-4 h-4" />
                <span>Dados Seguros · Em conformidade com a LGPD</span>
              </div>
            </div>

            {/* Coluna Navegação */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Navegação
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Início
                  </Link>
                </li>
                <li>
                  <a href="#modulos" className="hover:text-white transition-colors">
                    Soluções
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white transition-colors">
                    Planos
                  </a>
                </li>
                <li>
                  <a href="#diferenciais" className="hover:text-white transition-colors">
                    Diferenciais
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna Soluções */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Soluções
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <a href="#modulos" className="hover:text-white transition-colors">
                    Secretaria Escolar
                  </a>
                </li>
                <li>
                  <a href="#modulos" className="hover:text-white transition-colors">
                    Gestão Acadêmica
                  </a>
                </li>
                <li>
                  <a href="#modulos" className="hover:text-white transition-colors">
                    Financeiro & Mensalidades
                  </a>
                </li>
                <li>
                  <a href="#modulos" className="hover:text-white transition-colors">
                    Portal da Família & Aluno
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna Acesso & Contato */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Acesso ao Sistema
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <Link href="/app/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors flex items-center gap-1">
                    <span>Área da Escola</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <a href="#trial-form" className="hover:text-white transition-colors">
                    Iniciar Teste de 14 Dias
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    Central de Dúvidas
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Linha inferior de Copyright e Termos Legais */}
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} Educar360. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#faq" className="hover:text-slate-300 transition-colors">
                Política de Privacidade
              </a>
              <span>•</span>
              <a href="#faq" className="hover:text-slate-300 transition-colors">
                Termos de Uso
              </a>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Educação que transforma futuros</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}