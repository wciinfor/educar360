import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Database,
} from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — Educar360",
  description:
    "Conheça as diretrizes de privacidade, segurança e proteção de dados do Educar360, em total conformidade com a LGPD (Lei nº 13.709/2018).",
};

export default function PoliticaPrivacidadePage() {
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacidade e Segurança</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Política de Privacidade
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              O <strong>Educar360</strong> tem o compromisso de zelar pela
              segurança, confidencialidade e proteção integral dos dados pessoais
              de gestores, professores, responsáveis e estudantes, em estrita
              observância à <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
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
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Definições e Papéis no Tratamento de Dados
                </h2>
              </div>
              <p>
                Para os fins desta Política de Privacidade e da legislação aplicável:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base">
                <li>
                  <strong>Educar360:</strong> Plataforma SaaS de gestão integrada fornecida para instituições educacionais, atuando preponderantemente como <strong>Operadora</strong> dos dados inseridos pela escola e como <strong>Controladora</strong> quanto aos dados cadastrais de contratação da instituição e leads da Landing Page.
                </li>
                <li>
                  <strong>Instituição Contratante (Escola):</strong> Atua como <strong>Controladora</strong> dos dados pessoais cadastrados em seu ambiente, sendo responsável por coletar o devido consentimento ou amparo legal dos titulares (alunos, responsáveis e docentes).
                </li>
                <li>
                  <strong>Titulares dos Dados:</strong> Gestores escolares, colaboradores, professores, pais, responsáveis legais e alunos cadastrados na plataforma.
                </li>
              </ul>
            </section>

            {/* Seção 2 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Dados Coletados e Formas de Coleta
                </h2>
              </div>
              <p>
                O Educar360 processa informações fornecidas diretamente pelos usuários e pelas instituições parceiras:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Formulário de Demonstração / Teste
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Nome completo, e-mail institucional/comercial, telefone/WhatsApp, nome da instituição de ensino e cargo do solicitante.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Uso da Plataforma Escolar
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Dados acadêmicos, matrículas, registros de frequência, notas, histórico escolar, dados de contato dos responsáveis e registros de cobranças escolares inseridos pela instituição.
                  </p>
                </div>
              </div>
            </section>

            {/* Seção 3 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Finalidades do Tratamento de Dados
                </h2>
              </div>
              <p>
                O tratamento de dados no Educar360 ocorre estritamente para as seguintes finalidades legítimas:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base">
                <li>Provisionar, operar e manter a plataforma de gestão escolar acessível e segura;</li>
                <li>Viabilizar a comunicação institucional e pedagógica entre escola, docentes e famílias;</li>
                <li>Emitir relatórios escolares, fichas cadastrais, boletins e controle de matrículas;</li>
                <li>Enviar notificações transacionais de acesso, convites de novos usuários e avisos do sistema;</li>
                <li>Cumprir obrigações legais e regulatórias do setor de educação aplicáveis às instituições.</li>
              </ul>
            </section>

            {/* Seção 4 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Segurança da Informação e Isolamento por Instituição
                </h2>
              </div>
              <p>
                Adotamos rigorosos padrões técnicos e organizacionais para proteger as informações:
              </p>
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <Lock className="w-4 h-4 text-blue-700" />
                  <span>Arquitetura Multi-Tenant com Isolamento Lógico (Row Level Security)</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                  Cada instituição de ensino possui seu espaço de dados isolado por identificador exclusivo de tenant. Políticas estritas de banco de dados (RLS) garantem que nenhuma escola possa visualizar, alterar ou acessar registros pertencentes a outra instituição.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base pt-2">
                <li>Comunicação 100% criptografada via protocolo HTTPS/TLS em trânsito;</li>
                <li>Autenticação com proteção de senhas via hashes criptográficos modernos;</li>
                <li>Registro de auditoria de acessos e operações críticas de administração.</li>
              </ul>
            </section>

            {/* Seção 5 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  5
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Compartilhamento com Prestadores e Parceiros
                </h2>
              </div>
              <p>
                O Educar360 <strong>não comercializa dados pessoais</strong> sob nenhuma hipótese. O compartilhamento ocorre exclusivamente com parceiros tecnológicos essenciais à operação do software:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm sm:text-base">
                <li>
                  <strong>Provedores de Infraestrutura em Nuvem e Banco de Dados:</strong> Hospedagem segura de servidores e banco de dados (ex.: Vercel e Supabase/AWS);
                </li>
                <li>
                  <strong>Serviços de Envio de E-mails Transacionais:</strong> Disparo de convites de ativação e notificações do sistema (ex.: Resend);
                </li>
                <li>
                  <strong>Gateways de Cobrança da Plataforma:</strong> Processamento seguro de assinaturas entre as escolas e o Educar360 (ex.: Asaas), quando contratado.
                </li>
              </ul>
            </section>

            {/* Seção 6 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Direitos dos Titulares de Dados
                </h2>
              </div>
              <p>
                Nos termos do artigo 18 da LGPD, os titulares possuem os seguintes direitos:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  "Confirmação da existência de tratamento",
                  "Acesso aos dados de forma facilitada",
                  "Correção de dados incompletos ou desatualizados",
                  "Anonimização, bloqueio ou eliminação de dados desnecessários",
                  "Portabilidade dos dados cadastrais",
                  "Revogação do consentimento, quando cabível",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700"
                  >
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 pt-2">
                * Observação: Alunos e responsáveis vinculados a uma escola devem direcionar solicitações relativas a prontuários e notas primariamente à secretaria da instituição contratante (Controladora).
              </p>
            </section>

            {/* Seção 7 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Retenção e Exclusão de Dados
                </h2>
              </div>
              <p>
                Os dados cadastrais e acadêmicos são conservados pelo tempo necessário ao cumprimento das finalidades pedagógicas e operacionais, ou conforme exigido por regulamentações do Ministério da Educação (MEC) e legislações fiscais aplicáveis. Ao término do contrato com uma instituição de ensino, os dados poderão ser exportados pela escola e, posteriormente, excluídos de nossos servidores ativos de forma segura.
              </p>
            </section>

            {/* Seção 8 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Cookies e Sessão de Navegação
                </h2>
              </div>
              <p>
                Utilizamos cookies estritamente necessários para autenticação de sessão de usuários logados, prevenção a ataques cibernéticos e roteamento seguro de subdomínios (<code>app.educar360.com.br</code> e <code>admin.educar360.com.br</code>). Não utilizamos cookies invasivos para rastreamento de perfil sem consentimento.
              </p>
            </section>

            {/* Seção 9 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Canal de Contato e Encarregado (DPO)
                </h2>
              </div>
              <p>
                Para exercer seus direitos de titular, esclarecer dúvidas sobre esta Política ou reportar incidentes de segurança da informação, utilize o canal oficial:
              </p>
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Canal de Privacidade & LGPD
                </p>
                <p className="text-base font-bold text-blue-400">
                  privacidade@educar360.com.br
                </p>
                <p className="text-xs text-slate-400">
                  Equipe de Proteção de Dados e Governança • Educar360
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
            <Link href="/termos-de-uso" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
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
