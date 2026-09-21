'use client';

import React, { useState } from 'react';
import { EnrollmentDocumentTemplate } from '@/types/matriculas';
import { saveInstitutionChecklistSettingsAction } from '@/app/actions/matriculas';
import { Settings, Plus, Trash2, CheckCircle, AlertCircle, Save, X, FileText } from 'lucide-react';

interface InstitutionChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: EnrollmentDocumentTemplate[];
  onSaved: (updatedTemplates: EnrollmentDocumentTemplate[]) => void;
}

export function InstitutionChecklistModal({
  isOpen,
  onClose,
  templates: initialTemplates,
  onSaved,
}: InstitutionChecklistModalProps) {
  const [templates, setTemplates] = useState<EnrollmentDocumentTemplate[]>(initialTemplates);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleToggleRequired = (index: number) => {
    setTemplates((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, is_required: !t.is_required } : t))
    );
  };

  const handleRemoveItem = (index: number) => {
    setTemplates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    const baseType = trimmedTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30);

    const docType = `custom_${baseType}_${Date.now().toString().slice(-4)}`;

    const newItem: EnrollmentDocumentTemplate = {
      id: docType,
      document_type: docType,
      document_name: trimmedTitle,
      description: newDescription.trim() || undefined,
      is_required: newRequired,
    };

    setTemplates((prev) => [...prev, newItem]);
    setNewTitle('');
    setNewDescription('');
    setNewRequired(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await saveInstitutionChecklistSettingsAction({
        templates,
      });

      if (!res.success) {
        setMessage({ type: 'error', text: res.error || 'Erro ao salvar configurações' });
        return;
      }

      setMessage({ type: 'success', text: 'Configuração da checklist institucional salva com sucesso!' });
      onSaved(templates);
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1200);
    } catch {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao salvar a checklist institucional.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Checklist Institucional de Matrícula</h2>
              <p className="text-xs text-slate-500">
                Defina os documentos padrão que serão exigidos para novas matrículas deste tenant.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl border text-sm flex items-center space-x-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Document Templates List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-between">
              <span>Documentos Configurados ({templates.length})</span>
              <span className="text-xs font-normal text-slate-500">
                {templates.filter((t) => t.is_required).length} obrigatórios
              </span>
            </h3>

            <div className="space-y-2">
              {templates.map((tpl, index) => (
                <div
                  key={tpl.document_type || index}
                  className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0 pr-4">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{tpl.document_name}</span>
                        {tpl.is_required ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
                            Obrigatório
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                            Opcional
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{tpl.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(index)}
                      className={`text-xs px-2.5 py-1.5 font-medium rounded-lg border transition-colors ${
                        tpl.is_required
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      {tpl.is_required ? 'Tornar Opcional' : 'Tornar Obrigatório'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  Nenhum documento configurado na checklist da instituição.
                </div>
              )}
            </div>
          </div>

          {/* Add New Template Form */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Adicionar Documento à Lista Padrão
            </h4>
            <form onSubmit={handleAddItem} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Documento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Histórico Escolar do Ensino Fundamental"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Orientação / Descrição
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Cópia autenticada ou original"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-700">Documento obrigatório para matrícula</span>
                </label>

                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Incluir</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
