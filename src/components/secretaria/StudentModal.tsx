"use client";

import React, { useState, useEffect, useRef } from "react";
import { Student, StudentInput, Guardian, Gender, Kinship } from "@/types/secretaria";
import { saveStudentAction, getGuardiansAction } from "@/app/actions/secretaria";
import { GuardianModal } from "./GuardianModal";
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Camera,
  Link2,
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  FileText,
  Users,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newStudentId?: string) => void;
  studentToEdit?: Student | null;
  zIndexClass?: string;
}

export function StudentModal({
  isOpen,
  onClose,
  onSaved,
  studentToEdit,
  zIndexClass = "z-50",
}: StudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<StudentInput>({
    first_name: "",
    last_name: "",
    cpf: "",
    rg: "",
    rg_issuer: "",
    birth_date: "",
    gender: "uninformed",
    photo_url: "",
    email: "",
    phone: "",
    whatsapp: "",
    postal_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    medical_notes: "",
    general_notes: "",
    is_active: true,
    guardians: [],
  });

  const [availableGuardians, setAvailableGuardians] = useState<Guardian[]>([]);
  const [isNewGuardianModalOpen, setIsNewGuardianModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  async function loadGuardians() {
    const list = await getGuardiansAction({ status: "active" });
    setAvailableGuardians(list);
  }

  useEffect(() => {
    if (isOpen) {
      loadGuardians();
      setError(null);
      setShowUrlInput(false);

      if (studentToEdit) {
        const computedFullName =
          studentToEdit.full_name ||
          [studentToEdit.first_name, studentToEdit.last_name].filter(Boolean).join(" ");

        setFullName(computedFullName);
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
        setFullName("");
        setFormData({
          first_name: "",
          last_name: "",
          gender: "uninformed",
          is_active: true,
          photo_url: "",
          guardians: [],
        });
      }
    }
  }, [isOpen, studentToEdit]);

  if (!isOpen) return null;

  // Redimensionamento e compressão inteligente de foto no navegador (evita estourar limite do body da Server Action)
  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).");
      return;
    }

    try {
      setIsProcessingPhoto(true);
      setError(null);

      const optimizedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));
        reader.onload = (event) => {
          const img = new Image();
          img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
          img.onload = () => {
            const maxDim = 600;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }

            // Preenchimento branco para evitar transparência preta em JPEGs
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Compressão para JPEG com qualidade 85% (~40-80 KB)
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            resolve(compressed);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      setFormData((prev) => ({ ...prev, photo_url: optimizedDataUrl }));
    } catch (err: any) {
      setError(err?.message || "Erro ao processar imagem.");
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = "";
    }
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
        // falha silenciosa se offline
      } finally {
        setIsSearchingCep(false);
      }
    }
  }

  // Máscaras de entrada
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

    const trimmedFull = fullName.trim();
    if (!trimmedFull) {
      setError("O Nome Completo do aluno é obrigatório.");
      return;
    }

    // Decomposição segura de Nome Completo em first_name e last_name
    const parts = trimmedFull.split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    const payload: StudentInput = {
      ...formData,
      first_name: firstName,
      last_name: lastName || firstName, // Garante preenchimento para restrição NOT NULL no banco
    };

    setLoading(true);
    const res = await saveStudentAction(studentToEdit?.id || null, payload);
    setLoading(false);

    if (res.success) {
      onSaved(res.id);
      onClose();
    } else {
      setError(res.error || "Erro ao salvar cadastro do aluno.");
    }
  }

  return (
    <>
      <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200`}>
        <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
          
          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-indigo-50/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-200/50 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {studentToEdit ? "Editar Ficha do Aluno" : "Cadastrar Novo Aluno"}
                </h3>
                <p className="text-xs text-slate-500">
                  Registro civil, foto, contatos, endereço e vínculos com responsáveis legais
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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

            {/* SEÇÃO 1: FOTO DO ALUNO & NOME COMPLETO (ÁREA DE DESTAQUE) */}
            <div className="p-5 bg-linear-to-br from-indigo-50/40 via-white to-slate-50/60 rounded-2xl border border-indigo-100/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                
                {/* Avatar / Área de Foto */}
                <div className="flex flex-col items-center gap-2.5 shrink-0">
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white border-2 border-indigo-100 shadow-sm flex items-center justify-center transition-all group-hover:border-indigo-300">
                      {isProcessingPhoto ? (
                        <div className="flex flex-col items-center justify-center text-indigo-600 gap-1">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="text-[10px] font-semibold text-slate-500">Otimizando...</span>
                        </div>
                      ) : formData.photo_url ? (
                        <img
                          src={formData.photo_url}
                          alt="Foto do Aluno"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 p-2 text-center">
                          <User className="w-10 h-10 text-indigo-200 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-400">Sem Foto</span>
                        </div>
                      )}
                    </div>

                    {formData.photo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photo_url: "" }))}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Remover foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Botões de Ação da Foto */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handlePhotoFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      {formData.photo_url ? "Alterar Foto" : "Carregar Foto"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                        showUrlInput
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                      title="Inserir foto via link web"
                    >
                      <Link2 className="w-3 h-3" />
                      URL
                    </button>
                  </div>

                  {showUrlInput && (
                    <div className="w-full max-w-[200px] animate-in fade-in slide-in-from-top-1">
                      <input
                        type="url"
                        value={formData.photo_url || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, photo_url: e.target.value }))}
                        placeholder="https://.../foto.jpg"
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Input Único: Nome Completo do Aluno e Status */}
                <div className="flex-1 w-full space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Nome Completo do Aluno <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Status Cadastral:</span>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          formData.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {formData.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all"
                      placeholder="Ex: Lucas Oliveira de Souza"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Informe o nome civil completo do discente conforme certidão de nascimento ou documento oficial com foto.
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS CIVIS E DE NASCIMENTO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Dados Civis e de Nascimento
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Data de Nascimento
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.birth_date || ""}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sexo / Gênero
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="uninformed">Não informado</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CPF do Aluno
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ""}
                    onChange={(e) => setFormData({ ...formData, cpf: maskCpf(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    RG / Certidão
                  </label>
                  <input
                    type="text"
                    value={formData.rg || ""}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="Número do documento"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Órgão Emissor / UF
                  </label>
                  <input
                    type="text"
                    value={formData.rg_issuer || ""}
                    onChange={(e) => setFormData({ ...formData, rg_issuer: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="Ex: SSP/SP ou Cartório 1º Ofício"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: RESPONSÁVEIS LEGAIS & VÍNCULOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Responsáveis Legais & Vínculos
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewGuardianModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Responsável
                </button>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-3">
                <div>
                  <select
                    id="guardianSelector"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddGuardianLink(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      Selecione um responsável cadastrado para vincular ao aluno...
                    </option>
                    {availableGuardians.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (CPF: {g.cpf}) — {g.kinship.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.guardians && formData.guardians.length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    {formData.guardians.map((link, idx) => {
                      const guardian = availableGuardians.find((g) => g.id === link.guardian_id);
                      return (
                        <div
                          key={link.guardian_id}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {guardian?.name || "Responsável"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              CPF: {guardian?.cpf} • Tel: {guardian?.whatsapp || guardian?.phone || "N/A"}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs">
                            <select
                              value={link.kinship}
                              onChange={(e) => handleUpdateGuardianLink(idx, "kinship", e.target.value as Kinship)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium text-slate-700"
                            >
                              <option value="mae">Mãe</option>
                              <option value="pai">Pai</option>
                              <option value="avo">Avô/Avó</option>
                              <option value="tio">Tio/Tia</option>
                              <option value="tutor">Tutor</option>
                              <option value="outro">Outro</option>
                            </select>

                            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-emerald-50/60 rounded-lg border border-emerald-200/60 text-emerald-800">
                              <input
                                type="checkbox"
                                checked={link.is_financial}
                                onChange={(e) =>
                                  handleUpdateGuardianLink(idx, "is_financial", e.target.checked)
                                }
                                className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-[11px] font-bold">Financeiro</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-indigo-50/60 rounded-lg border border-indigo-200/60 text-indigo-800">
                              <input
                                type="checkbox"
                                checked={link.is_pedagogical}
                                onChange={(e) =>
                                  handleUpdateGuardianLink(idx, "is_pedagogical", e.target.checked)
                                }
                                className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[11px] font-bold">Pedagógico</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveGuardianLink(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Desvincular responsável"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/70 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400">
                      Nenhum responsável vinculado ainda. Selecione na lista acima ou cadastre um novo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 4: CONTATOS DO ALUNO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Canais de Contato do Aluno
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
                    Telefone Fixo
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail do Aluno
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                      placeholder="aluno@escola.com.br"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: ENDEREÇO RESIDENCIAL */}
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
                    placeholder="Ex: Av. Brasil"
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

            {/* SEÇÃO 6: OBSERVAÇÕES DE SAÚDE E SECRETARIA */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Saúde & Observações Internas
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Restrições Médicas / Alergias
                  </label>
                  <textarea
                    rows={3}
                    value={formData.medical_notes || ""}
                    onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs resize-none"
                    placeholder="Alergias alimentares, medicamentos contínuos, tipo sanguíneo, restrições..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Anotações Internas da Secretaria
                  </label>
                  <textarea
                    rows={3}
                    value={formData.general_notes || ""}
                    onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs resize-none"
                    placeholder="Histórico pedagógico anterior, observações de matrícula ou secretaria..."
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
                {studentToEdit ? "Salvar Alterações" : "Concluir Cadastro"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <GuardianModal
        isOpen={isNewGuardianModalOpen}
        onClose={() => setIsNewGuardianModalOpen(false)}
        zIndexClass={zIndexClass === "z-70" ? "z-80" : "z-60"}
        onSaved={async () => {
          await loadGuardians();
          setIsNewGuardianModalOpen(false);
        }}
      />
    </>
  );
}