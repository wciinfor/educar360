"use client";

import React, { useState, useTransition } from "react";
import {
  SchoolYear,
  AcademicTerm,
  CalendarEventCategory,
  CalendarEvent,
  SchoolYearStatus,
  AcademicTermType,
  AcademicTermStatus,
  EventTargetAudience,
} from "@/types/calendario";
import {
  createSchoolYearAction,
  updateSchoolYearAction,
  setCurrentSchoolYearAction,
  deleteSchoolYearAction,
  createAcademicTermAction,
  updateAcademicTermAction,
  deleteAcademicTermAction,
  getSchoolYearsAction,
  getCalendarEventCategoriesAction,
  createCalendarEventCategoryAction,
  updateCalendarEventCategoryAction,
  deleteCalendarEventCategoryAction,
  seedDefaultCalendarCategoriesAction,
  getCalendarEventsAction,
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/actions/calendario";
import {
  CalendarDays,
  CalendarCheck,
  Plus,
  Edit2,
  Trash2,
  Star,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Info,
  Calendar,
  Lock,
  Tag,
  Users,
  Search,
  Filter,
  Sparkles,
  Clock,
  Check,
  Printer,
  FileText,
} from "lucide-react";
import clsx from "clsx";

import { CalendarioVisualView } from "./CalendarioVisualView";
import { ControleDiasLetivosView } from "./ControleDiasLetivosView";
import { RelatorioCalendarioView } from "./RelatorioCalendarioView";

interface CalendarioAnosClientProps {
  initialSchoolYears: SchoolYear[];
  initialCategories: CalendarEventCategory[];
  initialEvents: CalendarEvent[];
  userRole: string;
  currentUserId: string;
  schoolName: string;
}

type ActiveTab = "visual" | "dias_letivos" | "relatorio" | "anos" | "eventos" | "categorias";

const TERM_TYPE_LABELS: Record<AcademicTermType, string> = {
  bimestre: "Bimestre",
  trimestre: "Trimestre",
  semestre: "Semestre",
  etapa: "Etapa",
  anual: "Anual",
  outro: "Outro",
};

const AUDIENCE_LABELS: Record<EventTargetAudience, string> = {
  todos: "Todos (Comunidade Escolar)",
  professores: "Professores & Docentes",
  alunos_responsaveis: "Alunos & Responsáveis",
  equipe_pedagogica: "Equipe Pedagógica & Coordenação",
  secretaria: "Secretaria Escolar",
};

const YEAR_STATUS_CONFIG: Record<
  SchoolYearStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  planejamento: {
    label: "Em Planejamento",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  ativo: {
    label: "Ativo / Em Andamento",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  encerrado: {
    label: "Encerrado",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
  },
  bloqueado: {
    label: "Bloqueado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

const TERM_STATUS_CONFIG: Record<
  AcademicTermStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  aberto: {
    label: "Aberto",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  fechado: {
    label: "Fechado",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
  },
  bloqueado: {
    label: "Bloqueado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

export function CalendarioAnosClient({
  initialSchoolYears,
  initialCategories,
  initialEvents,
  userRole,
  currentUserId,
  schoolName,
}: CalendarioAnosClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("visual");
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>(initialSchoolYears);
  const [categories, setCategories] = useState<CalendarEventCategory[]>(initialCategories);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const [selectedYearId, setSelectedYearId] = useState<string>(() => {
    const current = initialSchoolYears.find((y) => y.is_current);
    if (current) return current.id;
    return initialSchoolYears[0]?.id || "";
  });

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filtros de Eventos
  const [eventSearch, setEventSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTerm, setFilterTerm] = useState<string>("all");
  const [filterAudience, setFilterAudience] = useState<string>("all");

  // Modais
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);

  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CalendarEventCategory | null>(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Formulário Ano Letivo
  const [yearForm, setYearForm] = useState({
    year: "",
    title: "",
    start_date: "",
    end_date: "",
    total_school_days: 200,
    status: "planejamento" as SchoolYearStatus,
    is_current: false,
  });

  // Formulário Período Acadêmico
  const [termForm, setTermForm] = useState({
    term_type: "bimestre" as AcademicTermType,
    name: "",
    code: "",
    sequence_order: 1,
    start_date: "",
    end_date: "",
    status: "aberto" as AcademicTermStatus,
  });

  // Formulário Categoria de Evento
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    color_hex: "#3B82F6",
    is_school_day: false,
    allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
    is_active: true,
  });

  // Formulário Evento do Calendário
  const [eventForm, setEventForm] = useState({
    school_year_id: "",
    academic_term_id: "",
    category_id: "",
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    is_full_day: true,
    start_time: "",
    end_time: "",
    is_school_day: false,
    target_audience: "todos" as EventTargetAudience,
  });

  const canManageAll =
    userRole === "admin_escola" || userRole === "coordenacao" || userRole === "secretaria";
  const isSecretaria = userRole === "secretaria";

  const currentYear = schoolYears.find((y) => y.id === selectedYearId) || schoolYears[0];
  const sortedTerms = currentYear?.academic_terms
    ? [...currentYear.academic_terms].sort((a, b) => a.sequence_order - b.sequence_order)
    : [];

  const modalSelectedYear =
    schoolYears.find((y) => y.id === eventForm.school_year_id) || currentYear;
  const modalSortedTerms = modalSelectedYear?.academic_terms
    ? [...modalSelectedYear.academic_terms].sort((a, b) => a.sequence_order - b.sequence_order)
    : [];

  // Categorias que a secretaria tem permissão para cadastrar
  const allowedCategoriesForUser = categories.filter((cat) => {
    if (canManageAll) return true;
    if (isSecretaria) return cat.allowed_roles.includes("secretaria") && cat.is_active;
    return false;
  });

  // Atualizar dados completos do servidor
  async function refreshData(targetYearId?: string) {
    const [yearsRes, catsRes, eventsRes] = await Promise.all([
      getSchoolYearsAction(),
      getCalendarEventCategoriesAction(),
      getCalendarEventsAction(),
    ]);

    if (yearsRes.success) {
      const list = yearsRes.schoolYears || [];
      setSchoolYears(list);
      setSelectedYearId((prev) => {
        if (targetYearId && list.some((y) => y.id === targetYearId)) return targetYearId;
        if (prev && list.some((y) => y.id === prev)) return prev;
        const current = list.find((y) => y.is_current);
        if (current) return current.id;
        return list[0]?.id || "";
      });
    }
    if (catsRes.success) setCategories(catsRes.categories);
    if (eventsRes.success) setEvents(eventsRes.events);
  }

  function triggerSuccess(msg: string) {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 5000);
  }

  function triggerError(msg: string) {
    setActionError(msg);
    setActionSuccess(null);
  }

  // ==============================================================================
  // HANDLERS: ANO LETIVO
  // ==============================================================================
  function handleOpenYearModal(yearToEdit?: SchoolYear) {
    setActionError(null);
    if (yearToEdit) {
      setEditingYear(yearToEdit);
      setYearForm({
        year: yearToEdit.year,
        title: yearToEdit.title,
        start_date: yearToEdit.start_date,
        end_date: yearToEdit.end_date,
        total_school_days: yearToEdit.total_school_days,
        status: yearToEdit.status,
        is_current: yearToEdit.is_current,
      });
    } else {
      setEditingYear(null);
      const nextYear = String(new Date().getFullYear() + 1);
      setYearForm({
        year: nextYear,
        title: `Ano Letivo ${nextYear}`,
        start_date: `${nextYear}-02-01`,
        end_date: `${nextYear}-12-18`,
        total_school_days: 200,
        status: "planejamento",
        is_current: schoolYears.length === 0,
      });
    }
    setShowYearModal(true);
  }

  function handleSaveYear(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageAll) return;

    if (!yearForm.year.trim()) return triggerError("O ano (ex: 2026) é obrigatório.");
    if (!yearForm.start_date || !yearForm.end_date) {
      return triggerError("As datas de início e término são obrigatórias.");
    }
    if (new Date(yearForm.end_date) < new Date(yearForm.start_date)) {
      return triggerError("A data de término deve ser posterior ou igual à data de início.");
    }

    startTransition(async () => {
      if (editingYear) {
        const res = await updateSchoolYearAction({
          id: editingYear.id,
          year: yearForm.year,
          title: yearForm.title,
          start_date: yearForm.start_date,
          end_date: yearForm.end_date,
          total_school_days: Number(yearForm.total_school_days),
          status: yearForm.status,
          is_current: yearForm.is_current,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao atualizar ano letivo.");
        } else {
          setShowYearModal(false);
          triggerSuccess("Ano letivo atualizado com sucesso!");
          await refreshData();
        }
      } else {
        const res = await createSchoolYearAction({
          year: yearForm.year,
          title: yearForm.title,
          start_date: yearForm.start_date,
          end_date: yearForm.end_date,
          total_school_days: Number(yearForm.total_school_days),
          status: yearForm.status,
          is_current: yearForm.is_current,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao criar ano letivo.");
        } else {
          setShowYearModal(false);
          triggerSuccess("Ano letivo cadastrado com sucesso!");
          if (res.id) setSelectedYearId(res.id);
          await refreshData(res.id);
        }
      }
    });
  }

  function handleSetCurrentYear(yearId: string) {
    if (!canManageAll) return;
    startTransition(async () => {
      const res = await setCurrentSchoolYearAction(yearId);
      if (!res.success) {
        triggerError(res.error || "Erro ao definir ano letivo corrente.");
      } else {
        triggerSuccess("Ano letivo definido como corrente com sucesso!");
        await refreshData();
      }
    });
  }

  function handleDeleteYear(yearId: string, yearNumber: string) {
    if (!canManageAll) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o ano letivo ${yearNumber}? Esta operação só será concluída se não houver períodos ou eventos vinculados.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteSchoolYearAction(yearId);
      if (!res.success) {
        triggerError(res.error || "Erro ao excluir ano letivo.");
      } else {
        triggerSuccess("Ano letivo excluído com sucesso!");
        await refreshData();
      }
    });
  }

  // ==============================================================================
  // HANDLERS: PERÍODO ACADÊMICO
  // ==============================================================================
  function handleOpenTermModal(termToEdit?: AcademicTerm) {
    if (!currentYear) return;
    setActionError(null);

    if (termToEdit) {
      setEditingTerm(termToEdit);
      setTermForm({
        term_type: termToEdit.term_type,
        name: termToEdit.name,
        code: termToEdit.code,
        sequence_order: termToEdit.sequence_order,
        start_date: termToEdit.start_date,
        end_date: termToEdit.end_date,
        status: termToEdit.status,
      });
    } else {
      setEditingTerm(null);
      const nextSeq = sortedTerms.length + 1;
      setTermForm({
        term_type: "bimestre",
        name: `${nextSeq}º Bimestre`,
        code: `${nextSeq}B`,
        sequence_order: nextSeq,
        start_date: currentYear.start_date,
        end_date: currentYear.end_date,
        status: "aberto",
      });
    }
    setShowTermModal(true);
  }

  function handleSaveTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageAll || !currentYear) return;

    if (!termForm.name.trim()) return triggerError("O nome do período é obrigatório.");
    if (!termForm.code.trim()) return triggerError("O código do período é obrigatório.");
    if (!termForm.start_date || !termForm.end_date) {
      return triggerError("As datas de início e término são obrigatórias.");
    }
    if (new Date(termForm.end_date) < new Date(termForm.start_date)) {
      return triggerError("A data de término deve ser posterior ou igual à data de início.");
    }

    if (
      new Date(termForm.start_date) < new Date(currentYear.start_date) ||
      new Date(termForm.end_date) > new Date(currentYear.end_date)
    ) {
      return triggerError(
        `O período deve estar contido dentro do ano letivo (${currentYear.start_date} a ${currentYear.end_date}).`
      );
    }

    // Validar sobreposição de datas com outras etapas do mesmo ano letivo
    const newStart = new Date(termForm.start_date).getTime();
    const newEnd = new Date(termForm.end_date).getTime();
    const otherTerms = (currentYear.academic_terms || []).filter(
      (t) => !editingTerm || t.id !== editingTerm.id
    );
    const hasOverlap = otherTerms.some((t) => {
      const tStart = new Date(t.start_date).getTime();
      const tEnd = new Date(t.end_date).getTime();
      return newStart <= tEnd && newEnd >= tStart;
    });

    if (hasOverlap) {
      return triggerError(
        "As datas desta etapa sobrepõem o intervalo de outra etapa já cadastrada para este ano letivo."
      );
    }

    startTransition(async () => {
      if (editingTerm) {
        const res = await updateAcademicTermAction({
          id: editingTerm.id,
          term_type: termForm.term_type,
          name: termForm.name,
          code: termForm.code,
          sequence_order: Number(termForm.sequence_order),
          start_date: termForm.start_date,
          end_date: termForm.end_date,
          status: termForm.status,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao atualizar período acadêmico.");
        } else {
          setShowTermModal(false);
          triggerSuccess("Período acadêmico atualizado com sucesso!");
          await refreshData();
        }
      } else {
        const res = await createAcademicTermAction({
          school_year_id: currentYear.id,
          term_type: termForm.term_type,
          name: termForm.name,
          code: termForm.code,
          sequence_order: Number(termForm.sequence_order),
          start_date: termForm.start_date,
          end_date: termForm.end_date,
          status: termForm.status,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao criar período acadêmico.");
        } else {
          setShowTermModal(false);
          triggerSuccess("Período acadêmico cadastrado com sucesso!");
          await refreshData();
        }
      }
    });
  }

  function handleDeleteTerm(termId: string, termName: string) {
    if (!canManageAll) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o período '${termName}'? A exclusão será rejeitada caso existam eventos vinculados.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAcademicTermAction(termId);
      if (!res.success) {
        triggerError(res.error || "Erro ao excluir período acadêmico.");
      } else {
        triggerSuccess("Período acadêmico excluído com sucesso!");
        await refreshData();
      }
    });
  }

  // ==============================================================================
  // HANDLERS: CATEGORIAS DE EVENTO
  // ==============================================================================
  function handleOpenCategoryModal(categoryToEdit?: CalendarEventCategory) {
    setActionError(null);
    if (categoryToEdit) {
      setEditingCategory(categoryToEdit);
      setCategoryForm({
        name: categoryToEdit.name,
        slug: categoryToEdit.slug,
        description: categoryToEdit.description || "",
        color_hex: categoryToEdit.color_hex,
        is_school_day: categoryToEdit.is_school_day,
        allowed_roles: categoryToEdit.allowed_roles,
        is_active: categoryToEdit.is_active,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        slug: "",
        description: "",
        color_hex: "#3B82F6",
        is_school_day: false,
        allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
        is_active: true,
      });
    }
    setShowCategoryModal(true);
  }

  function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageAll) return;

    if (!categoryForm.name.trim()) return triggerError("O nome da categoria é obrigatório.");

    startTransition(async () => {
      if (editingCategory) {
        const res = await updateCalendarEventCategoryAction({
          id: editingCategory.id,
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description,
          color_hex: categoryForm.color_hex,
          is_school_day: categoryForm.is_school_day,
          allowed_roles: categoryForm.allowed_roles,
          is_active: categoryForm.is_active,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao atualizar categoria.");
        } else {
          setShowCategoryModal(false);
          triggerSuccess("Categoria atualizada com sucesso!");
          await refreshData();
        }
      } else {
        const res = await createCalendarEventCategoryAction({
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description,
          color_hex: categoryForm.color_hex,
          is_school_day: categoryForm.is_school_day,
          allowed_roles: categoryForm.allowed_roles,
          is_active: categoryForm.is_active,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao criar categoria.");
        } else {
          setShowCategoryModal(false);
          triggerSuccess("Categoria criada com sucesso!");
          await refreshData();
        }
      }
    });
  }

  function handleSeedDefaultCategories() {
    if (!canManageAll) return;
    startTransition(async () => {
      const res = await seedDefaultCalendarCategoriesAction();
      if (!res.success) {
        triggerError(res.error || "Erro ao gerar categorias padrão.");
      } else {
        triggerSuccess(`Categorias padrão geradas/sincronizadas (${res.insertedCount} adicionadas)!`);
        await refreshData();
      }
    });
  }

  function handleDeleteCategory(catId: string, catName: string) {
    if (!canManageAll) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a categoria '${catName}'? A exclusão só será permitida se não houver eventos cadastrados nela.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteCalendarEventCategoryAction(catId);
      if (!res.success) {
        triggerError(res.error || "Erro ao excluir categoria.");
      } else {
        triggerSuccess("Categoria excluída com sucesso!");
        await refreshData();
      }
    });
  }

  // ==============================================================================
  // HANDLERS: EVENTOS DO CALENDÁRIO
  // ==============================================================================
  function handleOpenEventModal(eventToEdit?: CalendarEvent) {
    if (!currentYear) return triggerError("Selecione um ano letivo antes de criar um evento.");
    setActionError(null);

    if (eventToEdit) {
      setEditingEvent(eventToEdit);
      setEventForm({
        school_year_id: eventToEdit.school_year_id,
        academic_term_id: eventToEdit.academic_term_id || "",
        category_id: eventToEdit.category_id,
        title: eventToEdit.title,
        description: eventToEdit.description || "",
        start_date: eventToEdit.start_date,
        end_date: eventToEdit.end_date,
        is_full_day: eventToEdit.is_full_day,
        start_time: eventToEdit.start_time || "",
        end_time: eventToEdit.end_time || "",
        is_school_day: eventToEdit.is_school_day,
        target_audience: eventToEdit.target_audience,
      });
    } else {
      setEditingEvent(null);
      const defaultCategory = allowedCategoriesForUser[0] || categories[0];
      setEventForm({
        school_year_id: currentYear.id,
        academic_term_id: "",
        category_id: defaultCategory?.id || "",
        title: "",
        description: "",
        start_date: currentYear.start_date,
        end_date: currentYear.start_date,
        is_full_day: true,
        start_time: "",
        end_time: "",
        is_school_day: defaultCategory?.is_school_day || false,
        target_audience: "todos",
      });
    }
    setShowEventModal(true);
  }

  function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    const targetYear =
      schoolYears.find((y) => y.id === eventForm.school_year_id) || currentYear;
    if (!targetYear) return triggerError("Selecione um ano letivo.");

    if (!eventForm.category_id) return triggerError("Selecione a categoria do evento.");
    if (!eventForm.title.trim()) return triggerError("O título do evento é obrigatório.");
    if (!eventForm.start_date) return triggerError("A data inicial é obrigatória.");

    const finalEndDate = eventForm.end_date || eventForm.start_date;
    if (new Date(finalEndDate) < new Date(eventForm.start_date)) {
      return triggerError("A data final deve ser posterior ou igual à data inicial.");
    }

    // Validação com o ano letivo
    if (
      new Date(eventForm.start_date) < new Date(targetYear.start_date) ||
      new Date(finalEndDate) > new Date(targetYear.end_date)
    ) {
      return triggerError(
        `O evento deve estar contido dentro do ano letivo selecionado (${targetYear.start_date} a ${targetYear.end_date}).`
      );
    }

    // Validação com o período acadêmico se selecionado
    if (eventForm.academic_term_id) {
      const term = (targetYear.academic_terms || []).find(
        (t) => t.id === eventForm.academic_term_id
      );
      if (term) {
        if (
          new Date(eventForm.start_date) < new Date(term.start_date) ||
          new Date(finalEndDate) > new Date(term.end_date)
        ) {
          return triggerError(
            `O evento deve estar contido dentro do período '${term.name}' (${term.start_date} a ${term.end_date}).`
          );
        }
      }
    }

    startTransition(async () => {
      if (editingEvent) {
        const res = await updateCalendarEventAction({
          id: editingEvent.id,
          school_year_id: eventForm.school_year_id,
          academic_term_id: eventForm.academic_term_id || null,
          category_id: eventForm.category_id,
          title: eventForm.title,
          description: eventForm.description,
          start_date: eventForm.start_date,
          end_date: finalEndDate,
          is_full_day: eventForm.is_full_day,
          start_time: eventForm.is_full_day ? null : eventForm.start_time || null,
          end_time: eventForm.is_full_day ? null : eventForm.end_time || null,
          is_school_day: eventForm.is_school_day,
          target_audience: eventForm.target_audience,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao atualizar evento.");
        } else {
          setShowEventModal(false);
          triggerSuccess("Evento atualizado com sucesso!");
          await refreshData();
        }
      } else {
        const res = await createCalendarEventAction({
          school_year_id: eventForm.school_year_id,
          academic_term_id: eventForm.academic_term_id || null,
          category_id: eventForm.category_id,
          title: eventForm.title,
          description: eventForm.description,
          start_date: eventForm.start_date,
          end_date: finalEndDate,
          is_full_day: eventForm.is_full_day,
          start_time: eventForm.is_full_day ? null : eventForm.start_time || null,
          end_time: eventForm.is_full_day ? null : eventForm.end_time || null,
          is_school_day: eventForm.is_school_day,
          target_audience: eventForm.target_audience,
        });

        if (!res.success) {
          triggerError(res.error || "Erro ao cadastrar evento.");
        } else {
          setShowEventModal(false);
          triggerSuccess("Evento cadastrado com sucesso!");
          await refreshData();
        }
      }
    });
  }

  function handleDeleteEvent(eventId: string, eventTitle: string) {
    if (!window.confirm(`Tem certeza que deseja excluir o evento '${eventTitle}'?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteCalendarEventAction(eventId);
      if (!res.success) {
        triggerError(res.error || "Erro ao excluir evento.");
      } else {
        triggerSuccess("Evento excluído com sucesso!");
        await refreshData();
      }
    });
  }

  // Filtragem dos eventos para exibição
  const filteredEvents = events.filter((ev) => {
    // Filtro pelo ano selecionado
    if (ev.school_year_id !== selectedYearId) return false;

    // Filtro por categoria
    if (filterCategory !== "all" && ev.category_id !== filterCategory) return false;

    // Filtro por etapa/termo
    if (filterTerm !== "all" && ev.academic_term_id !== filterTerm) return false;

    // Filtro por público-alvo
    if (filterAudience !== "all" && ev.target_audience !== filterAudience && ev.target_audience !== "todos") {
      return false;
    }

    // Busca textual
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchDesc = ev.description?.toLowerCase().includes(q);
      const matchCat = ev.category?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Alertas de Feedback */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs sm:text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-900 text-xs sm:text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Institucional do Calendário */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Calendário Acadêmico & Escolar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de Anos, Períodos & Eventos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Planejamento estruturado de anos letivos, bimestres, feriados, recessos e datas pedagógicas de {schoolName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!canManageAll && !isSecretaria && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Modo Consulta</span>
            </span>
          )}

          {/* Ações do Header */}
          {(canManageAll || isSecretaria) && activeTab === "visual" && (
            <button
              type="button"
              onClick={() => handleOpenEventModal()}
              disabled={isPending || !currentYear}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Evento / Data</span>
            </button>
          )}

          {canManageAll && activeTab === "anos" && (
            <button
              type="button"
              onClick={() => handleOpenYearModal()}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Ano Letivo</span>
            </button>
          )}

          {(canManageAll || isSecretaria) && activeTab === "eventos" && (
            <button
              type="button"
              onClick={() => handleOpenEventModal()}
              disabled={isPending || !currentYear}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Evento / Data</span>
            </button>
          )}

          {canManageAll && activeTab === "categorias" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSeedDefaultCategories}
                disabled={isPending}
                title="Gera categorias padrões oficiais"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Gerar Padrões</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenCategoryModal()}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Abas do Calendário */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("visual")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "visual"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendário Visual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dias_letivos")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "dias_letivos"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <CalendarCheck className="w-4 h-4 text-emerald-500" />
          <span>Controle de Dias Letivos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("relatorio")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "relatorio"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <Printer className="w-4 h-4 text-indigo-500" />
          <span>Relatório Oficial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("anos")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "anos"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Anos Letivos & Etapas</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {schoolYears.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("eventos")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "eventos"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Eventos & Feriados</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {filteredEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categorias")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === "categorias"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <Tag className="w-4 h-4" />
          <span>Categorias de Eventos</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {categories.length}
          </span>
        </button>
      </div>

      {/* ============================================================================== */}
      {/* ABA 0: CALENDÁRIO VISUAL (ETAPA 3) */}
      {/* ============================================================================== */}
      {activeTab === "visual" && currentYear && (
        <CalendarioVisualView
          schoolYear={currentYear}
          schoolYears={schoolYears}
          onSelectYear={(yearId) => setSelectedYearId(yearId)}
          categories={categories}
          events={events}
          terms={sortedTerms}
          userRole={userRole}
          currentUserId={currentUserId}
          onOpenCreateEventModal={(initialDate) => {
            if (initialDate) {
              setEventForm({
                ...eventForm,
                school_year_id: currentYear.id,
                start_date: initialDate,
                end_date: initialDate,
              });
              setShowEventModal(true);
            } else {
              handleOpenEventModal();
            }
          }}
          onOpenEditEventModal={(ev) => handleOpenEventModal(ev)}
          onDeleteEvent={(id, title) => handleDeleteEvent(id, title)}
        />
      )}

      {activeTab === "visual" && !currentYear && (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 max-w-lg mx-auto my-8">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Nenhum Ano Letivo Cadastrado</h3>
            <p className="text-xs text-slate-500">
              Para visualizar o calendário escolar, configure primeiro o ano letivo na aba &quot;Anos Letivos & Etapas&quot;.
            </p>
          </div>
          {canManageAll && (
            <button
              type="button"
              onClick={() => handleOpenYearModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Ano Letivo</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* ABA: CONTROLE DE DIAS LETIVOS (ETAPA 4) */}
      {/* ============================================================================== */}
      {activeTab === "dias_letivos" && currentYear && (
        <ControleDiasLetivosView
          schoolYear={currentYear}
          schoolYears={schoolYears}
          onSelectYear={(yearId) => setSelectedYearId(yearId)}
          events={events}
          categories={categories}
          terms={sortedTerms}
        />
      )}

      {activeTab === "dias_letivos" && !currentYear && (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 max-w-lg mx-auto my-8">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Nenhum Ano Letivo Cadastrado</h3>
            <p className="text-xs text-slate-500">
              Para controlar os dias letivos, configure primeiro o ano letivo na aba &quot;Anos Letivos & Etapas&quot;.
            </p>
          </div>
          {canManageAll && (
            <button
              type="button"
              onClick={() => handleOpenYearModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Ano Letivo</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* ABA: RELATÓRIO OFICIAL / IMPRESSÃO (ETAPA 5) */}
      {/* ============================================================================== */}
      {activeTab === "relatorio" && currentYear && (
        <RelatorioCalendarioView
          schoolYear={currentYear}
          schoolYears={schoolYears}
          onSelectYear={(yearId) => setSelectedYearId(yearId)}
          events={events}
          categories={categories}
          terms={sortedTerms}
          schoolName={schoolName}
        />
      )}

      {activeTab === "relatorio" && !currentYear && (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 max-w-lg mx-auto my-8">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Nenhum Ano Letivo Cadastrado</h3>
            <p className="text-xs text-slate-500">
              Para gerar o relatório oficial do calendário, configure primeiro o ano letivo na aba &quot;Anos Letivos & Etapas&quot;.
            </p>
          </div>
          {canManageAll && (
            <button
              type="button"
              onClick={() => handleOpenYearModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Ano Letivo</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* ABA 1: ANOS LETIVOS & ETAPAS ACADÊMICAS (ETAPA 2A) */}
      {/* ============================================================================== */}
      {activeTab === "anos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Anos Letivos (4 colunas) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Anos Cadastrados ({schoolYears.length})
              </h3>
              {canManageAll && (
                <button
                  type="button"
                  onClick={() => handleOpenYearModal()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Ano</span>
                </button>
              )}
            </div>

            {schoolYears.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Nenhum ano letivo configurado</p>
                <p className="text-xs text-slate-500">
                  Cadastre o primeiro ano letivo para configurar períodos e datas escolares.
                </p>
                {canManageAll && (
                  <button
                    type="button"
                    onClick={() => handleOpenYearModal()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Ano</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {schoolYears.map((year) => {
                  const isSelected = year.id === selectedYearId;
                  const statusCfg = YEAR_STATUS_CONFIG[year.status] || YEAR_STATUS_CONFIG.planejamento;

                  return (
                    <div
                      key={year.id}
                      onClick={() => setSelectedYearId(year.id)}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all cursor-pointer relative",
                        isSelected
                          ? "bg-white border-indigo-600 shadow-md shadow-indigo-600/5 ring-2 ring-indigo-500/10"
                          : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                            {year.year}
                          </span>
                          {year.is_current && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Vigente</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                            statusCfg.bg,
                            statusCfg.text,
                            statusCfg.border
                          )}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium truncate mb-2.5">
                        {year.title}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(year.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                            {new Date(year.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-700">
                          {year.total_school_days} dias letivos
                        </div>
                      </div>

                      {canManageAll && (
                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100/80">
                          {!year.is_current && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetCurrentYear(year.id);
                              }}
                              disabled={isPending}
                              title="Definir como Ano Letivo Vigente"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Tornar Atual</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenYearModal(year);
                            }}
                            disabled={isPending}
                            title="Editar Ano Letivo"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!year.is_current && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteYear(year.id, year.year);
                              }}
                              disabled={isPending}
                              title="Excluir Ano Letivo"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalhes do Ano Selecionado e Etapas Acadêmicas (8 colunas) */}
          <div className="lg:col-span-8 space-y-6">
            {currentYear ? (
              <>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">
                          {currentYear.title}
                        </h3>
                        {currentYear.is_current && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">
                            Ano Corrente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Identificador: <code className="font-mono text-slate-700">{currentYear.year}</code> • Status:{" "}
                        <strong className="text-slate-700 uppercase">{currentYear.status}</strong>
                      </p>
                    </div>

                    {canManageAll && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenYearModal(currentYear)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Dados do Ano</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[11px] font-semibold text-slate-500">Início do Ano</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {new Date(currentYear.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[11px] font-semibold text-slate-500">Término do Ano</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {new Date(currentYear.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[11px] font-semibold text-slate-500">Dias Letivos</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {currentYear.total_school_days} dias
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[11px] font-semibold text-slate-500">Etapas / Períodos</span>
                      <span className="text-xs sm:text-sm font-bold text-indigo-700">
                        {sortedTerms.length} cadastrados
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900">
                        Etapas & Períodos Acadêmicos
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Divisão do ano letivo para cálculo de médias, fechamento de notas e apuração de frequência.
                      </p>
                    </div>

                    {canManageAll && (
                      <button
                        type="button"
                        onClick={() => handleOpenTermModal()}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Período</span>
                      </button>
                    )}
                  </div>

                  {sortedTerms.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">
                        Nenhuma etapa ou período cadastrado para {currentYear.year}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Cadastre os bimestres, trimestres ou semestres correspondentes a este ano letivo.
                      </p>
                      {canManageAll && (
                        <button
                          type="button"
                          onClick={() => handleOpenTermModal()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Cadastrar 1º Bimestre</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-3">Ordem</th>
                            <th className="py-3 px-3">Nome / Código</th>
                            <th className="py-3 px-3">Tipo</th>
                            <th className="py-3 px-3">Vigência</th>
                            <th className="py-3 px-3">Status</th>
                            {canManageAll && <th className="py-3 px-3 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedTerms.map((term) => {
                            const statusCfg = TERM_STATUS_CONFIG[term.status] || TERM_STATUS_CONFIG.aberto;

                            return (
                              <tr key={term.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-3 font-extrabold text-slate-900">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 inline-flex items-center justify-center text-xs text-slate-700">
                                    {term.sequence_order}º
                                  </span>
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="font-bold text-slate-900">{term.name}</div>
                                  <div className="text-[11px] font-mono text-slate-500">{term.code}</div>
                                </td>
                                <td className="py-3.5 px-3">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                    {TERM_TYPE_LABELS[term.term_type] || term.term_type}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      {new Date(term.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                                      {new Date(term.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3">
                                  <span
                                    className={clsx(
                                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-block",
                                      statusCfg.bg,
                                      statusCfg.text,
                                      statusCfg.border
                                    )}
                                  >
                                    {statusCfg.label}
                                  </span>
                                </td>
                                {canManageAll && (
                                  <td className="py-3.5 px-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTermModal(term)}
                                        disabled={isPending}
                                        title="Editar Período"
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTerm(term.id, term.name)}
                                        disabled={isPending}
                                        title="Excluir Período"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-3">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Nenhum ano letivo selecionado</h3>
                <p className="text-xs text-slate-500">
                  Selecione um ano letivo na coluna lateral para visualizar suas etapas acadêmicas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* ABA 2: EVENTOS & FERIADOS DO CALENDÁRIO (ETAPA 2B) */}
      {/* ============================================================================== */}
      {activeTab === "eventos" && (
        <div className="space-y-6">
          {/* Barra de Filtros e Seletores */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Seleção de Ano */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Ano Letivo
                </label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {schoolYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year} - {y.title} {y.is_current ? "(Atual)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Categoria */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Etapa / Período */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Etapa / Período
                </label>
                <select
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todas as Etapas</option>
                  {sortedTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Público */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Público-Alvo
                </label>
                <select
                  value={filterAudience}
                  onChange={(e) => setFilterAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todos os Públicos</option>
                  <option value="todos">Toda a Comunidade</option>
                  <option value="professores">Professores</option>
                  <option value="alunos_responsaveis">Alunos & Responsáveis</option>
                  <option value="equipe_pedagogica">Equipe Pedagógica</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
            </div>

            {/* Busca textual */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar evento por título, descrição ou categoria..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Lista de Eventos */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Eventos do Ano {currentYear?.year || ""} ({filteredEvents.length})
              </h3>
              {(canManageAll || isSecretaria) && (
                <button
                  type="button"
                  onClick={() => handleOpenEventModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Evento</span>
                </button>
              )}
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Nenhum evento encontrado</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Não há eventos cadastrados correspondentes aos filtros selecionados para este ano letivo.
                </p>
                {(canManageAll || isSecretaria) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEventModal()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Primeiro Evento</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((ev) => {
                  const catColor = ev.category?.color_hex || "#3B82F6";
                  const isCreator = ev.created_by === currentUserId;
                  const canEditThisEvent = canManageAll || (isSecretaria && isCreator);

                  return (
                    <div
                      key={ev.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-2xl px-3 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-xs"
                          style={{ backgroundColor: catColor }}
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${catColor}15`,
                                color: catColor,
                                borderColor: `${catColor}30`,
                              }}
                            >
                              {ev.category?.name || "Sem categoria"}
                            </span>
                            {ev.is_school_day ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Dia Letivo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Não Letivo
                              </span>
                            )}
                            {ev.academic_term && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {ev.academic_term.name}
                              </span>
                            )}
                          </div>

                          {ev.description && (
                            <p className="text-xs text-slate-600 max-w-xl">{ev.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(ev.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                {ev.end_date !== ev.start_date &&
                                  ` a ${new Date(ev.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                              </span>
                            </div>

                            {!ev.is_full_day && ev.start_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {ev.start_time} {ev.end_time ? `às ${ev.end_time}` : ""}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{AUDIENCE_LABELS[ev.target_audience] || ev.target_audience}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {canEditThisEvent && (
                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEventModal(ev)}
                            disabled={isPending}
                            title="Editar Evento"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            disabled={isPending}
                            title="Excluir Evento"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* ABA 3: CATEGORIAS DE EVENTOS (ETAPA 2B) */}
      {/* ============================================================================== */}
      {activeTab === "categorias" && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Categorias de Datas & Eventos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Classificação visual, regras de contagem como dia letivo e controle de permissões por perfil.
              </p>
            </div>

            {canManageAll && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedDefaultCategories}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sincronizar Padrões</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCategoryModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Categoria</span>
                </button>
              </div>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Tag className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma categoria cadastrada</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Clique no botão abaixo para gerar instantaneamente as categorias oficiais de feriados, recessos e provas.
              </p>
              {canManageAll && (
                <button
                  type="button"
                  onClick={handleSeedDefaultCategories}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Categorias Oficiais</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white/70 hover:bg-white hover:border-slate-300 shadow-xs space-y-3 relative flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color_hex }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm truncate">{cat.name}</h4>
                      </div>

                      {cat.is_system ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          Sistema
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                          Custom
                        </span>
                      )}
                    </div>

                    {cat.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cat.is_school_day ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Dia Letivo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Não Letivo
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                        {cat.allowed_roles.includes("secretaria")
                          ? "Gestão & Secretaria"
                          : "Somente Gestão"}
                      </span>
                    </div>
                  </div>

                  {canManageAll && (
                    <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => handleOpenCategoryModal(cat)}
                        disabled={isPending}
                        title="Editar Categoria"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!cat.is_system && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={isPending}
                          title="Excluir Categoria"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: CRIAR / EDITAR ANO LETIVO */}
      {/* ============================================================================== */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingYear ? "Editar Ano Letivo" : "Novo Ano Letivo"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveYear} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ano Letivo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2026"
                    value={yearForm.year}
                    onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Dias Letivos *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={yearForm.total_school_days}
                    onChange={(e) =>
                      setYearForm({ ...yearForm, total_school_days: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título Descritivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ano Letivo 2026"
                  value={yearForm.title}
                  onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={yearForm.start_date}
                    onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={yearForm.end_date}
                    onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Ano Letivo
                </label>
                <select
                  value={yearForm.status}
                  onChange={(e) =>
                    setYearForm({ ...yearForm, status: e.target.value as SchoolYearStatus })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="planejamento">Em Planejamento</option>
                  <option value="ativo">Ativo / Em Andamento</option>
                  <option value="encerrado">Encerrado</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={yearForm.is_current}
                    onChange={(e) => setYearForm({ ...yearForm, is_current: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Definir como Ano Letivo Vigente (Atual) desta instituição
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingYear ? "Salvar Alterações" : "Criar Ano Letivo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: CRIAR / EDITAR PERÍODO ACADÊMICO */}
      {/* ============================================================================== */}
      {showTermModal && currentYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingTerm ? "Editar Etapa / Período" : "Nova Etapa / Período"}
                  </h3>
                  <span className="text-xs text-slate-500">Ano: {currentYear.title}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Divisão *
                  </label>
                  <select
                    value={termForm.term_type}
                    onChange={(e) =>
                      setTermForm({ ...termForm, term_type: e.target.value as AcademicTermType })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="bimestre">Bimestre</option>
                    <option value="trimestre">Trimestre</option>
                    <option value="semestre">Semestre</option>
                    <option value="etapa">Etapa</option>
                    <option value="anual">Anual</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordem Sequencial *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={termForm.sequence_order}
                    onChange={(e) =>
                      setTermForm({ ...termForm, sequence_order: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Etapa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1º Bimestre"
                    value={termForm.name}
                    onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1B"
                    value={termForm.code}
                    onChange={(e) =>
                      setTermForm({ ...termForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Início da Etapa *
                  </label>
                  <input
                    type="date"
                    required
                    min={currentYear.start_date}
                    max={currentYear.end_date}
                    value={termForm.start_date}
                    onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Término da Etapa *
                  </label>
                  <input
                    type="date"
                    required
                    min={currentYear.start_date}
                    max={currentYear.end_date}
                    value={termForm.end_date}
                    onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Etapa
                </label>
                <select
                  value={termForm.status}
                  onChange={(e) =>
                    setTermForm({ ...termForm, status: e.target.value as AcademicTermStatus })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="aberto">Aberto (Permite lançamentos de diário e avaliações)</option>
                  <option value="fechado">Fechado (Concluído)</option>
                  <option value="bloqueado">Bloqueado (Trava administrativa)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingTerm ? "Salvar Alterações" : "Criar Período"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: CRIAR / EDITAR CATEGORIA DE EVENTO */}
      {/* ============================================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria de Evento"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Feriado Municipal, Feira Cultural..."
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Explicativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Finalidade e orientações sobre os eventos desta categoria..."
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={categoryForm.color_hex}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, color_hex: e.target.value })
                      }
                      className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-slate-50"
                    />
                    <input
                      type="text"
                      value={categoryForm.color_hex}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, color_hex: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_school_day}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, is_school_day: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Computar como Dia Letivo
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.allowed_roles.includes("secretaria")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCategoryForm({
                            ...categoryForm,
                            allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
                          });
                        } else {
                          setCategoryForm({
                            ...categoryForm,
                            allowed_roles: ["admin_escola", "coordenacao"],
                          });
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Permitir lançamento pela Secretaria
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCategory ? "Salvar Alterações" : "Criar Categoria"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: CRIAR / EDITAR EVENTO DO CALENDÁRIO */}
      {/* ============================================================================== */}
      {showEventModal && currentYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingEvent ? "Editar Evento / Data" : "Novo Evento no Calendário"}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Ano Selecionado: {modalSelectedYear?.title || currentYear.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tiradentes, Feira de Ciências, Prova de Matemática..."
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ano Letivo *
                  </label>
                  <select
                    required
                    value={eventForm.school_year_id}
                    onChange={(e) => {
                      const newYearId = e.target.value;
                      const targetYear = schoolYears.find((y) => y.id === newYearId);
                      setEventForm({
                        ...eventForm,
                        school_year_id: newYearId,
                        academic_term_id: "",
                        start_date: targetYear?.start_date || eventForm.start_date,
                        end_date: targetYear?.start_date || eventForm.end_date,
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {schoolYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.year} - {y.title} {y.is_current ? "(Atual)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    required
                    value={eventForm.category_id}
                    onChange={(e) => {
                      const selectedCat = categories.find((c) => c.id === e.target.value);
                      setEventForm({
                        ...eventForm,
                        category_id: e.target.value,
                        is_school_day: selectedCat?.is_school_day ?? false,
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Selecione...</option>
                    {allowedCategoriesForUser.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.is_school_day ? "(Letivo)" : "(Não letivo)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Etapa / Período (Opcional)
                  </label>
                  <select
                    value={eventForm.academic_term_id}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, academic_term_id: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Nenhum (Todo o ano)</option>
                    {modalSortedTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    required
                    min={modalSelectedYear?.start_date}
                    max={modalSelectedYear?.end_date}
                    value={eventForm.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setEventForm({
                        ...eventForm,
                        start_date: newStart,
                        end_date: eventForm.end_date < newStart ? newStart : eventForm.end_date,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Final *
                  </label>
                  <input
                    type="date"
                    required
                    min={eventForm.start_date || modalSelectedYear?.start_date}
                    max={modalSelectedYear?.end_date}
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Público-Alvo
                  </label>
                  <select
                    value={eventForm.target_audience}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        target_audience: e.target.value as EventTargetAudience,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="todos">Toda a Comunidade Escolar</option>
                    <option value="professores">Professores & Docentes</option>
                    <option value="alunos_responsaveis">Alunos & Responsáveis</option>
                    <option value="equipe_pedagogica">Equipe Pedagógica</option>
                    <option value="secretaria">Secretaria</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.is_full_day}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, is_full_day: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">Evento de Dia Inteiro</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.is_school_day}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, is_school_day: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Contabilizar como Dia Letivo
                    </span>
                  </label>
                </div>
              </div>

              {!eventForm.is_full_day && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Horário Início
                    </label>
                    <input
                      type="time"
                      value={eventForm.start_time}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, start_time: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Horário Término
                    </label>
                    <input
                      type="time"
                      value={eventForm.end_time}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, end_time: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detalhes / Orientações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções para a equipe, avisos gerais..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingEvent ? "Salvar Alterações" : "Cadastrar Evento"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
