"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { UserRole } from "@/types/database";
import { revalidatePath } from "next/cache";
import {
  Enrollment,
  EnrollmentFilters,
  CreateEnrollmentInput,
  UpdateEnrollmentStatusInput,
  EnrollmentStatus,
  EnrollmentDocumentItem,
  EnrollmentDocumentTemplate,
  EnrollmentDocumentProgress,
  UpdateEnrollmentDocumentInput,
  AddCustomEnrollmentDocumentInput,
  SaveChecklistSettingsInput,
  EnrollmentHistoryItem,
  UpdateEnrollmentAcademicDataInput,
  DEFAULT_DOCUMENT_TEMPLATES,
} from "@/types/matriculas";
import { Student, Guardian } from "@/types/secretaria";
import { SchoolClass, Course, Series } from "@/types/academico";

// ==============================================================================
// 0. GUARDIÃO DE ACESSO & RBAC GRANULAR
// ==============================================================================

async function assertMatriculasAccess(requiredRoles?: UserRole[]) {
  const session = await getTenantSession();
  if (!session) {
    throw new Error("Não autenticado ou sessão expirada.");
  }
  if (!canAccessModule(session.role, "matriculas")) {
    throw new Error("Acesso negado: Perfil sem permissão para o módulo de Matrículas.");
  }
  if (requiredRoles && !requiredRoles.includes(session.role)) {
    throw new Error(
      `Acesso restrito: Seu perfil (${session.role}) não possui autorização para esta operação de matrícula.`
    );
  }
  return session;
}

// ==============================================================================
// HELPER: GERAÇÃO DE CÓDIGOS MAT-[ANO]-[SEQUENCIAL] SEGUROS CONTRA COLISÕES
// ==============================================================================

async function generateUniqueEnrollmentCode(
  supabase: any,
  tenantId: string,
  academicYear: string,
  isFallback: boolean,
  fallbackList?: any[]
): Promise<string> {
  let baseCount = 1;

  if (!isFallback) {
    try {
      const { count } = await (supabase.from("enrollments") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("academic_year", academicYear);
      baseCount = (count || 0) + 1;
    } catch {
      baseCount = 1;
    }
  } else {
    baseCount =
      (fallbackList || []).filter((e) => e.academic_year === academicYear).length + 1;
  }

  // Tenta até 5 sequenciais para evitar colisões em concorrência simultânea
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = String(baseCount + attempt).padStart(5, "0");
    const candidateCode = `MAT-${academicYear}-${seq}`;

    if (!isFallback) {
      const { data } = await (supabase.from("enrollments") as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("enrollment_code", candidateCode)
        .maybeSingle();

      if (!data) {
        return candidateCode;
      }
    } else {
      const exists = (fallbackList || []).some(
        (e) => e.enrollment_code === candidateCode
      );
      if (!exists) {
        return candidateCode;
      }
    }
  }

  // Fallback com timestamp/hex caso haja altíssima concorrência simultânea
  const randomHex = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase();
  return `MAT-${academicYear}-${randomHex}`;
}

// ==============================================================================
// HELPER: VALIDAÇÃO ATÔMICA DE CAPACIDADE DE TURMAS COM CONCORRÊNCIA E FALLBACK
// ==============================================================================

export async function validateClassCapacityHelper(
  supabase: any,
  tenantId: string,
  classId: string | null | undefined,
  isConfirmingStatus: boolean,
  context?: {
    academicYear?: string;
    shift?: string;
    courseName?: string;
    gradeLevel?: string;
    excludeEnrollmentId?: string;
  }
): Promise<{
  valid: boolean;
  schoolClass?: SchoolClass;
  isFull?: boolean;
  capacity?: number;
  enrolledCount?: number;
  availableVacancies?: number;
  isFallback?: boolean;
  error?: string;
}> {
  if (!classId) {
    return { valid: true, isFull: false };
  }

  // 1. Busca os dados da turma para validação no servidor
  let classData: SchoolClass | null = null;
  let isFallback = false;

  try {
    const { data, error } = await (supabase.from("school_classes") as any)
      .select(`
        *,
        series:series(
          *,
          course:courses(*)
        )
      `)
      .eq("id", classId)
      .eq("tenant_id", tenantId)
      .single();

    if (!error && data) {
      classData = data as SchoolClass;
    }
  } catch {
    // Tabela física pode não existir ainda
  }

  // Fallback para JSONB se a tabela física não retornou
  if (!classData) {
    isFallback = true;
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", tenantId)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    const classesList: SchoolClass[] = curSettings.academic_classes_store || [];
    const seriesList: Series[] = curSettings.academic_series_store || [];
    const courses: Course[] = curSettings.academic_courses_store || [];

    const coursesMap = new Map(courses.map((c) => [c.id, c]));
    const foundClass = classesList.find((c) => c.id === classId);
    if (foundClass) {
      const foundSeries = seriesList.find((s) => s.id === foundClass.series_id);
      classData = {
        ...foundClass,
        series: foundSeries
          ? {
              ...foundSeries,
              course: coursesMap.get(foundSeries.course_id),
            }
          : undefined,
      };
    }
  }

  if (!classData) {
    return {
      valid: false,
      error: "A turma selecionada não foi encontrada ou não pertence a esta instituição.",
    };
  }

  if (!classData.is_active) {
    return {
      valid: false,
      error: `A turma "${classData.name}" está inativa e não aceita novas matrículas.`,
    };
  }

  // 2. Validação estrita de Integridade Acadêmica no Servidor (P2)
  if (context?.academicYear && classData.academic_year !== context.academicYear) {
    return {
      valid: false,
      error: `A turma "${classData.name}" é do ano letivo ${classData.academic_year}, incompatível com o ano ${context.academicYear} da matrícula.`,
    };
  }

  if (context?.shift && classData.shift !== context.shift) {
    return {
      valid: false,
      error: `A turma "${classData.name}" pertence ao turno ${classData.shift}, incompatível com o turno ${context.shift} da matrícula.`,
    };
  }

  const seriesName = classData.series?.name;
  if (context?.gradeLevel && seriesName && seriesName.toLowerCase().trim() !== context.gradeLevel.toLowerCase().trim()) {
    return {
      valid: false,
      error: `A turma "${classData.name}" pertence à série "${seriesName}", incompatível com a série "${context.gradeLevel}" da matrícula.`,
    };
  }

  const courseName = classData.series?.course?.name;
  if (context?.courseName && courseName && courseName.toLowerCase().trim() !== context.courseName.toLowerCase().trim()) {
    return {
      valid: false,
      error: `A turma "${classData.name}" pertence ao curso "${courseName}", incompatível com o curso "${context.courseName}" da matrícula.`,
    };
  }

  // 3. Validação de capacidade
  let enrolledCount = 0;
  if (!isFallback) {
    try {
      let q = (supabase.from("enrollments") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .eq("status", "matriculado");

      if (context?.excludeEnrollmentId) {
        q = q.neq("id", context.excludeEnrollmentId);
      }

      const { count, error } = await q;
      if (!error && count !== null) {
        enrolledCount = count;
      } else {
        throw new Error("count_failed");
      }
    } catch {
      isFallback = true;
    }
  }

  if (isFallback) {
    // Tratamento estrito do fallback JSONB (P3):
    // Como o store JSONB não oferece lock transacional ACID em alta concorrência,
    // se estiver confirmando status 'matriculado', checa capacidade no array local
    // e alerta sobre o modo contingencial se a capacidade estiver no limite.
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", tenantId)
      .single();

    const curList: Enrollment[] = curTenant?.settings?.enrollments_store || [];
    enrolledCount = curList.filter(
      (e) =>
        e.class_id === classId &&
        e.status === "matriculado" &&
        e.id !== context?.excludeEnrollmentId
    ).length;

    if (isConfirmingStatus && enrolledCount >= classData.capacity) {
      return {
        valid: false,
        schoolClass: classData,
        isFull: true,
        isFallback: true,
        capacity: classData.capacity,
        enrolledCount,
        availableVacancies: 0,
        error: `[Contingência] A turma "${classData.name}" atingiu a capacidade máxima (${enrolledCount}/${classData.capacity}). No modo fallback, novas vagas não podem ser alocadas concorrentemente.`,
      };
    }
  }

  const isFull = enrolledCount >= classData.capacity;
  const availableVacancies = Math.max(0, classData.capacity - enrolledCount);

  if (isConfirmingStatus && isFull) {
    return {
      valid: false,
      schoolClass: classData,
      isFull: true,
      isFallback,
      capacity: classData.capacity,
      enrolledCount,
      availableVacancies: 0,
      error: `A turma "${classData.name}" está lotada (${enrolledCount}/${classData.capacity} alunos matriculados). Para confirmar esta matrícula, aumente a capacidade da turma ou escolha outra turma disponível.`,
    };
  }

  return {
    valid: true,
    schoolClass: classData,
    isFull,
    isFallback,
    capacity: classData.capacity,
    enrolledCount,
    availableVacancies,
  };
}


// ==============================================================================
// HELPER: AUTO-SINCRONIZAÇÃO ENTRE FALLBACK E TABELA FÍSICA (ZERO DIVERGÊNCIA)
// ==============================================================================

async function syncFallbackToPhysicalTableIfApplicable(
  supabase: any,
  tenantId: string
) {
  try {
    // Verifica se existem registros pendentes no fallback do tenant
    const { data: tenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", tenantId)
      .single();

    const settings = (tenant?.settings as Record<string, any>) || {};
    const fallbackList: Enrollment[] = settings.enrollments_store || [];

    if (fallbackList.length === 0) return;

    // Tenta migrar os registros do fallback para a tabela física enrollments
    for (const item of fallbackList) {
      await (supabase.from("enrollments") as any).upsert([
        {
          id: item.id,
          tenant_id: tenantId,
          student_id: item.student_id,
          guardian_id: item.guardian_id || null,
          enrollment_code: item.enrollment_code,
          academic_year: item.academic_year,
          course_name: item.course_name,
          grade_level: item.grade_level,
          shift: item.shift,
          status: item.status,
          status_notes: item.status_notes || null,
          entry_date: item.entry_date,
          exit_date: item.exit_date || null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        },
      ]);
    }

    // Limpa o store do fallback no tenant de forma atômica
    const newSettings = { ...settings };
    delete newSettings.enrollments_store;

    await (supabase.from("tenants") as any)
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);
  } catch (syncErr) {
    // Silencia se a tabela física ainda não estiver disponível
  }
}

async function attachDocumentsAndProgressToEnrollments(
  supabase: any,
  tenantId: string,
  enrollments: Enrollment[]
): Promise<Enrollment[]> {
  if (!enrollments || enrollments.length === 0) return [];

  const { data: tenant } = await (supabase.from("tenants") as any)
    .select("settings")
    .eq("id", tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, any>) || {};
  const templates: EnrollmentDocumentTemplate[] =
    settings.enrollment_checklist_settings || DEFAULT_DOCUMENT_TEMPLATES;

  const docStore: Record<string, EnrollmentDocumentItem[]> =
    settings.enrollment_documents_store || {};

  const enrollmentIds = enrollments.map((e) => e.id);
  const docsByEnrollment = new Map<string, EnrollmentDocumentItem[]>();

  try {
    const { data: dbDocs, error } = await (supabase.from("enrollment_documents") as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .in("enrollment_id", enrollmentIds);

    if (!error && dbDocs && dbDocs.length > 0) {
      for (const d of dbDocs as EnrollmentDocumentItem[]) {
        const arr = docsByEnrollment.get(d.enrollment_id) || [];
        arr.push(d);
        docsByEnrollment.set(d.enrollment_id, arr);
      }
    }
  } catch {
    // Silencia se a tabela física de docs não existir
  }

  return enrollments.map((enr) => {
    let docs = docsByEnrollment.get(enr.id) || docStore[enr.id];
    if (!docs || docs.length === 0) {
      docs = templates.map((tpl) => ({
        id: `virtual-${enr.id}-${tpl.document_type}`,
        enrollment_id: enr.id,
        tenant_id: tenantId,
        document_type: tpl.document_type,
        document_name: tpl.document_name,
        status: "pendente" as const,
        is_required: tpl.is_required,
        received_at: null,
        verified_by: null,
        notes: null,
        created_at: enr.created_at,
        updated_at: enr.updated_at,
      }));
    }

    const progress = computeDocumentProgress(docs);
    return {
      ...enr,
      documents: docs,
      document_progress: progress,
    };
  });
}

// ==============================================================================
// 1. LISTAGEM DE MATRÍCULAS COM ISOLAMENTO, SINCRONIZAÇÃO E DOCUMENTOS
// ==============================================================================

export async function getEnrollmentsAction(
  filters?: EnrollmentFilters
): Promise<{ success: boolean; data: Enrollment[]; error?: string }> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    // 1. Tenta consultar a tabela public.enrollments
    let query = (supabase.from("enrollments") as any)
      .select(`
        *,
        student:students(*),
        guardian:guardians(*),
        school_class:school_classes(*)
      `)
      .eq("tenant_id", session.tenant.id)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.academicYear && filters.academicYear.trim() && filters.academicYear !== "all") {
      query = query.eq("academic_year", filters.academicYear.trim());
    }

    if (filters?.course && filters.course.trim() && filters.course !== "all") {
      query = query.eq("course_name", filters.course.trim());
    }

    if (filters?.gradeLevel && filters.gradeLevel.trim() && filters.gradeLevel !== "all") {
      query = query.eq("grade_level", filters.gradeLevel.trim());
    }

    if (filters?.classId && filters.classId !== "all") {
      query = query.eq("class_id", filters.classId);
    }

    if (filters?.shift && filters.shift !== "all") {
      query = query.eq("shift", filters.shift);
    }

    const { data: dbData, error: dbError } = await query;


    // 2. Se a tabela física public.enrollments funcionou perfeitamente:
    if (!dbError) {
      // Sincroniza em background eventuais dados órfãos que estavam no fallback
      await syncFallbackToPhysicalTableIfApplicable(supabase, session.tenant.id);

      let results = (dbData || []) as Enrollment[];

      if (filters?.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        results = results.filter(
          (e) =>
            e.enrollment_code.toLowerCase().includes(term) ||
            e.student?.first_name?.toLowerCase().includes(term) ||
            e.student?.last_name?.toLowerCase().includes(term) ||
            e.student?.cpf?.includes(term) ||
            e.guardian?.name?.toLowerCase().includes(term)
        );
      }

      const enrichedWithDocs = await attachDocumentsAndProgressToEnrollments(
        supabase,
        session.tenant.id,
        results
      );

      return { success: true, data: enrichedWithDocs };
    }

    // 3. Fallback gracioso SE e SOMENTE SE a tabela ainda não existe no banco (42P01)
    if (dbError.code === "42P01" || dbError.message?.includes("does not exist")) {
      const { data: tenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const settings = (tenant?.settings as Record<string, any>) || {};
      const fallbackList: any[] = settings.enrollments_store || [];

      // Carrega dados dos estudantes e responsáveis para enriquecer o fallback
      const { data: students } = await (supabase.from("students") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id);

      const { data: guardians } = await (supabase.from("guardians") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id);

      const studentsMap = new Map<string, Student>(
        ((students || []) as Student[]).map((s) => [s.id, s])
      );
      const guardiansMap = new Map<string, Guardian>(
        ((guardians || []) as Guardian[]).map((g) => [g.id, g])
      );

      const classesMap = new Map<string, SchoolClass>(
        ((settings.academic_classes_store || []) as SchoolClass[]).map((c) => [c.id, c])
      );

      let enriched: Enrollment[] = fallbackList.map((e) => {
        const student = studentsMap.get(e.student_id) || e.student;
        const guardian = e.guardian_id ? guardiansMap.get(e.guardian_id) || e.guardian : null;
        const schoolClass = e.class_id ? classesMap.get(e.class_id) || e.school_class : null;
        return {
          ...e,
          student,
          guardian,
          school_class: schoolClass,
        } as Enrollment;
      });

      if (filters?.status && filters.status !== "all") {
        enriched = enriched.filter((e) => e.status === filters.status);
      }
      if (filters?.academicYear && filters.academicYear.trim() && filters.academicYear !== "all") {
        enriched = enriched.filter((e) => e.academic_year === filters.academicYear);
      }
      if (filters?.course && filters.course.trim() && filters.course !== "all") {
        enriched = enriched.filter((e) => e.course_name === filters.course);
      }
      if (filters?.gradeLevel && filters.gradeLevel.trim() && filters.gradeLevel !== "all") {
        enriched = enriched.filter((e) => e.grade_level === filters.gradeLevel);
      }
      if (filters?.classId && filters.classId !== "all") {
        enriched = enriched.filter((e) => e.class_id === filters.classId);
      }
      if (filters?.shift && filters.shift !== "all") {
        enriched = enriched.filter((e) => e.shift === filters.shift);
      }

      if (filters?.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        enriched = enriched.filter(
          (e) =>
            e.enrollment_code.toLowerCase().includes(term) ||
            e.student?.first_name?.toLowerCase().includes(term) ||
            e.student?.last_name?.toLowerCase().includes(term) ||
            e.student?.cpf?.includes(term) ||
            e.guardian?.name?.toLowerCase().includes(term)
        );
      }

      const enrichedWithDocs = await attachDocumentsAndProgressToEnrollments(
        supabase,
        session.tenant.id,
        enriched
      );

      return { success: true, data: enrichedWithDocs };
    }

    console.error("Erro ao buscar matrículas:", dbError);
    return { success: false, data: [], error: dbError.message };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message || "Erro ao consultar matrículas." };
  }
}

// ==============================================================================
// 2. BUSCA DE DADOS AUXILIARES (ALUNOS E RESPONSÁVEIS EXISTENTES)
// ==============================================================================

export async function getEnrollmentLookupDataAction(): Promise<{
  success: boolean;
  students: Student[];
  guardians: Guardian[];
  error?: string;
}> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    const [studentsRes, guardiansRes] = await Promise.all([
      (supabase.from("students") as any)
        .select(`
          *,
          guardians:student_guardians(
            id,
            guardian_id,
            kinship,
            is_financial,
            guardian:guardians(*)
          )
        `)
        .eq("tenant_id", session.tenant.id)
        .order("first_name", { ascending: true }),
      (supabase.from("guardians") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .order("name", { ascending: true }),
    ]);

    return {
      success: true,
      students: (studentsRes.data || []) as Student[],
      guardians: (guardiansRes.data || []) as Guardian[],
    };
  } catch (err: any) {
    return {
      success: false,
      students: [],
      guardians: [],
      error: err?.message || "Erro ao carregar cadastros existentes.",
    };
  }
}

// ==============================================================================
// 3. CRIAÇÃO DE MATRÍCULA (REUTILIZANDO CADASTROS EXISTENTES)
// ==============================================================================

export async function createEnrollmentAction(
  input: CreateEnrollmentInput
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  try {
    // Alçada RBAC: Apenas diretoria, coordenação, secretaria e comercial podem registrar
    const session = await assertMatriculasAccess([
      "admin_escola",
      "coordenacao",
      "secretaria",
      "comercial",
    ]);
    const supabase = await createClient();

    // Regra comercial: O perfil comercial apenas pode abrir pré-matrícula ou em análise
    let effectiveInitialStatus = input.initial_status || "pre_matricula";
    if (session.role === "comercial" && effectiveInitialStatus === "matriculado") {
      effectiveInitialStatus = "em_analise";
    }

    let studentId: string | null = null;
    let guardianId: string | null = null;

    // --- Passo 1: Aluno (Reutilização ou Criação) ---
    if (input.isExistingStudent && input.studentId) {
      // Valida se o estudante pertence ao tenant atual (Isolamento RLS)
      const { data: stdCheck } = await (supabase.from("students") as any)
        .select("id")
        .eq("id", input.studentId)
        .eq("tenant_id", session.tenant.id)
        .single();

      if (!stdCheck) {
        return { success: false, error: "Aluno selecionado não pertence à sua instituição." };
      }
      studentId = input.studentId;
    } else if (input.newStudent) {
      if (!input.newStudent.first_name.trim() || !input.newStudent.last_name.trim()) {
        return { success: false, error: "Nome e sobrenome do aluno são obrigatórios." };
      }

      const { data: newStd, error: stdErr } = await (supabase.from("students") as any)
        .insert([
          {
            tenant_id: session.tenant.id,
            first_name: input.newStudent.first_name.trim(),
            last_name: input.newStudent.last_name.trim(),
            cpf: input.newStudent.cpf?.trim() || null,
            birth_date: input.newStudent.birth_date || null,
            gender: input.newStudent.gender || "uninformed",
            email: input.newStudent.email?.trim().toLowerCase() || null,
            phone: input.newStudent.phone?.trim() || null,
            is_active: effectiveInitialStatus === "matriculado",
          },
        ])
        .select("id")
        .single();

      if (stdErr || !newStd) {
        return { success: false, error: stdErr?.message || "Erro ao cadastrar novo aluno." };
      }
      studentId = newStd.id;
    }

    if (!studentId) {
      return { success: false, error: "Identificação do aluno não fornecida." };
    }

    // --- Passo 2: Responsável (Reutilização ou Criação) ---
    if (input.isExistingGuardian && input.guardianId) {
      const { data: grdCheck } = await (supabase.from("guardians") as any)
        .select("id")
        .eq("id", input.guardianId)
        .eq("tenant_id", session.tenant.id)
        .single();

      if (!grdCheck) {
        return { success: false, error: "Responsável selecionado não pertence à instituição." };
      }
      guardianId = input.guardianId;

      // Assegura vinculação em student_guardians se ainda não existir
      await (supabase.from("student_guardians") as any).upsert([
        {
          tenant_id: session.tenant.id,
          student_id: studentId,
          guardian_id: guardianId,
          kinship: "outro",
          is_financial: true,
          is_pedagogical: true,
          has_custody: true,
        },
      ]);
    } else if (input.newGuardian && input.newGuardian.name.trim()) {
      if (!input.newGuardian.cpf?.trim()) {
        return { success: false, error: "CPF do responsável é obrigatório." };
      }

      const { data: newGrd, error: grdErr } = await (supabase.from("guardians") as any)
        .insert([
          {
            tenant_id: session.tenant.id,
            name: input.newGuardian.name.trim(),
            cpf: input.newGuardian.cpf.trim(),
            kinship: input.newGuardian.kinship || "outro",
            phone: input.newGuardian.phone?.trim() || null,
            email: input.newGuardian.email?.trim().toLowerCase() || null,
            is_financial_responsible: true,
            is_pedagogical_responsible: true,
          },
        ])
        .select("id")
        .single();

      if (grdErr || !newGrd) {
        return { success: false, error: grdErr?.message || "Erro ao cadastrar novo responsável." };
      }
      guardianId = newGrd.id;

      // Vincula na tabela associativa student_guardians
      await (supabase.from("student_guardians") as any).upsert([
        {
          tenant_id: session.tenant.id,
          student_id: studentId,
          guardian_id: guardianId,
          kinship: input.newGuardian.kinship || "outro",
          is_financial: true,
          is_pedagogical: true,
          has_custody: true,
        },
      ]);
    }

    // --- Passo 3: Validação de Turma e Capacidade (Fase 2 - Integração Acadêmica) ---
    const academicYear = input.academic_year?.trim() || "2026";
    const classId = input.class_id || null;
    const courseName = input.course_name.trim();
    const gradeLevel = input.grade_level.trim();
    const shift = input.shift || "matutino";

    if (classId) {
      const capCheck = await validateClassCapacityHelper(
        supabase,
        session.tenant.id,
        classId,
        effectiveInitialStatus === "matriculado",
        {
          academicYear,
          shift,
          courseName,
          gradeLevel,
        }
      );

      if (!capCheck.valid) {
        return { success: false, error: capCheck.error || "Capacidade da turma excedida ou dados acadêmicos incompatíveis." };
      }
    }

    let isFallback = false;

    // Checa se a tabela enrollments existe
    const { error: testTableErr } = await (supabase.from("enrollments") as any)
      .select("id")
      .limit(1);

    if (testTableErr && (testTableErr.code === "42P01" || testTableErr.message?.includes("does not exist"))) {
      isFallback = true;
    }

    let fallbackStore: any[] = [];
    if (isFallback) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();
      fallbackStore = (curTenant?.settings as Record<string, any>)?.enrollments_store || [];
    }

    const enrollmentCode = await generateUniqueEnrollmentCode(
      supabase,
      session.tenant.id,
      academicYear,
      isFallback,
      fallbackStore
    );

    const enrollmentRecord = {
      tenant_id: session.tenant.id,
      student_id: studentId,
      guardian_id: guardianId,
      enrollment_code: enrollmentCode,
      academic_year: academicYear,
      course_name: courseName,
      grade_level: gradeLevel,
      shift,
      class_id: classId,
      status: effectiveInitialStatus,
      status_notes: input.notes?.trim() || null,
      entry_date: new Date().toISOString().split("T")[0],
    };

    // Obtém dados do operador para histórico e auditoria
    const { data: userProfile } = await (supabase.from("profiles") as any)
      .select("first_name, last_name, email")
      .eq("id", session.user.id)
      .single();

    const userName = userProfile?.first_name
      ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
      : userProfile?.email || session.role;
    const initialReason = input.notes?.trim() || "Registro inicial de matrícula realizado na plataforma.";

    let finalId: string | undefined;

    if (!isFallback) {
      // 1. Tenta executar via RPC transacional atômica com lock FOR UPDATE na mesma transação
      //    (grava matrícula, histórico e audit_logs atomicamente no Postgres)
      let atomicExecuted = false;
      try {
        const { data: atomicRes, error: atomicErr } = await (supabase.rpc as any)(
          "create_enrollment_atomic",
          {
            p_tenant_id: session.tenant.id,
            p_student_id: studentId,
            p_guardian_id: guardianId,
            p_enrollment_code: enrollmentCode,
            p_academic_year: academicYear,
            p_course_name: courseName,
            p_grade_level: gradeLevel,
            p_shift: shift,
            p_class_id: classId,
            p_status: effectiveInitialStatus,
            p_status_notes: input.notes?.trim() || null,
            p_entry_date: enrollmentRecord.entry_date,
            p_user_id: session.user.id,
            p_user_name: userName,
            p_reason: initialReason,
          }
        );

        if (!atomicErr && atomicRes) {
          atomicExecuted = true;
          if (!atomicRes.success) {
            return { success: false, error: atomicRes.error || "Erro na validação transacional da turma." };
          }
          finalId = atomicRes.enrollment_id;
        }
      } catch {
        atomicExecuted = false;
      }

      // Se a RPC ainda não estiver criada no banco, faz insert direto com fallback resiliente
      if (!atomicExecuted) {
        const { data: inserted, error: insErr } = await (supabase.from("enrollments") as any)
          .insert([enrollmentRecord])
          .select("id")
          .single();

        if (insErr) {
          return { success: false, error: insErr.message || "Erro ao registrar matrícula." };
        }
        finalId = inserted?.id;

        // Reconciliação manual de histórico e auditoria quando não executado via RPC atômica
        await recordEnrollmentHistoryHelper(
          supabase,
          session.tenant.id,
          session.user.id,
          userName,
          finalId!,
          "ENROLLMENT_CREATED",
          {},
          {
            enrollment_code: enrollmentCode,
            academic_year: academicYear,
            course_name: input.course_name,
            grade_level: input.grade_level,
            shift: input.shift,
            class_id: classId,
            status: effectiveInitialStatus,
          },
          initialReason
        );

        try {
          await (supabase.from("audit_logs") as any).insert([
            {
              tenant_id: session.tenant.id,
              user_id: session.user.id,
              action: "ENROLLMENT_CREATED",
              entity_name: "enrollments",
              entity_id: finalId,
              new_values: {
                enrollment_code: enrollmentCode,
                student_id: studentId,
                academic_year: academicYear,
                course_name: input.course_name,
                grade_level: input.grade_level,
                shift: input.shift,
                class_id: classId,
                status: effectiveInitialStatus,
              },
            },
          ]);
        } catch (auditErr) {
          console.warn("[matriculas] Falha não impeditiva ao registrar audit_log de criação:", auditErr);
        }
      }
    } else {
      // Modo contingencial (P3):
      // No fallback JSONB, operações críticas de alocação confirmada ('matriculado') com turma vinculada
      // não podem garantir atomicidade e isolamento ACID contra race conditions simultâneas.
      // Desativa alocação confirmada de turma no fallback e orienta o gestor.
      if (classId && effectiveInitialStatus === "matriculado") {
        return {
          success: false,
          error: "A confirmação direta de matrícula com turma vinculada exige a infraestrutura de tabelas ativas para garantir o limite atômico de vagas contra operações simultâneas. Registre a matrícula como 'Pré-matrícula' ou 'Em Análise' durante o período de contingência.",
        };
      }

      finalId = crypto.randomUUID();
      const fallbackItem: Enrollment = {
        ...enrollmentRecord,
        id: finalId,
        exit_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const curList: Enrollment[] = curSettings.enrollments_store || [];

      await (supabase.from("tenants") as any)
        .update({
          settings: {
            ...curSettings,
            enrollments_store: [fallbackItem, ...curList],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);

      // Reconciliação no fallback store
      await recordEnrollmentHistoryHelper(
        supabase,
        session.tenant.id,
        session.user.id,
        userName,
        finalId,
        "ENROLLMENT_CREATED",
        {},
        {
          enrollment_code: enrollmentCode,
          academic_year: academicYear,
          course_name: input.course_name,
          grade_level: input.grade_level,
          shift: input.shift,
          class_id: classId,
          status: effectiveInitialStatus,
        },
        initialReason
      );
    }

    // Se a matrícula já nascer como "matriculado", garante que o estudante está marcado como ativo
    if (effectiveInitialStatus === "matriculado") {
      await (supabase.from("students") as any)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", studentId)
        .eq("tenant_id", session.tenant.id);
    }

    // Inicializa os documentos exigidos a partir do checklist da instituição
    if (finalId) {
      try {
        const chkRes = await getInstitutionChecklistSettingsAction();
        const templates = chkRes.templates;
        const initialDocs: EnrollmentDocumentItem[] = templates.map((tpl) => ({
          id: crypto.randomUUID(),
          enrollment_id: finalId!,
          tenant_id: session.tenant.id,
          document_type: tpl.document_type,
          document_name: tpl.document_name,
          status: "pendente",
          is_required: tpl.is_required,
          received_at: null,
          verified_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: docInsErr } = await (supabase.from("enrollment_documents") as any).insert(
          initialDocs
        );

        if (docInsErr) {
          throw new Error("fallback");
        }
      } catch {
        const { data: curT } = await (supabase.from("tenants") as any)
          .select("settings")
          .eq("id", session.tenant.id)
          .single();
        const cSettings = (curT?.settings as Record<string, any>) || {};
        const dStore = cSettings.enrollment_documents_store || {};
        const templates = cSettings.enrollment_checklist_settings || DEFAULT_DOCUMENT_TEMPLATES;
        dStore[finalId] = templates.map((tpl: any) => ({
          id: crypto.randomUUID(),
          enrollment_id: finalId!,
          tenant_id: session.tenant.id,
          document_type: tpl.document_type,
          document_name: tpl.document_name,
          status: "pendente",
          is_required: tpl.is_required,
          received_at: null,
          verified_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        await (supabase.from("tenants") as any)
          .update({
            settings: { ...cSettings, enrollment_documents_store: dStore },
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.tenant.id);
      }
    }

    revalidatePath("/app/matriculas");
    return { success: true, enrollmentId: finalId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao processar matrícula." };
  }
}

// ==============================================================================
// 4. ATUALIZAÇÃO DE STATUS DA MATRÍCULA COM CONSISTÊNCIA DE ALUNO E AUDITORIA
// ==============================================================================

export async function updateEnrollmentStatusAction(
  input: UpdateEnrollmentStatusInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Alçada RBAC: Apenas diretoria, coordenação, secretaria e comercial podem alterar status
    const session = await assertMatriculasAccess([
      "admin_escola",
      "coordenacao",
      "secretaria",
      "comercial",
    ]);
    const supabase = await createClient();

    // Validação de alçada do perfil comercial:
    if (
      session.role === "comercial" &&
      !["pre_matricula", "em_analise"].includes(input.targetStatus)
    ) {
      return {
        success: false,
        error: "O perfil Comercial apenas pode alternar entre Pré-matrícula e Em Análise. A formalização da matrícula é restrita à Secretaria.",
      };
    }

    // Exige justificativa caso a matrícula seja cancelada ou transferida
    if (
      ["cancelado", "transferido"].includes(input.targetStatus) &&
      (!input.notes || input.notes.trim().length < 3)
    ) {
      return {
        success: false,
        error: "É obrigatório registrar a justificativa ou documento para cancelamento ou transferência.",
      };
    }

    const exitDate = ["cancelado", "transferido"].includes(input.targetStatus)
      ? new Date().toISOString().split("T")[0]
      : null;

    let affectedStudentId: string | null = null;
    let oldStatus: EnrollmentStatus | null = null;
    let isFallback = false;

    // Obtém perfil do operador antes de qualquer transição
    const { data: userProfile } = await (supabase.from("profiles") as any)
      .select("first_name, last_name, email")
      .eq("id", session.user.id)
      .single();

    const userName = userProfile?.first_name
      ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
      : userProfile?.email || session.role;
    const statusReason = input.notes?.trim() || `Situação alterada para ${input.targetStatus}`;

    // 1. Tenta executar via RPC transacional atômica com lock FOR UPDATE na mesma transação
    //    (grava status, histórico essencial e audit_logs atomicamente no Postgres)
    let atomicExecuted = false;
    try {
      const { data: atomicRes, error: atomicErr } = await (supabase.rpc as any)(
        "update_enrollment_status_atomic",
        {
          p_tenant_id: session.tenant.id,
          p_enrollment_id: input.enrollmentId,
          p_target_status: input.targetStatus,
          p_notes: input.notes?.trim() || null,
          p_exit_date: exitDate,
          p_user_id: session.user.id,
          p_user_name: userName,
        }
      );

      if (!atomicErr && atomicRes) {
        if (!atomicRes.success) {
          return { success: false, error: atomicRes.error || "Erro na validação transacional ao alterar status." };
        }
        atomicExecuted = true;
        affectedStudentId = atomicRes.student_id;
        oldStatus = atomicRes.old_status as EnrollmentStatus;
      } else if (atomicErr && (atomicErr.code === "42P01" || atomicErr.message?.includes("does not exist"))) {
        isFallback = true;
      } else {
        // Tenta update direto na tabela física caso a procedure não exista
        const { data: updated, error: updErr } = await (supabase.from("enrollments") as any)
          .update({
            status: input.targetStatus,
            status_notes: input.notes?.trim() || null,
            exit_date: exitDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.enrollmentId)
          .eq("tenant_id", session.tenant.id)
          .select("student_id, status")
          .single();

        if (!updErr && updated) {
          affectedStudentId = updated.student_id;
          oldStatus = updated.status;
        } else if (updErr && (updErr.code === "42P01" || updErr.message?.includes("does not exist"))) {
          isFallback = true;
        } else {
          return { success: false, error: updErr?.message || "Erro ao atualizar situação." };
        }
      }
    } catch {
      isFallback = true;
    }

    if (isFallback) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const curList: Enrollment[] = curSettings.enrollments_store || [];

      const idx = curList.findIndex((e) => e.id === input.enrollmentId);
      if (idx >= 0) {
        // Desativa operações críticas de confirmação com turma no fallback (P3)
        if (input.targetStatus === "matriculado" && curList[idx].class_id) {
          return {
            success: false,
            error: "A confirmação de matrícula em turma vinculada está desativada no modo de contingência por não permitir garantia atômica de vagas concorrentes. Realize a confirmação após a ativação da infraestrutura de banco de dados.",
          };
        }

        oldStatus = curList[idx].status;
        affectedStudentId = curList[idx].student_id;

        curList[idx] = {
          ...curList[idx],
          status: input.targetStatus,
          status_notes: input.notes?.trim() || null,
          exit_date: exitDate,
          updated_at: new Date().toISOString(),
        };

        await (supabase.from("tenants") as any)
          .update({
            settings: { ...curSettings, enrollments_store: curList },
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.tenant.id);
      } else {
        return { success: false, error: "Registro de matrícula não localizado." };
      }
    }

    // 2. Sincroniza a situação ativa do aluno em students
    if (affectedStudentId) {
      if (input.targetStatus === "matriculado") {
        await (supabase.from("students") as any)
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", affectedStudentId)
          .eq("tenant_id", session.tenant.id);
      } else if (input.targetStatus === "cancelado" || input.targetStatus === "transferido") {
        // Verifica se o estudante possui alguma outra matrícula ativa/matriculada
        let hasOtherActive = false;
        try {
          const { count } = await (supabase.from("enrollments") as any)
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", session.tenant.id)
            .eq("student_id", affectedStudentId)
            .eq("status", "matriculado")
            .neq("id", input.enrollmentId);

          hasOtherActive = Boolean(count && count > 0);
        } catch {
          // Fallback check
          const { data: curTenant } = await (supabase.from("tenants") as any)
            .select("settings")
            .eq("id", session.tenant.id)
            .single();
          const curList: Enrollment[] = curTenant?.settings?.enrollments_store || [];
          hasOtherActive = curList.some(
            (e) =>
              e.student_id === affectedStudentId &&
              e.status === "matriculado" &&
              e.id !== input.enrollmentId
          );
        }

        // Se não possui nenhuma outra matrícula ativa, desativa o aluno no prontuário
        if (!hasOtherActive) {
          await (supabase.from("students") as any)
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", affectedStudentId)
            .eq("tenant_id", session.tenant.id);
        }
      }
    }

    // 3. Se a operação NÃO foi concluída atomicamente pela RPC, executa reconciliação de histórico e auditoria
    if (!atomicExecuted) {
      await recordEnrollmentHistoryHelper(
        supabase,
        session.tenant.id,
        session.user.id,
        userName,
        input.enrollmentId,
        "STATUS_CHANGED",
        { status: oldStatus },
        { status: input.targetStatus, exit_date: exitDate },
        statusReason
      );

      try {
        await (supabase.from("audit_logs") as any).insert([
          {
            tenant_id: session.tenant.id,
            user_id: session.user.id,
            action: "ENROLLMENT_STATUS_UPDATED",
            entity_name: "enrollments",
            entity_id: input.enrollmentId,
            new_values: {
              previous_status: oldStatus,
              target_status: input.targetStatus,
              notes: input.notes,
              exit_date: exitDate,
            },
          },
        ]);
      } catch (auditErr) {
        console.warn("[matriculas] Falha não impeditiva ao registrar audit_log de status:", auditErr);
      }
    }

    revalidatePath("/app/matriculas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao alterar situação da matrícula." };
  }
}

// ==============================================================================
// 5. CÁLCULO DE PROGRESSO DOCUMENTAL & HELPERS
// ==============================================================================

function computeDocumentProgress(
  docs: EnrollmentDocumentItem[] = []
): EnrollmentDocumentProgress {
  const total = docs.length;
  const received = docs.filter((d) => d.status === "recebido").length;
  const dispensed = docs.filter((d) => d.status === "dispensado").length;
  const pending = docs.filter((d) => d.status === "pendente").length;
  const rejected = docs.filter((d) => d.status === "rejeitado").length;
  const percent = total > 0 ? Math.round(((received + dispensed) / total) * 100) : 0;
  const requiredDocs = docs.filter((d) => d.is_required);
  const isComplete =
    requiredDocs.length > 0
      ? requiredDocs.every((d) => d.status === "recebido" || d.status === "dispensado")
      : total > 0;

  return { total, received, dispensed, pending, rejected, percent, isComplete };
}

// ==============================================================================
// 6. CHECKLIST PADRÃO CONFIGURÁVEL POR INSTITUIÇÃO (TENANT)
// ==============================================================================

export async function getInstitutionChecklistSettingsAction(): Promise<{
  success: boolean;
  templates: EnrollmentDocumentTemplate[];
  error?: string;
}> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    const { data: tenant, error } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    if (error || !tenant) {
      return { success: true, templates: DEFAULT_DOCUMENT_TEMPLATES };
    }

    const settings = (tenant.settings as Record<string, any>) || {};
    const configuredTemplates = settings.enrollment_checklist_settings as
      | EnrollmentDocumentTemplate[]
      | undefined;

    return {
      success: true,
      templates:
        configuredTemplates && configuredTemplates.length > 0
          ? configuredTemplates
          : DEFAULT_DOCUMENT_TEMPLATES,
    };
  } catch (err: any) {
    return {
      success: false,
      templates: DEFAULT_DOCUMENT_TEMPLATES,
      error: err?.message || "Erro ao consultar checklist institucional.",
    };
  }
}

export async function saveInstitutionChecklistSettingsAction(
  input: SaveChecklistSettingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Apenas diretoria e secretaria escolar podem alterar o padrão institucional
    const session = await assertMatriculasAccess(["admin_escola", "secretaria"]);
    const supabase = await createClient();

    if (!input.templates || input.templates.length === 0) {
      return { success: false, error: "A checklist deve conter ao menos um documento." };
    }

    const { data: currentTenant, error: fetchErr } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    if (fetchErr || !currentTenant) {
      return { success: false, error: "Instituição não localizada." };
    }

    const currentSettings = (currentTenant.settings as Record<string, any>) || {};

    const { error: updErr } = await (supabase.from("tenants") as any)
      .update({
        settings: {
          ...currentSettings,
          enrollment_checklist_settings: input.templates,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.tenant.id);

    if (updErr) {
      return { success: false, error: updErr.message || "Erro ao salvar checklist." };
    }

    // Auditoria sem dados sensíveis
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ENROLLMENT_CHECKLIST_SETTINGS_UPDATED",
        entity_name: "tenants",
        entity_id: session.tenant.id,
        new_values: {
          total_templates: input.templates.length,
          updated_at: new Date().toISOString(),
        },
      },
    ]);

    revalidatePath("/app/matriculas");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao atualizar checklist da instituição.",
    };
  }
}

// ==============================================================================
// 7. GESTÃO DOS DOCUMENTOS DA MATRÍCULA
// ==============================================================================

export async function getEnrollmentDocumentsAction(enrollmentId: string): Promise<{
  success: boolean;
  documents: EnrollmentDocumentItem[];
  progress: EnrollmentDocumentProgress;
  error?: string;
}> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    // 1. Obtém a checklist padrão da instituição para caso a matrícula ainda não tenha itens
    const checklistRes = await getInstitutionChecklistSettingsAction();
    const templates = checklistRes.templates;

    // 2. Tenta consultar public.enrollment_documents
    let docs: EnrollmentDocumentItem[] = [];
    const { data: dbDocs, error: dbErr } = await (supabase.from("enrollment_documents") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: true });

    if (!dbErr && dbDocs && dbDocs.length > 0) {
      docs = dbDocs as EnrollmentDocumentItem[];
    } else {
      // Fallback em tenants.settings->'enrollment_documents_store'
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const docStore: Record<string, EnrollmentDocumentItem[]> =
        curSettings.enrollment_documents_store || {};

      if (docStore[enrollmentId] && docStore[enrollmentId].length > 0) {
        docs = docStore[enrollmentId];
      } else {
        // Inicializa documentos a partir do template padrão
        docs = templates.map((tpl) => ({
          id: crypto.randomUUID(),
          enrollment_id: enrollmentId,
          tenant_id: session.tenant.id,
          document_type: tpl.document_type,
          document_name: tpl.document_name,
          status: "pendente" as const,
          is_required: tpl.is_required,
          received_at: null,
          verified_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // Persiste a inicialização
        try {
          await (supabase.from("enrollment_documents") as any).insert(docs);
        } catch {
          // Salva no fallback
          docStore[enrollmentId] = docs;
          await (supabase.from("tenants") as any)
            .update({
              settings: { ...curSettings, enrollment_documents_store: docStore },
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.tenant.id);
        }
      }
    }

    const progress = computeDocumentProgress(docs);
    return { success: true, documents: docs, progress };
  } catch (err: any) {
    return {
      success: false,
      documents: [],
      progress: {
        total: 0,
        received: 0,
        dispensed: 0,
        pending: 0,
        rejected: 0,
        percent: 0,
        isComplete: false,
      },
      error: err?.message || "Erro ao consultar documentos da matrícula.",
    };
  }
}

export async function updateEnrollmentDocumentStatusAction(
  input: UpdateEnrollmentDocumentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertMatriculasAccess([
      "admin_escola",
      "coordenacao",
      "secretaria",
      "comercial",
    ]);
    const supabase = await createClient();

    const receivedAt =
      input.status === "recebido" ? new Date().toISOString() : null;

    const payload = {
      status: input.status,
      notes: input.notes?.trim() || null,
      received_at: receivedAt,
      verified_by: session.user.id,
      updated_at: new Date().toISOString(),
    };

    let updated = false;

    // 1. Tenta atualizar na tabela public.enrollment_documents
    try {
      let query = (supabase.from("enrollment_documents") as any)
        .update(payload)
        .eq("tenant_id", session.tenant.id)
        .eq("enrollment_id", input.enrollmentId);

      if (input.documentId && !input.documentId.startsWith("virtual-")) {
        query = query.eq("id", input.documentId);
      } else {
        query = query.eq("document_type", input.documentType);
      }

      const { data, error } = await query.select("id").maybeSingle();
      if (!error && data) {
        updated = true;
      }
    } catch {
      updated = false;
    }

    // 2. Fallback em tenants.settings->'enrollment_documents_store' se a tabela ainda não existir
    if (!updated) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const docStore: Record<string, EnrollmentDocumentItem[]> =
        curSettings.enrollment_documents_store || {};

      let list = docStore[input.enrollmentId] || [];

      // Se a lista ainda não existir no fallback, inicializa com os defaults
      if (list.length === 0) {
        const templates =
          curSettings.enrollment_checklist_settings || DEFAULT_DOCUMENT_TEMPLATES;
        list = templates.map((tpl: any) => ({
          id: crypto.randomUUID(),
          enrollment_id: input.enrollmentId,
          tenant_id: session.tenant.id,
          document_type: tpl.document_type,
          document_name: tpl.document_name,
          status: "pendente",
          is_required: tpl.is_required,
          received_at: null,
          verified_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      }

      const itemIdx = list.findIndex(
        (d) =>
          (input.documentId && d.id === input.documentId) ||
          d.document_type === input.documentType
      );

      if (itemIdx >= 0) {
        list[itemIdx] = {
          ...list[itemIdx],
          status: input.status,
          notes: input.notes?.trim() || null,
          received_at: receivedAt,
          verified_by: session.user.id,
          updated_at: new Date().toISOString(),
        };
      } else {
        // Documento novo
        list.push({
          id: crypto.randomUUID(),
          enrollment_id: input.enrollmentId,
          tenant_id: session.tenant.id,
          document_type: input.documentType,
          document_name: input.documentType,
          status: input.status,
          is_required: true,
          received_at: receivedAt,
          verified_by: session.user.id,
          notes: input.notes?.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      docStore[input.enrollmentId] = list;
      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, enrollment_documents_store: docStore },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // 3. Auditoria sem dados pessoais ou documentos sensíveis
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ENROLLMENT_DOCUMENT_UPDATED",
        entity_name: "enrollment_documents",
        entity_id: input.enrollmentId,
        new_values: {
          document_type: input.documentType,
          target_status: input.status,
          has_notes: Boolean(input.notes?.trim()),
          received_at: receivedAt,
        },
      },
    ]);

    revalidatePath("/app/matriculas");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao atualizar situação do documento.",
    };
  }
}

export async function addCustomEnrollmentDocumentAction(
  input: AddCustomEnrollmentDocumentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertMatriculasAccess([
      "admin_escola",
      "coordenacao",
      "secretaria",
    ]);
    const supabase = await createClient();

    if (!input.documentName.trim()) {
      return { success: false, error: "Nome do documento é obrigatório." };
    }

    const docType =
      input.documentType ||
      input.documentName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 50);

    const newDocItem: EnrollmentDocumentItem = {
      id: crypto.randomUUID(),
      enrollment_id: input.enrollmentId,
      tenant_id: session.tenant.id,
      document_type: docType,
      document_name: input.documentName.trim(),
      status: "pendente",
      is_required: input.isRequired,
      received_at: null,
      verified_by: null,
      notes: input.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let inserted = false;
    try {
      const { error: insErr } = await (supabase.from("enrollment_documents") as any).insert([
        newDocItem,
      ]);
      if (!insErr) inserted = true;
    } catch {
      inserted = false;
    }

    if (!inserted) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const docStore: Record<string, EnrollmentDocumentItem[]> =
        curSettings.enrollment_documents_store || {};

      const list = docStore[input.enrollmentId] || [];
      list.push(newDocItem);
      docStore[input.enrollmentId] = list;

      await (supabase.from("tenants") as any)
        .update({
          settings: { ...curSettings, enrollment_documents_store: docStore },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.tenant.id);
    }

    // Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ENROLLMENT_DOCUMENT_ADDED",
        entity_name: "enrollment_documents",
        entity_id: input.enrollmentId,
        new_values: {
          document_name: input.documentName,
          is_required: input.isRequired,
        },
      },
    ]);

    revalidatePath("/app/matriculas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao adicionar documento." };
  }
}

// ==============================================================================
// 9. HELPER: REGISTRO NO HISTÓRICO DA MATRÍCULA (TABELA OU FALLBACK)
// ==============================================================================

async function recordEnrollmentHistoryHelper(
  supabase: any,
  tenantId: string,
  userId: string,
  userName: string,
  enrollmentId: string,
  actionType: string,
  previousValues: Record<string, any>,
  newValues: Record<string, any>,
  reason: string
): Promise<void> {
  const historyItem: EnrollmentHistoryItem = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    enrollment_id: enrollmentId,
    action_type: actionType,
    previous_values: previousValues,
    new_values: newValues,
    changed_by: userId,
    changed_by_name: userName,
    reason: reason.trim(),
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Tenta inserir na tabela física public.enrollment_history
    const { error } = await (supabase.from("enrollment_history") as any).insert([
      historyItem,
    ]);

    if (!error) return;
  } catch {
    // Continua para o fallback se a tabela física não existir
  }

  // 2. Fallback resiliente no JSONB do tenant (settings.enrollment_history_store)
  try {
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", tenantId)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    const hStore: Record<string, EnrollmentHistoryItem[]> =
      curSettings.enrollment_history_store || {};
    const list = hStore[enrollmentId] || [];
    list.unshift(historyItem); // Mais recentes primeiro
    hStore[enrollmentId] = list;

    await (supabase.from("tenants") as any)
      .update({
        settings: { ...curSettings, enrollment_history_store: hStore },
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);
  } catch {
    // Silencia eventuais falhas de fallback
  }
}

// ==============================================================================
// 10. CONSULTA DO HISTÓRICO DA MATRÍCULA (FASE 3)
// ==============================================================================

export async function getEnrollmentHistoryAction(
  enrollmentId: string
): Promise<{ success: boolean; history: EnrollmentHistoryItem[]; error?: string }> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    // 1. Tenta consultar a tabela física public.enrollment_history
    try {
      const { data, error } = await (supabase.from("enrollment_history") as any)
        .select("*")
        .eq("tenant_id", session.tenant.id)
        .eq("enrollment_id", enrollmentId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return { success: true, history: data as EnrollmentHistoryItem[] };
      }
    } catch {
      // Tabela física pode ainda não ter sido migrada
    }

    // 2. Fallback JSONB store
    const { data: curTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const curSettings = (curTenant?.settings as Record<string, any>) || {};
    const hStore: Record<string, EnrollmentHistoryItem[]> =
      curSettings.enrollment_history_store || {};
    const list = hStore[enrollmentId] || [];

    return { success: true, history: list };
  } catch (err: any) {
    return { success: false, history: [], error: err?.message || "Erro ao consultar histórico." };
  }
}

// ==============================================================================
// 11. EDIÇÃO DE DADOS ACADÊMICOS DA MATRÍCULA (FASE 3)
// ==============================================================================

export async function updateEnrollmentAcademicDataAction(
  input: UpdateEnrollmentAcademicDataInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Alçada RBAC: Apenas diretoria, coordenação e secretaria podem editar dados acadêmicos
    const session = await assertMatriculasAccess([
      "admin_escola",
      "coordenacao",
      "secretaria",
    ]);
    const supabase = await createClient();

    const trimmedReason = input.reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      return {
        success: false,
        error: "A justificativa da alteração acadêmica é obrigatória (mínimo de 5 caracteres).",
      };
    }

    if (!input.academic_year?.trim() || !input.course_name?.trim() || !input.grade_level?.trim()) {
      return {
        success: false,
        error: "Ano letivo, curso/segmento e série/ano são campos obrigatórios.",
      };
    }

    // Obter dados atuais da matrícula para validação de bloqueio e auditoria
    let currentEnrollment: Enrollment | null = null;

    // Consulta na tabela física
    try {
      const { data, error } = await (supabase.from("enrollments") as any)
        .select("*")
        .eq("id", input.enrollmentId)
        .eq("tenant_id", session.tenant.id)
        .single();

      if (!error && data) {
        currentEnrollment = data as Enrollment;
      }
    } catch {
      // Ignora erro se a tabela física ainda não existir
    }

    // Se não encontrou na tabela física, busca no fallback store
    if (!currentEnrollment) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const curList: Enrollment[] = curSettings.enrollments_store || [];
      const found = curList.find((e) => e.id === input.enrollmentId);
      if (found) {
        currentEnrollment = found;
      }
    }

    if (!currentEnrollment) {
      return {
        success: false,
        error: "Matrícula não encontrada neste tenant ou acesso não autorizado.",
      };
    }

    // Regra de Bloqueio: Matrículas canceladas ou transferidas não podem ter dados acadêmicos alterados
    if (currentEnrollment.status === "cancelado" || currentEnrollment.status === "transferido") {
      return {
        success: false,
        error: `Não é permitido alterar os dados acadêmicos de uma matrícula com situação "${
          currentEnrollment.status === "cancelado" ? "Cancelada" : "Transferida"
        }".`,
      };
    }

    // Validação de Turma e Capacidade (Fase 2 - Integração Acadêmica)
    const targetClassId = input.class_id !== undefined ? input.class_id : (currentEnrollment as any).class_id || null;

    if (targetClassId && targetClassId !== (currentEnrollment as any).class_id) {
      const capCheck = await validateClassCapacityHelper(
        supabase,
        session.tenant.id,
        targetClassId,
        currentEnrollment.status === "matriculado",
        {
          academicYear: input.academic_year?.trim(),
          shift: input.shift,
          courseName: input.course_name?.trim(),
          gradeLevel: input.grade_level?.trim(),
          excludeEnrollmentId: input.enrollmentId,
        }
      );

      if (!capCheck.valid) {
        return { success: false, error: capCheck.error || "Capacidade da turma excedida." };
      }
    }

    // Busca dados legíveis da turma anterior e nova para histórico claro
    let previousClassName: string | null = null;
    let newClassName: string | null = null;

    const previousClassId = (currentEnrollment as any).class_id || null;
    if (previousClassId) {
      const pClass = await validateClassCapacityHelper(supabase, session.tenant.id, previousClassId, false);
      previousClassName = pClass.schoolClass?.name || null;
    }
    if (targetClassId) {
      const nClass = await validateClassCapacityHelper(supabase, session.tenant.id, targetClassId, false);
      newClassName = nClass.schoolClass?.name || null;
    }

    // Compara se houve alteração real
    const previousValues = {
      academic_year: currentEnrollment.academic_year,
      course_name: currentEnrollment.course_name,
      grade_level: currentEnrollment.grade_level,
      shift: currentEnrollment.shift,
      class_id: previousClassId,
      class_name: previousClassName,
    };

    const newValues = {
      academic_year: input.academic_year.trim(),
      course_name: input.course_name.trim(),
      grade_level: input.grade_level.trim(),
      shift: input.shift,
      class_id: targetClassId,
      class_name: newClassName,
    };

    const hasChanged =
      previousValues.academic_year !== newValues.academic_year ||
      previousValues.course_name !== newValues.course_name ||
      previousValues.grade_level !== newValues.grade_level ||
      previousValues.shift !== newValues.shift ||
      previousValues.class_id !== newValues.class_id;

    if (!hasChanged) {
      return {
        success: false,
        error: "Nenhum dado acadêmico foi modificado.",
      };
    }

    const updatePayload = {
      academic_year: newValues.academic_year,
      course_name: newValues.course_name,
      grade_level: newValues.grade_level,
      shift: newValues.shift,
      class_id: newValues.class_id,
      updated_at: new Date().toISOString(),
    };

    // Obtém nome e dados do operador antes da atualização
    const { data: userProfile } = await (supabase.from("profiles") as any)
      .select("first_name, last_name, email")
      .eq("id", session.user.id)
      .single();

    const userName = userProfile?.first_name
      ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim()
      : userProfile?.email || session.role;

    // 1. Tenta atualizar via RPC transacional atômica com lock FOR UPDATE na mesma transação
    //    (grava matrícula, histórico essencial e audit_logs atomicamente no Postgres)
    let atomicExecuted = false;
    let updatedOnPhysical = false;
    try {
      const { data: atomicRes, error: atomicErr } = await (supabase.rpc as any)(
        "update_enrollment_academic_atomic",
        {
          p_tenant_id: session.tenant.id,
          p_enrollment_id: input.enrollmentId,
          p_academic_year: newValues.academic_year,
          p_course_name: newValues.course_name,
          p_grade_level: newValues.grade_level,
          p_shift: newValues.shift,
          p_class_id: newValues.class_id,
          p_user_id: session.user.id,
          p_user_name: userName,
          p_reason: trimmedReason,
          p_previous_class_name: previousClassName,
          p_new_class_name: newClassName,
        }
      );

      if (!atomicErr && atomicRes) {
        if (!atomicRes.success) {
          return { success: false, error: atomicRes.error || "Erro na validação transacional ao alterar turma." };
        }
        atomicExecuted = true;
        updatedOnPhysical = true;
      } else if (!atomicErr || (atomicErr.code !== "42P01" && !atomicErr.message?.includes("does not exist"))) {
        // Tenta update direto na tabela física caso a procedure não exista ainda
        const { error: updErr } = await (supabase.from("enrollments") as any)
          .update(updatePayload)
          .eq("id", input.enrollmentId)
          .eq("tenant_id", session.tenant.id);

        if (!updErr) {
          updatedOnPhysical = true;
        }
      }
    } catch {
      // Falha se tabela física não existir
    }

    // 2. Se não atualizou na física, atualiza no fallback
    if (!updatedOnPhysical) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const curList: Enrollment[] = curSettings.enrollments_store || [];
      const idx = curList.findIndex((e) => e.id === input.enrollmentId);

      if (idx >= 0) {
        // Desativa troca de turma no modo contingencial para matrículas com status 'matriculado' (P3)
        if (
          curList[idx].status === "matriculado" &&
          newValues.class_id &&
          newValues.class_id !== (curList[idx].class_id || null)
        ) {
          return {
            success: false,
            error: "A alteração de turma para matrículas ativas está desativada no modo contingencial para evitar divergências e sobrelotação concorrente. Execute a migração do banco de dados para habilitar a atomicidade.",
          };
        }

        curList[idx] = {
          ...curList[idx],
          ...updatePayload,
        };

        await (supabase.from("tenants") as any)
          .update({
            settings: { ...curSettings, enrollments_store: curList },
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.tenant.id);
      }
    }

    // 3. Se NÃO foi gravado via RPC atômica, executa reconciliação de histórico e auditoria
    if (!atomicExecuted) {
      await recordEnrollmentHistoryHelper(
        supabase,
        session.tenant.id,
        session.user.id,
        userName,
        input.enrollmentId,
        "ACADEMIC_DATA_UPDATED",
        previousValues,
        newValues,
        trimmedReason
      );

      try {
        await (supabase.from("audit_logs") as any).insert([
          {
            tenant_id: session.tenant.id,
            user_id: session.user.id,
            action: "ENROLLMENT_ACADEMIC_DATA_UPDATED",
            entity_name: "enrollments",
            entity_id: input.enrollmentId,
            new_values: {
              previous: previousValues,
              updated: newValues,
              reason: trimmedReason,
            },
          },
        ]);
      } catch (auditErr) {
        console.warn("[matriculas] Falha não impeditiva ao registrar audit_log de dados acadêmicos:", auditErr);
      }
    }

    revalidatePath("/app/matriculas");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao atualizar dados acadêmicos da matrícula.",
    };
  }
}

// ==============================================================================
// 12. CONSULTA DETALHADA DA MATRÍCULA (FASE 4)
// ==============================================================================

export async function getEnrollmentByIdAction(
  enrollmentId: string
): Promise<{ success: boolean; enrollment?: Enrollment; error?: string }> {
  try {
    const session = await assertMatriculasAccess();
    const supabase = await createClient();

    let enrollment: Enrollment | null = null;

    // 1. Tenta buscar na tabela física public.enrollments
    try {
      const { data, error } = await (supabase.from("enrollments") as any)
        .select(`
          *,
          student:students(
            *,
            guardians:student_guardians(
              id,
              guardian_id,
              kinship,
              is_financial,
              guardian:guardians(*)
            )
          ),
          guardian:guardians(*),
          school_class:school_classes(
            *,
            series:series(
              *,
              course:courses(*)
            )
          )
        `)
        .eq("id", enrollmentId)
        .eq("tenant_id", session.tenant.id)
        .single();

      if (!error && data) {
        enrollment = data as Enrollment;
      }
    } catch {
      // Falha se tabela física não existir
    }

    // 2. Se não encontrou, busca no fallback store
    if (!enrollment) {
      const { data: curTenant } = await (supabase.from("tenants") as any)
        .select("settings")
        .eq("id", session.tenant.id)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const curList: Enrollment[] = curSettings.enrollments_store || [];
      const found = curList.find((e) => e.id === enrollmentId);

      if (found) {
        const { data: studentData } = await (supabase.from("students") as any)
          .select(`
            *,
            guardians:student_guardians(
              id,
              guardian_id,
              kinship,
              is_financial,
              guardian:guardians(*)
            )
          `)
          .eq("id", found.student_id)
          .eq("tenant_id", session.tenant.id)
          .single();

        let guardianData = null;
        if (found.guardian_id) {
          const { data: grd } = await (supabase.from("guardians") as any)
            .select("*")
            .eq("id", found.guardian_id)
            .eq("tenant_id", session.tenant.id)
            .single();
          guardianData = grd;
        }

        const classesList: SchoolClass[] = curSettings.academic_classes_store || [];
        const seriesList: Series[] = curSettings.academic_series_store || [];
        const courses: Course[] = curSettings.academic_courses_store || [];
        const coursesMap = new Map(courses.map((c) => [c.id, c]));
        const fClass = classesList.find((c) => c.id === found.class_id);
        const fSeries = fClass ? seriesList.find((s) => s.id === fClass.series_id) : null;
        const schoolClassData = fClass
          ? {
              ...fClass,
              series: fSeries
                ? { ...fSeries, course: coursesMap.get(fSeries.course_id) }
                : undefined,
            }
          : found.school_class;

        enrollment = {
          ...found,
          student: studentData || found.student,
          guardian: guardianData || found.guardian,
          school_class: schoolClassData,
        };
      }
    }


    if (!enrollment) {
      return { success: false, error: "Matrícula não encontrada neste tenant ou acesso não autorizado." };
    }

    // 3. Carrega Documentos e Progresso
    const enrichedList = await attachDocumentsAndProgressToEnrollments(
      supabase,
      session.tenant.id,
      [enrollment]
    );
    enrollment = enrichedList[0];

    // 4. Carrega Histórico
    const historyRes = await getEnrollmentHistoryAction(enrollmentId);
    if (historyRes.success) {
      enrollment.history = historyRes.history;
    }

    return { success: true, enrollment };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar detalhes da matrícula." };
  }
}

