"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { UserRole } from "@/types/database";
import { revalidatePath } from "next/cache";
import {
  SchoolYear,
  CreateSchoolYearInput,
  UpdateSchoolYearInput,
  AcademicTerm,
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
  CalendarEventCategory,
  CreateCalendarEventCategoryInput,
  UpdateCalendarEventCategoryInput,
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarEventsFilter,
} from "@/types/calendario";

// ==============================================================================
// 0. GUARDIÃO DE ACESSO & RBAC DO CALENDÁRIO ACADÊMICO
// ==============================================================================

async function assertCalendarAccess(requiredRoles?: UserRole[]) {
  const session = await getTenantSession();
  if (!session) {
    throw new Error("Não autenticado ou sessão expirada.");
  }
  if (!canAccessModule(session.role, "academico")) {
    throw new Error("Acesso negado: Perfil sem permissão para o módulo Acadêmico.");
  }
  if (requiredRoles && !requiredRoles.includes(session.role)) {
    throw new Error(
      `Acesso restrito: Seu perfil (${session.role}) não possui autorização para esta operação de calendário.`
    );
  }
  return session;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function revalidateCalendarPaths() {
  revalidatePath("/app/academico/calendario");
  revalidatePath("/app/academico");
}

// ==============================================================================
// 1. ANOS LETIVOS (SCHOOL YEARS)
// ==============================================================================

export async function getSchoolYearsAction(): Promise<{
  success: boolean;
  schoolYears: SchoolYear[];
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const [yearsRes, termsRes] = await Promise.all([
      (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .order("year", { ascending: false }),
      (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .order("sequence_order", { ascending: true }),
    ]);

    if (yearsRes.error) {
      return { success: false, schoolYears: [], error: yearsRes.error.message };
    }

    const terms = (termsRes.data as AcademicTerm[]) || [];
    const schoolYears = ((yearsRes.data as SchoolYear[]) || []).map((sy) => ({
      ...sy,
      academic_terms: terms.filter((t) => t.school_year_id === sy.id),
    }));

    return { success: true, schoolYears };
  } catch (err: any) {
    return { success: false, schoolYears: [], error: err?.message || "Erro ao listar anos letivos." };
  }
}

export async function getSchoolYearByIdAction(id: string): Promise<{
  success: boolean;
  schoolYear?: SchoolYear;
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const [yearRes, termsRes] = await Promise.all([
      (supabase.from("school_years") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("id", id)
        .maybeSingle(),
      (supabase.from("academic_terms") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", id)
        .order("sequence_order", { ascending: true }),
    ]);

    if (yearRes.error || !yearRes.data) {
      return { success: false, error: yearRes.error?.message || "Ano letivo não encontrado." };
    }

    const schoolYear: SchoolYear = {
      ...yearRes.data,
      academic_terms: (termsRes.data as AcademicTerm[]) || [],
    };

    return { success: true, schoolYear };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar ano letivo." };
  }
}

export async function getCurrentSchoolYearAction(): Promise<{
  success: boolean;
  schoolYear?: SchoolYear;
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const { data: yearData, error: yearErr } = await (supabase.from("school_years") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("is_current", true)
      .maybeSingle();

    if (yearErr) {
      return { success: false, error: yearErr.message };
    }

    if (!yearData) {
      return { success: true, schoolYear: undefined };
    }

    const { data: termsData } = await (supabase.from("academic_terms") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("school_year_id", yearData.id)
      .order("sequence_order", { ascending: true });

    const schoolYear: SchoolYear = {
      ...yearData,
      academic_terms: (termsData as AcademicTerm[]) || [],
    };

    return { success: true, schoolYear };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar ano letivo atual." };
  }
}

export async function createSchoolYearAction(
  input: CreateSchoolYearInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const year = input.year?.trim();
    const title = input.title?.trim() || `Ano Letivo ${year}`;
    const startDate = input.start_date;
    const endDate = input.end_date;
    const totalDays = input.total_school_days ?? 200;
    const status = input.status || "planejamento";
    const isCurrent = Boolean(input.is_current);

    if (!year) return { success: false, error: "O ano letivo (ex: 2026) é obrigatório." };
    if (!startDate || !endDate) return { success: false, error: "As datas de início e término são obrigatórias." };
    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, error: "A data de término deve ser posterior ou igual à data de início." };
    }
    if (totalDays <= 0) return { success: false, error: "O total de dias letivos deve ser maior que zero." };

    // Se marcado como atual, remove flag de outros anos do mesmo tenant antes de inserir
    if (isCurrent) {
      await (supabase.from("school_years") as any)
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .eq("tenant_id", session.tenant.id);
    }

    const { data, error } = await (supabase.from("school_years") as any)
      .insert({
        tenant_id: session.tenant.id,
        year,
        title,
        start_date: startDate,
        end_date: endDate,
        total_school_days: totalDays,
        status,
        is_current: isCurrent,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `O ano letivo ${year} já está cadastrado para esta instituição.` };
      }
      return { success: false, error: `Falha ao cadastrar ano letivo: ${error.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_YEAR_CREATED",
        entity_name: "school_years",
        entity_id: data.id,
        new_values: { year, title, start_date: startDate, end_date: endDate, total_school_days: totalDays, is_current: isCurrent },
      },
    ]);

    revalidateCalendarPaths();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao criar ano letivo." };
  }
}

export async function updateSchoolYearAction(
  input: UpdateSchoolYearInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    if (!input.id) return { success: false, error: "ID do ano letivo é obrigatório." };

    const { data: existing, error: findErr } = await (supabase.from("school_years") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Ano letivo não encontrado." };
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.year !== undefined) updates.year = input.year.trim();
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.start_date !== undefined) updates.start_date = input.start_date;
    if (input.end_date !== undefined) updates.end_date = input.end_date;
    if (input.total_school_days !== undefined) {
      if (input.total_school_days <= 0) return { success: false, error: "Total de dias letivos deve ser positivo." };
      updates.total_school_days = input.total_school_days;
    }
    if (input.status !== undefined) updates.status = input.status;

    const finalStart = updates.start_date || existing.start_date;
    const finalEnd = updates.end_date || existing.end_date;
    if (new Date(finalEnd) < new Date(finalStart)) {
      return { success: false, error: "A data de término deve ser posterior ou igual à data de início." };
    }

    if (input.is_current !== undefined) {
      updates.is_current = input.is_current;
      if (input.is_current) {
        // Desativa is_current nos demais anos antes de ativar neste
        await (supabase.from("school_years") as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq("tenant_id", session.tenant.id)
          .neq("id", input.id);
      }
    }

    const { error: updErr } = await (supabase.from("school_years") as any)
      .update(updates)
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id);

    if (updErr) {
      return { success: false, error: `Falha ao atualizar ano letivo: ${updErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_YEAR_UPDATED",
        entity_name: "school_years",
        entity_id: input.id,
        old_values: existing,
        new_values: updates,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar ano letivo." };
  }
}

export async function setCurrentSchoolYearAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    // 1. Remove is_current de todos os anos do tenant
    await (supabase.from("school_years") as any)
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", session.tenant.id);

    // 2. Define o ano selecionado como único is_current
    const { error } = await (supabase.from("school_years") as any)
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq("tenant_id", session.tenant.id)
      .eq("id", id);

    if (error) {
      return { success: false, error: `Erro ao definir ano letivo corrente: ${error.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_YEAR_SET_CURRENT",
        entity_name: "school_years",
        entity_id: id,
        new_values: { is_current: true },
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao definir ano letivo corrente." };
  }
}

export async function deleteSchoolYearAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const { data: existing, error: findErr } = await (supabase.from("school_years") as any)
      .select("id, year, is_current")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Ano letivo não encontrado." };
    }

    if (existing.is_current) {
      return { success: false, error: "Não é permitido excluir o ano letivo definido como corrente." };
    }

    // Proteção contra cascade destrutivo: checa dependências antes da exclusão
    const { count: termCount } = await (supabase.from("academic_terms") as any)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", session.tenant.id)
      .eq("school_year_id", id);

    if ((termCount || 0) > 0) {
      return {
        success: false,
        error: `Não é possível excluir o ano letivo ${existing.year} pois existem ${termCount} período(s) acadêmico(s) vinculados.`,
      };
    }

    const { count: eventCount } = await (supabase.from("calendar_events") as any)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", session.tenant.id)
      .eq("school_year_id", id);

    if ((eventCount || 0) > 0) {
      return {
        success: false,
        error: `Não é possível excluir o ano letivo ${existing.year} pois existem ${eventCount} evento(s) de calendário vinculados.`,
      };
    }

    const { error: delErr } = await (supabase.from("school_years") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", id);

    if (delErr) {
      return { success: false, error: `Falha ao excluir ano letivo: ${delErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_YEAR_DELETED",
        entity_name: "school_years",
        entity_id: id,
        old_values: existing,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir ano letivo." };
  }
}

// ==============================================================================
// 2. ETAPAS / PERÍODOS ACADÊMICOS (ACADEMIC TERMS)
// ==============================================================================

export async function getAcademicTermsAction(
  schoolYearId?: string
): Promise<{
  success: boolean;
  academicTerms: AcademicTerm[];
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    let query = (supabase.from("academic_terms") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .order("sequence_order", { ascending: true });

    if (schoolYearId) {
      query = query.eq("school_year_id", schoolYearId);
    }

    const [termsRes, yearsRes] = await Promise.all([
      query,
      (supabase.from("school_years") as any)
        .select("id, year, title")
        .eq("tenant_id", session.tenant.id),
    ]);

    if (termsRes.error) {
      return { success: false, academicTerms: [], error: termsRes.error.message };
    }

    const yearMap = new Map<string, SchoolYear>((yearsRes.data || []).map((y: any) => [y.id, y as SchoolYear]));
    const academicTerms: AcademicTerm[] = ((termsRes.data as AcademicTerm[]) || []).map((t) => ({
      ...t,
      school_year: yearMap.get(t.school_year_id),
    }));

    return { success: true, academicTerms };
  } catch (err: any) {
    return { success: false, academicTerms: [], error: err?.message || "Erro ao listar períodos acadêmicos." };
  }
}

export async function getAcademicTermByIdAction(
  id: string
): Promise<{
  success: boolean;
  academicTerm?: AcademicTerm;
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const { data: termData, error: termErr } = await (supabase.from("academic_terms") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .maybeSingle();

    if (termErr || !termData) {
      return { success: false, error: termErr?.message || "Período acadêmico não encontrado." };
    }

    let school_year: SchoolYear | undefined = undefined;
    if (termData.school_year_id) {
      const { data: syData } = await (supabase.from("school_years") as any)
        .select("id, year, title")
        .eq("tenant_id", session.tenant.id)
        .eq("id", termData.school_year_id)
        .maybeSingle();
      if (syData) school_year = syData as SchoolYear;
    }

    return { success: true, academicTerm: { ...termData, school_year } as AcademicTerm };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar período acadêmico." };
  }
}

export async function createAcademicTermAction(
  input: CreateAcademicTermInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const name = input.name?.trim();
    const code = input.code?.trim().toUpperCase();
    const startDate = input.start_date;
    const endDate = input.end_date;
    const termType = input.term_type || "bimestre";
    const sequenceOrder = input.sequence_order ?? 1;
    const status = input.status || "aberto";

    if (!input.school_year_id) return { success: false, error: "O ano letivo vinculado é obrigatório." };
    if (!name) return { success: false, error: "O nome do período (ex: 1º Bimestre) é obrigatório." };
    if (!code) return { success: false, error: "O código do período (ex: 1B) é obrigatório." };
    if (!startDate || !endDate) return { success: false, error: "As datas de início e término são obrigatórias." };
    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, error: "A data de término deve ser posterior ou igual à data de início." };
    }

    // Valida se o ano letivo existe no mesmo tenant e se o período está dentro do ano letivo
    const { data: schoolYear, error: syErr } = await (supabase.from("school_years") as any)
      .select("id, start_date, end_date")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.school_year_id)
      .single();

    if (syErr || !schoolYear) {
      return { success: false, error: "Ano letivo informado não encontrado para esta instituição." };
    }

    if (new Date(startDate) < new Date(schoolYear.start_date) || new Date(endDate) > new Date(schoolYear.end_date)) {
      return {
        success: false,
        error: `As datas do período devem estar compreendidas dentro do ano letivo (${schoolYear.start_date} a ${schoolYear.end_date}).`,
      };
    }

    // Validação de sobreposição de datas com outros períodos do mesmo ano letivo
    const { data: existingTerms } = await (supabase.from("academic_terms") as any)
      .select("id, name, start_date, end_date")
      .eq("tenant_id", session.tenant.id)
      .eq("school_year_id", input.school_year_id);

    if (existingTerms && existingTerms.length > 0) {
      const newStart = new Date(startDate + "T00:00:00").getTime();
      const newEnd = new Date(endDate + "T23:59:59").getTime();

      for (const t of existingTerms) {
        const tStart = new Date(t.start_date + "T00:00:00").getTime();
        const tEnd = new Date(t.end_date + "T23:59:59").getTime();

        if (newStart <= tEnd && newEnd >= tStart) {
          return {
            success: false,
            error: `As datas informadas (${startDate} a ${endDate}) sobrepõem as datas do período '${t.name}' (${t.start_date} a ${t.end_date}).`,
          };
        }
      }
    }

    const { data, error } = await (supabase.from("academic_terms") as any)
      .insert({
        tenant_id: session.tenant.id,
        school_year_id: input.school_year_id,
        term_type: termType,
        name,
        code,
        sequence_order: sequenceOrder,
        start_date: startDate,
        end_date: endDate,
        status,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Já existe um período com o código '${code}' para este ano letivo.` };
      }
      return { success: false, error: `Falha ao criar período acadêmico: ${error.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ACADEMIC_TERM_CREATED",
        entity_name: "academic_terms",
        entity_id: data.id,
        new_values: { school_year_id: input.school_year_id, name, code, start_date: startDate, end_date: endDate },
      },
    ]);

    revalidateCalendarPaths();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao criar período acadêmico." };
  }
}

export async function updateAcademicTermAction(
  input: UpdateAcademicTermInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    if (!input.id) return { success: false, error: "ID do período é obrigatório." };

    const { data: existing, error: findErr } = await (supabase.from("academic_terms") as any)
      .select("*, school_year:school_years(start_date, end_date)")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Período acadêmico não encontrado." };
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.code !== undefined) updates.code = input.code.trim().toUpperCase();
    if (input.term_type !== undefined) updates.term_type = input.term_type;
    if (input.sequence_order !== undefined) updates.sequence_order = input.sequence_order;
    if (input.status !== undefined) updates.status = input.status;
    if (input.start_date !== undefined) updates.start_date = input.start_date;
    if (input.end_date !== undefined) updates.end_date = input.end_date;

    const finalStart = updates.start_date || existing.start_date;
    const finalEnd = updates.end_date || existing.end_date;
    if (new Date(finalEnd) < new Date(finalStart)) {
      return { success: false, error: "A data de término deve ser posterior ou igual à data de início." };
    }

    if (existing.school_year) {
      if (
        new Date(finalStart) < new Date(existing.school_year.start_date) ||
        new Date(finalEnd) > new Date(existing.school_year.end_date)
      ) {
        return {
          success: false,
          error: `As datas do período devem estar compreendidas dentro do ano letivo (${existing.school_year.start_date} a ${existing.school_year.end_date}).`,
        };
      }
    }

    // Validação de sobreposição de datas com outros períodos do mesmo ano letivo (excluindo o próprio)
    const { data: otherTerms } = await (supabase.from("academic_terms") as any)
      .select("id, name, start_date, end_date")
      .eq("tenant_id", session.tenant.id)
      .eq("school_year_id", existing.school_year_id)
      .neq("id", input.id);

    if (otherTerms && otherTerms.length > 0) {
      const newStart = new Date(finalStart + "T00:00:00").getTime();
      const newEnd = new Date(finalEnd + "T23:59:59").getTime();

      for (const t of otherTerms) {
        const tStart = new Date(t.start_date + "T00:00:00").getTime();
        const tEnd = new Date(t.end_date + "T23:59:59").getTime();

        if (newStart <= tEnd && newEnd >= tStart) {
          return {
            success: false,
            error: `As datas informadas (${finalStart} a ${finalEnd}) sobrepõem as datas do período '${t.name}' (${t.start_date} a ${t.end_date}).`,
          };
        }
      }
    }

    const { error: updErr } = await (supabase.from("academic_terms") as any)
      .update(updates)
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id);

    if (updErr) {
      return { success: false, error: `Falha ao atualizar período: ${updErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ACADEMIC_TERM_UPDATED",
        entity_name: "academic_terms",
        entity_id: input.id,
        old_values: existing,
        new_values: updates,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar período acadêmico." };
  }
}

export async function deleteAcademicTermAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao"]);
    const supabase = await createClient();

    const { data: existing, error: findErr } = await (supabase.from("academic_terms") as any)
      .select("id, name, code, school_year_id")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Período acadêmico não encontrado." };
    }

    // Proteção contra cascade destrutivo: checa eventos vinculados ao período
    const { count: eventCount } = await (supabase.from("calendar_events") as any)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", session.tenant.id)
      .eq("academic_term_id", id);

    if ((eventCount || 0) > 0) {
      return {
        success: false,
        error: `Não é possível excluir o período '${existing.name}' pois existem ${eventCount} evento(s) vinculados a ele.`,
      };
    }

    const { error: delErr } = await (supabase.from("academic_terms") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", id);

    if (delErr) {
      return { success: false, error: `Falha ao excluir período: ${delErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ACADEMIC_TERM_DELETED",
        entity_name: "academic_terms",
        entity_id: id,
        old_values: existing,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir período acadêmico." };
  }
}

// ==============================================================================
// 3. CATEGORIAS DE DATAS E EVENTOS (CALENDAR EVENT CATEGORIES)
// ==============================================================================

export async function getCalendarEventCategoriesAction(): Promise<{
  success: boolean;
  categories: CalendarEventCategory[];
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const { data, error } = await (supabase.from("calendar_event_categories") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .order("name", { ascending: true });

    if (error) {
      return { success: false, categories: [], error: error.message };
    }

    return { success: true, categories: (data as CalendarEventCategory[]) || [] };
  } catch (err: any) {
    return { success: false, categories: [], error: err?.message || "Erro ao listar categorias de eventos." };
  }
}

export async function createCalendarEventCategoryAction(
  input: CreateCalendarEventCategoryInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const name = input.name?.trim();
    if (!name) return { success: false, error: "O nome da categoria é obrigatório." };

    const slug = input.slug ? slugify(input.slug) : slugify(name);
    const colorHex = input.color_hex || "#3B82F6";
    const isSchoolDay = Boolean(input.is_school_day);
    const allowedRoles = input.allowed_roles || ["admin_escola", "coordenacao", "secretaria"];
    const isSystem = Boolean(input.is_system);
    const isActive = input.is_active ?? true;

    const { data, error } = await (supabase.from("calendar_event_categories") as any)
      .insert({
        tenant_id: session.tenant.id,
        name,
        slug,
        description: input.description?.trim() || null,
        color_hex: colorHex,
        is_school_day: isSchoolDay,
        allowed_roles: allowedRoles,
        is_system: isSystem,
        is_active: isActive,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Já existe uma categoria com o identificador '${slug}'.` };
      }
      return { success: false, error: `Falha ao criar categoria: ${error.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_CATEGORY_CREATED",
        entity_name: "calendar_event_categories",
        entity_id: data.id,
        new_values: { name, slug, color_hex: colorHex, is_school_day: isSchoolDay, allowed_roles: allowedRoles },
      },
    ]);

    revalidateCalendarPaths();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao criar categoria de evento." };
  }
}

export async function updateCalendarEventCategoryAction(
  input: UpdateCalendarEventCategoryInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    if (!input.id) return { success: false, error: "ID da categoria é obrigatório." };

    const { data: existing, error: findErr } = await (supabase.from("calendar_event_categories") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Categoria de evento não encontrada." };
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.slug !== undefined && !existing.is_system) updates.slug = slugify(input.slug);
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.color_hex !== undefined) updates.color_hex = input.color_hex;
    if (input.is_school_day !== undefined) updates.is_school_day = input.is_school_day;
    if (input.allowed_roles !== undefined) updates.allowed_roles = input.allowed_roles;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    const { error: updErr } = await (supabase.from("calendar_event_categories") as any)
      .update(updates)
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id);

    if (updErr) {
      return { success: false, error: `Falha ao atualizar categoria: ${updErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_CATEGORY_UPDATED",
        entity_name: "calendar_event_categories",
        entity_id: input.id,
        old_values: existing,
        new_values: updates,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar categoria de evento." };
  }
}

export async function deleteCalendarEventCategoryAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const { data: existing, error: findErr } = await (supabase.from("calendar_event_categories") as any)
      .select("id, name, is_system")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Categoria de evento não encontrada." };
    }

    if (existing.is_system) {
      return { success: false, error: "Categorias padrão do sistema não podem ser excluídas." };
    }

    // Proteção contra cascade: checa eventos vinculados
    const { count: eventCount } = await (supabase.from("calendar_events") as any)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", session.tenant.id)
      .eq("category_id", id);

    if ((eventCount || 0) > 0) {
      return {
        success: false,
        error: `Não é possível excluir a categoria '${existing.name}' pois existem ${eventCount} evento(s) vinculados a ela.`,
      };
    }

    const { error: delErr } = await (supabase.from("calendar_event_categories") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", id);

    if (delErr) {
      return { success: false, error: `Falha ao excluir categoria: ${delErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_CATEGORY_DELETED",
        entity_name: "calendar_event_categories",
        entity_id: id,
        old_values: existing,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir categoria de evento." };
  }
}

export async function seedDefaultCalendarCategoriesAction(): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const defaultCategories = [
      {
        name: "Feriado Nacional / Regional",
        slug: "feriado",
        description: "Feriados oficiais sem atividades letivas.",
        color_hex: "#EF4444",
        is_school_day: false,
        allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
        is_system: true,
      },
      {
        name: "Recesso Escolar / Férias",
        slug: "recesso-escolar",
        description: "Período de recesso discente ou férias docentes.",
        color_hex: "#F97316",
        is_school_day: false,
        allowed_roles: ["admin_escola", "coordenacao"],
        is_system: true,
      },
      {
        name: "Reunião Pedagógica / Conselho de Classe",
        slug: "reuniao-pedagogica",
        description: "Encontro pedagógico, alinhamentos ou conselho de classe.",
        color_hex: "#8B5CF6",
        is_school_day: false,
        allowed_roles: ["admin_escola", "coordenacao"],
        is_system: true,
      },
      {
        name: "Avaliação Bimestral / Prova",
        slug: "avaliacao-bimestral",
        description: "Semana ou dia de avaliações formais.",
        color_hex: "#3B82F6",
        is_school_day: true,
        allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
        is_system: true,
      },
      {
        name: "Evento Cultural / Comemorativo",
        slug: "evento-cultural",
        description: "Feira de ciências, gincana, apresentações e festividades.",
        color_hex: "#EC4899",
        is_school_day: true,
        allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
        is_system: true,
      },
      {
        name: "Planejamento / Formação Docente",
        slug: "formacao-docente",
        description: "Jornada pedagógica e capacitação continuada.",
        color_hex: "#10B981",
        is_school_day: false,
        allowed_roles: ["admin_escola", "coordenacao"],
        is_system: true,
      },
      {
        name: "Sábado Letivo / Reposição",
        slug: "sabado-letivo",
        description: "Dia letivo especial para cumprimento de carga horária.",
        color_hex: "#06B6D4",
        is_school_day: true,
        allowed_roles: ["admin_escola", "coordenacao", "secretaria"],
        is_system: true,
      },
    ];

    let inserted = 0;
    for (const cat of defaultCategories) {
      const { data: exists } = await (supabase.from("calendar_event_categories") as any)
        .select("id")
        .eq("tenant_id", session.tenant.id)
        .eq("slug", cat.slug)
        .maybeSingle();

      if (!exists) {
        await (supabase.from("calendar_event_categories") as any).insert({
          tenant_id: session.tenant.id,
          ...cat,
          is_active: true,
        });
        inserted++;
      }
    }

    revalidateCalendarPaths();
    return { success: true, insertedCount: inserted };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err?.message || "Erro ao gerar categorias padrão." };
  }
}

// ==============================================================================
// 4. EVENTOS E DATAS DO CALENDÁRIO (CALENDAR EVENTS)
// ==============================================================================

export async function getCalendarEventsAction(
  filter?: CalendarEventsFilter
): Promise<{
  success: boolean;
  events: CalendarEvent[];
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    let query = (supabase.from("calendar_events") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .order("start_date", { ascending: true });

    if (filter?.school_year_id) {
      query = query.eq("school_year_id", filter.school_year_id);
    }
    if (filter?.academic_term_id) {
      query = query.eq("academic_term_id", filter.academic_term_id);
    }
    if (filter?.category_id) {
      query = query.eq("category_id", filter.category_id);
    }
    if (filter?.is_school_day !== undefined) {
      query = query.eq("is_school_day", filter.is_school_day);
    }
    if (filter?.target_audience) {
      query = query.or(`target_audience.eq.${filter.target_audience},target_audience.eq.todos`);
    }
    if (filter?.start_date && filter?.end_date) {
      query = query.lte("start_date", filter.end_date).gte("end_date", filter.start_date);
    }

    const [eventsRes, catsRes, termsRes, yearsRes] = await Promise.all([
      query,
      (supabase.from("calendar_event_categories") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id),
      (supabase.from("academic_terms") as any)
        .select("id, name, code")
        .eq("tenant_id", session.tenant.id),
      (supabase.from("school_years") as any)
        .select("id, year, title")
        .eq("tenant_id", session.tenant.id),
    ]);

    if (eventsRes.error) {
      return { success: false, events: [], error: eventsRes.error.message };
    }

    const catMap = new Map<string, CalendarEventCategory>(
      (catsRes.data || []).map((c: any) => [c.id, c as CalendarEventCategory])
    );
    const termMap = new Map<string, AcademicTerm>(
      (termsRes.data || []).map((t: any) => [t.id, t as AcademicTerm])
    );
    const yearMap = new Map<string, SchoolYear>(
      (yearsRes.data || []).map((y: any) => [y.id, y as SchoolYear])
    );

    const events: CalendarEvent[] = ((eventsRes.data as CalendarEvent[]) || []).map((ev) => ({
      ...ev,
      category: catMap.get(ev.category_id),
      academic_term: ev.academic_term_id ? termMap.get(ev.academic_term_id) : undefined,
      school_year: ev.school_year_id ? yearMap.get(ev.school_year_id) : undefined,
    }));

    return { success: true, events };
  } catch (err: any) {
    return { success: false, events: [], error: err?.message || "Erro ao consultar eventos do calendário." };
  }
}

export async function getCalendarEventByIdAction(
  id: string
): Promise<{
  success: boolean;
  event?: CalendarEvent;
  error?: string;
}> {
  try {
    const session = await assertCalendarAccess();
    const supabase = await createClient();

    const { data: eventData, error: eventErr } = await (supabase.from("calendar_events") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .maybeSingle();

    if (eventErr || !eventData) {
      return { success: false, error: eventErr?.message || "Evento do calendário não encontrado." };
    }

    const [catRes, termRes, yearRes] = await Promise.all([
      eventData.category_id
        ? (supabase.from("calendar_event_categories") as any)
            .select("*")
            .eq("tenant_id", session.tenant.id)
            .eq("id", eventData.category_id)
            .maybeSingle()
        : { data: null },
      eventData.academic_term_id
        ? (supabase.from("academic_terms") as any)
            .select("id, name, code")
            .eq("tenant_id", session.tenant.id)
            .eq("id", eventData.academic_term_id)
            .maybeSingle()
        : { data: null },
      eventData.school_year_id
        ? (supabase.from("school_years") as any)
            .select("id, year, title")
            .eq("tenant_id", session.tenant.id)
            .eq("id", eventData.school_year_id)
            .maybeSingle()
        : { data: null },
    ]);

    const event: CalendarEvent = {
      ...eventData,
      category: (catRes.data as CalendarEventCategory) || undefined,
      academic_term: (termRes.data as AcademicTerm) || undefined,
      school_year: (yearRes.data as SchoolYear) || undefined,
    };

    return { success: true, event };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar evento do calendário." };
  }
}

export async function createCalendarEventAction(
  input: CreateCalendarEventInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const title = input.title?.trim();
    const startDate = input.start_date;
    const endDate = input.end_date || input.start_date;
    const isFullDay = input.is_full_day ?? true;
    const targetAudience = input.target_audience || "todos";

    if (!input.school_year_id) return { success: false, error: "O ano letivo é obrigatório." };
    if (!input.category_id) return { success: false, error: "A categoria do evento é obrigatória." };
    if (!title) return { success: false, error: "O título do evento é obrigatório." };
    if (!startDate) return { success: false, error: "A data inicial é obrigatória." };
    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, error: "A data final deve ser posterior ou igual à data inicial." };
    }

    // 1. Validar categoria e permissão RBAC específica no tenant
    const { data: category, error: catErr } = await (supabase.from("calendar_event_categories") as any)
      .select("id, name, is_school_day, allowed_roles, is_active")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.category_id)
      .single();

    if (catErr || !category || !category.is_active) {
      return { success: false, error: "Categoria de evento selecionada é inválida ou inativa." };
    }

    // Se o usuário for secretaria, valida se a role está em allowed_roles da categoria
    if (session.role === "secretaria" && !category.allowed_roles.includes("secretaria")) {
      return {
        success: false,
        error: `Perfil 'secretaria' não possui autorização para cadastrar eventos da categoria '${category.name}'.`,
      };
    }

    // 2. Validar ano letivo e enquadramento temporal
    const { data: schoolYear, error: syErr } = await (supabase.from("school_years") as any)
      .select("id, start_date, end_date")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.school_year_id)
      .single();

    if (syErr || !schoolYear) {
      return { success: false, error: "Ano letivo informado não encontrado para esta instituição." };
    }

    if (new Date(startDate) < new Date(schoolYear.start_date) || new Date(endDate) > new Date(schoolYear.end_date)) {
      return {
        success: false,
        error: `As datas do evento (${startDate} a ${endDate}) devem estar contidas no intervalo do ano letivo (${schoolYear.start_date} a ${schoolYear.end_date}).`,
      };
    }

    // 3. Se fornecido academic_term_id, valida enquadramento temporal no período
    if (input.academic_term_id) {
      const { data: term, error: tErr } = await (supabase.from("academic_terms") as any)
        .select("id, start_date, end_date, school_year_id")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", input.school_year_id)
        .eq("id", input.academic_term_id)
        .maybeSingle();

      if (tErr || !term) {
        return { success: false, error: "O período acadêmico informado não pertence ao ano letivo selecionado." };
      }

      if (new Date(startDate) < new Date(term.start_date) || new Date(endDate) > new Date(term.end_date)) {
        return {
          success: false,
          error: `As datas do evento (${startDate} a ${endDate}) devem estar contidas no intervalo do período acadêmico (${term.start_date} a ${term.end_date}).`,
        };
      }
    }

    const isSchoolDay = input.is_school_day !== undefined ? input.is_school_day : category.is_school_day;

    // Identidade estrita: created_by é sempre o usuário da sessão autenticada
    const { data, error } = await (supabase.from("calendar_events") as any)
      .insert({
        tenant_id: session.tenant.id,
        school_year_id: input.school_year_id,
        academic_term_id: input.academic_term_id || null,
        category_id: input.category_id,
        title,
        description: input.description?.trim() || null,
        start_date: startDate,
        end_date: endDate,
        is_full_day: isFullDay,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        is_school_day: isSchoolDay,
        target_audience: targetAudience,
        created_by: session.user.id,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: `Falha ao cadastrar evento: ${error.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_EVENT_CREATED",
        entity_name: "calendar_events",
        entity_id: data.id,
        new_values: { title, start_date: startDate, end_date: endDate, category_id: input.category_id, is_school_day: isSchoolDay },
      },
    ]);

    revalidateCalendarPaths();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao cadastrar evento no calendário." };
  }
}

export async function updateCalendarEventAction(
  input: UpdateCalendarEventInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    if (!input.id) return { success: false, error: "ID do evento é obrigatório." };

    const { data: existing, error: findErr } = await (supabase.from("calendar_events") as any)
      .select("*, category:calendar_event_categories(*), school_year:school_years(start_date, end_date)")
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Evento do calendário não encontrado." };
    }

    // Secretaria só pode atualizar eventos que ela mesma criou
    if (session.role === "secretaria" && existing.created_by && existing.created_by !== session.user.id) {
      return { success: false, error: "Acesso negado: Você só pode editar eventos cadastrados por você." };
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.school_year_id !== undefined) {
      const { data: sy, error: syErr } = await (supabase.from("school_years") as any)
        .select("id, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("id", input.school_year_id)
        .single();

      if (syErr || !sy) {
        return { success: false, error: "Ano letivo selecionado não encontrado." };
      }
      updates.school_year_id = input.school_year_id;
    }

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.start_date !== undefined) updates.start_date = input.start_date;
    if (input.end_date !== undefined) updates.end_date = input.end_date;
    if (input.is_full_day !== undefined) updates.is_full_day = input.is_full_day;
    if (input.start_time !== undefined) updates.start_time = input.start_time || null;
    if (input.end_time !== undefined) updates.end_time = input.end_time || null;
    if (input.is_school_day !== undefined) updates.is_school_day = input.is_school_day;
    if (input.target_audience !== undefined) updates.target_audience = input.target_audience;
    if (input.academic_term_id !== undefined) updates.academic_term_id = input.academic_term_id || null;

    const finalStart = updates.start_date || existing.start_date;
    const finalEnd = updates.end_date || existing.end_date;
    if (new Date(finalEnd) < new Date(finalStart)) {
      return { success: false, error: "A data final deve ser posterior ou igual à data inicial." };
    }

    // Validação temporal com o ano letivo
    const targetSchoolYearId = updates.school_year_id || existing.school_year_id;
    const { data: activeYear } = await (supabase.from("school_years") as any)
      .select("start_date, end_date")
      .eq("tenant_id", session.tenant.id)
      .eq("id", targetSchoolYearId)
      .single();

    if (activeYear) {
      if (
        new Date(finalStart) < new Date(activeYear.start_date) ||
        new Date(finalEnd) > new Date(activeYear.end_date)
      ) {
        return {
          success: false,
          error: `As datas do evento (${finalStart} a ${finalEnd}) devem estar contidas no intervalo do ano letivo (${activeYear.start_date} a ${activeYear.end_date}).`,
        };
      }
    }

    // Se houver termo acadêmico novo ou mantido, valida intervalo
    const targetTermId = updates.academic_term_id !== undefined ? updates.academic_term_id : existing.academic_term_id;
    if (targetTermId) {
      const { data: term, error: tErr } = await (supabase.from("academic_terms") as any)
        .select("id, start_date, end_date")
        .eq("tenant_id", session.tenant.id)
        .eq("school_year_id", targetSchoolYearId)
        .eq("id", targetTermId)
        .maybeSingle();

      if (tErr || !term) {
        return { success: false, error: "Período acadêmico selecionado inválido para este ano letivo." };
      }

      if (new Date(finalStart) < new Date(term.start_date) || new Date(finalEnd) > new Date(term.end_date)) {
        return {
          success: false,
          error: `As datas do evento (${finalStart} a ${finalEnd}) devem estar contidas no intervalo do período acadêmico (${term.start_date} a ${term.end_date}).`,
        };
      }
    }

    if (input.category_id !== undefined) {
      const { data: category, error: catErr } = await (supabase.from("calendar_event_categories") as any)
        .select("id, name, allowed_roles, is_active")
        .eq("tenant_id", session.tenant.id)
        .eq("id", input.category_id)
        .single();

      if (catErr || !category || !category.is_active) {
        return { success: false, error: "Nova categoria de evento selecionada é inválida ou inativa." };
      }

      if (session.role === "secretaria" && !category.allowed_roles.includes("secretaria")) {
        return {
          success: false,
          error: `Perfil 'secretaria' não possui autorização para eventos da categoria '${category.name}'.`,
        };
      }

      updates.category_id = input.category_id;
    }

    const { error: updErr } = await (supabase.from("calendar_events") as any)
      .update(updates)
      .eq("tenant_id", session.tenant.id)
      .eq("id", input.id);

    if (updErr) {
      return { success: false, error: `Falha ao atualizar evento: ${updErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_EVENT_UPDATED",
        entity_name: "calendar_events",
        entity_id: input.id,
        old_values: existing,
        new_values: updates,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar evento do calendário." };
  }
}

export async function deleteCalendarEventAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertCalendarAccess(["admin_escola", "coordenacao", "secretaria"]);
    const supabase = await createClient();

    const { data: existing, error: findErr } = await (supabase.from("calendar_events") as any)
      .select("id, title, created_by")
      .eq("tenant_id", session.tenant.id)
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return { success: false, error: "Evento do calendário não encontrado." };
    }

    // Secretaria só pode excluir eventos que ela mesma cadastrou
    if (session.role === "secretaria" && existing.created_by && existing.created_by !== session.user.id) {
      return { success: false, error: "Acesso negado: Você só pode excluir eventos cadastrados por você." };
    }

    const { error: delErr } = await (supabase.from("calendar_events") as any)
      .delete()
      .eq("tenant_id", session.tenant.id)
      .eq("id", id);

    if (delErr) {
      return { success: false, error: `Falha ao excluir evento: ${delErr.message}` };
    }

    // Auditoria (Identidade estrita da sessão)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "CALENDAR_EVENT_DELETED",
        entity_name: "calendar_events",
        entity_id: id,
        old_values: existing,
      },
    ]);

    revalidateCalendarPaths();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir evento do calendário." };
  }
}
