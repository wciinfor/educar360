"use client";

import React, { useState, useTransition } from "react";
import {
  IdCardTemplateConfig,
  IdCardThemePreset,
  ID_CARD_THEME_PRESETS,
  DEFAULT_ID_CARD_TEMPLATE,
} from "@/types/configuracoes";
import { saveIdCardTemplateAction } from "@/app/actions/configuracoes";
import {
  Palette,
  Layout,
  QrCode,
  School,
  User,
  Sliders,
  Check,
  Save,
  RotateCcw,
  Printer,
  ShieldCheck,
  Eye,
  Calendar,
  Layers,
  FileText,
  Building2,
  Sparkles,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface IdCardEditorClientProps {
  initialTemplate: IdCardTemplateConfig;
  institution: {
    name: string;
    tradeName?: string | null;
    cnpj?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    address?: string | null;
  };
  canEdit: boolean;
}

const SAMPLE_STUDENTS = [
  {
    name: "Lucas Gabriel Ferreira",
    registration: "2026-00482",
    className: "9º Ano A",
    course: "Ensino Fundamental II",
    birthDate: "14/05/2011",
    cpf: "123.456.789-00",
    rg: "54.321.987-X",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80",
  },
  {
    name: "Beatriz Helena de Castro",
    registration: "2026-01193",
    className: "3ª Série do Ensino Médio",
    course: "Ensino Médio",
    birthDate: "28/09/2008",
    cpf: "987.654.321-11",
    rg: "42.109.876-5",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80",
  },
];

export function IdCardEditorClient({
  initialTemplate,
  institution,
  canEdit,
}: IdCardEditorClientProps) {
  const [template, setTemplate] = useState<IdCardTemplateConfig>(initialTemplate);
  const [activeTab, setActiveTab] = useState<"appearance" | "fields" | "photo_qr" | "back">("appearance");
  const [cardSide, setCardSide] = useState<"front" | "back" | "both">("both");
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const currentStudent = SAMPLE_STUDENTS[selectedStudentIndex];

  // Atualiza campo do template
  function updateTemplate<K extends keyof IdCardTemplateConfig>(key: K, value: IdCardTemplateConfig[K]) {
    setTemplate((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setStatusMessage(null);
  }

  // Aplica tema predefinido
  function handleSelectTheme(presetKey: IdCardThemePreset) {
    if (presetKey === "custom") {
      updateTemplate("theme", "custom");
      return;
    }
    const preset = ID_CARD_THEME_PRESETS[presetKey];
    if (!preset) return;

    setTemplate((prev) => ({
      ...prev,
      theme: presetKey,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      background_type: preset.background_type,
      background_color: preset.background_color,
      background_gradient_end: preset.background_gradient_end,
      text_color: preset.text_color,
      accent_text_color: preset.accent_text_color,
      photo_border_color: preset.photo_border_color,
    }));
    setIsDirty(true);
    setStatusMessage(null);
  }

  // Restaura padrões
  function handleResetDefaults() {
    if (confirm("Deseja restaurar as configurações padrão da carteirinha?")) {
      setTemplate({
        ...DEFAULT_ID_CARD_TEMPLATE,
        school_name_override: institution.tradeName || institution.name,
        school_logo_url: institution.logoUrl || undefined,
        back_school_address: institution.address || undefined,
        back_school_phone: institution.phone || undefined,
        back_school_cnpj: institution.cnpj || undefined,
      });
      setIsDirty(true);
      setStatusMessage(null);
    }
  }

  // Salvar modelo
  function handleSave() {
    if (!canEdit) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await saveIdCardTemplateAction(template);
      if (res.success) {
        setIsDirty(false);
        setStatusMessage({
          type: "success",
          text: "Modelo da carteirinha estudantil salvo e sincronizado com sucesso!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Erro ao salvar modelo.",
        });
      }
    });
  }

  // Estilo de fundo do cartão
  const cardBackgroundStyle: React.CSSProperties = {
    background:
      template.background_type === "gradient"
        ? `linear-gradient(135deg, ${template.background_color} 0%, ${template.background_gradient_end || template.background_color} 100%)`
        : template.background_color,
    color: template.text_color,
    fontFamily:
      template.font_family === "serif"
        ? "Georgia, Cambria, serif"
        : template.font_family === "mono"
        ? "monospace"
        : "inherit",
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Editor da Carteirinha Estudantil
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Padrão CR-80 (ISO 7810 ID-1)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure o layout oficial da carteirinha da sua escola com visualização em tempo real da frente e verso.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isPending || !canEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Restaurar layout padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              alert(
                "Módulo de Impressão em Lote:\n\nA geração em lote de PDFs em alta resolução para gráfica (grade de cartões CR-80) e emissão individual dos alunos matriculados será liberada na próxima fase de implantação."
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Impressão em Lote</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Modelo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de feedback */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
          {isDirty && statusMessage.type === "success" && (
            <span className="ml-auto text-[10px] text-emerald-600 font-medium">
              *Você possui edições não salvas
            </span>
          )}
        </div>
      )}

      {/* Grid Principal: Controles do Editor (Esquerda) e Preview em Tempo Real (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Controles de Customização */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Navegação de Abas do Editor */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("appearance")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "appearance"
                    ? "bg-white text-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Cores & Tema</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("fields")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "fields"
                    ? "bg-white text-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Campos da Frente</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("photo_qr")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "photo_qr"
                    ? "bg-white text-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Foto & QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("back")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "back"
                    ? "bg-white text-indigo-600 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Verso do Cartão</span>
              </button>
            </div>

            {/* Conteúdo da Aba Ativa */}
            <div className="p-5 space-y-5">
              {/* ABA 1: CORES & TEMA */}
              {activeTab === "appearance" && (
                <div className="space-y-5">
                  {/* Presets de Tema */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Paletas de Estilo Pré-definidas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(Object.keys(ID_CARD_THEME_PRESETS) as IdCardThemePreset[]).map((key) => {
                        const preset = ID_CARD_THEME_PRESETS[key];
                        const isSelected = template.theme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectTheme(key)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-800">
                                {preset.name}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ backgroundColor: preset.primary_color }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ backgroundColor: preset.secondary_color }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ backgroundColor: preset.background_color }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cores Personalizadas */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-800 mb-3">
                      Ajuste Fino de Cores
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-slate-600 block mb-1">Cor Primária (Destaques)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.primary_color}
                            onChange={(e) => {
                              updateTemplate("primary_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.primary_color}
                            onChange={(e) => {
                              updateTemplate("primary_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-600 block mb-1">Cor Secundária</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.secondary_color}
                            onChange={(e) => {
                              updateTemplate("secondary_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.secondary_color}
                            onChange={(e) => {
                              updateTemplate("secondary_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-600 block mb-1">Fundo do Cartão (Início)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.background_color}
                            onChange={(e) => {
                              updateTemplate("background_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.background_color}
                            onChange={(e) => {
                              updateTemplate("background_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-600 block mb-1">Fundo do Cartão (Fim - Gradiente)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.background_gradient_end || template.background_color}
                            onChange={(e) => {
                              updateTemplate("background_gradient_end", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.background_gradient_end || template.background_color}
                            onChange={(e) => {
                              updateTemplate("background_gradient_end", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-600 block mb-1">Cor do Texto Principal</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.text_color}
                            onChange={(e) => {
                              updateTemplate("text_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.text_color}
                            onChange={(e) => {
                              updateTemplate("text_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-600 block mb-1">Cor dos Rótulos & Destaques</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={template.accent_text_color}
                            onChange={(e) => {
                              updateTemplate("accent_text_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={template.accent_text_color}
                            onChange={(e) => {
                              updateTemplate("accent_text_color", e.target.value);
                              updateTemplate("theme", "custom");
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tipografia */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Estilo de Tipografia
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: "sans", label: "Sans Moderno (Padrão)", font: "sans-serif" },
                        { id: "serif", label: "Serif Clássico", font: "Georgia, serif" },
                        { id: "mono", label: "Mono Técnico", font: "monospace" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateTemplate("font_family", item.id as any)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            template.font_family === item.id
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                              : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                          }`}
                          style={{ fontFamily: item.font }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CAMPOS DA FRENTE */}
              {activeTab === "fields" && (
                <div className="space-y-4">
                  {/* Título e Ano */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Título do Cartão
                      </label>
                      <input
                        type="text"
                        value={template.card_title}
                        onChange={(e) => updateTemplate("card_title", e.target.value)}
                        placeholder="Ex: Identificação Estudantil"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ano Letivo Vigente
                      </label>
                      <input
                        type="text"
                        value={template.academic_year}
                        onChange={(e) => updateTemplate("academic_year", e.target.value)}
                        placeholder="Ex: 2026"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Nome da Escola no Topo */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">Exibir Nome da Escola no Topo</strong>
                        <span className="text-[11px] text-slate-500">
                          Identificação visual da mantenedora / unidade no cabeçalho do cartão.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={template.show_school_name}
                        onChange={(e) => updateTemplate("show_school_name", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {template.show_school_name && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nome Exibido (Personalizado ou Nome Oficial)
                        </label>
                        <input
                          type="text"
                          value={template.school_name_override || ""}
                          onChange={(e) => updateTemplate("school_name_override", e.target.value)}
                          placeholder={institution.tradeName || institution.name}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Toggles de Campos Visíveis */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Campos Cadastrais do Aluno
                    </label>

                    {[
                      {
                        key: "show_student_name",
                        label: "Nome Completo do Aluno",
                        desc: "Nome oficial registrado na matrícula escolar.",
                      },
                      {
                        key: "show_registration_number",
                        label: "Número de Matrícula (R.A.)",
                        desc: "Identificador único do aluno na instituição.",
                      },
                      {
                        key: "show_class_name",
                        label: "Turma / Série",
                        desc: "Ex: 9º Ano A, 3º Ano do Ensino Médio, etc.",
                      },
                      {
                        key: "show_course_name",
                        label: "Curso / Segmento Educacional",
                        desc: "Ex: Ensino Fundamental, Ensino Médio, Técnico.",
                      },
                      {
                        key: "show_birth_date",
                        label: "Data de Nascimento",
                        desc: "Facilita a comprovação de faixa etária.",
                      },
                      {
                        key: "show_document_cpf",
                        label: "CPF do Aluno",
                        desc: "Conforme exigência do padrão nacional de meia-entrada.",
                      },
                      {
                        key: "show_document_rg",
                        label: "RG / Documento de Identidade",
                        desc: "Registro Geral do aluno com órgão emissor.",
                      },
                      {
                        key: "show_validity",
                        label: "Data de Validade da Carteirinha",
                        desc: "Data limite de vigência do cartão estudantil.",
                      },
                    ].map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/60 transition-colors text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {field.label}
                          </span>
                          <span className="text-[11px] text-slate-500">{field.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(template[field.key as keyof IdCardTemplateConfig])}
                          onChange={(e) =>
                            updateTemplate(
                              field.key as keyof IdCardTemplateConfig,
                              e.target.checked as any
                            )
                          }
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 ml-3"
                        />
                      </div>
                    ))}

                    {template.show_validity && (
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-2 text-xs">
                        <label className="block font-semibold text-indigo-900 mb-1">
                          Data de Validade Padrão
                        </label>
                        <input
                          type="text"
                          value={template.validity_date || ""}
                          onChange={(e) => updateTemplate("validity_date", e.target.value)}
                          placeholder="Ex: 31/12/2026"
                          className="w-full px-3 py-1.5 border border-indigo-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 3: FOTO & QR CODE */}
              {activeTab === "photo_qr" && (
                <div className="space-y-5 text-xs">
                  {/* Configurações da Foto */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">Foto 3x4 do Aluno</strong>
                        <span className="text-[11px] text-slate-500">
                          Sincronizada a partir do cadastro do aluno na Secretaria.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={template.show_photo}
                        onChange={(e) => updateTemplate("show_photo", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {template.show_photo && (
                      <div className="pt-2 space-y-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Formato do Enquadramento da Foto
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "rounded", label: "Arredondado" },
                              { id: "square", label: "Retangular / 3x4" },
                              { id: "circle", label: "Circular" },
                            ].map((shape) => (
                              <button
                                key={shape.id}
                                type="button"
                                onClick={() => updateTemplate("photo_shape", shape.id as any)}
                                className={`p-2 rounded-xl border text-center font-medium cursor-pointer transition-all ${
                                  template.photo_shape === shape.id
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {shape.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Cor da Borda da Foto
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                template.photo_border_color.startsWith("#")
                                  ? template.photo_border_color.slice(0, 7)
                                  : "#ffffff"
                              }
                              onChange={(e) => updateTemplate("photo_border_color", e.target.value)}
                              className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                            />
                            <span className="text-slate-500 text-[11px]">
                              Borda destacada para autenticidade visual.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configurações do QR Code */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">QR Code de Autenticação Antifraude</strong>
                        <span className="text-[11px] text-slate-500">
                          Permite a fiscais e bilheterias checarem a matrícula ativa e meia-entrada.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={template.show_qr_code}
                        onChange={(e) => updateTemplate("show_qr_code", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {template.show_qr_code && (
                      <div className="pt-2 space-y-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Posição do QR Code
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateTemplate("qr_code_position", "front")}
                              className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-all ${
                                template.qr_code_position === "front"
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              Frente do Cartão
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTemplate("qr_code_position", "back")}
                              className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-all ${
                                template.qr_code_position === "back"
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              Verso do Cartão
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Instrução / Texto Abaixo do QR Code
                          </label>
                          <input
                            type="text"
                            value={template.qr_code_instruction || ""}
                            onChange={(e) => updateTemplate("qr_code_instruction", e.target.value)}
                            placeholder="Ex: Validação Digital Antifraude"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 4: VERSO DO CARTÃO */}
              {activeTab === "back" && (
                <div className="space-y-4 text-xs">
                  {/* Dados da Escola no Verso */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">Dados da Instituição no Verso</strong>
                        <span className="text-[11px] text-slate-500">
                          Exibe endereço, telefone institucional e CNPJ da escola.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={template.back_show_school_info}
                        onChange={(e) => updateTemplate("back_show_school_info", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {template.back_show_school_info && (
                      <div className="pt-2 space-y-2">
                        <div>
                          <span className="text-[11px] text-slate-600 block mb-0.5">Endereço da Unidade</span>
                          <input
                            type="text"
                            value={template.back_school_address || ""}
                            onChange={(e) => updateTemplate("back_school_address", e.target.value)}
                            placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[11px] text-slate-600 block mb-0.5">Telefone de Contato</span>
                            <input
                              type="text"
                              value={template.back_school_phone || ""}
                              onChange={(e) => updateTemplate("back_school_phone", e.target.value)}
                              placeholder="(11) 99999-9999"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-600 block mb-0.5">CNPJ</span>
                            <input
                              type="text"
                              value={template.back_school_cnpj || ""}
                              onChange={(e) => updateTemplate("back_school_cnpj", e.target.value)}
                              placeholder="00.000.000/0001-00"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Texto Legal da Meia Entrada */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Declaração Legal & Normativa (Meia-Entrada)
                    </label>
                    <textarea
                      rows={3}
                      value={template.back_legal_terms}
                      onChange={(e) => updateTemplate("back_legal_terms", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                    />
                    <span className="text-[10px] text-slate-400">
                      Recomendado citar a Lei Federal nº 12.933/2013 e Decreto nº 8.537/2015.
                    </span>
                  </div>

                  {/* Linha de Assinatura */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">Linha de Assinatura Oficial</strong>
                        <span className="text-[11px] text-slate-500">
                          Espaço para carimbo ou assinatura da direção/secretaria.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={template.back_show_signature_line}
                        onChange={(e) => updateTemplate("back_show_signature_line", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {template.back_show_signature_line && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Título / Cargo da Assinatura
                        </label>
                        <input
                          type="text"
                          value={template.back_signature_title}
                          onChange={(e) => updateTemplate("back_signature_title", e.target.value)}
                          placeholder="Ex: Diretoria Geral / Secretaria Escolar"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Código de barras no verso */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div>
                      <strong className="text-slate-800 block">Código de Barras no Verso</strong>
                      <span className="text-[11px] text-slate-500">
                        Código 128 com número de matrícula para catracas e bibliotecas.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={template.back_show_barcode}
                      onChange={(e) => updateTemplate("back_show_barcode", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel Direito: Preview em Tempo Real (Padrão CR-80) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* Controles de Visualização */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Preview em Tempo Real
                </h3>
              </div>

              {/* Seletor de Face */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setCardSide("both")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    cardSide === "both"
                      ? "bg-white text-indigo-600 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ambos
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("front")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    cardSide === "front"
                      ? "bg-white text-indigo-600 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Frente
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide("back")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    cardSide === "back"
                      ? "bg-white text-indigo-600 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Verso
                </button>
              </div>
            </div>

            {/* Alternador de Aluno de Exemplo */}
            <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70 text-xs">
              <span className="text-slate-500 font-medium">Aluno de Teste:</span>
              <div className="flex items-center gap-2">
                {SAMPLE_STUDENTS.map((st, idx) => (
                  <button
                    key={st.registration}
                    type="button"
                    onClick={() => setSelectedStudentIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedStudentIndex === idx
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st.name.split(" ")[0]} ({st.className.split(" ")[0]})
                  </button>
                ))}
              </div>
            </div>

            {/* ÁREA DE VISUALIZAÇÃO DO CARTÃO CR-80 */}
            <div className="space-y-6 pt-1 flex flex-col items-center">
              {/* FRENTE DO CARTÃO */}
              {(cardSide === "front" || cardSide === "both") && (
                <div className="w-full max-w-[420px] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Frente do Cartão (CR-80)</span>
                    <span className="font-mono text-[10px]">85.6 × 53.98 mm</span>
                  </div>

                  {/* Cartão Frente */}
                  <div
                    style={cardBackgroundStyle}
                    className="w-full aspect-[85.6/53.98] rounded-2xl p-4 shadow-xl shadow-slate-900/10 relative overflow-hidden flex flex-col justify-between border border-white/15 select-none transition-all"
                  >
                    {/* Brilho plástico holográfico sutil */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

                    {/* Cabeçalho do Cartão */}
                    <div className="flex items-center justify-between border-b border-white/15 pb-2 relative z-10">
                      <div className="flex items-center gap-2 min-w-0">
                        {template.show_school_logo && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                            style={{
                              backgroundColor: template.primary_color,
                              color: "#ffffff",
                            }}
                          >
                            {institution.logoUrl ? (
                              <img
                                src={institution.logoUrl}
                                alt="Logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <School className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          {template.show_school_name && (
                            <span className="text-[11px] font-bold tracking-tight truncate leading-tight">
                              {template.school_name_override || institution.tradeName || institution.name}
                            </span>
                          )}
                          <span
                            className="text-[8px] uppercase tracking-wider font-semibold truncate leading-tight"
                            style={{ color: template.accent_text_color }}
                          >
                            {template.card_title || "Identificação Estudantil"}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ml-2"
                        style={{
                          backgroundColor: `${template.primary_color}33`,
                          color: template.text_color,
                          border: `1px solid ${template.primary_color}66`,
                        }}
                      >
                        {template.academic_year || "2026"}
                      </span>
                    </div>

                    {/* Corpo: Foto + Dados Acadêmicos */}
                    <div className="flex items-center gap-3 py-1 relative z-10">
                      {/* Foto do Aluno */}
                      {template.show_photo && (
                        <div
                          className={`w-15 h-19 shrink-0 overflow-hidden shadow-inner flex items-center justify-center bg-black/20 ${
                            template.photo_shape === "circle"
                              ? "rounded-full w-16 h-16"
                              : template.photo_shape === "square"
                              ? "rounded-none"
                              : "rounded-xl"
                          }`}
                          style={{
                            border: `2px solid ${template.photo_border_color || "#ffffff33"}`,
                          }}
                        >
                          <img
                            src={currentStudent.avatarUrl}
                            alt={currentStudent.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Dados Acadêmicos do Aluno */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {template.show_student_name && (
                          <div>
                            <span
                              className="text-[7.5px] uppercase tracking-wider block font-bold"
                              style={{ color: template.accent_text_color }}
                            >
                              Estudante
                            </span>
                            <div className="text-[11px] font-bold truncate leading-tight">
                              {currentStudent.name}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8.5px]">
                          {template.show_registration_number && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                Matrícula
                              </span>
                              <span className="font-mono font-semibold truncate block">
                                {currentStudent.registration}
                              </span>
                            </div>
                          )}

                          {template.show_class_name && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                Turma
                              </span>
                              <span className="font-medium truncate block">
                                {currentStudent.className}
                              </span>
                            </div>
                          )}

                          {template.show_course_name && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                Curso
                              </span>
                              <span className="font-medium truncate block">
                                {currentStudent.course}
                              </span>
                            </div>
                          )}

                          {template.show_birth_date && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                Nasc.
                              </span>
                              <span className="font-medium truncate block">
                                {currentStudent.birthDate}
                              </span>
                            </div>
                          )}

                          {template.show_document_cpf && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                CPF
                              </span>
                              <span className="font-mono truncate block">
                                {currentStudent.cpf}
                              </span>
                            </div>
                          )}

                          {template.show_document_rg && (
                            <div>
                              <span
                                className="text-[7px] uppercase block font-medium"
                                style={{ color: template.accent_text_color }}
                              >
                                RG
                              </span>
                              <span className="font-mono truncate block">
                                {currentStudent.rg}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé da Frente: Validade e/ou QR Code */}
                    <div className="flex items-end justify-between pt-1.5 border-t border-white/15 relative z-10">
                      {template.show_validity ? (
                        <div>
                          <span
                            className="text-[7px] uppercase tracking-wider block font-semibold"
                            style={{ color: template.accent_text_color }}
                          >
                            Validade
                          </span>
                          <span className="font-mono font-bold text-[10px]">
                            {template.validity_date || "31/12/2026"}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {template.show_qr_code && template.qr_code_position === "front" && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg shadow-xs text-slate-900">
                          <QrCode className="w-5 h-5" />
                          <div className="text-[6.5px] leading-tight flex flex-col font-medium pr-0.5">
                            <span className="font-bold">VERIFICAÇÃO</span>
                            <span className="text-slate-500">DIGITAL</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VERSO DO CARTÃO */}
              {(cardSide === "back" || cardSide === "both") && (
                <div className="w-full max-w-[420px] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Verso do Cartão (CR-80)</span>
                    <span className="font-mono text-[10px]">Normativo & Validação</span>
                  </div>

                  {/* Cartão Verso */}
                  <div
                    style={cardBackgroundStyle}
                    className="w-full aspect-[85.6/53.98] rounded-2xl p-4 shadow-xl shadow-slate-900/10 relative overflow-hidden flex flex-col justify-between border border-white/15 select-none transition-all"
                  >
                    {/* Brilho plástico sutil */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

                    {/* Topo do Verso: Tarja Magnética Estilizada / Cabeçalho */}
                    <div className="relative z-10 space-y-1">
                      {template.back_show_school_info && (
                        <div className="border-b border-white/15 pb-1 text-[8px] space-y-0.5">
                          <div className="font-bold truncate">
                            {template.school_name_override || institution.tradeName || institution.name}
                          </div>
                          <div
                            className="text-[7px] truncate leading-tight"
                            style={{ color: template.accent_text_color }}
                          >
                            {template.back_school_address || institution.address || "Endereço Institucional da Escola"}
                          </div>
                          <div className="flex items-center gap-3 text-[7px] font-mono">
                            {template.back_school_cnpj && (
                              <span>CNPJ: {template.back_school_cnpj}</span>
                            )}
                            {template.back_school_phone && (
                              <span>Tel: {template.back_school_phone}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Texto Legal da Meia Entrada */}
                      <p className="text-[6.5px] leading-relaxed opacity-85 pt-1 text-justify">
                        {template.back_legal_terms}
                      </p>
                    </div>

                    {/* Meio/Rodapé do Verso: QR Code no verso (se ativo) + Linha de Assinatura */}
                    <div className="relative z-10 flex items-end justify-between gap-3 pt-1 border-t border-white/10">
                      {/* Se QR Code estiver configurado para o Verso */}
                      {template.show_qr_code && template.qr_code_position === "back" ? (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg text-slate-900 shrink-0">
                          <QrCode className="w-7 h-7" />
                          <div className="text-[6.5px] leading-tight flex flex-col">
                            <span className="font-bold">VALIDAR</span>
                            <span className="text-slate-500">AUTENTICIDADE</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[7px] font-mono opacity-60">
                          SISTEMA EDUCAR360
                        </div>
                      )}

                      {/* Assinatura da Diretoria */}
                      {template.back_show_signature_line && (
                        <div className="flex flex-col items-center text-center shrink-0">
                          <div className="w-28 border-b border-dashed border-white/40 mb-0.5" />
                          <span
                            className="text-[6.5px] uppercase tracking-wider font-semibold"
                            style={{ color: template.accent_text_color }}
                          >
                            {template.back_signature_title || "Diretoria / Secretaria"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Código de barras decorativo no rodapé */}
                    {template.back_show_barcode && (
                      <div className="relative z-10 pt-1 flex flex-col items-center">
                        <div className="flex items-center gap-0.5 h-3 opacity-70">
                          {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 2, 4, 2].map(
                            (w, i) => (
                              <span
                                key={i}
                                className="h-full bg-current"
                                style={{ width: `${w}px` }}
                              />
                            )
                          )}
                        </div>
                        <span className="text-[6px] font-mono tracking-widest mt-0.5 opacity-60">
                          *{currentStudent.registration}*
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Informações normativas */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Formatado para PVC 85,60 mm × 53,98 mm (CR-80)
              </span>
              <span className="font-mono text-[10px]">
                {template.theme.toUpperCase()} • {template.font_family.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
