"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { revalidatePath } from "next/cache";
import { Student, StudentInput, Guardian, GuardianInput } from "@/types/secretaria";

async function assertSecretariaAccess() {
  const session = await getTenantSession();
  if (!session) {
    throw new Error("Não autenticado ou sessão expirada.");
  }
  if (!canAccessModule(session.role, "secretaria")) {
    throw new Error("Acesso negado: Perfil sem permissão para o módulo Secretaria.");
  }
  return session;
}

// ==============================================================================
// 1. ALUNOS
// ==============================================================================

export async function getStudentsAction(filters?: {
  search?: string;
  status?: "all" | "active" | "inactive";
}): Promise<Student[]> {
  const session = await assertSecretariaAccess();
  const supabase = await createClient();

  let query = (supabase.from("students") as any)
    .select(`
      *,
      guardians:student_guardians(
        id,
        kinship,
        is_financial,
        is_pedagogical,
        is_emergency_contact,
        has_custody,
        guardian:guardians(*)
      )
    `)
    .eq("tenant_id", session.tenant.id)
    .order("created_at", { ascending: false });

  if (filters?.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters?.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},cpf.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar alunos:", error);
    return [];
  }

  return (data || []) as Student[];
}

export async function getStudentByIdAction(id: string): Promise<Student | null> {
  const session = await assertSecretariaAccess();
  const supabase = await createClient();

  const { data, error } = await (supabase.from("students") as any)
    .select(`
      *,
      guardians:student_guardians(
        id,
        guardian_id,
        kinship,
        is_financial,
        is_pedagogical,
        is_emergency_contact,
        has_custody,
        notes,
        guardian:guardians(*)
      )
    `)
    .eq("id", id)
    .eq("tenant_id", session.tenant.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Student;
}

export async function saveStudentAction(
  studentId: string | null,
  input: StudentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertSecretariaAccess();
    const supabase = await createClient();

    const studentData: Record<string, any> = {
      tenant_id: session.tenant.id,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      cpf: input.cpf?.trim() || null,
      rg: input.rg?.trim() || null,
      rg_issuer: input.rg_issuer?.trim() || null,
      birth_date: input.birth_date || null,
      gender: input.gender || "uninformed",
      photo_url: input.photo_url?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      street: input.street?.trim() || null,
      number: input.number?.trim() || null,
      complement: input.complement?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim().toUpperCase() || null,
      medical_notes: input.medical_notes?.trim() || null,
      general_notes: input.general_notes?.trim() || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
      updated_at: new Date().toISOString(),
    };

    let targetStudentId = studentId;

    if (studentId) {
      const { error: updateError } = await (supabase.from("students") as any)
        .update(studentData)
        .eq("id", studentId)
        .eq("tenant_id", session.tenant.id);

      if (updateError) throw updateError;
    } else {
      const { data: created, error: createError } = await (supabase.from("students") as any)
        .insert([studentData])
        .select("id")
        .single();

      if (createError || !created) throw createError;
      targetStudentId = created.id;
    }

    if (targetStudentId && input.guardians) {
      await (supabase.from("student_guardians") as any)
        .delete()
        .eq("student_id", targetStudentId)
        .eq("tenant_id", session.tenant.id);

      if (input.guardians.length > 0) {
        const links = input.guardians.map((g) => ({
          tenant_id: session.tenant.id,
          student_id: targetStudentId,
          guardian_id: g.guardian_id,
          kinship: g.kinship,
          is_financial: Boolean(g.is_financial),
          is_pedagogical: Boolean(g.is_pedagogical),
          is_emergency_contact: Boolean(g.is_emergency_contact),
          has_custody: g.has_custody !== undefined ? g.has_custody : true,
          notes: g.notes?.trim() || null,
        }));

        await (supabase.from("student_guardians") as any).insert(links);
      }
    }

    revalidatePath("/app/secretaria");
    return { success: true, id: targetStudentId || undefined };
  } catch (err: any) {
    console.error("Erro em saveStudentAction:", err);
    return { success: false, error: err?.message || "Falha ao salvar dados do aluno." };
  }
}

export async function toggleStudentStatusAction(
  studentId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertSecretariaAccess();
    const supabase = await createClient();

    const { error } = await (supabase.from("students") as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", studentId)
      .eq("tenant_id", session.tenant.id);

    if (error) throw error;

    revalidatePath("/app/secretaria");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Falha ao alternar status do aluno." };
  }
}

// ==============================================================================
// 2. RESPONSÁVEIS
// ==============================================================================

export async function getGuardiansAction(filters?: {
  search?: string;
  status?: "all" | "active" | "inactive";
}): Promise<Guardian[]> {
  const session = await assertSecretariaAccess();
  const supabase = await createClient();

  let query = (supabase.from("guardians") as any)
    .select("*")
    .eq("tenant_id", session.tenant.id)
    .order("name", { ascending: true });

  if (filters?.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters?.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`name.ilike.${term},cpf.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar responsáveis:", error);
    return [];
  }

  return (data || []) as Guardian[];
}

export async function saveGuardianAction(
  guardianId: string | null,
  input: GuardianInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await assertSecretariaAccess();
    const supabase = await createClient();

    const guardianData: Record<string, any> = {
      tenant_id: session.tenant.id,
      name: input.name.trim(),
      cpf: input.cpf.trim(),
      rg: input.rg?.trim() || null,
      kinship: input.kinship || "outro",
      phone: input.phone?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      profession: input.profession?.trim() || null,
      workplace: input.workplace?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      street: input.street?.trim() || null,
      number: input.number?.trim() || null,
      complement: input.complement?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim().toUpperCase() || null,
      notes: input.notes?.trim() || null,
      is_financial_responsible: Boolean(input.is_financial_responsible),
      is_pedagogical_responsible: Boolean(input.is_pedagogical_responsible),
      is_active: input.is_active !== undefined ? input.is_active : true,
      updated_at: new Date().toISOString(),
    };

    let targetGuardianId = guardianId;

    if (guardianId) {
      const { error: updateError } = await (supabase.from("guardians") as any)
        .update(guardianData)
        .eq("id", guardianId)
        .eq("tenant_id", session.tenant.id);

      if (updateError) throw updateError;
    } else {
      const { data: created, error: createError } = await (supabase.from("guardians") as any)
        .insert([guardianData])
        .select("id")
        .single();

      if (createError || !created) throw createError;
      targetGuardianId = created.id;
    }

    revalidatePath("/app/secretaria");
    return { success: true, id: targetGuardianId || undefined };
  } catch (err: any) {
    console.error("Erro em saveGuardianAction:", err);
    return { success: false, error: err?.message || "Falha ao salvar responsável." };
  }
}

export async function toggleGuardianStatusAction(
  guardianId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertSecretariaAccess();
    const supabase = await createClient();

    const { error } = await (supabase.from("guardians") as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", guardianId)
      .eq("tenant_id", session.tenant.id);

    if (error) throw error;

    revalidatePath("/app/secretaria");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Falha ao alternar status do responsável." };
  }
}