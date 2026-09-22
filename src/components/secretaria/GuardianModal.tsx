"use client";

import React, { useState, useEffect } from "react";
import { Guardian, GuardianInput, Kinship } from "@/types/secretaria";
import { saveGuardianAction } from "@/app/actions/secretaria";
import {
  X,
  DollarSign,
  BookOpen,
  AlertCircle,
  Loader2,
  UserCheck,
  User,
  CreditCard,
  FileText,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Building2,
} from "lucide-react";

interface GuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newGuardianId?: string) => void;
  guardianToEdit?: Guardian | null;
  zIndexClass?: string;
}

export function GuardianModal({
  isOpen,
  onClose,
  onSaved,
  guardianToEdit,
  zIndexClass = "z-50",
}: GuardianModalProps) {
  const [formData, setFormData] = useState<GuardianInput>({
    name: "",
    cpf: "",
    rg: "",
    kinship: "pai",
    phone: "",
    whatsapp: "",
    email: "",
    profession: "",
    workplace: "",
    postal_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
    is_financial_responsible: true,
    is_pedagogical_responsible: true,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (guardianToEdit) {
        setFormData({
          name: guardianToEdit.name || "",
          cpf: guardianToEdit.cpf || "",
          rg: guardianToEdit.rg || "",
          kinship: guardianToEdit.kinship || "pai",
          phone: guardianToEdit.phone || "",
          whatsapp: guardianToEdit.whatsapp || "",
          email: guardianToEdit.email || "",
          profession: guardianToEdit.profession || "",
          workplace: guardianToEdit.workplace || "",
          postal_code: guardianToEdit.postal_code || "",
          street: guardianToEdit.street || "",
          number: guardianToEdit.number || "",
          complement: guardianToEdit.complement || "",
          neighborhood: guardianToEdit.neighborhood || "",
          city: guardianToEdit.city || "",
          state: guardianToEdit.state || "",
          notes: guardianToEdit.notes || "",
          is_financial_responsible: guardianToEdit.is_financial_responsible ?? true,
          is_pedagogical_responsible: guardianToEdit.is_pedagogical_responsible ?? true,
          is_active: guardianToEdit.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          cpf: "",
          rg: "",
          kinship: "pai",
          phone: "",
          whatsapp: "",
          email: "",
          profession: "",
          workplace: "",
          postal_code: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          notes: "",
          is_financial_responsible: true,
          is_pedagogical_responsible: true,
          is_active: true,
        });
      }
    }
  }, [isOpen, guardianToEdit]);

  if (!isOpen) return null;

  // Funções de máscara
  function maskCpf(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskPhone(val: string) {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 10) {
      return raw
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return raw
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function maskCep(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 8)
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  // Busca automática de CEP
  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      try {
        setIsSearchingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf ? data.uf.toUpperCase() : prev.state,
          }));
        }
      } catch {
        // silencioso
      } finally {
        setIsSearchingCep(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.cpf.trim()) {
      setError("Nome completo e CPF do responsável são obrigatórios.");
      return;
    }

    setLoading(true);
    const res = await saveGuardianAction(guardianToEdit?.id || null, formData);
    setLoading(false);

    if (res.success) {
      onSaved(res.id);
      onClose();
    } else {
      setError(res.error || "Erro ao salvar responsável.");
    }
  }

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200`}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-indigo-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-200/50 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {guardianToEdit ? "Editar Responsável" : "Novo Responsável"}
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre os dados cadastrais, financeiros e de contato do responsável
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Dados Pessoais
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="Ex: Francisco de Assis da Silva Alcantara"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CPF <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: maskCpf(e.target.value) })}
                    className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  RG
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.rg || ""}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="Número do documento"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Grau de Parentesco Padrão
                </label>
                <select
                  value={formData.kinship}
                  onChange={(e) => setFormData({ ...formData, kinship: e.target.value as Kinship })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="mae">Mãe</option>
                  <option value="pai">Pai</option>
                  <option value="avo">Avô / Avó</option>
                  <option value="tio">Tio / Tia</option>
                  <option value="tutor">Tutor Legal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Profissão
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.profession || ""}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="Ex: Engenheiro, Autônomo, etc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ATRIBUIÇÕES LEGAIS */}
          <div className="space-y-3 bg-linear-to-br from-slate-50 to-indigo-50/20 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Atribuições Legais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all shadow-2xs ${
                  formData.is_financial_responsible
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/15"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.is_financial_responsible}
                  onChange={(e) =>
                    setFormData({ ...formData, is_financial_responsible: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Responsável Financeiro
                  </div>
                  <p className="text-[11px] text-slate-500">Responde por mensalidades e cobranças</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all shadow-2xs ${
                  formData.is_pedagogical_responsible
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/15"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.is_pedagogical_responsible}
                  onChange={(e) =>
                    setFormData({ ...formData, is_pedagogical_responsible: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Responsável Pedagógico
                  </div>
                  <p className="text-[11px] text-slate-500">Acompanha notas, boletins e reuniões</p>
                </div>
              </label>
            </div>
          </div>

          {/* SEÇÃO 3: CANAIS DE CONTATO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Canais de Contato
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  WhatsApp / Celular
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.whatsapp || ""}
                    onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone Fixo / Recado
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="responsavel@email.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: ENDEREÇO RESIDENCIAL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Endereço Residencial
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">CEP</label>
                  {isSearchingCep && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                </div>
                <input
                  type="text"
                  value={formData.postal_code || ""}
                  onChange={(e) => setFormData({ ...formData, postal_code: maskCep(e.target.value) })}
                  onBlur={handleCepBlur}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="00000-000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Logradouro (Rua / Av)
                </label>
                <input
                  type="text"
                  value={formData.street || ""}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Número</label>
                <input
                  type="text"
                  value={formData.number || ""}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Complemento</label>
                <input
                  type="text"
                  value={formData.complement || ""}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="Apto 101, Bloco B"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bairro</label>
                <input
                  type="text"
                  value={formData.neighborhood || ""}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="Bairro"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cidade</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs uppercase"
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÕES DO RODAPÉ */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {guardianToEdit ? "Salvar Alterações" : "Cadastrar Responsável"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}