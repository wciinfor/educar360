"use client";

import React, { useState, useEffect } from "react";
import { Student, StudentInput, Guardian } from "@/types/secretaria";
import { saveStudentAction, getGuardiansAction } from "@/app/actions/secretaria";
import { GuardianModal } from "./GuardianModal";
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  studentToEdit?: Student | null;
}

export function StudentModal({ isOpen, onClose, onSaved, studentToEdit }: StudentModalProps) {
  const [formData, setFormData] = useState<StudentInput>({
    first_name: studentToEdit?.first_name || "",
    last_name: studentToEdit?.last_name || "",
    cpf: studentToEdit?.cpf || "",
    rg: studentToEdit?.rg || "",
    rg_issuer: studentToEdit?.rg_issuer || "",
    birth_date: studentToEdit?.birth_date || "",
    gender: studentToEdit?.gender || "uninformed",
    photo_url: studentToEdit?.photo_url || "",
    email: studentToEdit?.email || "",
    phone: studentToEdit?.phone || "",
    whatsapp: studentToEdit?.whatsapp || "",
    postal_code: studentToEdit?.postal_code || "",
    street: studentToEdit?.street || "",
    number: studentToEdit?.number || "",
    complement: studentToEdit?.complement || "",
    neighborhood: studentToEdit?.neighborhood || "",
    city: studentToEdit?.city || "",
    state: studentToEdit?.state || "",
    medical_notes: studentToEdit?.medical_notes || "",
    general_notes: studentToEdit?.general_notes || "",
    is_active: studentToEdit?.is_active ?? true,
    guardians: [],
  });

  const [availableGuardians, setAvailableGuardians] = useState<Guardian[]>([]);
  const [isNewGuardianModalOpen, setIsNewGuardianModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGuardians() {
    const list = await getGuardiansAction({ status: "active" });
    setAvailableGuardians(list);
  }

  useEffect(() => {
    if (isOpen) {
      loadGuardians();
      if (studentToEdit) {
        setFormData({
          first_name: studentToEdit.first_name,
          last_name: studentToEdit.last_name,
          cpf: studentToEdit.cpf || "",
          rg: studentToEdit.rg || "",
          rg_issuer: studentToEdit.rg_issuer || "",
          birth_date: studentToEdit.birth_date || "",
          gender: studentToEdit.gender,
          photo_url: studentToEdit.photo_url || "",
          email: studentToEdit.email || "",
          phone: studentToEdit.phone || "",
          whatsapp: studentToEdit.whatsapp || "",
          postal_code: studentToEdit.postal_code || "",
          street: studentToEdit.street || "",
          number: studentToEdit.number || "",
          complement: studentToEdit.complement || "",
          neighborhood: studentToEdit.neighborhood || "",
          city: studentToEdit.city || "",
          state: studentToEdit.state || "",
          medical_notes: studentToEdit.medical_notes || "",
          general_notes: studentToEdit.general_notes || "",
          is_active: studentToEdit.is_active,
          guardians:
            studentToEdit.guardians?.map((g) => ({
              guardian_id: g.guardian?.id || "",
              kinship: g.kinship,
              is_financial: g.is_financial,
              is_pedagogical: g.is_pedagogical,
              is_emergency_contact: g.is_emergency_contact,
              has_custody: g.has_custody,
              notes: g.notes || "",
            })) || [],
        });
      } else {
        setFormData({
          first_name: "",
          last_name: "",
          gender: "uninformed",
          is_active: true,
          guardians: [],
        });
      }
    }
  }, [isOpen, studentToEdit]);

  if (!isOpen) return null;

  function handleAddGuardianLink(guardianId: string) {
    if (!guardianId) return;
    if (formData.guardians?.some((g) => g.guardian_id === guardianId)) return;

    const guardianObj = availableGuardians.find((g) => g.id === guardianId);

    setFormData((prev) => ({
      ...prev,
      guardians: [
        ...(prev.guardians || []),
        {
          guardian_id: guardianId,
          kinship: guardianObj?.kinship || "mae",
          is_financial: guardianObj?.is_financial_responsible ?? true,
          is_pedagogical: guardianObj?.is_pedagogical_responsible ?? true,
          is_emergency_contact: true,
          has_custody: true,
        },
      ],
    }));
  }

  function handleRemoveGuardianLink(index: number) {
    setFormData((prev) => ({
      ...prev,
      guardians: prev.guardians?.filter((_, i) => i !== index),
    }));
  }

  function handleUpdateGuardianLink(index: number, field: string, val: any) {
    setFormData((prev) => {
      const updated = [...(prev.guardians || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, guardians: updated };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("Nome e Sobrenome são obrigatórios.");
      return;
    }

    setLoading(true);
    const res = await saveStudentAction(studentToEdit?.id || null, formData);
    setLoading(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setError(res.error || "Erro ao salvar aluno.");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {studentToEdit ? "Editar Ficha do Aluno" : "Cadastrar Novo Aluno"}
              </h3>
              <p className="text-xs text-slate-500">
                Registro civil, endereço, saúde e vínculo com responsáveis legais
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
                Identificação do Discente
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primeiro Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: Lucas"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sobrenome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: Oliveira de Souza"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date || ""}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexo / Gênero
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="uninformed">Não informado</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RG / Certidão
                  </label>
                  <input
                    type="text"
                    value={formData.rg || ""}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Número"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={formData.rg_issuer || ""}
                    onChange={(e) => setFormData({ ...formData, rg_issuer: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: SSP/SP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL da Foto
                  </label>
                  <input
                    type="url"
                    value={formData.photo_url || ""}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Responsáveis Legais & Vínculos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Vincule um ou mais responsáveis com funções financeiras e pedagógicas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewGuardianModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Responsável
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  id="guardianSelector"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddGuardianLink(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="" disabled>
                    Selecione um responsável cadastrado para vincular...
                  </option>
                  {availableGuardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (CPF: {g.cpf}) — {g.kinship.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {formData.guardians && formData.guardians.length > 0 ? (
                <div className="space-y-3">
                  {formData.guardians.map((link, idx) => {
                    const guardian = availableGuardians.find((g) => g.id === link.guardian_id);
                    return (
                      <div
                        key={link.guardian_id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {guardian?.name || "Responsável"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            CPF: {guardian?.cpf} • Tel: {guardian?.whatsapp || guardian?.phone || "N/A"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <select
                            value={link.kinship}
                            onChange={(e) => handleUpdateGuardianLink(idx, "kinship", e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
                          >
                            <option value="mae">Mãe</option>
                            <option value="pai">Pai</option>
                            <option value="avo">Avô/Avó</option>
                            <option value="tio">Tio/Tia</option>
                            <option value="tutor">Tutor</option>
                            <option value="outro">Outro</option>
                          </select>

                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={link.is_financial}
                              onChange={(e) =>
                                handleUpdateGuardianLink(idx, "is_financial", e.target.checked)
                              }
                              className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-semibold text-emerald-700">Financeiro</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={link.is_pedagogical}
                              onChange={(e) =>
                                handleUpdateGuardianLink(idx, "is_pedagogical", e.target.checked)
                              }
                              className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-semibold text-indigo-700">Pedagógico</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveGuardianLink(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">
                    Nenhum responsável vinculado ainda. Selecione acima ou cadastre um novo.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Contatos do Aluno
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
                    Telefone Fixo
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
                    E-mail do Aluno
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="aluno@email.com"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Logradouro (Rua/Av)
                  </label>
                  <input
                    type="text"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Rua..."
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
                    placeholder="Bairro"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Cidade"
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
                    placeholder="UF"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Observações de Saúde e Gerais
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Restrições Médicas / Alergias
                  </label>
                  <textarea
                    rows={2}
                    value={formData.medical_notes || ""}
                    onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Alergias, medicamentos contínuos, tipo sanguíneo..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Internas da Secretaria
                  </label>
                  <textarea
                    rows={2}
                    value={formData.general_notes || ""}
                    onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Anotações gerais..."
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
                {studentToEdit ? "Salvar Ficha" : "Concluir Cadastro"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <GuardianModal
        isOpen={isNewGuardianModalOpen}
        onClose={() => setIsNewGuardianModalOpen(false)}
        onSaved={async () => {
          await loadGuardians();
          setIsNewGuardianModalOpen(false);
        }}
      />
    </>
  );
}