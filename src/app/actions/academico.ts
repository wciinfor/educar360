"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { UserRole } from "@/types/database";
import { revalidatePath } from "next/cache";
import {
  Course,
  Series,
  SchoolClass,
  CreateCourseInput,
  UpdateCourseInput,
  CreateSeriesInput,
  UpdateSeriesInput,
  CreateSchoolClassInput,
  UpdateSchoolClassInput,
  ClassLesson,
  LessonAttendance,
  AttendanceStatus,
  SaveClassLessonInput,
  SaveLessonAttendancesInput,
  ClassAttendanceConsolidatedReport,
  TeacherClassAllocation,
  StudentAttendanceSummary,
  AssessmentType,
  CalculationFormula,
  RoundingRule,
  AcademicSettings,
  AcademicAssessment,
  StudentAssessmentGrade,
  AcademicPeriodClosing,
  SaveAssessmentInput,
  GradeItemInput,
  SaveStudentGradesInput,
  TogglePeriodClosingInput,
  SaveAcademicSettingsInput,
  StudentReportCard,
  ReportCardTerm,
  SchoolYear,
  AcademicTerm,
  SubjectReportItem,
  PeriodGradeDetail,
  HistoryOriginType,
  HistoryFinalResult,
  HistoryCurriculumSubject,
  StudentAcademicHistoryRecord,
  HistoryRectification,
  StudentBioProfile,
  CompleteStudentHistoryDocument,
  SaveExternalHistoryInput,
  ConsolidateCurrentYearHistoryInput,
  RectifyHistoryInput,
} from "@/types/academico";

// ==============================================================================
// 0. GUARDIÃO DE ACESSO & RBAC DO MÓDULO ACADÊMICO
// ==============================================================================

async function assertAcademicAccess(requiredRoles?: UserRole[]) {
  const session = await getTenantSession();
  if (!session) {
    throw new Error("Não autenticado ou sessão expirada.");
  }
  if (!canAccessModule(session.role, "academico")) {
    throw new Error("Acesso negado: Perfil sem permissão para o módulo Acadêmico.");
  }
  if (requiredRoles && !requiredRoles.includes(session.role)) {
    throw new Error(
      `Acesso restrito: Seu perfil (${session.role}) não possui autorização para gerenciar a estrutura acadêmica.`
    );
  }
  return session;
}

// ==============================================================================
// 1. CURSOS / SEGMENTOS DE ENSINO
// ==============================================================================

export async function getCoursesAction(): Promise<{
  success: boolean;
  courses: Course[];
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // 1. Tenta consultar tabela física public.courses
    try {
      const { data, error } = await (supabase.from("courses") as any)
        .select(`
          *,
          series:series(id)
        `)
        .eq("tenant_id", session.tenant.id)
        .order("name", { ascending: true });

      if (!error && data) {
        const list: Course[] = data.map((c: any) => ({
          id: c.id,
          tenant_id: c.tenant_id,
          name: c.name,
          description: c.description,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
          series_count: Array.isArray(c.series) ? c.series.length : 0,
        }));
        return { success: true, courses: list };
      }
    } catch {
      // Continua para o fallback
    }

    // 2. Fallback JSONB store
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    const courses: Course[] = curSettings.academic_courses_store || [];
    const seriesList: Series[] = curSettings.academic_series_store || [];

    const enriched = courses.map((c) => ({
      ...c,
      series_count: seriesList.filter((s) => s.course_id === c.id).length,
    }));

    return { success: true, courses: enriched };
  } catch (err: any) {
    return { success: false, courses: [], error: err?.message || "Erro ao consultar cursos." };
  }
}

export async function saveCourseAction(
  input: CreateCourseInput | UpdateCourseInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "O nome do curso/segmento é obrigatório." };
    }

    const isEdit = "id" in input && Boolean(input.id);
    const courseId = isEdit ? (input as UpdateCourseInput).id : crypto.randomUUID();
    const description = input.description?.trim() || null;
    const isActive = input.is_active !== undefined ? input.is_active : true;

    // 1. Tenta gravar na tabela física public.courses
    let savedOnPhysical = false;
    let isTableMissing = false;

    if (isEdit) {
      const { error } = await (supabase.from("courses") as any)
        .update({
          name,
          description,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", courseId)
        .eq("tenant_id", session.tenant.id);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          isTableMissing = true;
        } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_course_tenant_name")) {
          return { success: false, error: "Já existe um curso cadastrado com este nome nesta instituição." };
        } else {
          return { success: false, error: error.message || "Erro ao atualizar curso no banco de dados." };
        }
      } else {
        savedOnPhysical = true;
      }
    } else {
      const { error } = await (supabase.from("courses") as any).insert([
        {
          id: courseId,
          tenant_id: session.tenant.id,
          name,
          description,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          isTableMissing = true;
        } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_course_tenant_name")) {
          return { success: false, error: "Já existe um curso cadastrado com este nome nesta instituição." };
        } else {
          return { success: false, error: error.message || "Erro ao cadastrar curso no banco de dados." };
        }
      } else {
        savedOnPhysical = true;
      }
    }

    // 2. Fallback JSONB store SOMENTE se a tabela física comprovadamente não existir (42P01)
    if (isTableMissing && !savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const courses: Course[] = curSettings.academic_courses_store || [];

      // Checa duplicidade de nome no tenant
      const exists = courses.some(
        (c) => c.id !== courseId && c.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return { success: false, error: "Já existe um curso cadastrado com este nome." };
      }

      if (isEdit) {
        const idx = courses.findIndex((c) => c.id === courseId);
        if (idx >= 0) {
          courses[idx] = {
            ...courses[idx],
            name,
            description,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        courses.push({
          id: courseId,
          tenant_id: session.tenant.id,
          name,
          description,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_courses_store: courses },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: isEdit ? "COURSE_UPDATED" : "COURSE_CREATED",
        entity_name: "courses",
        entity_id: courseId,
        new_values: { name, is_active: isActive },
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true, id: courseId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar curso/segmento." };
  }
}

export async function deleteCourseAction(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao"]);
    const supabase = await createClient();

    // 1. Verifica se existem séries vinculadas
    let hasSeries = false;
    try {
      const { count } = await (supabase.from("series") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", session.tenant.id)
        .eq("course_id", courseId);

      hasSeries = Boolean(count && count > 0);
    } catch {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();
      const seriesList: Series[] = curTenant?.settings?.academic_series_store || [];
      hasSeries = seriesList.some((s) => s.course_id === courseId);
    }

    if (hasSeries) {
      return {
        success: false,
        error: "Não é possível excluir o curso pois existem séries/anos escolares vinculados a ele.",
      };
    }

    // 2. Exclui da tabela física
    let deleted = false;
    try {
      const { error } = await (supabase.from("courses") as any)
        .delete()
        .eq("id", courseId)
        .eq("tenant_id", session.tenant.id);

      if (!error) deleted = true;
    } catch {
      // Fallback
    }

    if (!deleted) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const courses: Course[] = curSettings.academic_courses_store || [];
      const filtered = courses.filter((c) => c.id !== courseId);

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_courses_store: filtered },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "COURSE_DELETED",
        entity_name: "courses",
        entity_id: courseId,
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir curso/segmento." };
  }
}

// ==============================================================================
// 2. SÉRIES / ANOS ESCOLARES
// ==============================================================================

export async function getSeriesAction(courseId?: string): Promise<{
  success: boolean;
  series: Series[];
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // 1. Tenta tabela física public.series
    try {
      let query = (supabase.from("series") as any)
        .select(`
          *,
          course:courses(*),
          school_classes:school_classes(id)
        `)
        .eq("tenant_id", session.tenant.id)
        .order("order_index", { ascending: true });

      if (courseId && courseId !== "all") {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const list: Series[] = data.map((s: any) => ({
          id: s.id,
          tenant_id: s.tenant_id,
          course_id: s.course_id,
          name: s.name,
          description: s.description,
          order_index: s.order_index,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.updated_at,
          course: s.course,
          classes_count: Array.isArray(s.school_classes) ? s.school_classes.length : 0,
        }));
        return { success: true, series: list };
      }
    } catch {
      // Continua para o fallback
    }

    // 2. Fallback JSONB store
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    let seriesList: Series[] = curSettings.academic_series_store || [];
    const courses: Course[] = curSettings.academic_courses_store || [];
    const classesList: SchoolClass[] = curSettings.academic_classes_store || [];

    const coursesMap = new Map(courses.map((c) => [c.id, c]));

    if (courseId && courseId !== "all") {
      seriesList = seriesList.filter((s) => s.course_id === courseId);
    }

    const enriched = seriesList.map((s) => ({
      ...s,
      course: coursesMap.get(s.course_id),
      classes_count: classesList.filter((c) => c.series_id === s.id).length,
    }));

    enriched.sort((a, b) => a.order_index - b.order_index);

    return { success: true, series: enriched };
  } catch (err: any) {
    return { success: false, series: [], error: err?.message || "Erro ao consultar séries." };
  }
}

export async function saveSeriesAction(
  input: CreateSeriesInput | UpdateSeriesInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "O nome da série/ano escolar é obrigatório." };
    }
    if (!input.course_id) {
      return { success: false, error: "O vínculo com um curso/segmento é obrigatório." };
    }

    const isEdit = "id" in input && Boolean(input.id);
    const seriesId = isEdit ? (input as UpdateSeriesInput).id : crypto.randomUUID();
    const description = input.description?.trim() || null;
    const orderIndex = input.order_index !== undefined ? Number(input.order_index) : 0;
    const isActive = input.is_active !== undefined ? input.is_active : true;

    // 1. Tenta gravar na tabela física
    let savedOnPhysical = false;
    let isTableMissing = false;

    if (isEdit) {
      const { error } = await (supabase.from("series") as any)
        .update({
          course_id: input.course_id,
          name,
          description,
          order_index: orderIndex,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seriesId)
        .eq("tenant_id", session.tenant.id);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          isTableMissing = true;
        } else if (error.code === "23503" || error.message?.includes("foreign key") || error.message?.includes("course_id")) {
          return { success: false, error: "O curso selecionado não foi encontrado no banco de dados. Recarregue a página e tente novamente." };
        } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_series_course_name")) {
          return { success: false, error: "Já existe uma série com este nome cadastrada para este curso/segmento." };
        } else {
          return { success: false, error: error.message || "Erro ao atualizar série no banco de dados." };
        }
      } else {
        savedOnPhysical = true;
      }
    } else {
      const { error } = await (supabase.from("series") as any).insert([
        {
          id: seriesId,
          tenant_id: session.tenant.id,
          course_id: input.course_id,
          name,
          description,
          order_index: orderIndex,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          isTableMissing = true;
        } else if (error.code === "23503" || error.message?.includes("foreign key") || error.message?.includes("course_id")) {
          return { success: false, error: "O curso selecionado não foi encontrado no banco de dados. Recarregue a página e tente novamente." };
        } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_series_course_name")) {
          return { success: false, error: "Já existe uma série com este nome cadastrada para este curso/segmento." };
        } else {
          return { success: false, error: error.message || "Erro ao cadastrar série no banco de dados." };
        }
      } else {
        savedOnPhysical = true;
      }
    }

    // 2. Fallback JSONB store SOMENTE se a tabela física comprovadamente não existir (42P01)
    if (isTableMissing && !savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const seriesList: Series[] = curSettings.academic_series_store || [];

      // Checa duplicidade de nome dentro do mesmo curso
      const exists = seriesList.some(
        (s) =>
          s.id !== seriesId &&
          s.course_id === input.course_id &&
          s.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return {
          success: false,
          error: "Já existe uma série com este nome cadastrada para este curso/segmento.",
        };
      }

      if (isEdit) {
        const idx = seriesList.findIndex((s) => s.id === seriesId);
        if (idx >= 0) {
          seriesList[idx] = {
            ...seriesList[idx],
            course_id: input.course_id,
            name,
            description,
            order_index: orderIndex,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        seriesList.push({
          id: seriesId,
          tenant_id: session.tenant.id,
          course_id: input.course_id,
          name,
          description,
          order_index: orderIndex,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_series_store: seriesList },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: isEdit ? "SERIES_UPDATED" : "SERIES_CREATED",
        entity_name: "series",
        entity_id: seriesId,
        new_values: { name, course_id: input.course_id, order_index: orderIndex },
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true, id: seriesId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar série/ano escolar." };
  }
}

export async function deleteSeriesAction(
  seriesId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao"]);
    const supabase = await createClient();

    // 1. Verifica turmas vinculadas
    let hasClasses = false;
    try {
      const { count } = await (supabase.from("school_classes") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", session.tenant.id)
        .eq("series_id", seriesId);

      hasClasses = Boolean(count && count > 0);
    } catch {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();
      const classesList: SchoolClass[] = curTenant?.settings?.academic_classes_store || [];
      hasClasses = classesList.some((c) => c.series_id === seriesId);
    }

    if (hasClasses) {
      return {
        success: false,
        error: "Não é possível excluir a série pois existem turmas vinculadas a ela.",
      };
    }

    // 2. Exclui da tabela física
    let deleted = false;
    try {
      const { error } = await (supabase.from("series") as any)
        .delete()
        .eq("id", seriesId)
        .eq("tenant_id", session.tenant.id);

      if (!error) deleted = true;
    } catch {
      // Fallback
    }

    if (!deleted) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const seriesList: Series[] = curSettings.academic_series_store || [];
      const filtered = seriesList.filter((s) => s.id !== seriesId);

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_series_store: filtered },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SERIES_DELETED",
        entity_name: "series",
        entity_id: seriesId,
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir série/ano escolar." };
  }
}

// ==============================================================================
// 3. TURMAS
// ==============================================================================

export async function getSchoolClassesAction(filters?: {
  seriesId?: string;
  academicYear?: string;
  schoolYearId?: string;
  shift?: string;
}): Promise<{
  success: boolean;
  schoolClasses: SchoolClass[];
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // 1. Tenta tabela física public.school_classes
    try {
      let query = (supabase.from("school_classes") as any)
        .select(`
          *,
          series:series(
            *,
            course:courses(*)
          ),
          school_year:school_years(*)
        `)
        .eq("tenant_id", session.tenant.id)
        .order("name", { ascending: true });

      if (filters?.seriesId && filters.seriesId !== "all") {
        query = query.eq("series_id", filters.seriesId);
      }
      if (filters?.schoolYearId && filters.schoolYearId !== "all") {
        query = query.eq("school_year_id", filters.schoolYearId);
      }
      if (filters?.academicYear && filters.academicYear !== "all") {
        query = query.eq("academic_year", filters.academicYear);
      }
      if (filters?.shift && filters.shift !== "all") {
        query = query.eq("shift", filters.shift);
      }

      const { data, error } = await query;

      if (!error && data) {
        const list: SchoolClass[] = data.map((c: any) => ({
          id: c.id,
          tenant_id: c.tenant_id,
          series_id: c.series_id,
          school_year_id: c.school_year_id || null,
          name: c.name,
          academic_year: c.academic_year,
          shift: c.shift,
          capacity: c.capacity,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
          series: c.series,
          school_year: c.school_year || null,
        }));
        return { success: true, schoolClasses: list };
      }
    } catch {
      // Continua para o fallback
    }

    // 2. Fallback JSONB store
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    let classesList: SchoolClass[] = curSettings.academic_classes_store || [];
    const seriesList: Series[] = curSettings.academic_series_store || [];
    const courses: Course[] = curSettings.academic_courses_store || [];

    const coursesMap = new Map(courses.map((c) => [c.id, c]));
    const seriesMap = new Map(
      seriesList.map((s) => [s.id, { ...s, course: coursesMap.get(s.course_id) }])
    );

    if (filters?.seriesId && filters.seriesId !== "all") {
      classesList = classesList.filter((c) => c.series_id === filters.seriesId);
    }
    if (filters?.academicYear && filters.academicYear !== "all") {
      classesList = classesList.filter((c) => c.academic_year === filters.academicYear);
    }
    if (filters?.shift && filters.shift !== "all") {
      classesList = classesList.filter((c) => c.shift === filters.shift);
    }

    const enriched = classesList.map((c) => ({
      ...c,
      series: seriesMap.get(c.series_id),
    }));

    return { success: true, schoolClasses: enriched };
  } catch (err: any) {
    return { success: false, schoolClasses: [], error: err?.message || "Erro ao consultar turmas." };
  }
}

export async function saveSchoolClassAction(
  input: CreateSchoolClassInput | UpdateSchoolClassInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "O nome / identificador da turma é obrigatório (Ex: Turma A, 9º A)." };
    }
    if (!input.series_id) {
      return { success: false, error: "A seleção da série/ano escolar é obrigatória." };
    }
    if (!input.capacity || Number(input.capacity) <= 0) {
      return { success: false, error: "A capacidade da turma deve ser um número positivo maior que zero." };
    }

    const isEdit = "id" in input && Boolean(input.id);
    const classId = isEdit ? (input as UpdateSchoolClassInput).id : crypto.randomUUID();
    const capacity = Number(input.capacity);
    const shift = input.shift;
    const isActive = input.is_active !== undefined ? input.is_active : true;

    // Resolução e validação do Ano Letivo oficial
    let resolvedSchoolYearId: string | null = input.school_year_id || null;
    let academicYear = "";

    if (!isEdit) {
      // Regra Definitiva: Criação de nova turma EXIGE school_year_id válido pertencente ao tenant
      if (!resolvedSchoolYearId) {
        // Verifica se o tenant possui algum ano letivo cadastrado
        const { count: syCount } = await (supabase.from("school_years") as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", session.tenant.id);

        if (!syCount || syCount === 0) {
          return {
            success: false,
            error:
              "Não é possível criar turmas sem um Ano Letivo cadastrado. Cadastre o Ano Letivo no Calendário Acadêmico antes de criar turmas.",
          };
        }

        return {
          success: false,
          error: "A seleção de um Ano Letivo cadastrado no Calendário Acadêmico é obrigatória para novas turmas.",
        };
      }

      const { data: syRecord, error: syErr } = await (supabase.from("school_years") as any)
        .select("id, year, title, status")
        .eq("tenant_id", session.tenant.id)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();

      if (syErr || !syRecord) {
        return {
          success: false,
          error: "O Ano Letivo selecionado não foi encontrado ou não pertence a esta instituição.",
        };
      }

      // Sincroniza automaticamente a coluna legada academic_year a partir de school_year.year
      academicYear = syRecord.year;
    } else {
      // Edição de turma existente
      if (resolvedSchoolYearId) {
        const { data: syRecord, error: syErr } = await (supabase.from("school_years") as any)
          .select("id, year, title, status")
          .eq("tenant_id", session.tenant.id)
          .eq("id", resolvedSchoolYearId)
          .maybeSingle();

        if (syErr || !syRecord) {
          return {
            success: false,
            error: "O Ano Letivo selecionado não foi encontrado ou não pertence a esta instituição.",
          };
        }
        academicYear = syRecord.year;
      } else {
        // Turmas legadas com school_year_id = NULL continuam funcionando sem quebra
        const { data: existingClass } = await (supabase.from("school_classes") as any)
          .select("school_year_id, academic_year")
          .eq("tenant_id", session.tenant.id)
          .eq("id", classId)
          .maybeSingle();

        academicYear = input.academic_year
          ? input.academic_year.trim()
          : existingClass?.academic_year || "";

        resolvedSchoolYearId = existingClass?.school_year_id || null;

        if (!academicYear) {
          return {
            success: false,
            error: "O Ano Letivo da turma é obrigatório.",
          };
        }
      }
    }

    // Se estiver editando, valida se a nova capacidade não é inferior ao total de matrículas ativas (status = 'matriculado')
    if (isEdit) {
      let enrolledCount = 0;
      let countFound = false;

      try {
        const { count, error } = await (supabase.from("enrollments") as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", session.tenant.id)
          .eq("class_id", classId)
          .eq("status", "matriculado");

        if (!error && count !== null) {
          enrolledCount = count;
          countFound = true;
        }
      } catch {
        countFound = false;
      }

      if (!countFound) {
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();
        const curList: any[] = curTenant?.settings?.enrollments_store || [];
        enrolledCount = curList.filter(
          (e) => e.class_id === classId && e.status === "matriculado"
        ).length;
      }

      if (capacity < enrolledCount) {
        return {
          success: false,
          error: `Não é possível reduzir a capacidade para ${capacity} vagas, pois a turma já possui ${enrolledCount} aluno(s) com matrícula confirmada. Remaneje os alunos excedentes antes de diminuir a capacidade.`,
        };
      }
    }

    // 1. Tenta gravar na tabela física
    let savedOnPhysical = false;
    let isTableMissing = false;

    if (isEdit) {
      // Tenta executar via RPC transacional atômica com lock FOR UPDATE na turma
      let atomicExecuted = false;
      try {
        const { data: atomicRes, error: atomicErr } = await (supabase.rpc as any)(
          "update_school_class_atomic",
          {
            p_tenant_id: session.tenant.id,
            p_class_id: classId,
            p_series_id: input.series_id,
            p_name: name,
            p_academic_year: academicYear,
            p_shift: shift,
            p_capacity: capacity,
            p_is_active: isActive,
          }
        );

        if (!atomicErr && atomicRes) {
          atomicExecuted = true;
          if (!atomicRes.success) {
            return { success: false, error: atomicRes.error || "Não foi possível atualizar a capacidade da turma." };
          }
          savedOnPhysical = true;
        }
      } catch {
        atomicExecuted = false;
      }

      // Se a RPC ainda não existe no banco, executa fallback relacional
      if (!atomicExecuted) {
        const updatePayload: Record<string, any> = {
          series_id: input.series_id,
          name,
          academic_year: academicYear,
          shift,
          capacity,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        };
        if (resolvedSchoolYearId) {
          updatePayload.school_year_id = resolvedSchoolYearId;
        }

        const { error } = await (supabase.from("school_classes") as any)
          .update(updatePayload)
          .eq("id", classId)
          .eq("tenant_id", session.tenant.id);

        if (error) {
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            isTableMissing = true;
          } else if (error.code === "23503" || error.message?.includes("foreign key") || error.message?.includes("series_id")) {
            return { success: false, error: "A série ou ano letivo selecionado não foi encontrado no banco de dados. Recarregue a página e tente novamente." };
          } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_class_tenant_year_series_name")) {
            return { success: false, error: "Já existe uma turma com este nome no mesmo ano letivo e série." };
          } else {
            return { success: false, error: error.message || "Erro ao atualizar turma no banco de dados." };
          }
        } else {
          savedOnPhysical = true;
        }
      }
    } else {
      const insertPayload: Record<string, any> = {
        id: classId,
        tenant_id: session.tenant.id,
        series_id: input.series_id,
        name,
        academic_year: academicYear,
        shift,
        capacity,
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (resolvedSchoolYearId) {
        insertPayload.school_year_id = resolvedSchoolYearId;
      }

      const { error } = await (supabase.from("school_classes") as any).insert([insertPayload]);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          isTableMissing = true;
        } else if (error.code === "23503" || error.message?.includes("foreign key") || error.message?.includes("series_id")) {
          return { success: false, error: "A série ou ano letivo selecionado não foi encontrado no banco de dados. Recarregue a página e tente novamente." };
        } else if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("uq_class_tenant_year_series_name")) {
          return { success: false, error: "Já existe uma turma com este nome no mesmo ano letivo e série." };
        } else {
          return { success: false, error: error.message || "Erro ao cadastrar turma no banco de dados." };
        }
      } else {
        savedOnPhysical = true;
      }
    }

    // 2. Fallback JSONB store SOMENTE se a tabela física comprovadamente não existir (42P01)
    if (isTableMissing && !savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const classesList: SchoolClass[] = curSettings.academic_classes_store || [];

      // Checa duplicidade de turma no mesmo ano letivo e série
      const exists = classesList.some(
        (c) =>
          c.id !== classId &&
          c.academic_year === academicYear &&
          c.series_id === input.series_id &&
          c.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return {
          success: false,
          error: "Já existe uma turma com este nome no mesmo ano letivo e série.",
        };
      }

      if (isEdit) {
        const idx = classesList.findIndex((c) => c.id === classId);
        if (idx >= 0) {
          classesList[idx] = {
            ...classesList[idx],
            series_id: input.series_id,
            name,
            academic_year: academicYear,
            shift,
            capacity,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        classesList.push({
          id: classId,
          tenant_id: session.tenant.id,
          series_id: input.series_id,
          name,
          academic_year: academicYear,
          shift,
          capacity,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_classes_store: classesList },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: isEdit ? "SCHOOL_CLASS_UPDATED" : "SCHOOL_CLASS_CREATED",
        entity_name: "school_classes",
        entity_id: classId,
        new_values: { name, academic_year: academicYear, series_id: input.series_id, capacity, shift },
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true, id: classId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar turma." };
  }
}

export async function deleteSchoolClassAction(
  classId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao"]);
    const supabase = await createClient();

    // 1. Validação de integridade referencial: impede excluir turma com matrículas vinculadas
    let hasLinkedEnrollments = false;
    try {
      const { count } = await (supabase.from("enrollments") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", session.tenant.id)
        .eq("class_id", classId);

      if (count && count > 0) {
        hasLinkedEnrollments = true;
      }
    } catch {
      // Falha se a tabela enrollments não existir
    }

    if (!hasLinkedEnrollments) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();
      const curList: any[] = curTenant?.settings?.enrollments_store || [];
      if (curList.some((e) => e.class_id === classId)) {
        hasLinkedEnrollments = true;
      }
    }

    if (hasLinkedEnrollments) {
      return {
        success: false,
        error: "Não é possível excluir esta turma pois ela possui matrículas vinculadas. Remaneje os alunos antes de remover a turma.",
      };
    }

    // 2. Exclui da tabela física
    let deleted = false;
    try {
      const { error } = await (supabase.from("school_classes") as any)
        .delete()
        .eq("id", classId)
        .eq("tenant_id", session.tenant.id);

      if (!error) deleted = true;
    } catch {
      // Fallback
    }

    // 3. Fallback JSONB
    if (!deleted) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const classesList: SchoolClass[] = curSettings.academic_classes_store || [];
      const filtered = classesList.filter((c) => c.id !== classId);

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_classes_store: filtered },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_CLASS_DELETED",
        entity_name: "school_classes",
        entity_id: classId,
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir turma." };
  }
}

// ==============================================================================
// 4. DIÁRIO DE CLASSE & FREQUÊNCIA (ETAPA 1 VIDA ACADÊMICA)
// ==============================================================================

/**
 * Validação rigorosa se o usuário atual pode acessar/ministrar a turma especificada
 */
export async function assertClassAccess(classId: string) {
  const session = await assertAcademicAccess();
  const supabase = await createClient();

  // Admin, Coordenação e Secretaria possuem acesso total a todas as turmas do tenant
  if (["admin_escola", "coordenacao", "secretaria"].includes(session.role)) {
    return { session, isStaff: true, isTeacher: session.role === "professor" };
  }

  // Se for professor, valida se ele está alocado na turma ou se ainda não há alocações registradas
  if (session.role === "professor") {
    let hasAllocations = false;
    let isAllocated = false;

    try {
      const { data: allocs, error } = await (supabase.from("teacher_class_allocations") as any)
        .select("id, user_id")
        .eq("tenant_id", session.tenant.id)
        .eq("class_id", classId)
        .eq("is_active", true);

      if (!error && allocs) {
        if (allocs.length > 0) {
          hasAllocations = true;
          isAllocated = allocs.some((a: any) => a.user_id === session.user.id);
        }
      }
    } catch {
      // Tabela física pode não existir ainda
    }

    if (!hasAllocations) {
      // Fallback JSONB
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const allocList: TeacherClassAllocation[] = curTenant?.settings?.teacher_class_allocations_store || [];
      const classAllocs = allocList.filter((a) => a.class_id === classId && a.is_active);
      if (classAllocs.length > 0) {
        hasAllocations = true;
        isAllocated = classAllocs.some((a) => a.user_id === session.user.id);
      }
    }

    // Se houver alocações configuradas e o professor não estiver vinculado, bloqueia
    if (hasAllocations && !isAllocated) {
      throw new Error("Acesso negado: Você não está alocado nesta turma como professor.");
    }

    return { session, isStaff: false, isTeacher: true };
  }

  throw new Error("Acesso não autorizado para esta operação de turma.");
}

/**
 * Listagem das turmas que o usuário autenticado tem permissão de visualizar
 */
export async function getAuthorizedClassesAction(filters?: {
  academic_year?: string;
  academicYear?: string;
}): Promise<{
  success: boolean;
  schoolClasses: SchoolClass[];
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    const academicYear = filters?.academicYear || filters?.academic_year;

    // 1. Busca todas as turmas ativas do tenant
    const classesRes = await getSchoolClassesAction(academicYear ? { academicYear } : undefined);
    if (!classesRes.success) {
      return classesRes;
    }

    const allClasses = classesRes.schoolClasses || [];

    // Se for gestão/coordenação, tem acesso a todas
    if (["admin_escola", "coordenacao", "secretaria"].includes(session.role)) {
      return { success: true, schoolClasses: allClasses };
    }

    // Se for professor, filtra turmas onde ele está alocado
    if (session.role === "professor") {
      let allocatedClassIds = new Set<string>();
      let hasAnyAllocations = false;

      try {
        const { data: allocs } = await (supabase.from("teacher_class_allocations") as any)
          .select("class_id")
          .eq("tenant_id", session.tenant.id)
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        if (allocs && allocs.length > 0) {
          hasAnyAllocations = true;
          allocs.forEach((a: any) => allocatedClassIds.add(a.class_id));
        }
      } catch {
        // Tabela não existe
      }

      if (!hasAnyAllocations) {
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();

        const allocList: TeacherClassAllocation[] = curTenant?.settings?.teacher_class_allocations_store || [];
        const myAllocs = allocList.filter((a) => a.user_id === session.user.id && a.is_active);
        if (myAllocs.length > 0) {
          hasAnyAllocations = true;
          myAllocs.forEach((a) => allocatedClassIds.add(a.class_id));
        }
      }

      // Se há alocações, retorna somente as alocadas. Caso contrário (escola inicial), permite ver as turmas ativas
      const filtered = hasAnyAllocations
        ? allClasses.filter((c) => allocatedClassIds.has(c.id))
        : allClasses;

      return { success: true, schoolClasses: filtered };
    }

    return { success: true, schoolClasses: [] };
  } catch (err: any) {
    return { success: false, schoolClasses: [], error: err?.message || "Erro ao consultar turmas autorizadas." };
  }
}

/**
 * Consulta de Aulas ministradas (Diário de Classe) com filtros
 */
export async function getClassLessonsAction(filters: {
  class_id: string;
  academic_term_id?: string;
  academic_period?: string;
  start_date?: string;
  end_date?: string;
  subject_name?: string;
}): Promise<{
  success: boolean;
  lessons: ClassLesson[];
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(filters.class_id);
    const supabase = await createClient();

    let lessons: ClassLesson[] = [];
    let savedOnPhysical = false;

    // 1. Tenta buscar na tabela física public.class_lessons
    try {
      let query = (supabase.from("class_lessons") as any)
        .select(`
          *,
          teacher:profiles(full_name),
          school_class:school_classes(name),
          school_year:school_years(*),
          academic_term:academic_terms(*),
          attendances:lesson_attendances(id, status)
        `)
        .eq("tenant_id", session.tenant.id)
        .eq("class_id", filters.class_id)
        .order("lesson_date", { ascending: false });

      if (filters.academic_term_id && filters.academic_term_id !== "all") {
        query = query.eq("academic_term_id", filters.academic_term_id);
      }
      if (filters.academic_period && filters.academic_period !== "all") {
        query = query.eq("academic_period", filters.academic_period);
      }
      if (filters.start_date) {
        query = query.gte("lesson_date", filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte("lesson_date", filters.end_date);
      }
      if (filters.subject_name && filters.subject_name.trim()) {
        query = query.ilike("subject_name", `%${filters.subject_name.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        savedOnPhysical = true;
        lessons = data.map((l: any) => {
          const atts = l.attendances || [];
          return {
            id: l.id,
            tenant_id: l.tenant_id,
            class_id: l.class_id,
            school_year_id: l.school_year_id || null,
            academic_term_id: l.academic_term_id || null,
            teacher_id: l.teacher_id,
            lesson_date: l.lesson_date,
            academic_period: l.academic_period,
            subject_name: l.subject_name || null,
            title: l.title,
            content_summary: l.content_summary,
            pedagogical_notes: l.pedagogical_notes || null,
            created_at: l.created_at,
            updated_at: l.updated_at,
            teacher_name: l.teacher?.full_name || "Professor",
            class_name: l.school_class?.name || "Turma",
            school_year: l.school_year || null,
            academic_term: l.academic_term || null,
            attendances_count: atts.length,
            present_count: atts.filter((a: any) => a.status === "presente").length,
            absent_count: atts.filter((a: any) => a.status === "falta").length,
            justified_count: atts.filter((a: any) => a.status === "justificada").length,
          };
        });
      }
    } catch {
      // Fallback
    }

    // 2. Fallback JSONB caso tabela física não esteja disponível
    if (!savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const lessonStore: ClassLesson[] = curSettings.academic_lessons_store || [];
      const attendanceStore: LessonAttendance[] = curSettings.academic_attendances_store || [];

      let filtered = lessonStore.filter((l) => l.tenant_id === session.tenant.id && l.class_id === filters.class_id);

      if (filters.academic_term_id && filters.academic_term_id !== "all") {
        filtered = filtered.filter((l) => l.academic_term_id === filters.academic_term_id);
      }
      if (filters.academic_period && filters.academic_period !== "all") {
        filtered = filtered.filter((l) => l.academic_period === filters.academic_period);
      }
      if (filters.start_date) {
        filtered = filtered.filter((l) => l.lesson_date >= filters.start_date!);
      }
      if (filters.end_date) {
        filtered = filtered.filter((l) => l.lesson_date <= filters.end_date!);
      }
      if (filters.subject_name && filters.subject_name.trim()) {
        filtered = filtered.filter((l) =>
          l.subject_name?.toLowerCase().includes(filters.subject_name!.toLowerCase().trim())
        );
      }

      lessons = filtered.sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)).map((l) => {
        const atts = attendanceStore.filter((a) => a.lesson_id === l.id);
        return {
          ...l,
          attendances_count: atts.length,
          present_count: atts.filter((a) => a.status === "presente").length,
          absent_count: atts.filter((a) => a.status === "falta").length,
          justified_count: atts.filter((a) => a.status === "justificada").length,
        };
      });
    }

    return { success: true, lessons };
  } catch (err: any) {
    return { success: false, lessons: [], error: err?.message || "Erro ao listar aulas do diário." };
  }
}

/**
 * Salvar ou editar Aula / Registro do Diário de Classe
 */
export async function saveClassLessonAction(
  payload: SaveClassLessonInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { session } = await assertClassAccess(payload.class_id);
    const supabase = await createClient();

    const isEdit = Boolean(payload.id);
    const lessonId = payload.id || crypto.randomUUID();
    const lessonDate = payload.lesson_date.trim();
    const title = payload.title.trim();
    const contentSummary = payload.content_summary.trim();
    const subjectName = payload.subject_name ? payload.subject_name.trim() : null;
    const pedagogicalNotes = payload.pedagogical_notes ? payload.pedagogical_notes.trim() : null;

    if (!payload.class_id) {
      return { success: false, error: "A turma é obrigatória para o registro da aula." };
    }
    if (!lessonDate) {
      return { success: false, error: "A data da aula é obrigatória." };
    }
    if (!title || title.length < 3) {
      return { success: false, error: "O título ou tema da aula deve conter pelo menos 3 caracteres." };
    }
    if (!contentSummary || contentSummary.length < 5) {
      return { success: false, error: "O resumo do conteúdo ministrado deve conter pelo menos 5 caracteres." };
    }

    // 1. Busca a turma para obter school_year_id
    const { data: targetClass, error: tcErr } = await (supabase.from("school_classes") as any)
      .select("id, tenant_id, school_year_id, academic_year, school_year:school_years(*)")
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.class_id)
      .maybeSingle();

    if (tcErr || !targetClass) {
      return { success: false, error: "Turma não encontrada para lançamento da aula." };
    }

    // 2. Resolução do Ano Letivo oficial
    let schoolYearId: string | null = payload.school_year_id || targetClass.school_year_id || null;
    let schoolYear: any = targetClass.school_year || null;

    if (!schoolYear && schoolYearId) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("id", schoolYearId)
        .maybeSingle();
      schoolYear = sy;
    } else if (!schoolYear && targetClass.academic_year) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("year", targetClass.academic_year)
        .maybeSingle();
      if (sy) {
        schoolYear = sy;
        schoolYearId = sy.id;
      }
    }

    // 3. Resolução e validação estrita do Período Acadêmico oficial
    let academicTermId: string | null = payload.academic_term_id || null;
    let academicTerm: any = null;

    if (academicTermId) {
      const { data: atRecord } = await (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("id", academicTermId)
        .maybeSingle();

      if (!atRecord) {
        return {
          success: false,
          error: "O Período Acadêmico selecionado não foi encontrado ou não pertence a esta instituição.",
        };
      }

      // Validação 3: academic_term_id deve pertencer ao mesmo school_year_id da turma
      if (schoolYearId && atRecord.school_year_id !== schoolYearId) {
        return {
          success: false,
          error: "O Período Acadêmico selecionado não pertence ao Ano Letivo oficial desta turma.",
        };
      }

      academicTerm = atRecord;
      if (!schoolYearId && academicTerm.school_year_id) {
        schoolYearId = academicTerm.school_year_id;
      }
    } else if (schoolYearId) {
      const { data: atRecords } = await (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", schoolYearId);

      // Validação 2: Se a turma possui Ano Letivo oficial, mas não há períodos cadastrados, bloqueia
      if (!atRecords || atRecords.length === 0) {
        return {
          success: false,
          error: "Não existem períodos acadêmicos cadastrados para o Ano Letivo desta turma. Cadastre os períodos no Calendário Acadêmico antes de registrar aulas.",
        };
      }

      const matchingByDate = atRecords.find(
        (t: any) => lessonDate >= t.start_date && lessonDate <= t.end_date
      );
      if (matchingByDate) {
        academicTerm = matchingByDate;
        academicTermId = matchingByDate.id;
      } else if (payload.academic_period) {
        const matchingByName = atRecords.find(
          (t: any) => t.name.toLowerCase() === payload.academic_period!.toLowerCase().trim()
        );
        if (matchingByName) {
          academicTerm = matchingByName;
          academicTermId = matchingByName.id;
        }
      }

      // Validação 1: Turma com school_year_id exige obrigatoriamente academic_term_id válido
      if (!academicTermId || !academicTerm) {
        return {
          success: false,
          error: `Esta turma está vinculada a um Ano Letivo oficial. É obrigatório selecionar ou vincular a aula a um Período Acadêmico oficial (a data ${lessonDate} não coincide com a vigência de nenhum período cadastrado).`,
        };
      }
    }

    // 4. Validações Temporais Rigorosas com o Calendário Acadêmico
    if (schoolYear) {
      if (lessonDate < schoolYear.start_date || lessonDate > schoolYear.end_date) {
        return {
          success: false,
          error: `A data da aula (${lessonDate}) está fora do período de vigência do Ano Letivo ${schoolYear.year} (${schoolYear.start_date} a ${schoolYear.end_date}).`,
        };
      }
    }

    if (academicTerm) {
      if (lessonDate < academicTerm.start_date || lessonDate > academicTerm.end_date) {
        return {
          success: false,
          error: `A data da aula (${lessonDate}) está fora da vigência de '${academicTerm.name}' (${academicTerm.start_date} a ${academicTerm.end_date}).`,
        };
      }

      // Validação 4: Período com status bloqueado impede criação e edição para TODOS os perfis
      if (academicTerm.status === "bloqueado") {
        return {
          success: false,
          error: `O período acadêmico '${academicTerm.name}' está bloqueado para novos lançamentos e edições no diário de classe.`,
        };
      }
    }

    const academicPeriod = academicTerm ? academicTerm.name : (payload.academic_period?.trim() || "1º Bimestre");

    let savedOnPhysical = false;

    // 5. Tenta salvar na tabela física public.class_lessons
    try {
      const now = new Date().toISOString();
      const record: Record<string, any> = {
        id: lessonId,
        tenant_id: session.tenant.id,
        class_id: payload.class_id,
        teacher_id: session.user.id,
        lesson_date: lessonDate,
        academic_period: academicPeriod,
        subject_name: subjectName,
        title,
        content_summary: contentSummary,
        pedagogical_notes: pedagogicalNotes,
        updated_at: now,
      };

      if (schoolYearId) record.school_year_id = schoolYearId;
      if (academicTermId) record.academic_term_id = academicTermId;

      if (isEdit) {
        const { error } = await (supabase.from("class_lessons") as any)
          .update(record)
          .eq("id", lessonId)
          .eq("tenant_id", session.tenant.id);

        if (!error) savedOnPhysical = true;
      } else {
        const { error } = await (supabase.from("class_lessons") as any).insert([
          {
            ...record,
            created_at: now,
          },
        ]);

        if (!error) savedOnPhysical = true;
      }
    } catch {
      // Fallback
    }

    // 6. Fallback JSONB
    if (!savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const lessonStore: ClassLesson[] = curSettings.academic_lessons_store || [];
      const now = new Date().toISOString();

      if (isEdit) {
        const idx = lessonStore.findIndex((l) => l.id === lessonId);
        if (idx >= 0) {
          lessonStore[idx] = {
            ...lessonStore[idx],
            class_id: payload.class_id,
            school_year_id: schoolYearId,
            academic_term_id: academicTermId,
            lesson_date: lessonDate,
            academic_period: academicPeriod,
            subject_name: subjectName,
            title,
            content_summary: contentSummary,
            pedagogical_notes: pedagogicalNotes,
            updated_at: now,
          };
        }
      } else {
        lessonStore.push({
          id: lessonId,
          tenant_id: session.tenant.id,
          class_id: payload.class_id,
          school_year_id: schoolYearId,
          academic_term_id: academicTermId,
          teacher_id: session.user.id,
          lesson_date: lessonDate,
          academic_period: academicPeriod,
          subject_name: subjectName,
          title,
          content_summary: contentSummary,
          pedagogical_notes: pedagogicalNotes,
          created_at: now,
          updated_at: now,
        });
      }

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_lessons_store: lessonStore },
          updated_at: now,
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: isEdit ? "CLASS_LESSON_UPDATED" : "CLASS_LESSON_CREATED",
        entity_name: "class_lessons",
        entity_id: lessonId,
        new_values: {
          class_id: payload.class_id,
          lesson_date: lessonDate,
          academic_period: academicPeriod,
          title,
        },
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true, id: lessonId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar aula do diário." };
  }
}

/**
 * Excluir aula do diário de classe
 */
export async function deleteClassLessonAction(
  lessonId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "professor"]);
    const supabase = await createClient();

    let deleted = false;

    // 1. Tenta deletar da tabela física
    try {
      const { error } = await (supabase.from("class_lessons") as any)
        .delete()
        .eq("id", lessonId)
        .eq("tenant_id", session.tenant.id);

      if (!error) deleted = true;
    } catch {
      // Fallback
    }

    // 2. Fallback JSONB
    if (!deleted) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const lessonStore: ClassLesson[] = curSettings.academic_lessons_store || [];
      const attendanceStore: LessonAttendance[] = curSettings.academic_attendances_store || [];

      const filteredLessons = lessonStore.filter((l) => l.id !== lessonId);
      const filteredAttendances = attendanceStore.filter((a) => a.lesson_id !== lessonId);

      await (supabase.from("tenants") as any)
        .update({
          settings: {
            ...curSettings,
            academic_lessons_store: filteredLessons,
            academic_attendances_store: filteredAttendances,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CLASS_LESSON_DELETED",
        entity_name: "class_lessons",
        entity_id: lessonId,
      },
    ]);

    revalidatePath("/app/academico");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir aula do diário." };
  }
}

/**
 * Listagem dos alunos de uma turma com status da frequência em uma aula específica
 */
export async function getClassLessonAttendancesAction(
  classId: string,
  lessonId?: string
): Promise<{
  success: boolean;
  students: Array<{
    student_id: string;
    enrollment_id: string;
    student_name: string;
    student_cpf: string | null;
    status: AttendanceStatus;
    justification_reason: string;
    attendance_id?: string;
  }>;
  lesson?: ClassLesson;
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(classId);
    const supabase = await createClient();

    // 1. Busca alunos com matrícula ativa na turma
    let enrolledStudents: any[] = [];
    let isFallback = false;

    try {
      const { data: enrollments, error } = await (supabase.from("enrollments") as any)
        .select(`
          id,
          student_id,
          class_id,
          status,
          student:students(id, first_name, last_name, cpf, is_active)
        `)
        .eq("tenant_id", session.tenant.id)
        .eq("class_id", classId)
        .eq("status", "matriculado")
        .order("created_at", { ascending: true });

      if (!error && enrollments) {
        enrolledStudents = enrollments
          .filter((e: any) => e.student && e.student.is_active !== false)
          .map((e: any) => ({
            student_id: e.student_id,
            enrollment_id: e.id,
            student_name: `${e.student.first_name || ""} ${e.student.last_name || ""}`.trim(),
            student_cpf: e.student.cpf || null,
          }));
      }
    } catch {
      isFallback = true;
    }

    if (enrolledStudents.length === 0 || isFallback) {
      // Fallback JSONB
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const enrollmentStore: any[] = curSettings.enrollments_store || [];
      const studentStore: any[] = curSettings.students_store || [];

      const activeEnrollments = enrollmentStore.filter(
        (e) => e.class_id === classId && e.status === "matriculado"
      );

      enrolledStudents = activeEnrollments.map((e) => {
        const st = studentStore.find((s) => s.id === e.student_id);
        const name = st ? `${st.first_name || ""} ${st.last_name || ""}`.trim() : (e.student_name || "Aluno");
        return {
          student_id: e.student_id,
          enrollment_id: e.id,
          student_name: name,
          student_cpf: st?.cpf || null,
        };
      });
    }

    // Ordena por nome do aluno
    enrolledStudents.sort((a, b) => a.student_name.localeCompare(b.student_name));

    // 2. Se foi informado um lessonId, busca os registros de presença já gravados
    let existingAttendancesMap = new Map<string, { id: string; status: AttendanceStatus; justification_reason: string }>();
    let lessonData: ClassLesson | undefined = undefined;

    if (lessonId) {
      try {
        const { data: lessonRecord } = await (supabase.from("class_lessons") as any)
          .select("*")
          .eq("id", lessonId)
          .eq("tenant_id", session.tenant.id)
          .single();

        if (lessonRecord) lessonData = lessonRecord;

        const { data: attRecords } = await (supabase.from("lesson_attendances") as any)
          .select("*")
          .eq("lesson_id", lessonId)
          .eq("tenant_id", session.tenant.id);

        if (attRecords && attRecords.length > 0) {
          attRecords.forEach((a: any) => {
            existingAttendancesMap.set(a.student_id, {
              id: a.id,
              status: a.status as AttendanceStatus,
              justification_reason: a.justification_reason || "",
            });
          });
        }
      } catch {
        // Fallback
      }

      if (existingAttendancesMap.size === 0) {
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();

        const curSettings = (curTenant?.settings as Record<string, any>) || {};
        const lessonStore: ClassLesson[] = curSettings.academic_lessons_store || [];
        const attendanceStore: LessonAttendance[] = curSettings.academic_attendances_store || [];

        if (!lessonData) {
          lessonData = lessonStore.find((l) => l.id === lessonId);
        }

        const foundAtts = attendanceStore.filter((a) => a.lesson_id === lessonId);
        foundAtts.forEach((a) => {
          existingAttendancesMap.set(a.student_id, {
            id: a.id,
            status: a.status,
            justification_reason: a.justification_reason || "",
          });
        });
      }
    }

    const result = enrolledStudents.map((st) => {
      const existing = existingAttendancesMap.get(st.student_id);
      return {
        student_id: st.student_id,
        enrollment_id: st.enrollment_id,
        student_name: st.student_name,
        student_cpf: st.student_cpf,
        status: existing ? existing.status : ("presente" as AttendanceStatus),
        justification_reason: existing ? existing.justification_reason : "",
        attendance_id: existing?.id,
      };
    });

    return {
      success: true,
      students: result,
      lesson: lessonData,
    };
  } catch (err: any) {
    return {
      success: false,
      students: [],
      error: err?.message || "Erro ao consultar lista de chamada dos alunos.",
    };
  }
}

/**
 * Salvar lançamento da chamada / frequência da aula de forma atômica
 */
export async function saveLessonAttendancesAction(
  payload: SaveLessonAttendancesInput
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria", "professor"]);
    const supabase = await createClient();

    if (!payload.lesson_id) {
      return { success: false, error: "ID da aula não informado." };
    }
    if (!payload.attendances || payload.attendances.length === 0) {
      return { success: false, error: "Nenhum aluno informado para lançamento de presença." };
    }

    let savedOnPhysical = false;
    const now = new Date().toISOString();

    // 1. Tenta salvar na tabela física public.lesson_attendances com upsert por (tenant_id, lesson_id, student_id)
    try {
      const rows = payload.attendances.map((item) => ({
        tenant_id: session.tenant.id,
        lesson_id: payload.lesson_id,
        student_id: item.student_id,
        enrollment_id: item.enrollment_id || null,
        status: item.status || "presente",
        justification_reason: item.justification_reason?.trim() || null,
        recorded_by: session.user.id,
        updated_at: now,
      }));

      const { error } = await (supabase.from("lesson_attendances") as any).upsert(rows, {
        onConflict: "tenant_id,lesson_id,student_id",
      });

      if (!error) savedOnPhysical = true;
    } catch {
      // Fallback
    }

    // 2. Fallback JSONB
    if (!savedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      let attendanceStore: LessonAttendance[] = curSettings.academic_attendances_store || [];

      // Remove presenças antigas desta aula e adiciona as novas
      attendanceStore = attendanceStore.filter((a) => a.lesson_id !== payload.lesson_id);

      payload.attendances.forEach((item) => {
        attendanceStore.push({
          id: crypto.randomUUID(),
          tenant_id: session.tenant.id,
          lesson_id: payload.lesson_id,
          student_id: item.student_id,
          enrollment_id: item.enrollment_id || null,
          status: item.status || "presente",
          justification_reason: item.justification_reason?.trim() || null,
          recorded_by: session.user.id,
          created_at: now,
          updated_at: now,
        });
      });

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, academic_attendances_store: attendanceStore },
          updated_at: now,
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "LESSON_ATTENDANCE_RECORDED",
        entity_name: "lesson_attendances",
        entity_id: payload.lesson_id,
        new_values: {
          lesson_id: payload.lesson_id,
          total_records: payload.attendances.length,
          presents: payload.attendances.filter((a) => a.status === "presente").length,
          absents: payload.attendances.filter((a) => a.status === "falta").length,
          justified: payload.attendances.filter((a) => a.status === "justificada").length,
        },
      },
    ]);

    revalidatePath("/app/academico");
    return {
      success: true,
      message: `Frequência lançada com sucesso para ${payload.attendances.length} aluno(s).`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar frequência da aula." };
  }
}

/**
 * Consulta de Relatório Consolidado de Frequência por Turma e Período
 */
export async function getClassAttendanceConsolidatedAction(
  classId: string,
  period?: string
): Promise<{
  success: boolean;
  report?: ClassAttendanceConsolidatedReport;
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(classId);
    const supabase = await createClient();

    // 1. Dados da turma
    const classesRes = await getSchoolClassesAction();
    const targetClass = classesRes.schoolClasses?.find((c) => c.id === classId);

    if (!targetClass) {
      return { success: false, error: "Turma não encontrada." };
    }

    // 2. Aulas da turma no período selecionado
    const selectedPeriod = period && period !== "all" ? period : "Todos os Períodos";
    const lessonsRes = await getClassLessonsAction({
      class_id: classId,
      academic_period: period && period !== "all" ? period : undefined,
    });

    const lessons = lessonsRes.lessons || [];
    const lessonIds = lessons.map((l) => l.id);

    // 3. Lista de alunos matriculados na turma
    const studentsRes = await getClassLessonAttendancesAction(classId);
    const enrolledStudents = studentsRes.students || [];

    // 4. Busca todos os registros de presença dessas aulas
    let attendancesMap = new Map<string, { presences: number; absences: number; justified: number }>();
    enrolledStudents.forEach((st) => {
      attendancesMap.set(st.student_id, { presences: 0, absences: 0, justified: 0 });
    });

    if (lessonIds.length > 0) {
      let allAttendances: any[] = [];
      let savedOnPhysical = false;

      try {
        const { data, error } = await (supabase.from("lesson_attendances") as any)
          .select("*")
          .eq("tenant_id", session.tenant.id)
          .in("lesson_id", lessonIds);

        if (!error && data) {
          savedOnPhysical = true;
          allAttendances = data;
        }
      } catch {
        // Fallback
      }

      if (!savedOnPhysical) {
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();

        const curSettings = (curTenant?.settings as Record<string, any>) || {};
        const attendanceStore: LessonAttendance[] = curSettings.academic_attendances_store || [];
        allAttendances = attendanceStore.filter((a) => lessonIds.includes(a.lesson_id));
      }

      allAttendances.forEach((att) => {
        const stAcc = attendancesMap.get(att.student_id);
        if (stAcc) {
          if (att.status === "presente") stAcc.presences += 1;
          else if (att.status === "falta") stAcc.absences += 1;
          else if (att.status === "justificada") stAcc.justified += 1;
        }
      });
    }

    const totalLessons = lessons.length;
    let totalAllPresences = 0;
    let totalAllOpportunities = 0;

    const studentsSummary: StudentAttendanceSummary[] = enrolledStudents.map((st) => {
      const acc = attendancesMap.get(st.student_id) || { presences: 0, absences: 0, justified: 0 };
      const attended = acc.presences + acc.justified; // Faltas justificadas abonadas no cômputo padrão
      const pct = totalLessons > 0 ? Math.min(100, Math.round((attended / totalLessons) * 100)) : 100;

      totalAllPresences += attended;
      totalAllOpportunities += totalLessons;

      return {
        student_id: st.student_id,
        enrollment_id: st.enrollment_id,
        student_name: st.student_name,
        student_cpf: st.student_cpf,
        total_lessons: totalLessons,
        presences: acc.presences,
        absences: acc.absences,
        justified: acc.justified,
        attendance_percentage: pct,
      };
    });

    const overallRate =
      totalAllOpportunities > 0
        ? Math.round((totalAllPresences / totalAllOpportunities) * 100)
        : 100;

    const report: ClassAttendanceConsolidatedReport = {
      school_class: targetClass,
      period: selectedPeriod,
      total_lessons: totalLessons,
      students_summary: studentsSummary,
      overall_attendance_rate: overallRate,
    };

    return { success: true, report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao gerar consolidado de frequência." };
  }
}

// ==============================================================================
// 7. ETAPA 2: CONFIGURAÇÕES ACADÊMICAS DO TENANT (MÉDIAS & REGRAS)
// ==============================================================================

const DEFAULT_ACADEMIC_SETTINGS: Omit<AcademicSettings, "tenant_id"> = {
  passing_grade: 6.0,
  max_score_per_period: 10.0,
  calculation_formula: "media_aritmetica",
  rounding_rule: "padrao",
  decimal_places: 1,
  recovery_enabled: true,
  recovery_replaces_lowest: true,
  min_attendance_percentage: 75.0,
};

export async function getAcademicSettingsAction(): Promise<{
  success: boolean;
  settings: AcademicSettings;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    const { data, error } = await (supabase.from("academic_settings") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .maybeSingle();

    if (error) {
      console.warn("[academico] academic_settings query error:", error);
    }

    if (data) {
      return {
        success: true,
        settings: {
          id: data.id,
          tenant_id: data.tenant_id,
          passing_grade: Number(data.passing_grade) || 6.0,
          max_score_per_period: Number(data.max_score_per_period) || 10.0,
          calculation_formula: data.calculation_formula || "media_aritmetica",
          rounding_rule: data.rounding_rule || "padrao",
          decimal_places: Number(data.decimal_places) ?? 1,
          recovery_enabled: data.recovery_enabled ?? true,
          recovery_replaces_lowest: data.recovery_replaces_lowest ?? true,
          min_attendance_percentage: Number(data.min_attendance_percentage) || 75.0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
    }

    return {
      success: true,
      settings: {
        tenant_id: session.tenant.id,
        ...DEFAULT_ACADEMIC_SETTINGS,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      settings: {
        tenant_id: "",
        ...DEFAULT_ACADEMIC_SETTINGS,
      },
      error: err?.message || "Erro ao consultar configurações acadêmicas.",
    };
  }
}

export async function saveAcademicSettingsAction(
  payload: SaveAcademicSettingsInput
): Promise<{
  success: boolean;
  settings?: AcademicSettings;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao"]);
    const supabase = await createClient();

    // Validações
    if (payload.passing_grade < 0 || payload.passing_grade > 100) {
      return { success: false, error: "Média de aprovação deve estar entre 0 e 100." };
    }
    if (payload.max_score_per_period <= 0 || payload.max_score_per_period > 1000) {
      return { success: false, error: "Pontuação máxima por período deve ser maior que 0." };
    }
    if (payload.min_attendance_percentage < 0 || payload.min_attendance_percentage > 100) {
      return { success: false, error: "Percentual mínimo de frequência deve estar entre 0 e 100." };
    }

    const upsertData = {
      tenant_id: session.tenant.id,
      passing_grade: payload.passing_grade,
      max_score_per_period: payload.max_score_per_period,
      calculation_formula: payload.calculation_formula,
      rounding_rule: payload.rounding_rule,
      decimal_places: payload.decimal_places,
      recovery_enabled: payload.recovery_enabled,
      recovery_replaces_lowest: payload.recovery_replaces_lowest,
      min_attendance_percentage: payload.min_attendance_percentage,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase.from("academic_settings") as any)
      .upsert(upsertData, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error) {
      return { success: false, error: `Falha ao salvar configurações acadêmicas: ${error.message}` };
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "UPDATE",
        resource: "academic_settings",
        resource_id: data.id,
        metadata: {
          payload,
          updated_at: new Date().toISOString(),
        },
      },
    ]);

    revalidatePath("/app/academico/avaliacoes");
    revalidatePath("/app/academico/boletim");

    return {
      success: true,
      settings: {
        id: data.id,
        tenant_id: data.tenant_id,
        passing_grade: Number(data.passing_grade),
        max_score_per_period: Number(data.max_score_per_period),
        calculation_formula: data.calculation_formula,
        rounding_rule: data.rounding_rule,
        decimal_places: Number(data.decimal_places),
        recovery_enabled: data.recovery_enabled,
        recovery_replaces_lowest: data.recovery_replaces_lowest,
        min_attendance_percentage: Number(data.min_attendance_percentage),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar configurações acadêmicas." };
  }
}

// ==============================================================================
// 8. ETAPA 2: GESTÃO DE AVALIAÇÕES (ACADEMIC ASSESSMENTS)
// ==============================================================================

export async function getAcademicAssessmentsAction(filters: {
  classId: string;
  academic_term_id?: string;
  academicTermId?: string;
  academicPeriod?: string;
  subjectName?: string;
}): Promise<{
  success: boolean;
  assessments?: AcademicAssessment[];
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(filters.classId);
    const supabase = await createClient();

    let query = (supabase.from("academic_assessments") as any)
      .select(`
        id,
        tenant_id,
        class_id,
        school_year_id,
        academic_term_id,
        subject_name,
        academic_period,
        title,
        description,
        assessment_date,
        assessment_type,
        max_score,
        weight,
        is_locked,
        created_by,
        created_at,
        updated_at,
        creator:created_by (full_name),
        school_classes:class_id (name),
        school_year:school_years(*),
        academic_term:academic_terms(*)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", filters.classId)
      .order("assessment_date", { ascending: false });

    const termIdFilter = filters.academic_term_id || filters.academicTermId;
    if (termIdFilter && termIdFilter !== "all") {
      query = query.eq("academic_term_id", termIdFilter);
    }
    if (filters.academicPeriod && filters.academicPeriod !== "all") {
      query = query.eq("academic_period", filters.academicPeriod);
    }
    if (filters.subjectName) {
      query = query.eq("subject_name", filters.subjectName);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: `Falha ao carregar avaliações: ${error.message}` };
    }

    // Busca estatísticas de notas lançadas para cada avaliação
    const assessmentIds = (data || []).map((a: any) => a.id);
    let gradesMap = new Map<string, { count: number; totalScore: number }>();

    if (assessmentIds.length > 0) {
      const { data: gradesData } = await (supabase.from("student_assessment_grades") as any)
        .select("assessment_id, score, is_absent")
        .eq("tenant_id", session.tenant.id)
        .in("assessment_id", assessmentIds);

      if (gradesData) {
        for (const g of gradesData) {
          const prev = gradesMap.get(g.assessment_id) || { count: 0, totalScore: 0 };
          if (g.score !== null && g.score !== undefined && !g.is_absent) {
            prev.count += 1;
            prev.totalScore += Number(g.score);
          }
          gradesMap.set(g.assessment_id, prev);
        }
      }
    }

    const assessments: AcademicAssessment[] = (data || []).map((a: any) => {
      const gradeStat = gradesMap.get(a.id);
      const avg = gradeStat && gradeStat.count > 0 ? Number((gradeStat.totalScore / gradeStat.count).toFixed(1)) : undefined;

      return {
        id: a.id,
        tenant_id: a.tenant_id,
        class_id: a.class_id,
        school_year_id: a.school_year_id || null,
        academic_term_id: a.academic_term_id || null,
        subject_name: a.subject_name,
        academic_period: a.academic_period,
        title: a.title,
        description: a.description,
        assessment_date: a.assessment_date,
        assessment_type: a.assessment_type,
        max_score: Number(a.max_score),
        weight: Number(a.weight),
        is_locked: a.is_locked,
        created_by: a.created_by,
        created_at: a.created_at,
        updated_at: a.updated_at,
        class_name: a.school_classes?.name,
        creator_name: a.creator?.full_name,
        school_year: a.school_year || null,
        academic_term: a.academic_term || null,
        grades_count: gradeStat?.count || 0,
        average_score: avg,
      };
    });

    return { success: true, assessments };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar avaliações." };
  }
}

export async function getAcademicAssessmentByIdAction(assessmentId: string): Promise<{
  success: boolean;
  assessment?: AcademicAssessment;
  isPeriodClosed?: boolean;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    const { data: a, error } = await (supabase.from("academic_assessments") as any)
      .select(`
        id,
        tenant_id,
        class_id,
        school_year_id,
        academic_term_id,
        subject_name,
        academic_period,
        title,
        description,
        assessment_date,
        assessment_type,
        max_score,
        weight,
        is_locked,
        created_by,
        created_at,
        updated_at,
        creator:created_by (full_name),
        school_classes:class_id (name),
        school_year:school_years(*),
        academic_term:academic_terms(*)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", assessmentId)
      .single();

    if (error || !a) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    // Valida permissão de acesso à turma da avaliação
    await assertClassAccess(a.class_id);

    // Checa se o período está fechado ou bloqueado
    const { data: closing } = await (supabase.from("academic_period_closings") as any)
      .select("id, is_closed")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", a.class_id)
      .eq("academic_period", a.academic_period)
      .maybeSingle();

    const isTermBlocked = a.academic_term?.status === "bloqueado";
    const isPeriodClosed = (closing?.is_closed ?? false) || isTermBlocked;

    return {
      success: true,
      assessment: {
        id: a.id,
        tenant_id: a.tenant_id,
        class_id: a.class_id,
        school_year_id: a.school_year_id || null,
        academic_term_id: a.academic_term_id || null,
        subject_name: a.subject_name,
        academic_period: a.academic_period,
        title: a.title,
        description: a.description,
        assessment_date: a.assessment_date,
        assessment_type: a.assessment_type,
        max_score: Number(a.max_score),
        weight: Number(a.weight),
        is_locked: a.is_locked,
        created_by: a.created_by,
        created_at: a.created_at,
        updated_at: a.updated_at,
        class_name: a.school_classes?.name,
        creator_name: a.creator?.full_name,
        school_year: a.school_year || null,
        academic_term: a.academic_term || null,
      },
      isPeriodClosed,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao carregar dados da avaliação." };
  }
}

export async function saveAcademicAssessmentAction(payload: SaveAssessmentInput): Promise<{
  success: boolean;
  assessment?: AcademicAssessment;
  error?: string;
}> {
  try {
    const { session, isTeacher } = await assertClassAccess(payload.class_id);
    const supabase = await createClient();

    const assessmentDate = payload.assessment_date.trim();

    // Validações básicas
    if (!payload.title || payload.title.trim().length === 0) {
      return { success: false, error: "O título da avaliação é obrigatório." };
    }
    if (!payload.subject_name || payload.subject_name.trim().length === 0) {
      return { success: false, error: "A disciplina é obrigatória." };
    }
    if (!assessmentDate) {
      return { success: false, error: "A data da avaliação é obrigatória." };
    }
    if (payload.max_score <= 0) {
      return { success: false, error: "O valor máximo deve ser maior que zero." };
    }
    if (payload.weight <= 0) {
      return { success: false, error: "O peso da avaliação deve ser maior que zero." };
    }

    // 1. Busca a turma para obter dados do Ano Letivo oficial
    const { data: targetClass, error: tcErr } = await (supabase.from("school_classes") as any)
      .select("id, tenant_id, school_year_id, academic_year, school_year:school_years(*)")
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.class_id)
      .maybeSingle();

    if (tcErr || !targetClass) {
      return { success: false, error: "Turma não encontrada para cadastro da avaliação." };
    }

    // 2. Resolução do Ano Letivo oficial
    let schoolYearId: string | null = payload.school_year_id || targetClass.school_year_id || null;
    let schoolYear: any = targetClass.school_year || null;

    if (!schoolYear && schoolYearId) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("id", schoolYearId)
        .maybeSingle();
      schoolYear = sy;
    } else if (!schoolYear && targetClass.academic_year) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("year", targetClass.academic_year)
        .maybeSingle();
      if (sy) {
        schoolYear = sy;
        schoolYearId = sy.id;
      }
    }

    // 3. Resolução e validação estrita do Período Acadêmico oficial
    let academicTermId: string | null = payload.academic_term_id || null;
    let academicTerm: any = null;

    if (academicTermId) {
      const { data: atRecord } = await (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("id", academicTermId)
        .maybeSingle();

      if (!atRecord) {
        return {
          success: false,
          error: "O Período Acadêmico selecionado não foi encontrado ou não pertence a esta instituição.",
        };
      }

      // Validação: academic_term_id deve pertencer ao mesmo school_year_id da turma
      if (schoolYearId && atRecord.school_year_id !== schoolYearId) {
        return {
          success: false,
          error: "O Período Acadêmico selecionado não pertence ao Ano Letivo oficial desta turma.",
        };
      }

      academicTerm = atRecord;
      if (!schoolYearId && academicTerm.school_year_id) {
        schoolYearId = academicTerm.school_year_id;
      }
    } else if (schoolYearId) {
      const { data: atRecords } = await (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", schoolYearId);

      if (!atRecords || atRecords.length === 0) {
        return {
          success: false,
          error: "Não existem períodos acadêmicos cadastrados para o Ano Letivo desta turma. Cadastre os períodos no Calendário Acadêmico antes de criar avaliações.",
        };
      }

      const matchingByDate = atRecords.find(
        (t: any) => assessmentDate >= t.start_date && assessmentDate <= t.end_date
      );
      if (matchingByDate) {
        academicTerm = matchingByDate;
        academicTermId = matchingByDate.id;
      } else if (payload.academic_period) {
        const matchingByName = atRecords.find(
          (t: any) => t.name.toLowerCase() === payload.academic_period!.toLowerCase().trim()
        );
        if (matchingByName) {
          academicTerm = matchingByName;
          academicTermId = matchingByName.id;
        }
      }

      if (!academicTermId || !academicTerm) {
        return {
          success: false,
          error: `Esta turma está vinculada a um Ano Letivo oficial. É obrigatório selecionar um Período Acadêmico oficial válido (a data ${assessmentDate} não coincide com a vigência de nenhum período cadastrado).`,
        };
      }
    }

    // 4. Validações Temporais Rigorosas com o Calendário Acadêmico
    if (schoolYear) {
      if (assessmentDate < schoolYear.start_date || assessmentDate > schoolYear.end_date) {
        return {
          success: false,
          error: `A data da avaliação (${assessmentDate}) está fora do período de vigência do Ano Letivo ${schoolYear.year} (${schoolYear.start_date} a ${schoolYear.end_date}).`,
        };
      }
    }

    if (academicTerm) {
      if (assessmentDate < academicTerm.start_date || assessmentDate > academicTerm.end_date) {
        return {
          success: false,
          error: `A data da avaliação (${assessmentDate}) está fora da vigência de '${academicTerm.name}' (${academicTerm.start_date} a ${academicTerm.end_date}).`,
        };
      }

      // Validação: Período com status bloqueado impede criação e edição para TODOS os perfis
      if (academicTerm.status === "bloqueado") {
        return {
          success: false,
          error: `O período acadêmico '${academicTerm.name}' está bloqueado para criação e alteração de avaliações.`,
        };
      }
    }

    const academicPeriod = academicTerm ? academicTerm.name : (payload.academic_period?.trim() || "1º Bimestre");

    // Checagem de período fechado manual
    const { data: closing } = await (supabase.from("academic_period_closings") as any)
      .select("id, is_closed")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", payload.class_id)
      .eq("academic_period", academicPeriod)
      .maybeSingle();

    if (closing?.is_closed && isTeacher) {
      return {
        success: false,
        error: `O período ${academicPeriod} está fechado para lançamentos e alterações.`,
      };
    }

    const isEdit = !!payload.id;

    if (isEdit) {
      const { data: existing, error: findErr } = await (supabase.from("academic_assessments") as any)
        .select("id, created_by, is_locked")
        .eq("tenant_id", session.tenant.id)
        .eq("id", payload.id)
        .single();

      if (findErr || !existing) {
        return { success: false, error: "Avaliação não encontrada para edição." };
      }

      if (existing.is_locked && isTeacher) {
        return { success: false, error: "Esta avaliação está bloqueada para alterações." };
      }

      const updateData: Record<string, any> = {
        subject_name: payload.subject_name.trim(),
        academic_period: academicPeriod,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        assessment_date: assessmentDate,
        assessment_type: payload.assessment_type,
        max_score: payload.max_score,
        weight: payload.weight,
        updated_at: new Date().toISOString(),
      };

      if (schoolYearId) updateData.school_year_id = schoolYearId;
      if (academicTermId) updateData.academic_term_id = academicTermId;

      const { data: updated, error: updateErr } = await (supabase.from("academic_assessments") as any)
        .update(updateData)
        .eq("tenant_id", session.tenant.id)
        .eq("id", payload.id)
        .select()
        .single();

      if (updateErr) {
        return { success: false, error: `Falha ao atualizar avaliação: ${updateErr.message}` };
      }

      // Auditoria
      await (supabase.from("audit_logs") as any).insert([
        {
          tenant_id: session.tenant.id,
          user_id: session.user.id,
          user_name: session.profile.full_name || session.user.email,
          user_email: session.user.email,
          user_role: session.role,
          action: "UPDATE",
          resource: "academic_assessments",
          resource_id: payload.id,
          metadata: { payload, updated_at: new Date().toISOString() },
        },
      ]);

      revalidatePath("/app/academico/avaliacoes");
      revalidatePath("/app/academico/boletim");

      return {
        success: true,
        assessment: {
          id: updated.id,
          tenant_id: updated.tenant_id,
          class_id: updated.class_id,
          school_year_id: updated.school_year_id || null,
          academic_term_id: updated.academic_term_id || null,
          subject_name: updated.subject_name,
          academic_period: updated.academic_period,
          title: updated.title,
          description: updated.description,
          assessment_date: updated.assessment_date,
          assessment_type: updated.assessment_type,
          max_score: Number(updated.max_score),
          weight: Number(updated.weight),
          is_locked: updated.is_locked,
          created_by: updated.created_by,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
          school_year: schoolYear,
          academic_term: academicTerm,
        },
      };
    } else {
      // Inserção
      const insertData: Record<string, any> = {
        tenant_id: session.tenant.id,
        class_id: payload.class_id,
        subject_name: payload.subject_name.trim(),
        academic_period: academicPeriod,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        assessment_date: assessmentDate,
        assessment_type: payload.assessment_type,
        max_score: payload.max_score,
        weight: payload.weight,
        is_locked: false,
        created_by: session.user.id,
      };

      if (schoolYearId) insertData.school_year_id = schoolYearId;
      if (academicTermId) insertData.academic_term_id = academicTermId;

      const { data: inserted, error: insertErr } = await (supabase.from("academic_assessments") as any)
        .insert([insertData])
        .select()
        .single();

      if (insertErr) {
        return { success: false, error: `Falha ao cadastrar avaliação: ${insertErr.message}` };
      }

      // Auditoria
      await (supabase.from("audit_logs") as any).insert([
        {
          tenant_id: session.tenant.id,
          user_id: session.user.id,
          user_name: session.profile.full_name || session.user.email,
          user_email: session.user.email,
          user_role: session.role,
          action: "CREATE",
          resource: "academic_assessments",
          resource_id: inserted.id,
          metadata: { payload, created_at: new Date().toISOString() },
        },
      ]);

      revalidatePath("/app/academico/avaliacoes");
      revalidatePath("/app/academico/boletim");

      return {
        success: true,
        assessment: {
          id: inserted.id,
          tenant_id: inserted.tenant_id,
          class_id: inserted.class_id,
          school_year_id: inserted.school_year_id || null,
          academic_term_id: inserted.academic_term_id || null,
          subject_name: inserted.subject_name,
          academic_period: inserted.academic_period,
          title: inserted.title,
          description: inserted.description,
          assessment_date: inserted.assessment_date,
          assessment_type: inserted.assessment_type,
          max_score: Number(inserted.max_score),
          weight: Number(inserted.weight),
          is_locked: inserted.is_locked,
          created_by: inserted.created_by,
          created_at: inserted.created_at,
          updated_at: inserted.updated_at,
          school_year: schoolYear,
          academic_term: academicTerm,
        },
      };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar avaliação." };
  }
}

export async function deleteAcademicAssessmentAction(assessmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    const { data: assessment, error: findErr } = await (supabase.from("academic_assessments") as any)
      .select("id, class_id, academic_period, created_by, is_locked")
      .eq("tenant_id", session.tenant.id)
      .eq("id", assessmentId)
      .single();

    if (findErr || !assessment) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    const { isTeacher } = await assertClassAccess(assessment.class_id);

    if (assessment.is_locked && isTeacher) {
      return { success: false, error: "Esta avaliação está bloqueada para exclusão." };
    }

    // Checagem de período fechado
    const { data: closing } = await (supabase.from("academic_period_closings") as any)
      .select("id, is_closed")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", assessment.class_id)
      .eq("academic_period", assessment.academic_period)
      .maybeSingle();

    if (closing?.is_closed && isTeacher) {
      return {
        success: false,
        error: `O período ${assessment.academic_period} está fechado. Exclusão não permitida.`,
      };
    }

    const { error: delErr } = await (supabase.from("academic_assessments") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", assessmentId);

    if (delErr) {
      return { success: false, error: `Falha ao excluir avaliação: ${delErr.message}` };
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "DELETE",
        resource: "academic_assessments",
        resource_id: assessmentId,
        metadata: { deleted_at: new Date().toISOString() },
      },
    ]);

    revalidatePath("/app/academico/avaliacoes");
    revalidatePath("/app/academico/boletim");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir avaliação." };
  }
}

// ==============================================================================
// 9. ETAPA 2: LANÇAMENTO DE NOTAS (STUDENT ASSESSMENT GRADES)
// ==============================================================================

export async function getAssessmentGradesAction(assessmentId: string): Promise<{
  success: boolean;
  assessment?: AcademicAssessment;
  grades?: (StudentAssessmentGrade & {
    student_name: string;
    student_cpf?: string | null;
  })[];
  isLocked?: boolean;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // 1. Busca os detalhes da avaliação
    const { data: assessmentData, error: aErr } = await (supabase.from("academic_assessments") as any)
      .select(`
        id,
        tenant_id,
        class_id,
        subject_name,
        academic_period,
        title,
        description,
        assessment_date,
        assessment_type,
        max_score,
        weight,
        is_locked,
        school_classes:class_id (name)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", assessmentId)
      .single();

    if (aErr || !assessmentData) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    // 2. Valida acesso à turma
    const { isTeacher } = await assertClassAccess(assessmentData.class_id);

    // 3. Checa se o período está fechado
    const { data: closing } = await (supabase.from("academic_period_closings") as any)
      .select("id, is_closed")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", assessmentData.class_id)
      .eq("academic_period", assessmentData.academic_period)
      .maybeSingle();

    const isPeriodClosed = closing?.is_closed ?? false;
    const isLocked = (assessmentData.is_locked || isPeriodClosed) && isTeacher;

    // 4. Busca os alunos matriculados na turma
    const { data: enrollmentsData } = await (supabase.from("enrollments") as any)
      .select(`
        id,
        student_id,
        status,
        students:student_id (id, full_name, cpf)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", assessmentData.class_id)
      .eq("status", "matriculado");

    const enrolledList = (enrollmentsData || []).map((e: any) => ({
      student_id: e.student_id,
      enrollment_id: e.id,
      student_name: e.students?.full_name || "Aluno sem nome",
      student_cpf: e.students?.cpf || null,
    }));

    // Ordena alfabeticamente
    enrolledList.sort((a: any, b: any) => a.student_name.localeCompare(b.student_name));

    // 5. Busca as notas já gravadas
    const { data: existingGrades } = await (supabase.from("student_assessment_grades") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("assessment_id", assessmentId);

    const gradesMap = new Map<string, any>();
    (existingGrades || []).forEach((g: any) => {
      gradesMap.set(g.student_id, g);
    });

    const mergedGrades = enrolledList.map((st: any) => {
      const g = gradesMap.get(st.student_id);
      return {
        id: g ? g.id : `draft-${st.student_id}`,
        tenant_id: session.tenant.id,
        assessment_id: assessmentId,
        student_id: st.student_id,
        enrollment_id: st.enrollment_id,
        score: g?.score !== null && g?.score !== undefined ? Number(g.score) : null,
        is_absent: g?.is_absent ?? false,
        feedback_notes: g?.feedback_notes || "",
        recorded_by: g?.recorded_by,
        created_at: g?.created_at || new Date().toISOString(),
        updated_at: g?.updated_at || new Date().toISOString(),
        student_name: st.student_name,
        student_cpf: st.student_cpf,
      };
    });

    return {
      success: true,
      assessment: {
        id: assessmentData.id,
        tenant_id: assessmentData.tenant_id,
        class_id: assessmentData.class_id,
        subject_name: assessmentData.subject_name,
        academic_period: assessmentData.academic_period,
        title: assessmentData.title,
        description: assessmentData.description,
        assessment_date: assessmentData.assessment_date,
        assessment_type: assessmentData.assessment_type,
        max_score: Number(assessmentData.max_score),
        weight: Number(assessmentData.weight),
        is_locked: assessmentData.is_locked,
        class_name: assessmentData.school_classes?.name,
        created_at: "",
        updated_at: "",
      },
      grades: mergedGrades,
      isLocked,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao carregar lista de notas da avaliação." };
  }
}

export async function saveAssessmentGradesAction(payload: SaveStudentGradesInput): Promise<{
  success: boolean;
  savedCount?: number;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // 1. Busca a avaliação para validar existência e valor máximo
    const { data: assessment, error: aErr } = await (supabase.from("academic_assessments") as any)
      .select(`
        id,
        class_id,
        academic_period,
        academic_term_id,
        max_score,
        is_locked,
        academic_term:academic_terms (
          id,
          name,
          status,
          start_date,
          end_date
        )
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.assessment_id)
      .single();

    if (aErr || !assessment) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    const { isTeacher } = await assertClassAccess(assessment.class_id);

    // REGRA OFICIAL FASE 3: Se o período acadêmico oficial estiver BLOQUEADO, bloqueia lançamento/alteração de notas para TODOS os perfis
    if (assessment.academic_term?.status === "bloqueado") {
      return {
        success: false,
        error: `O período acadêmico '${assessment.academic_term?.name || assessment.academic_period}' está bloqueado no Calendário Escolar para lançamento e alteração de notas.`,
      };
    }

    // 2. Checagem de travas de período ou de avaliação
    const { data: closing } = await (supabase.from("academic_period_closings") as any)
      .select("id, is_closed")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", assessment.class_id)
      .eq("academic_period", assessment.academic_period)
      .maybeSingle();

    if (closing?.is_closed && isTeacher) {
      return {
        success: false,
        error: `O período ${assessment.academic_period} está fechado. Lançamento não permitido.`,
      };
    }

    if (assessment.is_locked && isTeacher) {
      return {
        success: false,
        error: "Esta avaliação foi bloqueada para alterações pela coordenação.",
      };
    }

    const maxScore = Number(assessment.max_score);

    // 3. Valida limites de cada nota enviada
    for (const item of payload.grades) {
      if (item.score !== null && item.score !== undefined) {
        const num = Number(item.score);
        if (isNaN(num) || num < 0 || num > maxScore) {
          return {
            success: false,
            error: `Nota inválida detectada (${num}). A nota deve ser um valor entre 0 e a nota máxima da avaliação (${maxScore}).`,
          };
        }
      }
    }

    // 4. Prepara registros para upsert atômico
    const now = new Date().toISOString();
    const rowsToUpsert = payload.grades.map((item) => ({
      tenant_id: session.tenant.id,
      assessment_id: payload.assessment_id,
      student_id: item.student_id,
      enrollment_id: item.enrollment_id || null,
      score: item.is_absent ? 0 : item.score !== null && item.score !== undefined ? Number(item.score) : null,
      is_absent: !!item.is_absent,
      feedback_notes: item.feedback_notes?.trim() || null,
      recorded_by: session.user.id,
      updated_at: now,
    }));

    if (rowsToUpsert.length > 0) {
      const { error: upsertErr } = await (supabase.from("student_assessment_grades") as any).upsert(
        rowsToUpsert,
        { onConflict: "tenant_id,assessment_id,student_id" }
      );

      if (upsertErr) {
        return { success: false, error: `Falha ao gravar notas: ${upsertErr.message}` };
      }
    }

    // 5. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "UPDATE",
        resource: "student_assessment_grades",
        resource_id: payload.assessment_id,
        metadata: {
          assessment_id: payload.assessment_id,
          class_id: assessment.class_id,
          grades_count: payload.grades.length,
          updated_at: now,
        },
      },
    ]);

    revalidatePath("/app/academico/avaliacoes");
    revalidatePath("/app/academico/boletim");

    return { success: true, savedCount: rowsToUpsert.length };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar notas da avaliação." };
  }
}

// ==============================================================================
// 10. ETAPA 2: FECHAMENTO / TRAVA DE PERÍODOS LETIVOS
// ==============================================================================

export async function togglePeriodClosingAction(payload: TogglePeriodClosingInput): Promise<{
  success: boolean;
  closing?: AcademicPeriodClosing;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const now = new Date().toISOString();
    const row = {
      tenant_id: session.tenant.id,
      class_id: payload.class_id,
      academic_period: payload.academic_period,
      academic_term_id: payload.academic_term_id || null,
      subject_name: payload.subject_name?.trim() || null,
      is_closed: payload.is_closed,
      closed_at: now,
      closed_by: session.user.id,
      closure_notes: payload.closure_notes?.trim() || null,
    };

    let query = (supabase.from("academic_period_closings") as any)
      .select("id")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", payload.class_id)
      .eq("academic_period", payload.academic_period);

    if (payload.subject_name?.trim()) {
      query = query.eq("subject_name", payload.subject_name.trim());
    } else {
      query = query.is("subject_name", null);
    }

    const { data: existing } = await query.maybeSingle();

    let data: any;
    let error: any;

    if (existing) {
      const res = await (supabase.from("academic_period_closings") as any)
        .update({
          is_closed: payload.is_closed,
          closed_at: now,
          closed_by: session.user.id,
          closure_notes: payload.closure_notes?.trim() || null,
          academic_term_id: payload.academic_term_id || null,
        })
        .eq("id", existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      const res = await (supabase.from("academic_period_closings") as any)
        .insert([row])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return { success: false, error: `Falha ao alterar status de fechamento do período: ${error.message}` };
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: payload.is_closed ? "LOCK" : "UNLOCK",
        resource: "academic_period_closings",
        resource_id: data.id,
        metadata: {
          class_id: payload.class_id,
          academic_period: payload.academic_period,
          academic_term_id: payload.academic_term_id,
          is_closed: payload.is_closed,
          closed_at: now,
        },
      },
    ]);

    revalidatePath("/app/academico/avaliacoes");
    revalidatePath("/app/academico/boletim");

    return {
      success: true,
      closing: {
        id: data.id,
        tenant_id: data.tenant_id,
        class_id: data.class_id,
        academic_period: data.academic_period,
        academic_term_id: data.academic_term_id || null,
        subject_name: data.subject_name,
        is_closed: data.is_closed,
        closed_at: data.closed_at,
        closed_by: data.closed_by,
        closure_notes: data.closure_notes,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao gerenciar fechamento de período." };
  }
}

export async function getPeriodClosingsAction(classId: string): Promise<{
  success: boolean;
  closings?: AcademicPeriodClosing[];
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(classId);
    const supabase = await createClient();

    const { data, error } = await (supabase.from("academic_period_closings") as any)
      .select(`
        id,
        tenant_id,
        class_id,
        academic_period,
        academic_term_id,
        subject_name,
        is_closed,
        closed_at,
        closed_by,
        closure_notes,
        closer:closed_by (full_name)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", classId);

    if (error) {
      return { success: false, error: `Falha ao consultar fechamentos: ${error.message}` };
    }

    const closings: AcademicPeriodClosing[] = (data || []).map((c: any) => ({
      id: c.id,
      tenant_id: c.tenant_id,
      class_id: c.class_id,
      academic_period: c.academic_period,
      academic_term_id: c.academic_term_id || null,
      subject_name: c.subject_name,
      is_closed: c.is_closed,
      closed_at: c.closed_at,
      closed_by: c.closed_by,
      closure_notes: c.closure_notes,
      closer_name: c.closer?.full_name,
    }));

    return { success: true, closings };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar fechamentos de período." };
  }
}

// ==============================================================================
// 11. MOTOR DE CÁLCULO DE MÉDIAS E BOLETIM ESCOLAR (REPORT CARDS)
// ==============================================================================

function applyRounding(value: number, rule: RoundingRule, decimals: number): number {
  const factor = Math.pow(10, decimals);
  switch (rule) {
    case "baixo":
      return Math.floor(value * factor) / factor;
    case "cima":
      return Math.ceil(value * factor) / factor;
    case "sem_arredondamento":
      return Number(value.toFixed(decimals));
    case "padrao":
    default:
      return Math.round(value * factor) / factor;
  }
}

function calculatePeriodGrade(
  assessments: {
    id: string;
    title: string;
    type: AssessmentType;
    max_score: number;
    weight: number;
    score: number | null;
    is_absent: boolean;
  }[],
  settings: AcademicSettings
): { calculatedGrade: number | null; recoveryGrade: number | null; finalPeriodGrade: number | null } {
  const regular = assessments.filter((a) => a.type !== "recuperacao");
  const recovery = assessments.find((a) => a.type === "recuperacao" && a.score !== null);

  const regularWithScores = regular.filter((a) => a.score !== null);

  if (regularWithScores.length === 0) {
    return { calculatedGrade: null, recoveryGrade: recovery?.score ?? null, finalPeriodGrade: null };
  }

  let calculatedRaw = 0;

  if (settings.calculation_formula === "media_aritmetica") {
    const sum = regularWithScores.reduce((acc, curr) => acc + (curr.score || 0), 0);
    calculatedRaw = sum / regularWithScores.length;
  } else if (settings.calculation_formula === "media_ponderada") {
    const totalWeight = regularWithScores.reduce((acc, curr) => acc + curr.weight, 0);
    const weightedSum = regularWithScores.reduce((acc, curr) => acc + (curr.score || 0) * curr.weight, 0);
    calculatedRaw = totalWeight > 0 ? weightedSum / totalWeight : 0;
  } else if (settings.calculation_formula === "soma_pontos") {
    calculatedRaw = regularWithScores.reduce((acc, curr) => acc + (curr.score || 0), 0);
  }

  const calculatedGrade = applyRounding(calculatedRaw, settings.rounding_rule, settings.decimal_places);

  let finalGrade = calculatedGrade;
  let recoveryGrade: number | null = null;

  if (recovery && recovery.score !== null && settings.recovery_enabled) {
    recoveryGrade = Number(recovery.score);
    if (settings.recovery_replaces_lowest) {
      if (recoveryGrade > calculatedGrade) {
        finalGrade = recoveryGrade;
      }
    }
  }

  return {
    calculatedGrade,
    recoveryGrade,
    finalPeriodGrade: finalGrade,
  };
}

export async function getStudentReportCardAction(
  classId: string,
  studentId: string,
  academicYear?: string
): Promise<{
  success: boolean;
  reportCard?: StudentReportCard;
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(classId);
    const supabase = await createClient();

    // 1. Busca dados da turma
    const { data: schoolClass, error: cErr } = await (supabase.from("school_classes") as any)
      .select(`
        id,
        tenant_id,
        series_id,
        name,
        academic_year,
        shift,
        capacity,
        is_active,
        series:series_id (id, name, course:course_id (id, name))
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", classId)
      .single();

    if (cErr || !schoolClass) {
      return { success: false, error: "Turma não encontrada." };
    }

    // 1.1 Resolução do Ano Letivo oficial (por school_year_id ou academic_year)
    let resolvedSchoolYearId: string | null = (schoolClass as any).school_year_id || null;
    let resolvedSchoolYear: any = null;

    if (resolvedSchoolYearId) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();
      resolvedSchoolYear = syData;
    } else if (schoolClass.academic_year) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("year", schoolClass.academic_year)
        .maybeSingle();
      if (syData) {
        resolvedSchoolYear = syData;
        resolvedSchoolYearId = syData.id;
      }
    }

    // 1.2 Busca períodos acadêmicos oficiais se o Ano Letivo oficial for encontrado
    let termsList: ReportCardTerm[] = [];
    if (resolvedSchoolYearId) {
      const { data: termsData } = await (supabase.from("academic_terms") as any)
        .select("id, tenant_id, school_year_id, name, term_type, sequence_order, start_date, end_date, status")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", resolvedSchoolYearId)
        .order("sequence_order", { ascending: true });

      if (termsData && termsData.length > 0) {
        termsList = termsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          term_type: t.term_type,
          sequence_order: t.sequence_order,
          start_date: t.start_date,
          end_date: t.end_date,
          status: t.status,
        }));
      }
    }

    // Se for turma legada ou se o Ano Letivo oficial não tiver períodos cadastrados, usa o padrão de 4 bimestres
    if (termsList.length === 0) {
      const fallbackNames = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
      termsList = fallbackNames.map((name, idx) => ({
        name,
        sequence_order: idx + 1,
        status: "aberto",
      }));
    }

    // 2. Busca dados do aluno e matrícula
    const { data: enrollment, error: eErr } = await (supabase.from("enrollments") as any)
      .select(`
        id,
        enrollment_code,
        student_id,
        status,
        students:student_id (id, full_name, cpf)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (eErr || !enrollment) {
      return { success: false, error: "Aluno não encontrado ou não matriculado nesta turma." };
    }

    // 3. Busca as configurações acadêmicas
    const settingsRes = await getAcademicSettingsAction();
    const settings = settingsRes.settings;

    // 4. Busca todos os fechamentos de período para a turma
    const closingsRes = await getPeriodClosingsAction(classId);
    const closingsByTermId = new Map<string, boolean>();
    const closingsByPeriodName = new Map<string, boolean>();
    (closingsRes.closings || []).forEach((c) => {
      if (c.is_closed) {
        if (c.academic_term_id) {
          closingsByTermId.set(`${c.academic_term_id}-${c.subject_name || ""}`, true);
          closingsByTermId.set(`${c.academic_term_id}-`, true);
        }
        if (c.academic_period) {
          closingsByPeriodName.set(`${c.academic_period}-${c.subject_name || ""}`, true);
          closingsByPeriodName.set(`${c.academic_period}-`, true);
        }
      }
    });

    // 5. Busca todas as avaliações da turma
    const { data: assessmentsData } = await (supabase.from("academic_assessments") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", classId)
      .order("assessment_date", { ascending: true });

    // 6. Busca as notas do aluno para essas avaliações
    const assessmentIds = (assessmentsData || []).map((a: any) => a.id);
    const gradesMap = new Map<string, any>();

    if (assessmentIds.length > 0) {
      const { data: gradesData } = await (supabase.from("student_assessment_grades") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("student_id", studentId)
        .in("assessment_id", assessmentIds);

      (gradesData || []).forEach((g: any) => {
        gradesMap.set(g.assessment_id, g);
      });
    }

    // 7. Busca dados de frequência do aluno nesta turma
    const { data: lessonsData } = await (supabase.from("class_lessons") as any)
      .select("id, subject_name, lesson_date")
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", classId);

    const lessonIds = (lessonsData || []).map((l: any) => l.id);
    const lessonSubjectMap = new Map<string, string>();
    (lessonsData || []).forEach((l: any) => {
      lessonSubjectMap.set(l.id, l.subject_name || "Geral");
    });

    const attendancesBySubject = new Map<string, { total: number; presences: number; absences: number; justified: number }>();

    if (lessonIds.length > 0) {
      const { data: attendancesData } = await (supabase.from("lesson_attendances") as any)
        .select("lesson_id, status")
        .eq("tenant_id", session.tenant.id)
        .eq("student_id", studentId)
        .in("lesson_id", lessonIds);

      (lessonsData || []).forEach((l: any) => {
        const subj = l.subject_name || "Geral";
        const cur = attendancesBySubject.get(subj) || { total: 0, presences: 0, absences: 0, justified: 0 };
        cur.total += 1;
        attendancesBySubject.set(subj, cur);
      });

      (attendancesData || []).forEach((att: any) => {
        const subj = lessonSubjectMap.get(att.lesson_id) || "Geral";
        const cur = attendancesBySubject.get(subj) || { total: 0, presences: 0, absences: 0, justified: 0 };
        if (att.status === "presente") cur.presences += 1;
        else if (att.status === "justificada") cur.justified += 1;
        else if (att.status === "falta") cur.absences += 1;
        attendancesBySubject.set(subj, cur);
      });
    }

    // 8. Agrupa avaliações por Disciplina e Período (associando ao Term correspondente)
    const subjectsMap = new Map<string, Map<string, any[]>>();

    (assessmentsData || []).forEach((a: any) => {
      const subj = a.subject_name;
      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, new Map<string, any[]>());
      }
      const periodMap = subjectsMap.get(subj)!;

      // Encontra o termo correspondente em termsList
      let matchedTerm = termsList.find((t) => t.id && a.academic_term_id && t.id === a.academic_term_id);
      if (!matchedTerm && a.academic_period) {
        matchedTerm = termsList.find((t) => t.name.toLowerCase() === a.academic_period.toLowerCase());
      }
      if (!matchedTerm && a.assessment_date) {
        matchedTerm = termsList.find(
          (t) => t.start_date && t.end_date && a.assessment_date >= t.start_date && a.assessment_date <= t.end_date
        );
      }
      const termKey = matchedTerm ? matchedTerm.name : a.academic_period || termsList[0]?.name || "1º Bimestre";

      if (!periodMap.has(termKey)) {
        periodMap.set(termKey, []);
      }

      const userGrade = gradesMap.get(a.id);

      periodMap.get(termKey)!.push({
        id: a.id,
        title: a.title,
        type: a.assessment_type,
        max_score: Number(a.max_score),
        weight: Number(a.weight),
        score: userGrade?.score !== null && userGrade?.score !== undefined ? Number(userGrade.score) : null,
        is_absent: userGrade?.is_absent ?? false,
      });
    });

    // Se houver disciplinas com aulas mas sem avaliações cadastradas, inclui no mapa
    attendancesBySubject.forEach((_, subj) => {
      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, new Map<string, any[]>());
      }
    });

    // 9. Constrói os relatórios de cada disciplina baseado nos termos oficiais
    const subjectReports: SubjectReportItem[] = [];

    let totalSumAnnualGrades = 0;
    let subjectsWithGradesCount = 0;
    let overallTotalLessons = 0;
    let overallTotalPresences = 0;

    subjectsMap.forEach((periodMap, subjectName) => {
      const periodsObj: Record<string, PeriodGradeDetail> = {};
      const validPeriodGrades: number[] = [];

      termsList.forEach((term) => {
        const pName = term.name;
        const assessmentsInPeriod = periodMap.get(pName) || [];

        // Verifica se o período está fechado por closing ou bloqueado pelo Calendário
        const isClosedByClosing =
          (term.id ? closingsByTermId.get(`${term.id}-${subjectName}`) || closingsByTermId.get(`${term.id}-`) : false) ||
          closingsByPeriodName.get(`${pName}-${subjectName}`) ||
          closingsByPeriodName.get(`${pName}-`) ||
          false;

        const isTermLockedOrClosed = term.status === "bloqueado" || term.status === "fechado";
        const isClosed = isClosedByClosing || isTermLockedOrClosed;

        const calc = calculatePeriodGrade(assessmentsInPeriod, settings);

        periodsObj[pName] = {
          period: pName,
          academic_term_id: term.id || null,
          term_status: term.status,
          sequence_order: term.sequence_order,
          assessments: assessmentsInPeriod,
          calculated_grade: calc.calculatedGrade,
          recovery_grade: calc.recoveryGrade,
          final_period_grade: calc.finalPeriodGrade,
          is_closed: isClosed,
        };

        if (calc.finalPeriodGrade !== null) {
          validPeriodGrades.push(calc.finalPeriodGrade);
        }
      });

      const annualAverage =
        validPeriodGrades.length > 0
          ? applyRounding(
              validPeriodGrades.reduce((a, b) => a + b, 0) / validPeriodGrades.length,
              settings.rounding_rule,
              settings.decimal_places
            )
          : null;

      if (annualAverage !== null) {
        totalSumAnnualGrades += annualAverage;
        subjectsWithGradesCount += 1;
      }

      const att = attendancesBySubject.get(subjectName) || { total: 0, presences: 0, absences: 0, justified: 0 };
      const attended = att.presences + att.justified;
      const attPct = att.total > 0 ? Math.min(100, Math.round((attended / att.total) * 100)) : 100;

      overallTotalLessons += att.total;
      overallTotalPresences += attended;

      // Determinação da situação na disciplina
      let situation: "aprovado" | "reprovado" | "recuperacao" | "em_andamento" = "em_andamento";
      if (annualAverage !== null) {
        if (annualAverage >= settings.passing_grade && attPct >= settings.min_attendance_percentage) {
          situation = "aprovado";
        } else if (attPct < settings.min_attendance_percentage) {
          situation = "reprovado";
        } else if (annualAverage < settings.passing_grade) {
          situation = settings.recovery_enabled ? "recuperacao" : "reprovado";
        }
      }

      subjectReports.push({
        subject_name: subjectName,
        periods: periodsObj,
        annual_average: annualAverage,
        final_grade: annualAverage,
        total_lessons: att.total,
        presences: att.presences,
        absences: att.absences,
        attendance_percentage: attPct,
        situation,
      });
    });

    // Ordena disciplinas alfabeticamente
    subjectReports.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

    const overallAverage =
      subjectsWithGradesCount > 0
        ? applyRounding(totalSumAnnualGrades / subjectsWithGradesCount, settings.rounding_rule, settings.decimal_places)
        : null;

    const overallAttPct =
      overallTotalLessons > 0
        ? Math.min(100, Math.round((overallTotalPresences / overallTotalLessons) * 100))
        : 100;

    let overallSituation: "aprovado" | "reprovado" | "recuperacao" | "em_andamento" = "em_andamento";
    if (subjectReports.length > 0 && subjectReports.every((s) => s.annual_average !== null)) {
      if (subjectReports.some((s) => s.situation === "reprovado")) {
        overallSituation = "reprovado";
      } else if (subjectReports.some((s) => s.situation === "recuperacao")) {
        overallSituation = "recuperacao";
      } else {
        overallSituation = "aprovado";
      }
    }

    const reportCard: StudentReportCard = {
      student_id: studentId,
      student_name: enrollment.students?.full_name || "Aluno sem nome",
      student_cpf: enrollment.students?.cpf || null,
      enrollment_id: enrollment.id,
      enrollment_number: enrollment.enrollment_code || enrollment.enrollment_number || null,
      school_class: {
        ...schoolClass,
        school_year_id: resolvedSchoolYearId,
        school_year: resolvedSchoolYear,
      },
      academic_year: academicYear || schoolClass.academic_year,
      school_year_id: resolvedSchoolYearId,
      school_year: resolvedSchoolYear,
      terms: termsList,
      settings,
      subjects: subjectReports,
      overall_average: overallAverage,
      overall_attendance_percentage: overallAttPct,
      overall_situation: overallSituation,
    };

    return { success: true, reportCard };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao compor boletim escolar do aluno." };
  }
}

export async function getClassReportCardsAction(
  classId: string,
  academicYear?: string
): Promise<{
  success: boolean;
  students?: { id: string; name: string; cpf?: string | null; enrollment_number?: string | null }[];
  schoolClass?: SchoolClass;
  settings?: AcademicSettings;
  error?: string;
}> {
  try {
    const { session } = await assertClassAccess(classId);
    const supabase = await createClient();

    // 1. Busca a turma
    const { data: schoolClass, error: cErr } = await (supabase.from("school_classes") as any)
      .select(`
        id,
        tenant_id,
        series_id,
        name,
        academic_year,
        shift,
        capacity,
        is_active,
        series:series_id (id, name, course:course_id (id, name))
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", classId)
      .single();

    if (cErr || !schoolClass) {
      return { success: false, error: "Turma não encontrada." };
    }

    // 1.1 Resolução do Ano Letivo oficial
    let resolvedSchoolYearId: string | null = (schoolClass as any).school_year_id || null;
    let resolvedSchoolYear: any = null;

    if (resolvedSchoolYearId) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();
      resolvedSchoolYear = syData;
    } else if (schoolClass.academic_year) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("year", schoolClass.academic_year)
        .maybeSingle();
      if (syData) {
        resolvedSchoolYear = syData;
        resolvedSchoolYearId = syData.id;
      }
    }

    // 2. Busca os alunos matriculados
    const { data: enrollmentsData, error: eErr } = await (supabase.from("enrollments") as any)
      .select(`
        id,
        enrollment_code,
        student_id,
        students:student_id (id, full_name, cpf)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("class_id", classId)
      .eq("status", "matriculado");

    if (eErr) {
      return { success: false, error: `Falha ao buscar alunos da turma: ${eErr.message}` };
    }

    const students = (enrollmentsData || []).map((e: any) => ({
      id: e.student_id,
      name: e.students?.full_name || "Aluno sem nome",
      cpf: e.students?.cpf || null,
      enrollment_number: e.enrollment_code || e.enrollment_number || null,
    }));

    students.sort((a: any, b: any) => a.name.localeCompare(b.name));

    const settingsRes = await getAcademicSettingsAction();

    return {
      success: true,
      students,
      schoolClass,
      settings: settingsRes.settings,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar boletins da turma." };
  }
}

// ==============================================================================
// 12. ETAPA 3: HISTÓRICO ESCOLAR E SNAPSHOTS IMUTÁVEIS
// ==============================================================================

/**
 * Busca rápida de alunos para consulta do histórico escolar
 */
export async function searchStudentsForHistoryAction(searchTerm?: string): Promise<{
  success: boolean;
  students?: {
    id: string;
    full_name: string;
    cpf?: string | null;
    birth_date?: string | null;
    enrollment_number?: string | null;
    current_class_name?: string | null;
    current_year?: string | null;
  }[];
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // Se o usuário for professor, restringe a busca estritamente aos alunos de turmas onde o professor possui alocação ativa
    let teacherStudentIds: string[] | null = null;
    if (session.role === "professor") {
      let allocatedClassIds: string[] = [];
      try {
        const { data: allocs, error: allocErr } = await (supabase.from("teacher_class_allocations") as any)
          .select("class_id")
          .eq("tenant_id", session.tenant.id)
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        if (!allocErr && allocs) {
          allocatedClassIds = allocs.map((a: any) => a.class_id).filter(Boolean);
        }
      } catch {
        // Fallback
      }

      if (allocatedClassIds.length === 0) {
        // Fallback JSONB
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();
        const allocList: TeacherClassAllocation[] = curTenant?.settings?.teacher_class_allocations_store || [];
        allocatedClassIds = allocList
          .filter((a) => a.user_id === session.user.id && a.is_active)
          .map((a) => a.class_id);
      }

      if (allocatedClassIds.length === 0) {
        return { success: true, students: [] };
      }

      // Busca os student_id vinculados a essas turmas
      const { data: enrs } = await (supabase.from("enrollments") as any)
        .select("student_id")
        .eq("tenant_id", session.tenant.id)
        .in("class_id", allocatedClassIds);

      const studentIds = (enrs || []).map((e: any) => e.student_id).filter(Boolean);
      if (studentIds.length === 0) {
        return { success: true, students: [] };
      }
      teacherStudentIds = Array.from(new Set(studentIds));
    }

    let query = (supabase.from("students") as any)
      .select(`
        id,
        first_name,
        last_name,
        full_name,
        cpf,
        birth_date,
        is_active,
        enrollments (
          id,
          enrollment_code,
          academic_year,
          status,
          school_classes (name)
        )
      `)
      .eq("tenant_id", session.tenant.id)
      .order("first_name", { ascending: true })
      .limit(50);

    if (teacherStudentIds) {
      query = query.in("id", teacherStudentIds);
    }

    if (searchTerm && searchTerm.trim().length > 0) {
      const term = `%${searchTerm.trim()}%`;
      query = query.or(`full_name.ilike.${term},cpf.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: `Falha ao buscar alunos: ${error.message}` };
    }

    const students = (data || []).map((st: any) => {
      // Encontra a matrícula ativa mais recente
      const activeEnr = (st.enrollments || []).find((e: any) => e.status === "matriculado") || (st.enrollments || [])[0];

      return {
        id: st.id,
        full_name: st.full_name || `${st.first_name} ${st.last_name}`.trim(),
        cpf: st.cpf || null,
        birth_date: st.birth_date || null,
        enrollment_number: activeEnr?.enrollment_code || activeEnr?.enrollment_number || null,
        current_class_name: activeEnr?.school_classes?.name || null,
        current_year: activeEnr?.academic_year || null,
      };
    });

    return { success: true, students };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar alunos." };
  }
}

/**
 * Consulta o documento completo de Histórico Escolar do aluno (consolidado + ano em curso)
 */
export async function getStudentAcademicHistoryDocumentAction(studentId: string): Promise<{
  success: boolean;
  document?: CompleteStudentHistoryDocument;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess();
    const supabase = await createClient();

    // Validação de escopo para perfil de professor
    if (session.role === "professor") {
      let allocatedClassIds: string[] = [];
      try {
        const { data: allocs } = await (supabase.from("teacher_class_allocations") as any)
          .select("class_id")
          .eq("tenant_id", session.tenant.id)
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        if (allocs) {
          allocatedClassIds = allocs.map((a: any) => a.class_id).filter(Boolean);
        }
      } catch {
        // Fallback
      }

      if (allocatedClassIds.length === 0) {
        const { data: curTenant } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();
        const allocList: TeacherClassAllocation[] = curTenant?.settings?.teacher_class_allocations_store || [];
        allocatedClassIds = allocList
          .filter((a) => a.user_id === session.user.id && a.is_active)
          .map((a) => a.class_id);
      }

      // Verifica se o aluno possui matrícula em alguma turma do professor
      let hasAccess = false;
      if (allocatedClassIds.length > 0) {
        const { data: enrCheck } = await (supabase.from("enrollments") as any)
          .select("id")
          .eq("tenant_id", session.tenant.id)
          .eq("student_id", studentId)
          .in("class_id", allocatedClassIds)
          .limit(1);

        if (enrCheck && enrCheck.length > 0) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return {
          success: false,
          error: "Acesso negado: Professores só podem visualizar o histórico de alunos de turmas às quais estão alocados.",
        };
      }
    }

    // 1. Busca perfil do aluno e dados civis
    const { data: student, error: stErr } = await (supabase.from("students") as any)
      .select(`
        id,
        tenant_id,
        first_name,
        last_name,
        full_name,
        cpf,
        rg,
        rg_issuer,
        birth_date,
        gender,
        photo_url,
        email,
        phone,
        city,
        state
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", studentId)
      .single();

    if (stErr || !student) {
      return { success: false, error: "Aluno não encontrado." };
    }

    // 2. Busca responsáveis (filiação)
    const { data: guardiansData } = await (supabase.from("guardians") as any)
      .select("name, kinship, cpf, phone")
      .eq("tenant_id", session.tenant.id)
      .eq("student_id", studentId);

    const guardians = (guardiansData || []).map((g: any) => ({
      name: g.name,
      kinship: g.kinship,
      cpf: g.cpf || null,
      phone: g.phone || null,
    }));

    const studentBio: StudentBioProfile = {
      id: student.id,
      tenant_id: student.tenant_id,
      first_name: student.first_name,
      last_name: student.last_name,
      full_name: student.full_name || `${student.first_name} ${student.last_name}`.trim(),
      cpf: student.cpf,
      rg: student.rg,
      rg_issuer: student.rg_issuer,
      birth_date: student.birth_date,
      gender: student.gender,
      photo_url: student.photo_url,
      email: student.email,
      phone: student.phone,
      city: student.city,
      state: student.state,
      guardians,
    };

    // 3. Dados da Instituição (Tenant)
    const { data: tenantData } = await (supabase.from("tenants") as any)
      .select("name, settings")
      .eq("id", session.tenant.id)
      .single();

    const instSettings = tenantData?.settings?.general_info || {};

    const institution = {
      name: tenantData?.name || "Instituição de Ensino",
      cnpj: instSettings.cnpj || null,
      city: instSettings.city || student.city || null,
      state: instSettings.state || student.state || null,
      phone: instSettings.phone || null,
      email: instSettings.email || null,
    };

    // 4. Registros Históricos Consolidados (Passados / Snapshots)
    const { data: historyRecords, error: hErr } = await (supabase.from("student_academic_history_records") as any)
      .select(`
        *,
        consolidator:consolidated_by (full_name)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("student_id", studentId)
      .order("academic_year", { ascending: true });

    // Busca anos letivos do tenant para enriquecer school_year de forma retrocompatível
    const { data: tenantSchoolYears } = await (supabase.from("school_years") as any)
      .select("id, year, title, status, start_date, end_date")
      .eq("tenant_id", session.tenant.id);

    const schoolYearMap = new Map<string, any>();
    const schoolYearByYearMap = new Map<string, any>();
    (tenantSchoolYears || []).forEach((sy: any) => {
      schoolYearMap.set(sy.id, sy);
      schoolYearByYearMap.set(sy.year, sy);
    });

    const consolidatedRecords: StudentAcademicHistoryRecord[] = (historyRecords || []).map((hr: any) => {
      const sy = hr.school_year_id
        ? schoolYearMap.get(hr.school_year_id)
        : schoolYearByYearMap.get(hr.academic_year);

      return {
        id: hr.id,
        tenant_id: hr.tenant_id,
        student_id: hr.student_id,
        enrollment_id: hr.enrollment_id,
        school_year_id: hr.school_year_id || sy?.id || null,
        academic_year: hr.academic_year,
        grade_level: hr.grade_level,
        course_name: hr.course_name,
        school_name: hr.school_name,
        school_city: hr.school_city,
        school_state: hr.school_state,
        origin_type: hr.origin_type,
        shift: hr.shift,
        total_days: hr.total_days,
        total_workload_hours: hr.total_workload_hours ? Number(hr.total_workload_hours) : null,
        student_attendance_hours: hr.student_attendance_hours ? Number(hr.student_attendance_hours) : null,
        attendance_percentage: hr.attendance_percentage ? Number(hr.attendance_percentage) : null,
        final_result: hr.final_result,
        is_locked: hr.is_locked,
        consolidated_at: hr.consolidated_at,
        consolidated_by: hr.consolidated_by,
        observations: hr.observations,
        curriculum_snapshot: Array.isArray(hr.curriculum_snapshot) ? hr.curriculum_snapshot : [],
        created_at: hr.created_at,
        updated_at: hr.updated_at,
        consolidator_name: hr.consolidator?.full_name,
        school_year: sy || null,
      };
    });

    // 5. Ano Letivo Corrente (Em Curso)
    // Se o aluno possui matrícula ativa no tenant, projeta o ano em andamento
    let currentYearRecord: CompleteStudentHistoryDocument["current_year_record"] = null;

    const { data: activeEnrollment } = await (supabase.from("enrollments") as any)
      .select(`
        id,
        enrollment_code,
        academic_year,
        course_name,
        grade_level,
        shift,
        status,
        class_id,
        school_classes:class_id (id, name, series:series_id (name, course:course_id (name)))
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "matriculado")
      .maybeSingle();

    if (activeEnrollment && activeEnrollment.class_id) {
      // Verifica se esse ano letivo já foi consolidado formalmente
      const alreadyConsolidated = consolidatedRecords.some(
        (c) => c.academic_year === activeEnrollment.academic_year && c.grade_level === activeEnrollment.grade_level
      );

      if (!alreadyConsolidated) {
        const reportRes = await getStudentReportCardAction(activeEnrollment.class_id, studentId);
        if (reportRes.success && reportRes.reportCard) {
          const rc = reportRes.reportCard;

          const subjects: HistoryCurriculumSubject[] = rc.subjects.map((subj) => ({
            subject_name: subj.subject_name,
            workload_hours: subj.total_lessons > 0 ? subj.total_lessons : null,
            final_score: subj.annual_average,
            recovery_score: null,
            absences: subj.absences,
            attendance_pct: subj.attendance_percentage,
            situation: subj.situation as HistoryFinalResult,
          }));

          currentYearRecord = {
            enrollment_id: activeEnrollment.id,
            academic_year: activeEnrollment.academic_year,
            grade_level: activeEnrollment.grade_level || activeEnrollment.school_classes?.series?.name || "Série Regular",
            course_name: activeEnrollment.course_name || activeEnrollment.school_classes?.series?.course?.name || "Educação Básica",
            school_class_name: activeEnrollment.school_classes?.name || "Turma Regular",
            shift: activeEnrollment.shift || "matutino",
            enrollment_number: activeEnrollment.enrollment_code || activeEnrollment.enrollment_number || null,
            enrollment_status: activeEnrollment.status,
            overall_average: rc.overall_average,
            overall_attendance_percentage: rc.overall_attendance_percentage,
            overall_situation: rc.overall_situation,
            subjects,
            is_in_progress: true,
          };
        }
      }
    }

    // 6. Trilha de Retificações do Histórico
    const { data: rectsData } = await (supabase.from("student_academic_history_rectifications") as any)
      .select(`
        *,
        rectifier:rectified_by (full_name)
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("student_id", studentId)
      .order("rectified_at", { ascending: false });

    const rectifications: HistoryRectification[] = (rectsData || []).map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      history_record_id: r.history_record_id,
      student_id: r.student_id,
      rectified_by: r.rectified_by,
      rectified_at: r.rectified_at,
      reason: r.reason,
      previous_snapshot: r.previous_snapshot,
      new_snapshot: r.new_snapshot,
      rectifier_name: r.rectifier?.full_name,
    }));

    return {
      success: true,
      document: {
        student: studentBio,
        institution,
        consolidated_records: consolidatedRecords,
        current_year_record: currentYearRecord,
        rectifications,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao emitir histórico escolar do aluno." };
  }
}

/**
 * Consolida o ano letivo corrente gerando um snapshot imutável no histórico escolar
 */
export async function consolidateCurrentYearHistoryAction(
  payload: ConsolidateCurrentYearHistoryInput
): Promise<{
  success: boolean;
  historyRecord?: StudentAcademicHistoryRecord;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    if (!payload.enrollment_id || payload.enrollment_id.trim().length === 0) {
      return { success: false, error: "Identificador de matrícula não fornecido para consolidação." };
    }
    if (!payload.student_id || payload.student_id.trim().length === 0) {
      return { success: false, error: "Identificador de aluno não fornecido para consolidação." };
    }

    // 1. Busca e valida rigorosamente a matrícula
    const { data: enrollment, error: eErr } = await (supabase.from("enrollments") as any)
      .select(`
        id,
        tenant_id,
        student_id,
        academic_year,
        course_name,
        grade_level,
        shift,
        status,
        class_id,
        school_classes:class_id (id, name, academic_year, series:series_id (name, course:course_id (name)))
      `)
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.enrollment_id)
      .single();

    if (eErr || !enrollment) {
      return { success: false, error: "Matrícula não encontrada ou não pertence a esta instituição." };
    }

    if (enrollment.student_id !== payload.student_id) {
      return {
        success: false,
        error: "Inconsistência de segurança: A matrícula informada não pertence ao aluno selecionado.",
      };
    }

    if (enrollment.status !== "ativa" && enrollment.status !== "matriculado") {
      return {
        success: false,
        error: `A matrícula encontra-se com status '${enrollment.status}' e não pode ser consolidada no histórico oficial.`,
      };
    }

    if (!enrollment.class_id) {
      return {
        success: false,
        error: "A matrícula selecionada não possui turma vinculada para apuração do rendimento escolar.",
      };
    }

    const gradeLevel =
      enrollment.grade_level || enrollment.school_classes?.series?.name || "Série Regular";
    const academicYear = enrollment.academic_year;

    // 2. Resolução do Ano Letivo oficial e Validação de Encerramento/Bloqueio no Calendário
    let resolvedSchoolYearId: string | null =
      payload.school_year_id || enrollment.school_classes?.school_year_id || null;
    let resolvedSchoolYear: any = null;

    if (resolvedSchoolYearId) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();
      resolvedSchoolYear = syData;
    } else if (academicYear) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("year", academicYear)
        .maybeSingle();
      if (syData) {
        resolvedSchoolYear = syData;
        resolvedSchoolYearId = syData.id;
      }
    }

    // Regra do Calendário: Não permitir consolidação oficial antes do encerramento/bloqueio do Ano Letivo
    if (resolvedSchoolYear) {
      if (resolvedSchoolYear.status === "planejamento") {
        return {
          success: false,
          error: `Não é possível consolidar histórico de um Ano Letivo em planejamento (${resolvedSchoolYear.title || resolvedSchoolYear.year}).`,
        };
      }

      if (resolvedSchoolYear.status === "ativo") {
        // Verifica se todos os períodos acadêmicos cadastrados estão fechados ou bloqueados
        const { data: terms } = await (supabase.from("academic_terms") as any)
          .select("id, name, status")
          .eq("tenant_id", session.tenant.id)
          .eq("school_year_id", resolvedSchoolYear.id);

        if (terms && terms.length > 0) {
          const hasOpenTerms = terms.some((t: any) => t.status === "aberto" || t.status === "planejado");
          if (hasOpenTerms) {
            return {
              success: false,
              error: `Não é possível consolidar o Histórico Escolar enquanto o Ano Letivo estiver em andamento. O Ano Letivo oficial deve estar encerrado ou todos os períodos acadêmicos devem estar fechados/bloqueados no Calendário.`,
            };
          }
        }
      }
    }

    // 3. Trava de Imutabilidade: Verifica se o histórico deste ano/série já foi consolidado
    const { data: existingRecord } = await (supabase.from("student_academic_history_records") as any)
      .select("id, is_locked, academic_year, grade_level")
      .eq("tenant_id", session.tenant.id)
      .eq("student_id", payload.student_id)
      .eq("academic_year", academicYear)
      .eq("grade_level", gradeLevel)
      .maybeSingle();

    if (existingRecord) {
      return {
        success: false,
        error: `O ano letivo ${academicYear} (${gradeLevel}) já está consolidado e bloqueado no Histórico Escolar. Para realizar alterações oficiais em registros consolidados, utilize o procedimento formal de Retificação.`,
      };
    }

    // 4. Calcula as notas e frequência oficiais do boletim
    const reportRes = await getStudentReportCardAction(enrollment.class_id, payload.student_id);
    if (!reportRes.success || !reportRes.reportCard) {
      return { success: false, error: "Não foi possível apurar o boletim do aluno para consolidação." };
    }

    const rc = reportRes.reportCard;

    const curriculumSnapshot: HistoryCurriculumSubject[] = rc.subjects.map((s) => ({
      subject_name: s.subject_name,
      workload_hours: s.total_lessons,
      final_score: s.annual_average,
      recovery_score: null,
      absences: s.absences,
      attendance_pct: s.attendance_percentage,
      situation: s.situation as HistoryFinalResult,
    }));

    // 5. Dados da Instituição
    const { data: tenant } = await (supabase.from("tenants") as any)
      .select("name, settings")
      .eq("id", session.tenant.id)
      .single();

    const instSettings = tenant?.settings?.general_info || {};

    const rowToInsert: any = {
      tenant_id: session.tenant.id,
      student_id: payload.student_id,
      enrollment_id: payload.enrollment_id,
      academic_year: academicYear,
      grade_level: gradeLevel,
      course_name:
        enrollment.course_name ||
        enrollment.school_classes?.series?.course?.name ||
        "Educação Básica",
      school_name: tenant?.name || "Escola Educar360",
      school_city: instSettings.city || "Sede",
      school_state: instSettings.state || "SP",
      origin_type: "interna",
      shift: enrollment.shift || "matutino",
      total_days: payload.total_days || 200,
      total_workload_hours: payload.total_workload_hours || 800.0,
      attendance_percentage: rc.overall_attendance_percentage,
      final_result: payload.final_result,
      is_locked: true,
      consolidated_at: new Date().toISOString(),
      consolidated_by: session.user.id,
      observations: payload.observations?.trim() || null,
      curriculum_snapshot: curriculumSnapshot,
    };

    if (resolvedSchoolYearId) {
      rowToInsert.school_year_id = resolvedSchoolYearId;
    }

    // 6. Inserção Atômica sem upsert (impede sobrescrita concorrente ou acidental) com fallback resiliente
    let inserted: any = null;
    const { data: insData, error: insertErr } = await (
      supabase.from("student_academic_history_records") as any
    )
      .insert([rowToInsert])
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === "23505" || insertErr.message?.includes("uq_student_history_year")) {
        return {
          success: false,
          error: `Conflito de consolidação: O ano letivo ${academicYear} (${gradeLevel}) já foi consolidado por outro processo concorrente.`,
        };
      }
      if (insertErr.message?.includes("school_year_id")) {
        delete rowToInsert.school_year_id;
        const { data: retryIns, error: retryErr } = await (
          supabase.from("student_academic_history_records") as any
        )
          .insert([rowToInsert])
          .select()
          .single();
        if (retryErr) {
          return { success: false, error: `Falha ao gravar histórico consolidado: ${retryErr.message}` };
        }
        inserted = retryIns;
      } else {
        return { success: false, error: `Falha ao gravar histórico consolidado: ${insertErr.message}` };
      }
    } else {
      inserted = insData;
    }

    // 7. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "CREATE",
        resource: "student_academic_history_records",
        resource_id: inserted.id,
        metadata: {
          student_id: payload.student_id,
          school_year_id: resolvedSchoolYearId,
          academic_year: academicYear,
          grade_level: gradeLevel,
          final_result: payload.final_result,
          consolidated_at: new Date().toISOString(),
        },
      },
    ]);

    revalidatePath("/app/academico/historico");

    return {
      success: true,
      historyRecord: {
        ...inserted,
        school_year_id: resolvedSchoolYearId,
        school_year: resolvedSchoolYear,
        curriculum_snapshot: curriculumSnapshot,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consolidar ano letivo no histórico." };
  }
}

/**
 * Cadastra registro de histórico escolar de anos anteriores cursados em outras instituições (Histórico Externo)
 */
export async function saveExternalHistoryRecordAction(payload: SaveExternalHistoryInput): Promise<{
  success: boolean;
  historyRecord?: StudentAcademicHistoryRecord;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    // Validações
    if (!payload.student_id) return { success: false, error: "Aluno é obrigatório." };
    if (!payload.academic_year) return { success: false, error: "Ano letivo é obrigatório." };
    if (!payload.grade_level) return { success: false, error: "Série/Ano é obrigatório." };
    if (!payload.course_name) return { success: false, error: "Curso/Etapa é obrigatório." };
    if (!payload.school_name) return { success: false, error: "Nome da instituição escolar é obrigatório." };
    if (!payload.curriculum || payload.curriculum.length === 0) {
      return { success: false, error: "Informe ao menos um componente curricular/disciplina." };
    }

    // Resolução de school_year_id
    let resolvedSchoolYearId: string | null = payload.school_year_id || null;
    let resolvedSchoolYear: any = null;

    if (resolvedSchoolYearId) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();
      if (!sy) {
        return { success: false, error: "O Ano Letivo oficial selecionado não foi encontrado nesta instituição." };
      }
      resolvedSchoolYear = sy;
    } else if (payload.academic_year) {
      const { data: sy } = await (supabase.from("school_years") as any)
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("year", payload.academic_year.trim())
        .maybeSingle();
      if (sy) {
        resolvedSchoolYear = sy;
        resolvedSchoolYearId = sy.id;
      }
    }

    const row = {
      tenant_id: session.tenant.id,
      student_id: payload.student_id,
      school_year_id: resolvedSchoolYearId || null,
      academic_year: payload.academic_year.trim(),
      grade_level: payload.grade_level.trim(),
      course_name: payload.course_name.trim(),
      school_name: payload.school_name.trim(),
      school_city: payload.school_city?.trim() || null,
      school_state: payload.school_state?.trim() || null,
      origin_type: payload.origin_type || "externa_transferencia",
      shift: payload.shift || "matutino",
      total_days: payload.total_days || 200,
      total_workload_hours: payload.total_workload_hours || 800.0,
      attendance_percentage: payload.attendance_percentage || 100.0,
      final_result: payload.final_result,
      is_locked: true,
      consolidated_at: new Date().toISOString(),
      consolidated_by: session.user.id,
      observations: payload.observations?.trim() || null,
      curriculum_snapshot: payload.curriculum,
    };

    const { data: inserted, error: insertErr } = await (supabase.from("student_academic_history_records") as any)
      .upsert(row, { onConflict: "tenant_id,student_id,academic_year,grade_level" })
      .select()
      .single();

    if (insertErr) {
      return { success: false, error: `Falha ao cadastrar histórico externo: ${insertErr.message}` };
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "CREATE",
        resource: "student_academic_history_records_external",
        resource_id: inserted.id,
        metadata: { payload, created_at: new Date().toISOString() },
      },
    ]);

    revalidatePath("/app/academico/historico");

    return {
      success: true,
      historyRecord: {
        ...inserted,
        school_year_id: resolvedSchoolYearId,
        school_year: resolvedSchoolYear,
        curriculum_snapshot: payload.curriculum,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar histórico escolar externo." };
  }
}

/**
 * Retifica um registro histórico consolidado mediante justificativa legal formal
 * Executa operação transacional atômica via Stored Procedure PostgreSQL (RPC)
 */
export async function rectifyHistoryRecordAction(payload: RectifyHistoryInput): Promise<{
  success: boolean;
  historyRecord?: StudentAcademicHistoryRecord;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "secretaria"]);
    const supabase = await createClient();

    if (!payload.reason || payload.reason.trim().length < 10) {
      return {
        success: false,
        error: "A justificativa legal da retificação é obrigatória (mínimo de 10 caracteres).",
      };
    }

    // 1. Tenta executar via RPC atômica transacional no PostgreSQL com verificação segura
    const rpcPayload: any = {
      p_tenant_id: session.tenant.id,
      p_history_record_id: payload.history_record_id,
      p_reason: payload.reason.trim(),
      p_final_result: payload.updated_record.final_result || null,
      p_observations: payload.updated_record.observations?.trim() || null,
      p_school_name: payload.updated_record.school_name?.trim() || null,
      p_school_city: payload.updated_record.school_city?.trim() || null,
      p_school_state: payload.updated_record.school_state?.trim() || null,
      p_total_days: payload.updated_record.total_days ?? null,
      p_total_workload_hours: payload.updated_record.total_workload_hours ?? null,
      p_attendance_percentage: payload.updated_record.attendance_percentage ?? null,
      p_curriculum: payload.updated_record.curriculum ?? null,
      p_user_id: session.user.id,
      p_user_name: session.profile.full_name || session.user.email,
      p_user_email: session.user.email,
      p_user_role: session.role,
    };
    if (payload.updated_record.school_year_id) {
      rpcPayload.p_school_year_id = payload.updated_record.school_year_id;
    }

    try {
      let { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
        "rectify_student_history_record",
        rpcPayload
      );

      if (rpcError && rpcError.message?.includes("p_school_year_id")) {
        delete rpcPayload.p_school_year_id;
        const retryRpc = await (supabase.rpc as any)(
          "rectify_student_history_record",
          rpcPayload
        );
        rpcResult = retryRpc.data;
        rpcError = retryRpc.error;
      }

      if (!rpcError && rpcResult) {
        revalidatePath("/app/academico/historico");
        return {
          success: true,
          historyRecord: {
            ...rpcResult,
            curriculum_snapshot: rpcResult.curriculum_snapshot || [],
          },
        };
      }
    } catch {
      // Fallback
    }

    // 2. Fallback: Busca o registro atual e atualiza mantendo integridade
    const { data: existing, error: findErr } = await (supabase.from("student_academic_history_records") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.history_record_id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Registro de histórico não encontrado." };
    }

    const previousSnapshot = { ...existing };

    // Prepara atualização
    const updatedRow: any = {
      school_name: payload.updated_record.school_name?.trim() || existing.school_name,
      school_city: payload.updated_record.school_city?.trim() ?? existing.school_city,
      school_state: payload.updated_record.school_state?.trim() ?? existing.school_state,
      total_days: payload.updated_record.total_days ?? existing.total_days,
      total_workload_hours: payload.updated_record.total_workload_hours ?? existing.total_workload_hours,
      attendance_percentage: payload.updated_record.attendance_percentage ?? existing.attendance_percentage,
      final_result: payload.updated_record.final_result || existing.final_result,
      observations: payload.updated_record.observations?.trim() ?? existing.observations,
      curriculum_snapshot: payload.updated_record.curriculum || existing.curriculum_snapshot,
      updated_at: new Date().toISOString(),
    };

    if (payload.updated_record.school_year_id !== undefined) {
      updatedRow.school_year_id = payload.updated_record.school_year_id;
    }

    const { data: updated, error: updateErr } = await (supabase.from("student_academic_history_records") as any)
      .update(updatedRow)
      .eq("tenant_id", session.tenant.id)
      .eq("id", payload.history_record_id)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: `Falha ao retificar registro: ${updateErr.message}` };
    }

    // Grava na trilha formal de retificações
    await (supabase.from("student_academic_history_rectifications") as any).insert([
      {
        tenant_id: session.tenant.id,
        history_record_id: payload.history_record_id,
        student_id: existing.student_id,
        rectified_by: session.user.id,
        rectified_at: new Date().toISOString(),
        reason: payload.reason.trim(),
        previous_snapshot: previousSnapshot,
        new_snapshot: updated,
      },
    ]);

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "UPDATE",
        resource: "student_academic_history_rectifications",
        resource_id: payload.history_record_id,
        metadata: {
          reason: payload.reason,
          rectified_at: new Date().toISOString(),
        },
      },
    ]);

    revalidatePath("/app/academico/historico");

    return {
      success: true,
      historyRecord: {
        ...updated,
        curriculum_snapshot: updated.curriculum_snapshot || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao processar retificação do histórico." };
  }
}

/**
 * Exclui um registro de histórico escolar
 */
export async function deleteHistoryRecordAction(historyRecordId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await assertAcademicAccess(["admin_escola", "secretaria"]);
    const supabase = await createClient();

    const { error } = await (supabase.from("student_academic_history_records") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", historyRecordId);

    if (error) {
      return { success: false, error: `Falha ao excluir histórico: ${error.message}` };
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        user_name: session.profile.full_name || session.user.email,
        user_email: session.user.email,
        user_role: session.role,
        action: "DELETE",
        resource: "student_academic_history_records",
        resource_id: historyRecordId,
        metadata: { deleted_at: new Date().toISOString() },
      },
    ]);

    revalidatePath("/app/academico/historico");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir registro de histórico." };
  }
}



