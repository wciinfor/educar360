"use client";

import React, { useState } from "react";
import { submitLeadAction } from "@/app/actions/leads";
import { LeadInput } from "@/types/lead";
import { OFFICIAL_SAAS_PLANS } from "@/lib/plans/constants";
import {
  School,
  User,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface LeadFormProps {
  initialPlan?: string;
}

export function LeadForm({ initialPlan = "profissional" }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadInput>({
    school_name: "",
    contact_name: "",
    email: "",
    phone: "",
    role_in_school: "Diretor(a) / Mantenedor(a)",
    students_range: "100 a 200 alunos",
    plan_interest: initialPlan,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onboardResult, setOnboardResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const result = await submitLeadAction(formData);

    if (result.success) {
      setOnboardResult(result);
      setSubmitted(true);
    } else {
      setErrorMsg(result.message || "Erro ao processar criação da escola.");
    }
    setLoading(false);
  };

  if (submitted && onboardResult) {
    return (
      <div className="bg-white border border-emerald-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        
        <div className="space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>14 Dias Grátis Ativados</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sua escola foi criada com sucesso!
          </h3>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Parabéns! O ambiente exclusivo da instituição{" "}
            <strong className="text-slate-900 font-bold">{formData.school_name}</strong> já está configurado e pronto para uso.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-slate-800">Convite de ativação enviado para:</p>
              <p className="text-blue-600 font-mono font-medium">{formData.email}</p>
            </div>
          </div>
          <p className="text-[12px] text-slate-500 leading-normal pl-8 border-t border-slate-200/60 pt-2">
            Verifique sua caixa de entrada (ou pasta de spam/promoções) para criar sua senha de acesso. Não é necessário cartão de crédito.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onboardResult.activation_url && (
            <a
              href={onboardResult.activation_url}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Ativar meu acesso agora</span>
              <span>→</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setOnboardResult(null);
              setFormData({
                school_name: "",
                contact_name: "",
                email: "",
                phone: "",
                role_in_school: "Diretor(a) / Mantenedor(a)",
                students_range: "100 a 200 alunos",
                plan_interest: "profissional",
                message: "",
              });
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cadastrar outra instituição
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl shadow-slate-200/60 relative overflow-hidden">
      {/* Detalhe de fundo com gradiente sutil */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-50/70 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 mb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Experimente Grátis por 14 Dias</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Inicie o Teste da Sua Escola
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
          Sem necessidade de cartão de crédito. Ativação imediata de um tenant dedicado com suporte completo na importação dos dados dos alunos.
        </p>
      </div>

      {errorMsg && (
        <div className="relative z-10 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome da Instituição Escolar *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <School className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.school_name}
                onChange={(e) =>
                  setFormData({ ...formData, school_name: e.target.value })
                }
                placeholder="Ex: Colégio Santos Dumont"
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Seu Nome Completo *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                placeholder="Ex: Carlos Roberto Alcantara"
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail Institucional *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="diretoria@escola.com.br"
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp / Telefone *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(11) 98765-4321"
                className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Seu Cargo na Escola
            </label>
            <select
              value={formData.role_in_school}
              onChange={(e) =>
                setFormData({ ...formData, role_in_school: e.target.value })
              }
              className="w-full px-3 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs cursor-pointer"
            >
              <option value="Diretor(a) / Mantenedor(a)">Diretor(a) / Mantenedor(a)</option>
              <option value="Coordenador(a) Pedagógico">Coordenador(a) Pedagógico</option>
              <option value="Secretário(a) Escolar">Secretário(a) Escolar</option>
              <option value="Gestor(a) Financeiro">Gestor(a) Financeiro</option>
              <option value="Professor(a) / TI">Professor(a) / TI</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quantidade de Alunos
            </label>
            <select
              value={formData.students_range}
              onChange={(e) =>
                setFormData({ ...formData, students_range: e.target.value })
              }
              className="w-full px-3 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs cursor-pointer"
            >
              <option value="Até 100 alunos (Start)">Até 100 alunos (Start)</option>
              <option value="100 a 200 alunos (Essencial)">100 a 200 alunos (Essencial)</option>
              <option value="200 a 500 alunos (Profissional)">200 a 500 alunos (Profissional)</option>
              <option value="Mais de 500 alunos (Enterprise)">Mais de 500 alunos (Enterprise)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Plano de Interesse
            </label>
            <select
              value={formData.plan_interest}
              onChange={(e) =>
                setFormData({ ...formData, plan_interest: e.target.value })
              }
              className="w-full px-3 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs cursor-pointer"
            >
              {OFFICIAL_SAAS_PLANS.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} ({plan.priceFormatted}{plan.price_cents > 0 ? "/mês" : ""})
                </option>
              ))}
              <option value="indeciso">Ainda não sei / Quero avaliar</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Observações ou Desafios Principais (Opcional)
          </label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            placeholder="Conte-nos se já utilizam algum sistema e quais os principais pontos que gostariam de melhorar..."
            className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all shadow-xs"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Configurando solicitação...</span>
              </>
            ) : (
              <>
                <span>Iniciar Meus 14 Dias Grátis</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px] text-slate-400 pt-1 text-center">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Em conformidade com a LGPD
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Sem fidelidade obrigatória</span>
          <span className="hidden sm:inline">•</span>
          <span>Cancelamento simplificado</span>
        </div>
      </form>
    </div>
  );
}
