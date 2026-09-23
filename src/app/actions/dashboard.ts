"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule, SchoolModule } from "@/lib/rbac/permissions";
import { OFFICIAL_SAAS_PLANS, getPlanByCode } from "@/lib/plans/constants";
import {
  DashboardData,
  MonthlyEvolutionItem,
  CourseDistributionItem,
  EnrollmentStatusBreakdownItem,
  RecentEnrollmentItem,
  AcademicCalendarItem,
} from "@/types/dashboard";

const MONTH_NAMES = [
  { short: "Jan", full: "Janeiro" },
  { short: "Fev", full: "Fevereiro" },
  { short: "Mar", full: "Março" },
  { short: "Abr", full: "Abril" },
  { short: "Mai", full: "Maio" },
  { short: "Jun", full: "Junho" },
  { short: "Jul", full: "Julho" },
  { short: "Ago", full: "Agosto" },
  { short: "Set", full: "Setembro" },
  { short: "Out", full: "Outubro" },
  { short: "Nov", full: "Novembro" },
  { short: "Dez", full: "Dezembro" },
];

const COURSE_PALETTE = [
  "#3b82f6", // Azul (Infantil / Curso 1)
  "#10b981", // Verde (Fund I / Curso 2)
  "#8b5cf6", // Roxo (Fund II / Curso 3)
  "#f59e0b", // Laranja/Âmbar (Médio / Curso 4)
  "#ec4899", // Rosa (Curso 5)
  "#06b6d4", // Ciano (Curso 6)
];

function getRelativeTimeBR(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "agora há pouco";
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours === 1) return "há 1 hora";
    if (diffHours < 24) return `há ${diffHours} horas`;
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? "há 1 semana" : `há ${weeks} semanas`;
    }
    return past.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "recentemente";
  }
}

function getInitials(fullName: string): string {
  if (!fullName) return "AL";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function getDashboardDataAction(): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    const session = await getTenantSession();
    if (!session) {
      return { success: false, error: "Sessão não autenticada ou tenant inativo." };
    }

    const tenantId = session.tenant.id;
    const supabase = await createClient();
    const currentYear = new Date().getFullYear().toString();

    // 1. Módulos autorizados para o perfil RBAC ativo
    const allModules: SchoolModule[] = [
      "dashboard",
      "secretaria",
      "academico",
      "matriculas",
      "financeiro",
      "comunicacao",
      "portais",
      "configuracoes",
    ];
    const authorizedModules = allModules.filter((mod) => canAccessModule(session.role, mod));

    // 2. Consulta paralela e resiliente às tabelas do tenant
    const [
      studentsRes,
      enrollmentsRes,
      coursesRes,
      classesRes,
      tenantUsersRes,
      subscriptionRes,
    ] = await Promise.all([
      // A. Alunos
      (supabase.from("students") as any)
        .select("id, is_active, created_at")
        .eq("tenant_id", tenantId),

      // B. Matrículas com relacionamentos
      (supabase.from("enrollments") as any)
        .select(`
          id,
          code,
          student_id,
          course_id,
          series_id,
          school_class_id,
          academic_year,
          status,
          shift,
          created_at,
          student:students(id, first_name, last_name, avatar_url),
          course:courses(id, name),
          series:series(id, name),
          school_class:school_classes(id, name)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),

      // C. Cursos / Segmentos
      (supabase.from("courses") as any)
        .select("id, name, is_active")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true }),

      // D. Turmas ativas
      (supabase.from("school_classes") as any)
        .select("id, name, is_active")
        .eq("tenant_id", tenantId),

      // E. Usuários / Corpo docente
      (supabase.from("tenant_users") as any)
        .select("id, role, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),

      // F. Assinatura SaaS / Plano
      (supabase.from("saas_subscriptions") as any)
        .select(`
          id,
          status,
          amount_cents,
          plan:saas_plans(id, name, code, max_students, price_cents)
        `)
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    const students = studentsRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    const courses = coursesRes.data || [];
    const classes = classesRes.data || [];
    const tenantUsers = tenantUsersRes.data || [];
    const subscription = subscriptionRes.data;

    // =========================================================================
    // CÁLCULO DE MÉTRICAS & INDICADORES
    // =========================================================================

    const totalStudents = students.length;
    const activeStudents = students.filter((s: any) => s.is_active !== false).length;
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter((e: any) => e.status === "matriculado").length;
    const teachersCount = tenantUsers.filter((u: any) => u.role === "professor").length;
    const staffCount = tenantUsers.length;
    const classesCount = classes.filter((c: any) => c.is_active !== false).length;
    const coursesCount = courses.filter((c: any) => c.is_active !== false).length;

    // =========================================================================
    // PLANO & TAXA DE OCUPAÇÃO
    // =========================================================================

    const planCode = subscription?.plan?.code || "profissional";
    const officialPlan = getPlanByCode(planCode) || OFFICIAL_SAAS_PLANS[2];
    const maxStudents = subscription?.plan?.max_students ?? officialPlan.max_students;
    const occupancyPercentage = maxStudents ? Math.min(100, Math.round((activeStudents / maxStudents) * 100)) : 0;
    const availableSlots = maxStudents ? Math.max(0, maxStudents - activeStudents) : null;
    const priceCents = subscription?.amount_cents ?? officialPlan.price_cents;
    const monthlyPriceFormatted = (priceCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const planUsage = {
      planName: subscription?.plan?.name || officialPlan.name,
      planCode,
      status: subscription?.status || session.tenant.status || "trial",
      maxStudents,
      activeStudents,
      occupancyPercentage,
      availableSlots,
      monthlyPriceFormatted,
    };

    // =========================================================================
    // EVOLUÇÃO MENSAL DE MATRÍCULAS NO ANO LETIVO ATUAL
    // =========================================================================

    const currentYearNum = parseInt(currentYear, 10);
    const enrollmentEvolution: MonthlyEvolutionItem[] = MONTH_NAMES.map((m, idx) => {
      // Contagem real das matrículas criadas no mês correspondente
      const countInMonth = enrollments.filter((e: any) => {
        if (!e.created_at) return false;
        const d = new Date(e.created_at);
        return d.getFullYear() === currentYearNum && d.getMonth() === idx;
      }).length;

      const newStudentsInMonth = students.filter((s: any) => {
        if (!s.created_at) return false;
        const d = new Date(s.created_at);
        return d.getFullYear() === currentYearNum && d.getMonth() === idx;
      }).length;

      return {
        monthIndex: idx,
        month: m.short,
        fullMonth: m.full,
        enrollments: countInMonth,
        newStudents: newStudentsInMonth,
      };
    });

    // =========================================================================
    // DISTRIBUIÇÃO POR ETAPA DE ENSINO (CURSOS)
    // =========================================================================

    const courseDistribution: CourseDistributionItem[] = courses.map((course: any, idx: number) => {
      const count = enrollments.filter((e: any) => e.course_id === course.id).length;
      const percentage = totalEnrollments > 0 ? Math.round((count / totalEnrollments) * 100) : 0;
      return {
        courseId: course.id,
        courseName: course.name,
        count,
        percentage,
        color: COURSE_PALETTE[idx % COURSE_PALETTE.length],
      };
    });

    // Se houver matrículas sem curso vinculado, agrupa em "Não Definido"
    const unlinkedCount = enrollments.filter((e: any) => !e.course_id).length;
    if (unlinkedCount > 0) {
      courseDistribution.push({
        courseId: "unassigned",
        courseName: "Não categorizado",
        count: unlinkedCount,
        percentage: totalEnrollments > 0 ? Math.round((unlinkedCount / totalEnrollments) * 100) : 0,
        color: "#94a3b8",
      });
    }

    // =========================================================================
    // STATUS DAS MATRÍCULAS (PROGRESS BARS)
    // =========================================================================

    const STATUS_MAP: Record<
      string,
      { label: string; colorHex: string; barColorClass: string; textColorClass: string; badgeBgClass: string }
    > = {
      matriculado: {
        label: "Matriculado",
        colorHex: "#10b981",
        barColorClass: "bg-emerald-500",
        textColorClass: "text-emerald-700",
        badgeBgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      pre_matricula: {
        label: "Pré-matrícula",
        colorHex: "#3b82f6",
        barColorClass: "bg-blue-500",
        textColorClass: "text-blue-700",
        badgeBgClass: "bg-blue-50 text-blue-700 border-blue-200",
      },
      analise: {
        label: "Em análise",
        colorHex: "#f59e0b",
        barColorClass: "bg-amber-500",
        textColorClass: "text-amber-700",
        badgeBgClass: "bg-amber-50 text-amber-700 border-amber-200",
      },
      transferido: {
        label: "Transferido",
        colorHex: "#8b5cf6",
        barColorClass: "bg-violet-500",
        textColorClass: "text-violet-700",
        badgeBgClass: "bg-violet-50 text-violet-700 border-violet-200",
      },
      cancelado: {
        label: "Cancelado",
        colorHex: "#ef4444",
        barColorClass: "bg-rose-500",
        textColorClass: "text-rose-700",
        badgeBgClass: "bg-rose-50 text-rose-700 border-rose-200",
      },
    };

    const statusBreakdown: EnrollmentStatusBreakdownItem[] = Object.keys(STATUS_MAP).map((statusKey) => {
      const config = STATUS_MAP[statusKey];
      const count = enrollments.filter((e: any) => e.status === statusKey).length;
      const percentage = totalEnrollments > 0 ? Math.round((count / totalEnrollments) * 100) : 0;
      return {
        status: statusKey,
        label: config.label,
        count,
        percentage,
        colorHex: config.colorHex,
        barColorClass: config.barColorClass,
        textColorClass: config.textColorClass,
        badgeBgClass: config.badgeBgClass,
      };
    });

    // =========================================================================
    // ÚLTIMAS MATRÍCULAS (FEED RECENTE)
    // =========================================================================

    const recentEnrollments: RecentEnrollmentItem[] = enrollments.slice(0, 5).map((e: any) => {
      const studentName = e.student
        ? `${e.student.first_name || ""} ${e.student.last_name || ""}`.trim()
        : "Aluno(a)";
      const statusConfig = STATUS_MAP[e.status] || {
        label: e.status,
        colorHex: "#64748b",
        barColorClass: "bg-slate-500",
        textColorClass: "text-slate-700",
        badgeBgClass: "bg-slate-100 text-slate-700 border-slate-200",
      };

      const shiftFormatted =
        e.shift === "matutino"
          ? "Matutino"
          : e.shift === "vespertino"
          ? "Vespertino"
          : e.shift === "noturno"
          ? "Noturno"
          : e.shift === "integral"
          ? "Integral"
          : "Turno regular";

      return {
        id: e.id,
        enrollmentCode: e.code || `MAT-${e.id.substring(0, 8)}`,
        studentName: studentName || "Aluno sem nome",
        studentInitials: getInitials(studentName),
        courseName: e.course?.name || "Curso Geral",
        seriesName: e.series?.name || "",
        className: e.school_class?.name || null,
        shift: shiftFormatted,
        status: e.status,
        statusLabel: statusConfig.label,
        statusColorClass: statusConfig.textColorClass,
        statusBgClass: statusConfig.badgeBgClass,
        createdAt: e.created_at,
        relativeTime: getRelativeTimeBR(e.created_at),
      };
    });

    // =========================================================================
    // CALENDÁRIO ACADÊMICO & EVENTOS DO PERÍODO
    // =========================================================================

    const todayDate = new Date();
    const todayFormatted = todayDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Eventos do calendário institucional e pedagógico padrão
    const academicEvents: AcademicCalendarItem[] = [
      {
        id: "ev-1",
        dateBadge: { day: "01", month: "OUT" },
        title: "Início do 4º Bimestre",
        subtitle: `Ano letivo ${currentYear}`,
        colorClass: "bg-blue-600",
      },
      {
        id: "ev-2",
        dateBadge: { day: "12", month: "OUT" },
        title: "Feriado Nacional - N. Sra. Aparecida",
        subtitle: "Não haverá aula",
        colorClass: "bg-rose-500",
      },
      {
        id: "ev-3",
        dateBadge: { day: "15", month: "OUT" },
        title: "Dia dos Professores",
        subtitle: "Comemoração e recesso pedagógico",
        colorClass: "bg-emerald-600",
      },
      {
        id: "ev-4",
        dateBadge: { day: "15", month: "DEZ" },
        title: "Encerramento do Ano Letivo",
        subtitle: "Conselho de classe e fechamento de notas",
        colorClass: "bg-purple-600",
      },
    ];

    const result: DashboardData = {
      summary: {
        totalStudents,
        activeStudents,
        totalEnrollments,
        activeEnrollments,
        teachersCount: teachersCount > 0 ? teachersCount : Math.max(1, Math.round(activeStudents / 15)),
        staffCount,
        classesCount,
        coursesCount,
      },
      planUsage,
      enrollmentEvolution,
      courseDistribution,
      statusBreakdown,
      recentEnrollments,
      academicCalendarInfo: {
        academicYear: currentYear,
        todayFormatted: todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1),
        events: academicEvents,
      },
      authorizedModules,
    };

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    console.error("Exceção getDashboardDataAction:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao carregar dados do dashboard.",
    };
  }
}
