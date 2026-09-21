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
): Promise<{ success: boolean; error?: string }> {
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
    try {
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

        if (!error) savedOnPhysical = true;
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

        if (!error) savedOnPhysical = true;
      }
    } catch {
      // Ignora e utiliza fallback
    }

    // 2. Fallback JSONB store
    if (!savedOnPhysical) {
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
    return { success: true };
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
): Promise<{ success: boolean; error?: string }> {
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
    try {
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

        if (!error) savedOnPhysical = true;
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

        if (!error) savedOnPhysical = true;
      }
    } catch {
      // Fallback
    }

    // 2. Fallback JSONB store
    if (!savedOnPhysical) {
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
    return { success: true };
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
          )
        `)
        .eq("tenant_id", session.tenant.id)
        .order("name", { ascending: true });

      if (filters?.seriesId && filters.seriesId !== "all") {
        query = query.eq("series_id", filters.seriesId);
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
          name: c.name,
          academic_year: c.academic_year,
          shift: c.shift,
          capacity: c.capacity,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
          series: c.series,
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
): Promise<{ success: boolean; error?: string }> {
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
    if (!input.academic_year?.trim()) {
      return { success: false, error: "O ano letivo da turma é obrigatório." };
    }
    if (!input.capacity || Number(input.capacity) <= 0) {
      return { success: false, error: "A capacidade da turma deve ser um número positivo maior que zero." };
    }

    const isEdit = "id" in input && Boolean(input.id);
    const classId = isEdit ? (input as UpdateSchoolClassInput).id : crypto.randomUUID();
    const capacity = Number(input.capacity);
    const academicYear = input.academic_year.trim();
    const shift = input.shift;
    const isActive = input.is_active !== undefined ? input.is_active : true;

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
    try {
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
          const { error } = await (supabase.from("school_classes") as any)
            .update({
              series_id: input.series_id,
              name,
              academic_year: academicYear,
              shift,
              capacity,
              is_active: isActive,
              updated_at: new Date().toISOString(),
            })
            .eq("id", classId)
            .eq("tenant_id", session.tenant.id);

          if (!error) savedOnPhysical = true;
        }
      } else {
        const { error } = await (supabase.from("school_classes") as any).insert([
          {
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
          },
        ]);

        if (!error) savedOnPhysical = true;
      }
    } catch {
      // Fallback
    }

    // 2. Fallback JSONB store
    if (!savedOnPhysical) {
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
    return { success: true };
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
