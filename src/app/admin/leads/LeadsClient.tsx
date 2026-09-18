"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Lead, LeadStatus } from "@/types/lead";
import { updateLeadStatusAction, updateLeadNotesAction } from "@/app/actions/admin-leads";
import { ConvertLeadModal } from "@/components/platform/ConvertLeadModal";
import {
  UsersRound,
  Search,
  Filter,
  School,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Send,
  Save,
  Loader2,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface LeadsClientProps {
  initialLeads: Lead[];
}

export function LeadsClient({ initialLeads }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeLead, setActiveLead] = useState<Lead | null>(leads[0] || null);

  const [savingNote, setSavingNote] = useState(false);
  const [noteText, setNoteText] = useState(activeLead?.internal_notes || "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Controle do Modal de Conversão
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Sincroniza nota ao selecionar outro lead
  const handleSelectLead = (lead: Lead) => {
    setActiveLead(lead);
    setNoteText(lead.internal_notes || "");
    setFeedbackMsg(null);
  };

  // Filtros combinados
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.school_name.toLowerCase().includes(term) ||
        item.contact_name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [leads, searchTerm, selectedStatus]);

  // Status Metrics
  const metrics = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      qualified: leads.filter((l) => l.status === "qualified").length,
      converted: leads.filter((l) => l.status === "converted").length,
      discarded: leads.filter((l) => l.status === "discarded").length,
    };
  }, [leads]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!activeLead) return;
    setSavingStatus(true);
    setFeedbackMsg(null);

    const res = await updateLeadStatusAction(activeLead.id, newStatus);
    if (res.success) {
      setLeads((prev) =>
        prev.map((l) => (l.id === activeLead.id ? { ...l, status: newStatus } : l))
      );
      setActiveLead((prev) => (prev ? { ...prev, status: newStatus } : null));
      setFeedbackMsg({ type: "success", text: `Status atualizado para "${getStatusLabel(newStatus)}".` });
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Erro ao atualizar status." });
    }
    setSavingStatus(false);
  };

  const handleSaveNotes = async () => {
    if (!activeLead) return;
    setSavingNote(true);
    setFeedbackMsg(null);

    const res = await updateLeadNotesAction(activeLead.id, noteText);
    if (res.success) {
      setLeads((prev) =>
        prev.map((l) => (l.id === activeLead.id ? { ...l, internal_notes: noteText } : l))
      );
      setActiveLead((prev) => (prev ? { ...prev, internal_notes: noteText } : null));
      setFeedbackMsg({ type: "success", text: "Observações internas salvas com sucesso!" });
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Erro ao salvar notas." });
    }
    setSavingNote(false);
  };

  const handleConversionSuccess = (result: any) => {
    setConvertModalOpen(false);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLead?.id
          ? {
              ...l,
              status: "converted",
              converted_tenant_id: result.tenant_id,
            }
          : l
      )
    );
    if (activeLead) {
      setActiveLead({
        ...activeLead,
        status: "converted",
        converted_tenant_id: result.tenant_id,
      });
    }
    setFeedbackMsg({
      type: "success",
      text: `Escola "${result.tenant_slug}" criada com sucesso! Trial de 14 dias iniciado (até ${new Date(result.trial_ends_at).toLocaleDateString("pt-BR")}).`,
    });
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "new":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Novo
          </span>
        );
      case "contacted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Phone className="w-3 h-3" /> Contatado
          </span>
        );
      case "qualified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <Sparkles className="w-3 h-3" /> Qualificado
          </span>
        );
      case "converted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Convertido em Escola
          </span>
        );
      case "discarded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
            <XCircle className="w-3 h-3" /> Descartado
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    switch (status) {
      case "new":
        return "Novo Lead";
      case "contacted":
        return "Contatado";
      case "qualified":
        return "Qualificado";
      case "converted":
        return "Convertido em Cliente";
      case "discarded":
        return "Descartado";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              Leads & Prospecção Comercial
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-zinc-200 text-zinc-700 rounded-full">
              {metrics.total} recebidos
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Qualificação e conversão direta de solicitações da Landing Page em novas escolas.
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <button
          onClick={() => setSelectedStatus("new")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "new" ? "bg-blue-50/60 border-blue-400 ring-2 ring-blue-400/20" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-500 block">Novos</span>
          <span className="text-2xl font-bold text-blue-600 mt-0.5 block">{metrics.new}</span>
          <span className="text-[10px] text-zinc-400">Aguardando contato</span>
        </button>

        <button
          onClick={() => setSelectedStatus("contacted")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "contacted" ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-500 block">Contatados</span>
          <span className="text-2xl font-bold text-amber-600 mt-0.5 block">{metrics.contacted}</span>
          <span className="text-[10px] text-zinc-400">Em diálogo ativo</span>
        </button>

        <button
          onClick={() => setSelectedStatus("qualified")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "qualified" ? "bg-violet-50/60 border-violet-400 ring-2 ring-violet-400/20" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-500 block">Qualificados</span>
          <span className="text-2xl font-bold text-violet-600 mt-0.5 block">{metrics.qualified}</span>
          <span className="text-[10px] text-violet-700 font-semibold">Prontos p/ conversão</span>
        </button>

        <button
          onClick={() => setSelectedStatus("converted")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "converted" ? "bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-400/20" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-500 block">Convertidos</span>
          <span className="text-2xl font-bold text-emerald-600 mt-0.5 block">{metrics.converted}</span>
          <span className="text-[10px] text-zinc-400">Escolas ativas / trial</span>
        </button>

        <button
          onClick={() => setSelectedStatus("all")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "all" ? "bg-zinc-100 border-zinc-400 ring-2 ring-zinc-400/20" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-500 block">Todos os Leads</span>
          <span className="text-2xl font-bold text-zinc-900 mt-0.5 block">{metrics.total}</span>
          <span className="text-[10px] text-zinc-400">Base completa</span>
        </button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LISTAGEM DE LEADS */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row items-center gap-3 bg-zinc-50/50">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por escola, contato, e-mail ou telefone..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto bg-white border border-zinc-300 rounded-xl text-xs text-zinc-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="new">Novos</option>
              <option value="contacted">Contatados</option>
              <option value="qualified">Qualificados</option>
              <option value="converted">Convertidos</option>
              <option value="discarded">Descartados</option>
            </select>
          </div>

          <div className="divide-y divide-zinc-200 max-h-[640px] overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <UsersRound className="w-10 h-10 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold text-zinc-700">Nenhum lead encontrado</p>
                <p className="text-xs text-zinc-400">
                  Tente ajustar a busca ou os filtros aplicados.
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = activeLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`p-4 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected ? "bg-emerald-50/40 border-l-4 border-l-emerald-600" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 truncate">
                          {lead.school_name}
                        </span>
                        {getStatusBadge(lead.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {lead.contact_name}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          {lead.phone}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <span>Entrada: {new Date(lead.created_at).toLocaleString("pt-BR")}</span>
                        <span>&bull;</span>
                        <span className="uppercase font-semibold font-mono text-zinc-600">
                          {lead.plan_interest}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-emerald-600" : "text-zinc-300"}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETALHES DO LEAD SELECIONADO */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-6 sticky top-20">
          {activeLead ? (
            <>
              {/* Header do Lead */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    ID: {activeLead.id.slice(0, 8)}...
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 mt-0.5">
                    {activeLead.school_name}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Recebido em {new Date(activeLead.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>{getStatusBadge(activeLead.status)}</div>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    feedbackMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {feedbackMsg.type === "success" ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* CARD DE AÇÃO: CONVERSÃO EM ESCOLA (TENANT) */}
              {activeLead.status === "converted" ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Lead Convertido em Escola (Tenant Ativo)</span>
                  </div>
                  <p className="text-xs text-emerald-900">
                    Esta instituição já possui ambiente escolar criado e assinatura em modo Trial vinculada.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <Link
                      href={`/admin/tenants`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Ver Escola em Tenants</span>
                    </Link>
                    <Link
                      href={`/admin/assinaturas`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition-colors"
                    >
                      <span>Ver Assinatura</span>
                    </Link>
                  </div>
                </div>
              ) : activeLead.status === "qualified" ? (
                <div className="p-4 bg-violet-50/80 border border-violet-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-violet-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>Lead Qualificado &bull; Pronto para Conversão</span>
                  </div>
                  <p className="text-xs text-violet-800">
                    O lead possui alinhamento comercial confirmado. Clique abaixo para ativar o tenant da escola e iniciar o trial de 14 dias.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConvertModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Converter em Escola (Iniciar Trial)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-500 flex items-center justify-between">
                  <span>Qualifique este lead para habilitar a conversão em Escola.</span>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("qualified")}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  >
                    Qualificar Agora
                  </button>
                </div>
              )}

              {/* Dados do Contato */}
              <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 text-xs">
                <span className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] block">
                  Informações de Contato
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-zinc-400 block">Solicitante:</span>
                    <strong className="text-zinc-800">{activeLead.contact_name}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Cargo na Escola:</span>
                    <strong className="text-zinc-800">{activeLead.role_in_school || "Não informado"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">E-mail:</span>
                    <a
                      href={`mailto:${activeLead.email}`}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      {activeLead.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">WhatsApp / Telefone:</span>
                    <a
                      href={`https://wa.me/55${activeLead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      {activeLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Porte de Alunos:</span>
                    <strong className="text-zinc-800">{activeLead.students_range || "Não informado"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Plano de Interesse:</span>
                    <strong className="text-zinc-800 uppercase font-mono">{activeLead.plan_interest}</strong>
                  </div>
                </div>

                {activeLead.message && (
                  <div className="pt-2 border-t border-zinc-200">
                    <span className="text-zinc-400 block mb-1">Mensagem enviada:</span>
                    <p className="p-2.5 bg-white rounded-lg border border-zinc-200 text-zinc-700 italic">
                      "{activeLead.message}"
                    </p>
                  </div>
                )}
              </div>

              {/* Alterar Status */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Alterar Status do Lead
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "new", label: "Novo" },
                    { key: "contacted", label: "Contatado" },
                    { key: "qualified", label: "Qualificado" },
                    { key: "converted", label: "Convertido" },
                    { key: "discarded", label: "Descartado" },
                  ].map((s) => {
                    const isDisabled =
                      savingStatus ||
                      activeLead.status === s.key ||
                      (activeLead.status === "converted" && s.key !== "converted");

                    return (
                      <button
                        key={s.key}
                        disabled={isDisabled}
                        onClick={() => handleStatusChange(s.key as LeadStatus)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          activeLead.status === s.key
                            ? "bg-zinc-900 text-white border-zinc-900 cursor-default"
                            : isDisabled
                            ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observações Internas */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Observações Internas da Equipe
                </label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Registre o histórico de conversas, negociação ou detalhes do trial..."
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={savingNote}
                  onClick={handleSaveNotes}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar Observações</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Selecione um lead da lista para visualizar os detalhes.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Conversão */}
      {activeLead && (
        <ConvertLeadModal
          lead={activeLead}
          isOpen={convertModalOpen}
          onClose={() => setConvertModalOpen(false)}
          onSuccess={handleConversionSuccess}
        />
      )}
    </div>
  );
}
