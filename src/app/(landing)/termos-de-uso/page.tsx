import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  Building,
  CreditCard,
  Ban,
  Shield,
  Clock,
  Scale,
  RefreshCw,
} from "lucide-react";

export const metadata = {
  title: "Termos de Uso — Educar360",
  description:
    "Termos e Condições Gerais de Uso da Plataforma Educar360. Conheça os direitos, deveres, regras de assinatura e responsabilidades.",
};

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* CABEÇALHO */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center group py-2">
            <Image
              src="/images/landing/logoh.png"
              alt="Educar360 - Gestão escolar sem limites"
              width={160}
              height={40}
              priority
              className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 px-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao início</span>
          </Link>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 py-12 sm:py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header do Documento */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <FileCheck2 className="w-4 h-4" />
              <span>Contrato de Licenciamento SaaS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Termos de Uso
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Bem-vindo ao <strong>Educar360</strong>. Estes Termos de Uso
              disciplinam as condições gerais de acesso, licenciamento e utilização
              da plataforma tecnológica por escolas, gestores, docentes, responsáveis e alunos.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <span>Última atualização: Setembro de 2026</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Vigência Imediata
              </span>
            </div>
          </div>

          {/* Seções do Documento */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm space-y-12 text-slate-700 leading-relaxed">
            {/* Seção 1 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Aceitação dos Termos e Objeto
                </h2>
              </div>
              <p>
                Ao criar uma conta, iniciar um período de teste gratuito de 14 dias ou acessar qualquer módulo do Educar360, a instituição contratante e seus usuários declaram ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a nossa Política de Privacidade.
              </p>
              <p>
                O <strong>Educar360</strong> concede à instituição uma licença de software temporária, não exclusiva, revogável e intransferível, na modalidade Software como Serviço (SaaS), para apoio à gestão acadêmica, administrativa, pedagógica e financeira da escola.
              </p>
            </section>

            {/* Seção 2 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Cadastro, Credenciais e Primeiro Acesso
                </h2>
              </div>
              <p>
                O acesso à plataforma é condicionado a cadastro prévio verídico:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base">
                <li>
                  O administrador escolar inicial recebe um convite com token exclusivo de ativação para configurar sua senha pessoal;
                </li>
                <li>
                  As credenciais de acesso (e-mail e senha) são estritamente pessoais e intransferíveis, sendo o usuário exclusivamente responsável pela sua confidencialidade;
                </li>
                <li>
                  O compartilhamento indevido de senhas institucionais é expressamente proibido por motivos de segurança e integridade de auditoria.
                </li>
              </ul>
            </section>

            {/* Seção 3 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Período de Teste Gratuito (Trial de 14 Dias)
                </h2>
              </div>
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Degustação Completa sem Compromisso</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">
                  O Educar360 oferece um período de teste de 14 dias corridos a novas escolas cadastradas, sem exigência de cartão de crédito no momento do onboarding. Durante este período, a instituição usufrui dos recursos do plano selecionado.
                </p>
              </div>
              <p className="text-sm sm:text-base text-slate-600">
                Ao término dos 14 dias, para continuar utilizando a plataforma, a escola deverá confirmar a contratação do plano regular. Caso não opte pela continuidade, o acesso ao ambiente será suspenso sem qualquer cobrança retroativa.
              </p>
            </section>

            {/* Seção 4 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Planos, Mensalidades e Cancelamento
                </h2>
              </div>
              <p>
                Os planos comerciais disponíveis atendem diferentes portes de instituições:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">Plano Start</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">R$ 199/mês</div>
                  <div className="text-xs text-slate-500 mt-1">Até 100 alunos</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">Plano Essencial</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">R$ 299/mês</div>
                  <div className="text-xs text-slate-500 mt-1">Até 200 alunos</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">Plano Profissional</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">R$ 499/mês</div>
                  <div className="text-xs text-slate-500 mt-1">Até 500 alunos</div>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base pt-2">
                <li>
                  As mensalidades são pré-pagas e cobradas periodicamente de acordo com o ciclo contratado;
                </li>
                <li>
                  O cancelamento pode ser solicitado a qualquer momento pelo administrador da escola, sem multas rescisórias abusivas, permanecendo o acesso ativo até o término da competência já quitada;
                </li>
                <li>
                  Instituições com mais de 500 alunos ou redes municipais/privadas operam sob proposta customizada do Plano Enterprise.
                </li>
              </ul>
            </section>

            {/* Seção 5 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Responsabilidades das Partes
                </h2>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-base">Da Escola Contratante:</h3>
                <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
                  <li>Garantir a veracidade, exatidão e legitimidade de todos os dados de alunos, docentes e responsáveis inseridos no sistema;</li>
                  <li>Gerenciar as permissões e desligamentos de seus próprios colaboradores escolares (professores e secretários);</li>
                  <li>Utilizar a plataforma em estrita conformidade com as leis educacionais e civis brasileiras.</li>
                </ul>

                <h3 className="font-bold text-slate-900 text-base pt-2">Do Educar360:</h3>
                <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
                  <li>Manter a disponibilidade e integridade da infraestrutura com esforços comerciais razoáveis;</li>
                  <li>Prestar suporte técnico operacional pelos canais oficiais de atendimento;</li>
                  <li>Implementar backups periódicos e proteção lógica dos dados do software.</li>
                </ul>
              </div>
            </section>

            {/* Seção 6 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Uso Permitido e Condutas Proibidas
                </h2>
              </div>
              <p>É expressamente vedado a qualquer usuário ou instituição:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {[
                  "Praticar engenharia reversa ou descompilação do sistema",
                  "Tentar burlar o isolamento de tenants ou autenticação",
                  "Inserir arquivos maliciosos, vírus ou scripts danosos",
                  "Utilizar robôs ou scrapers para extração em massa não autorizada",
                  "Ceder ou sublicenciar a plataforma a terceiros não autorizados",
                  "Inserir conteúdos ilícitos, discriminatórios ou difamatórios",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs sm:text-sm text-rose-900"
                  >
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Seção 7 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Propriedade Intelectual
                </h2>
              </div>
              <p>
                Todos os direitos autorais, códigos-fonte, marcas, logotipos, layouts e documentações pertencem com exclusividade ao <strong>Educar360</strong>. Os dados acadêmicos e cadastrais inseridos pela escola pertencem exclusivamente à instituição e aos respectivos titulares, não havendo cessão de direitos proprietários sobre o conteúdo pedagógico e institucional da escola.
              </p>
            </section>

            {/* Seção 8 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Disponibilidade e Manutenções
                </h2>
              </div>
              <p>
                Buscamos assegurar índice elevado de disponibilidade (uptime). Manutenções programadas ou atualizações evolutivas serão preferencialmente realizadas em horários de menor tráfego (noturno ou finais de semana), com aviso prévio aos administradores sempre que viável.
              </p>
            </section>

            {/* Seção 9 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Disposições Gerais e Foro
                </h2>
              </div>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas serão preferencialmente resolvidas de forma amigável e extrajudicial; caso não haja acordo, fica eleito o foro do domicílio da instituição contratante ou da sede do Educar360, conforme as regras de competência do Código de Processo Civil.
              </p>
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2 mt-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Dúvidas Jurídicas ou Contratuais
                </p>
                <p className="text-base font-bold text-emerald-400">
                  suporte@educar360.com.br
                </p>
                <p className="text-xs text-slate-400">
                  Educar360 • Gestão escolar sem limites
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* RODAPÉ INSTITUCIONAL */}
      <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800/90 pt-12 pb-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-block bg-white rounded-lg p-1.5 shadow-sm">
              <Image
                src="/images/landing/logoh.png"
                alt="Educar360"
                width={110}
                height={28}
                className="h-6 w-auto object-contain"
              />
            </Link>
            <span>&bull;</span>
            <span>Gestão escolar sem limites</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">
              Início
            </Link>
            <Link href="/termos-de-uso" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
          </div>

          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} Educar360. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
