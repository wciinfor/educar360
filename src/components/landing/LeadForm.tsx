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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const result = await submitLeadAction(formData);

    if (result.success) {
      setSubmitted(true);
    } else {
      setErrorMsg(result.message || "Erro ao enviar solicitação.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-2xl shadow-emerald-500/10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold text-white">
            Solicitação Recebida com Sucesso!
          </h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Nossa equipe de especialistas já recebeu os dados da instituição{" "}
            <strong className="text-white">{formData.school_name}</strong>. Em breve entraremos em contato para disponibilizar o ambiente de teste gratuito de 14 dias.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
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
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Enviar outra solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Experimente Grátis por 14 Dias</span>
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight">
          Inicie o Teste da Sua Escola
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Sem necessidade de cartão de crédito. Ativação rápida com suporte para importação de alunos.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nome da Instituição Escolar *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <School className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.school_name}
                onChange={(e) =>
                  setFormData({ ...formData, school_name: e.target.value })
                }
                placeholder="Ex: Colégio Monteiro Lobato"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Seu Nome Completo *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                placeholder="Ex: Carlos Eduardo"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              E-mail Institucional *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              WhatsApp / Telefone *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Seu Cargo na Instituição
            </label>
            <select
              value={formData.role_in_school}
              onChange={(e) =>
                setFormData({ ...formData, role_in_school: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Quantidade de Alunos
            </label>
            <select
              value={formData.students_range}
              onChange={(e) =>
                setFormData({ ...formData, students_range: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="Até 100 alunos (Start)">Até 100 alunos (Start)</option>
              <option value="100 a 200 alunos (Essencial)">100 a 200 alunos (Essencial)</option>
              <option value="200 a 500 alunos (Profissional)">200 a 500 alunos (Profissional)</option>
              <option value="Mais de 500 alunos (Enterprise)">Mais de 500 alunos (Enterprise)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Plano de Interesse
            </label>
            <select
              value={formData.plan_interest}
              onChange={(e) =>
                setFormData({ ...formData, plan_interest: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Observações ou Desafios Principais (Opcional)
          </label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            placeholder="Conte-nos se já utilizam algum sistema e quais os principais pontos que gostariam de melhorar..."
            className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando solicitação...</span>
              </>
            ) : (
              <>
                <span>Iniciar Meus 14 Dias Grátis</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-500 pt-1">
          Ao enviar, você concorda com nossos termos e política de privacidade. Seus dados estão rigorosamente protegidos conforme a LGPD.
        </p>
      </form>
    </div>
  );
}
