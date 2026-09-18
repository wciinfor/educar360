"use client";

import React, { useState } from "react";
import { Guardian, GuardianInput } from "@/types/secretaria";
import { saveGuardianAction } from "@/app/actions/secretaria";
import { X, DollarSign, BookOpen, AlertCircle, Loader2 } from "lucide-react";

interface GuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  guardianToEdit?: Guardian | null;
}

export function GuardianModal({ isOpen, onClose, onSaved, guardianToEdit }: GuardianModalProps) {
  const [formData, setFormData] = useState<GuardianInput>({
    name: guardianToEdit?.name || "",
    cpf: guardianToEdit?.cpf || "",
    rg: guardianToEdit?.rg || "",
    kinship: guardianToEdit?.kinship || "pai",
    phone: guardianToEdit?.phone || "",
    whatsapp: guardianToEdit?.whatsapp || "",
    email: guardianToEdit?.email || "",
    profession: guardianToEdit?.profession || "",
    workplace: guardianToEdit?.workplace || "",
    postal_code: guardianToEdit?.postal_code || "",
    street: guardianToEdit?.street || "",
    number: guardianToEdit?.number || "",
    complement: guardianToEdit?.complement || "",
    neighborhood: guardianToEdit?.neighborhood || "",
    city: guardianToEdit?.city || "",
    state: guardianToEdit?.state || "",
    notes: guardianToEdit?.notes || "",
    is_financial_responsible: guardianToEdit?.is_financial_responsible ?? true,
    is_pedagogical_responsible: guardianToEdit?.is_pedagogical_responsible ?? true,
    is_active: guardianToEdit?.is_active ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.cpf.trim()) {
      setError("Nome e CPF são obrigatórios.");
      return;
    }

    setLoading(true);
    const res = await saveGuardianAction(guardianToEdit?.id || null, formData);
    setLoading(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setError(res.error || "Erro ao salvar responsável.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {guardianToEdit ? "Editar Responsável" : "Novo Responsável"}
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre os dados cadastrais, financeiros e de contato do responsável
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dados Pessoais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Ex: Maria dos Santos Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RG
                </label>
                <input
                  type="text"
                  value={formData.rg || ""}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Número do documento"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grau de Parentesco Padrão
                </label>
                <select
                  value={formData.kinship}
                  onChange={(e) => setFormData({ ...formData, kinship: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="mae">Mãe</option>
                  <option value="pai">Pai</option>
                  <option value="avo">Avô/Avó</option>
                  <option value="tio">Tio/Tia</option>
                  <option value="tutor">Tutor Legal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profissão
                </label>
                <input
                  type="text"
                  value={formData.profession || ""}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Ex: Engenheira Civil"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Atribuições Legais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300">
                <input
                  type="checkbox"
                  checked={formData.is_financial_responsible}
                  onChange={(e) => setFormData({ ...formData, is_financial_responsible: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Responsável Financeiro
                  </div>
                  <p className="text-[11px] text-slate-500">Responde por mensalidades e cobranças</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300">
                <input
                  type="checkbox"
                  checked={formData.is_pedagogical_responsible}
                  onChange={(e) => setFormData({ ...formData, is_pedagogical_responsible: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Responsável Pedagógico
                  </div>
                  <p className="text-[11px] text-slate-500">Acompanha notas, boletins e reuniões</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Canais de Contato
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Celular
                </label>
                <input
                  type="text"
                  value={formData.whatsapp || ""}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Fixo / Recado
                </label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="(00) 0000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="responsavel@email.com"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Endereço Residencial
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={formData.postal_code || ""}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="00000-000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logradouro (Rua/Av)</label>
                <input
                  type="text"
                  value={formData.street || ""}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Rua das Flores"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número</label>
                <input
                  type="text"
                  value={formData.number || ""}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={formData.neighborhood || ""}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Centro"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="São Paulo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {guardianToEdit ? "Salvar Alterações" : "Cadastrar Responsável"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}