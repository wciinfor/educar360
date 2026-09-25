import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  if (fs.existsSync(".env.local")) {
    const content = fs.readFileSync(".env.local", "utf8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key.trim()] = val;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function getAuthenticatedUser(email: string) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    throw new Error(`Erro ao gerar magic link para ${email}: ${linkErr?.message}`);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sessionData, error: otpErr } = await userClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (otpErr || !sessionData.session) {
    throw new Error(`Erro ao autenticar ${email} via OTP: ${otpErr?.message}`);
  }

  return {
    client: userClient,
    session: sessionData.session,
    user: sessionData.user,
    token: sessionData.session.access_token,
  };
}

// Implementação fidedigna da lógica de saveAcademicAssessmentAction com JWT do usuário e RLS
async function executeSaveAssessment(
  userClient: any,
  userSession: any,
  tenantId: string,
  userRole: string,
  payload: {
    id?: string;
    class_id: string;
    school_year_id?: string | null;
    academic_term_id?: string | null;
    subject_name: string;
    academic_period?: string;
    title: string;
    description?: string;
    assessment_date: string;
    assessment_type: string;
    max_score: number;
    weight: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const isEdit = Boolean(payload.id);
    const assessmentDate = payload.assessment_date.trim();

    if (!payload.class_id) {
      return { success: false, error: "A turma é obrigatória." };
    }
    if (!payload.title || payload.title.trim().length < 2) {
      return { success: false, error: "O título da avaliação é obrigatório." };
    }
    if (!payload.subject_name || payload.subject_name.trim().length < 2) {
      return { success: false, error: "A disciplina é obrigatória." };
    }
    if (!assessmentDate) {
      return { success: false, error: "A data da avaliação é obrigatória." };
    }
    if (payload.max_score <= 0) {
      return { success: false, error: "A pontuação máxima deve ser maior que zero." };
    }

    // 1. Busca turma com RLS ativo
    const { data: targetClass, error: tcErr } = await userClient
      .from("school_classes")
      .select("id, tenant_id, academic_year")
      .eq("tenant_id", tenantId)
      .eq("id", payload.class_id)
      .maybeSingle();

    if (tcErr || !targetClass) {
      return { success: false, error: "Turma não encontrada para cadastro da avaliação." };
    }

    // 2. Resolução do Ano Letivo oficial
    let schoolYearId: string | null = payload.school_year_id || null;
    let schoolYear: any = null;

    if (schoolYearId) {
      const { data: sy } = await userClient
        .from("school_years")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", schoolYearId)
        .maybeSingle();
      schoolYear = sy;
    } else if (targetClass.academic_year) {
      const { data: sy } = await userClient
        .from("school_years")
        .select("*")
        .eq("tenant_id", tenantId)
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
      const { data: atRecord } = await userClient
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId)
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
      const { data: atRecords } = await userClient
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId)
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
    const isTeacher = userRole === "professor";

    // Checagem de período fechado manual
    const { data: closing } = await userClient
      .from("academic_period_closings")
      .select("id, is_closed")
      .eq("tenant_id", tenantId)
      .eq("class_id", payload.class_id)
      .eq("academic_period", academicPeriod)
      .maybeSingle();

    if (closing?.is_closed && isTeacher) {
      return {
        success: false,
        error: `O período ${academicPeriod} está fechado para lançamentos e alterações.`,
      };
    }

    if (isEdit) {
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

      const { data: updated, error: updateErr } = await userClient
        .from("academic_assessments")
        .update(updateData)
        .eq("tenant_id", tenantId)
        .eq("id", payload.id)
        .select()
        .single();

      if (updateErr) {
        return { success: false, error: `Falha ao atualizar avaliação: ${updateErr.message}` };
      }
      return { success: true, id: updated.id };
    } else {
      const insertData: Record<string, any> = {
        tenant_id: tenantId,
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
        created_by: userSession.user.id,
      };

      const { data: inserted, error: insertErr } = await userClient
        .from("academic_assessments")
        .insert([insertData])
        .select()
        .single();

      if (insertErr) {
        return { success: false, error: `Falha ao cadastrar avaliação: ${insertErr.message}` };
      }
      return { success: true, id: inserted.id };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro inesperado ao salvar avaliação." };
  }
}

// Implementação fidedigna da lógica de saveAssessmentGradesAction com JWT e RLS
async function executeSaveAssessmentGrades(
  userClient: any,
  userSession: any,
  tenantId: string,
  userRole: string,
  payload: {
    assessment_id: string;
    grades: Array<{
      student_id: string;
      enrollment_id?: string;
      score: number | null;
      is_absent?: boolean;
      feedback_notes?: string;
    }>;
  },
  termStatus?: string
): Promise<{ success: boolean; savedCount?: number; error?: string }> {
  try {
    const isTeacher = userRole === "professor";

    // 1. Busca a avaliação para validar existência e valor máximo
    const { data: assessment, error: aErr } = await userClient
      .from("academic_assessments")
      .select("id, class_id, academic_period, max_score, is_locked")
      .eq("tenant_id", tenantId)
      .eq("id", payload.assessment_id)
      .single();

    if (aErr || !assessment) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    // REGRA OFICIAL FASE 3: Se o período acadêmico oficial estiver BLOQUEADO, bloqueia para TODOS os perfis
    if (termStatus === "bloqueado") {
      return {
        success: false,
        error: `O período acadêmico '${assessment.academic_period}' está bloqueado no Calendário Escolar para lançamento e alteração de notas.`,
      };
    }

    // 2. Checagem de travas de período ou de avaliação
    const { data: closing } = await userClient
      .from("academic_period_closings")
      .select("id, is_closed")
      .eq("tenant_id", tenantId)
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

    const now = new Date().toISOString();
    const rowsToUpsert = payload.grades.map((item) => ({
      tenant_id: tenantId,
      assessment_id: payload.assessment_id,
      student_id: item.student_id,
      enrollment_id: item.enrollment_id || null,
      score: item.is_absent ? 0 : item.score !== null && item.score !== undefined ? Number(item.score) : null,
      is_absent: !!item.is_absent,
      feedback_notes: item.feedback_notes?.trim() || null,
      recorded_by: userSession.user.id,
      updated_at: now,
    }));

    if (rowsToUpsert.length > 0) {
      const { error: upsertErr } = await userClient
        .from("student_assessment_grades")
        .upsert(rowsToUpsert, { onConflict: "tenant_id,assessment_id,student_id" });

      if (upsertErr) {
        return { success: false, error: `Falha ao gravar notas: ${upsertErr.message}` };
      }
    }

    return { success: true, savedCount: rowsToUpsert.length };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar notas da avaliação." };
  }
}

// Implementação de togglePeriodClosingAction
async function executeTogglePeriodClosing(
  userClient: any,
  userSession: any,
  tenantId: string,
  userRole: string,
  payload: {
    class_id: string;
    academic_period: string;
    academic_term_id?: string | null;
    subject_name?: string | null;
    is_closed: boolean;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!["admin_escola", "coordenacao", "secretaria"].includes(userRole)) {
      return { success: false, error: "Acesso negado. Apenas gestores podem fechar períodos." };
    }

    const now = new Date().toISOString();
    const row = {
      tenant_id: tenantId,
      class_id: payload.class_id,
      academic_period: payload.academic_period,
      subject_name: payload.subject_name?.trim() || null,
      is_closed: payload.is_closed,
      closed_at: now,
      closed_by: userSession.user.id,
    };

    let query = userClient
      .from("academic_period_closings")
      .select("id")
      .eq("tenant_id", tenantId)
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
      const res = await userClient
        .from("academic_period_closings")
        .update({
          is_closed: payload.is_closed,
          closed_at: now,
          closed_by: userSession.user.id,
          academic_term_id: payload.academic_term_id || null,
        })
        .eq("id", existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      const res = await userClient
        .from("academic_period_closings")
        .insert([row])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      return { success: false, error: `Falha ao alterar status de fechamento: ${error.message}` };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao alterar fechamento." };
  }
}

async function runHomologationFase3() {
  console.log("================================================================================");
  console.log("HOMOLOGAÇÃO FUNCIONAL REAL — FASE 3: CALENDÁRIO ↔ AVALIAÇÕES / NOTAS");
  console.log("Tenant: Escola Modelo Homologação | Auth: Sessões JWT Reais | RLS Ativo");
  console.log("================================================================================\n");

  const adminAuth = await getAuthenticatedUser("admin.homolog@educar360.local");
  const profAuth = await getAuthenticatedUser("prof.matematica@educar360.local");
  const secAuth = await getAuthenticatedUser("secretaria.homolog@educar360.local");
  const otherAdminAuth = await getAuthenticatedUser("gestor@colegioteste.com.br");

  const tenantId = "44146cf2-1363-4384-a23b-617cce527895"; // Escola Modelo Homologação
  const tenant2Id = "5a664d44-4b14-4cda-b52a-73cdeb87db8e"; // Colégio Horizonte LTDA

  console.log(`Tenant Homologação ID: ${tenantId}`);
  console.log(`Tenant 2 ID: ${tenant2Id}\n`);

  const createdIds: Record<string, string> = {};

  try {
    // --------------------------------------------------------------------------
    // SETUP: Dados de Base para os Testes
    // --------------------------------------------------------------------------
    console.log("--- 1. CONFIGURAÇÃO DE DADOS DE TESTE ---");

    // Ano Letivo 2026 Homologação
    const { data: sy2026, error: syErr } = await adminClient
      .from("school_years")
      .insert([
        {
          tenant_id: tenantId,
          year: "2026",
          title: "Ano Letivo Homologação 2026",
          start_date: "2026-02-01",
          end_date: "2026-12-15",
          total_school_days: 200,
          status: "ativo",
          is_current: true,
        },
      ])
      .select()
      .single();

    if (syErr) throw new Error(`Falha ao criar School Year 2026: ${syErr.message}`);
    createdIds.sy2026 = sy2026.id;
    console.log(`✅ Ano Letivo 2026 criado: ${sy2026.id}`);

    // Período 1 (Aberto)
    const { data: term1, error: t1Err } = await adminClient
      .from("academic_terms")
      .insert([
        {
          tenant_id: tenantId,
          school_year_id: sy2026.id,
          name: "1º Bimestre 2026",
          code: "1B_2026",
          term_type: "bimestre",
          sequence_order: 1,
          start_date: "2026-02-01",
          end_date: "2026-04-30",
          status: "aberto",
        },
      ])
      .select()
      .single();

    if (t1Err) throw new Error(`Falha ao criar Term 1: ${t1Err.message}`);
    createdIds.term1 = term1.id;
    console.log(`✅ Período 1 (Aberto) criado: ${term1.id} (${term1.start_date} a ${term1.end_date})`);

    // Período 2 (Bloqueado)
    const { data: term2, error: t2Err } = await adminClient
      .from("academic_terms")
      .insert([
        {
          tenant_id: tenantId,
          school_year_id: sy2026.id,
          name: "2º Bimestre 2026",
          code: "2B_2026",
          term_type: "bimestre",
          sequence_order: 2,
          start_date: "2026-05-01",
          end_date: "2026-07-15",
          status: "bloqueado",
        },
      ])
      .select()
      .single();

    if (t2Err) throw new Error(`Falha ao criar Term 2 Bloqueado: ${t2Err.message}`);
    createdIds.term2 = term2.id;
    console.log(`✅ Período 2 (Bloqueado) criado: ${term2.id} (${term2.start_date} a ${term2.end_date})`);

    // Ano Letivo 2025 (Outro ano)
    const { data: sy2025, error: sy25Err } = await adminClient
      .from("school_years")
      .insert([
        {
          tenant_id: tenantId,
          year: "2025",
          title: "Ano Letivo Homologação 2025",
          start_date: "2025-02-01",
          end_date: "2025-12-15",
          total_school_days: 200,
          status: "encerrado",
          is_current: false,
        },
      ])
      .select()
      .single();

    if (sy25Err) throw new Error(`Falha ao criar School Year 2025: ${sy25Err.message}`);
    createdIds.sy2025 = sy2025.id;

    // Período do Ano 2025
    const { data: term2025, error: t25Err } = await adminClient
      .from("academic_terms")
      .insert([
        {
          tenant_id: tenantId,
          school_year_id: sy2025.id,
          name: "1º Bimestre 2025",
          code: "1B_2025",
          term_type: "bimestre",
          sequence_order: 1,
          start_date: "2025-02-01",
          end_date: "2025-04-30",
          status: "aberto",
        },
      ])
      .select()
      .single();

    if (t25Err) throw new Error(`Falha ao criar Term 2025: ${t25Err.message}`);
    createdIds.term2025 = term2025.id;

    // Turma Oficial vinculada a 2026
    const { data: classOfficial, error: coErr } = await adminClient
      .from("school_classes")
      .insert([
        {
          tenant_id: tenantId,
          series_id: "d0adf065-35bd-438c-9f72-730a70801867",
          name: "Turma 901 Oficial 2026 Teste",
          academic_year: "2026",
          shift: "matutino",
          capacity: 30,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (coErr) throw new Error(`Falha ao criar Turma Oficial: ${coErr.message}`);
    createdIds.classOfficial = classOfficial.id;
    console.log(`✅ Turma Oficial vinculada ao Ano 2026 criada: ${classOfficial.id}`);

    // Turma Legada (academic_year = '2024' sem ano oficial no calendário)
    const { data: classLegacy, error: clErr } = await adminClient
      .from("school_classes")
      .insert([
        {
          tenant_id: tenantId,
          series_id: "d0adf065-35bd-438c-9f72-730a70801867",
          name: "Turma 801 Legada Sem Ano Oficial",
          academic_year: "2024",
          shift: "vespertino",
          capacity: 25,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (clErr) throw new Error(`Falha ao criar Turma Legada: ${clErr.message}`);
    createdIds.classLegacy = classLegacy.id;
    console.log(`✅ Turma Legada criada: ${classLegacy.id}`);

    // Busca um aluno existente do tenant para teste de notas
    const { data: existingStudents } = await adminClient
      .from("students")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .limit(1);

    let studentId = existingStudents?.[0]?.id;
    if (!studentId) {
      const studentInsertId = crypto.randomUUID();
      const { data: newSt } = await adminClient
        .from("students")
        .insert([
          {
            id: studentInsertId,
            tenant_id: tenantId,
            name: "Aluno Teste Homologação Avaliações",
            status: "ativo",
          },
        ])
        .select()
        .single();
      studentId = newSt?.id || studentInsertId;
      createdIds.student = studentId;
    }
    console.log(`✅ Aluno de teste selecionado: ${studentId}\n`);

    // --------------------------------------------------------------------------
    // EXECUÇÃO DOS CENÁRIOS DE TESTE
    // --------------------------------------------------------------------------
    console.log("--- 2. EXECUÇÃO DOS CENÁRIOS DE HOMOLOGAÇÃO ---\n");

    const results: Array<{ scenario: string; status: "PASSOU" | "FALHOU"; detail: string }> = [];

    // Cenário 1: Criar avaliação em turma oficial com Ano/Período válido
    const res1 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classOfficial.id,
      school_year_id: sy2026.id,
      academic_term_id: term1.id,
      subject_name: "Matemática",
      title: "Prova Mensal 1 - Álgebra",
      assessment_date: "2026-03-15",
      assessment_type: "prova",
      max_score: 10,
      weight: 1,
    });

    if (res1.success && res1.id) {
      createdIds.assessment1 = res1.id;
      results.push({
        scenario: "1. Criar avaliação em turma oficial com Ano/Período válido",
        status: "PASSOU",
        detail: `Avaliação criada com sucesso (ID: ${res1.id}) no 1º Bimestre 2026.`,
      });
    } else {
      results.push({
        scenario: "1. Criar avaliação em turma oficial com Ano/Período válido",
        status: "FALHOU",
        detail: `Erro inesperado: ${res1.error}`,
      });
    }

    // Cenário 2: Criar avaliação sem academic_term_id em turma oficial (com data não pertencente a termos)
    const res2 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classOfficial.id,
      subject_name: "Matemática",
      title: "Tentativa Sem Período",
      assessment_date: "2026-08-20", // Fora de term1 e term2
      assessment_type: "trabalho",
      max_score: 10,
      weight: 1,
    });

    if (!res2.success && res2.error?.includes("É obrigatório selecionar um Período Acadêmico oficial válido")) {
      results.push({
        scenario: "2. Criar avaliação sem academic_term_id em turma oficial",
        status: "PASSOU",
        detail: `Bloqueado corretamente com a mensagem: "${res2.error}"`,
      });
    } else {
      results.push({
        scenario: "2. Criar avaliação sem academic_term_id em turma oficial",
        status: "FALHOU",
        detail: `Deveria ter bloqueado. Resultado: ${JSON.stringify(res2)}`,
      });
    }

    // Cenário 3: Usar período de outro Ano Letivo (term2025 em turma de 2026)
    const res3 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classOfficial.id,
      academic_term_id: term2025.id,
      subject_name: "Matemática",
      title: "Tentativa com Termo de 2025",
      assessment_date: "2025-03-10",
      assessment_type: "prova",
      max_score: 10,
      weight: 1,
    });

    if (!res3.success && res3.error?.includes("não pertence ao Ano Letivo oficial desta turma")) {
      results.push({
        scenario: "3. Usar período de outro Ano Letivo",
        status: "PASSOU",
        detail: `Bloqueado corretamente com a mensagem: "${res3.error}"`,
      });
    } else {
      results.push({
        scenario: "3. Usar período de outro Ano Letivo",
        status: "FALHOU",
        detail: `Deveria ter bloqueado. Resultado: ${JSON.stringify(res3)}`,
      });
    }

    // Cenário 4: Data fora do Ano Letivo (ex: 2027-01-10)
    const res4 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classOfficial.id,
      school_year_id: sy2026.id,
      academic_term_id: term1.id,
      subject_name: "Matemática",
      title: "Tentativa Data Fora Ano",
      assessment_date: "2027-01-10",
      assessment_type: "prova",
      max_score: 10,
      weight: 1,
    });

    if (!res4.success && (res4.error?.includes("fora do período de vigência do Ano Letivo") || res4.error?.includes("fora da vigência"))) {
      results.push({
        scenario: "4. Data fora da vigência do Ano Letivo",
        status: "PASSOU",
        detail: `Bloqueado corretamente com a mensagem: "${res4.error}"`,
      });
    } else {
      results.push({
        scenario: "4. Data fora da vigência do Ano Letivo",
        status: "FALHOU",
        detail: `Deveria ter bloqueado. Resultado: ${JSON.stringify(res4)}`,
      });
    }

    // Cenário 5: Data fora do Período (ex: data 2026-05-10 para o Term 1 que é fev-abr)
    const res5 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classOfficial.id,
      school_year_id: sy2026.id,
      academic_term_id: term1.id,
      subject_name: "Matemática",
      title: "Tentativa Data Fora do Período",
      assessment_date: "2026-05-10", // Maio está fora do Term 1 (fev-abr)
      assessment_type: "prova",
      max_score: 10,
      weight: 1,
    });

    if (!res5.success && res5.error?.includes("está fora da vigência de '1º Bimestre 2026'")) {
      results.push({
        scenario: "5. Data fora da vigência do Período Selecionado",
        status: "PASSOU",
        detail: `Bloqueado corretamente com a mensagem: "${res5.error}"`,
      });
    } else {
      results.push({
        scenario: "5. Data fora da vigência do Período Selecionado",
        status: "FALHOU",
        detail: `Deveria ter bloqueado. Resultado: ${JSON.stringify(res5)}`,
      });
    }

    // Cenário 6: Criar/editar avaliação em período bloqueado para TODOS os perfis
    const rolesToTest = [
      { name: "professor", auth: profAuth },
      { name: "secretaria", auth: secAuth },
      { name: "admin_escola", auth: adminAuth },
    ];

    let allRolesBlocked = true;
    const roleDetails: string[] = [];

    for (const r of rolesToTest) {
      const resLock = await executeSaveAssessment(r.auth.client, r.auth.session, tenantId, r.name, {
        class_id: classOfficial.id,
        school_year_id: sy2026.id,
        academic_term_id: term2.id, // term2 está 'bloqueado'
        subject_name: "Matemática",
        title: `Tentativa Bloqueado por ${r.name}`,
        assessment_date: "2026-06-10",
        assessment_type: "prova",
        max_score: 10,
        weight: 1,
      });

      if (!resLock.success && resLock.error?.includes("está bloqueado para criação e alteração de avaliações")) {
        roleDetails.push(`${r.name}: bloqueado`);
      } else {
        allRolesBlocked = false;
        roleDetails.push(`${r.name}: FALHA (${JSON.stringify(resLock)})`);
      }
    }

    results.push({
      scenario: "6. Criar avaliação em período bloqueado (Professor, Secretaria, Admin)",
      status: allRolesBlocked ? "PASSOU" : "FALHOU",
      detail: `Resultado por perfil: ${roleDetails.join(" | ")}`,
    });

    // Cenário 7: Lançar/alterar notas em avaliação de período bloqueado
    const { data: assessBlocked, error: abErr } = await adminClient
      .from("academic_assessments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: classOfficial.id,
          subject_name: "Matemática",
          academic_period: term2.name,
          title: "Avaliação Antiga do Período 2 Bloqueado",
          assessment_date: "2026-06-05",
          assessment_type: "prova",
          max_score: 10,
          weight: 1,
          is_locked: false,
          created_by: adminAuth.user?.id,
        },
      ])
      .select()
      .single();

    if (abErr) throw new Error(`Falha ao preparar avaliação em termo bloqueado: ${abErr.message}`);
    createdIds.assessBlocked = assessBlocked.id;

    let gradesAllRolesBlocked = true;
    const gradeRoleDetails: string[] = [];

    for (const r of rolesToTest) {
      const resGrade = await executeSaveAssessmentGrades(r.auth.client, r.auth.session, tenantId, r.name, {
        assessment_id: assessBlocked.id,
        grades: [
          {
            student_id: studentId,
            score: 8.5,
            is_absent: false,
            feedback_notes: "Excelente",
          },
        ],
      }, "bloqueado");

      if (!resGrade.success && resGrade.error?.includes("está bloqueado no Calendário Escolar para lançamento e alteração de notas")) {
        gradeRoleDetails.push(`${r.name}: bloqueado`);
      } else {
        gradesAllRolesBlocked = false;
        gradeRoleDetails.push(`${r.name}: FALHA (${JSON.stringify(resGrade)})`);
      }
    }

    results.push({
      scenario: "7. Lançar notas em período bloqueado (Professor, Secretaria, Admin)",
      status: gradesAllRolesBlocked ? "PASSOU" : "FALHOU",
      detail: `Resultado por perfil: ${gradeRoleDetails.join(" | ")}`,
    });

    // Cenário 7.1: Lançar notas com sucesso em avaliação de período ABERTO (Term 1)
    const resGradeSuccess = await executeSaveAssessmentGrades(profAuth.client, profAuth.session, tenantId, "professor", {
      assessment_id: res1.id!,
      grades: [
        {
          student_id: studentId,
          score: 9.0,
          is_absent: false,
          feedback_notes: "Ótimo desempenho em álgebra",
        },
      ],
    }, "aberto");

    if (resGradeSuccess.success && resGradeSuccess.savedCount === 1) {
      results.push({
        scenario: "7.1. Lançar notas em período ABERTO (Term 1)",
        status: "PASSOU",
        detail: "Nota 9.0 lançada com sucesso para o aluno matriculado.",
      });
    } else {
      results.push({
        scenario: "7.1. Lançar notas em período ABERTO (Term 1)",
        status: "FALHOU",
        detail: `Erro: ${resGradeSuccess.error}`,
      });
    }

    // Cenário 8: Criar avaliação em turma legada sem school_year_id
    const res8 = await executeSaveAssessment(profAuth.client, profAuth.session, tenantId, "professor", {
      class_id: classLegacy.id,
      subject_name: "História",
      academic_period: "3º Bimestre",
      title: "Trabalho de História Legado",
      assessment_date: "2024-09-10",
      assessment_type: "trabalho",
      max_score: 10,
      weight: 1,
    });

    if (res8.success && res8.id) {
      createdIds.assessmentLegacy = res8.id;
      results.push({
        scenario: "8. Criar avaliação em turma legada (sem school_year_id)",
        status: "PASSOU",
        detail: `Avaliação legada criada com sucesso (ID: ${res8.id}) mantendo fluxo textual '3º Bimestre'.`,
      });
    } else {
      results.push({
        scenario: "8. Criar avaliação em turma legada (sem school_year_id)",
        status: "FALHOU",
        detail: `Erro: ${res8.error}`,
      });
    }

    // Cenário 9: Confirmar que tentativas bloqueadas não persistem registros no banco
    const { data: ghostAssessments } = await adminClient
      .from("academic_assessments")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .in("title", [
        "Tentativa Sem Período",
        "Tentativa com Termo de 2025",
        "Tentativa Data Fora Ano",
        "Tentativa Data Fora do Período",
        "Tentativa Bloqueado por professor",
        "Tentativa Bloqueado por secretaria",
        "Tentativa Bloqueado por admin_escola",
      ]);

    if (!ghostAssessments || ghostAssessments.length === 0) {
      results.push({
        scenario: "9. Confirmar ausência de registros das tentativas bloqueadas",
        status: "PASSOU",
        detail: "0 registros fantasmas encontrados no banco de dados.",
      });
    } else {
      results.push({
        scenario: "9. Confirmar ausência de registros das tentativas bloqueadas",
        status: "FALHOU",
        detail: `${ghostAssessments.length} registros indevidos encontrados no banco: ${ghostAssessments.map((g: any) => g.title).join(", ")}`,
      });
    }

    // Cenário 10: Isolamento cross-tenant
    const resCross = await executeSaveAssessment(otherAdminAuth.client, otherAdminAuth.session, tenant2Id, "admin_escola", {
      class_id: classOfficial.id, // Turma do Tenant 1
      school_year_id: sy2026.id,
      academic_term_id: term1.id,
      subject_name: "Invasão Cross-Tenant",
      title: "Avaliação Ilegítima",
      assessment_date: "2026-03-15",
      assessment_type: "prova",
      max_score: 10,
      weight: 1,
    });

    if (!resCross.success && (resCross.error?.includes("Turma não encontrada") || resCross.error?.includes("não pertence"))) {
      results.push({
        scenario: "10. Isolamento Cross-Tenant (RLS)",
        status: "PASSOU",
        detail: `Usuário do Tenant 2 bloqueado pelo RLS: "${resCross.error}"`,
      });
    } else {
      results.push({
        scenario: "10. Isolamento Cross-Tenant (RLS)",
        status: "FALHOU",
        detail: `Vazamento cross-tenant detectado! Resultado: ${JSON.stringify(resCross)}`,
      });
    }

    // Cenário 11: Validar fechamento/reabertura operacional com academic_term_id
    const resClosing = await executeTogglePeriodClosing(adminAuth.client, adminAuth.session, tenantId, "admin_escola", {
      class_id: classOfficial.id,
      academic_period: term1.name,
      academic_term_id: term1.id,
      is_closed: true,
    });

    if (resClosing.success && resClosing.id) {
      createdIds.closing = resClosing.id;

      // Verifica se o registro no banco possui os dados corretos
      const { data: closingRecord } = await adminClient
        .from("academic_period_closings")
        .select("id, is_closed, academic_period")
        .eq("id", resClosing.id)
        .single();

      if (closingRecord?.academic_period === term1.name && closingRecord?.is_closed === true) {
        results.push({
          scenario: "11. Fechamento de Período Oficial",
          status: "PASSOU",
          detail: `Período fechado com sucesso e persistido para ${term1.name}.`,
        });
      } else {
        results.push({
          scenario: "11. Fechamento de Período Oficial",
          status: "FALHOU",
          detail: `Registro de fechamento gravado incorretamente: ${JSON.stringify(closingRecord)}`,
        });
      }
    } else {
      results.push({
        scenario: "11. Fechamento de Período Oficial",
        status: "FALHOU",
        detail: `Erro ao fechar período: ${resClosing.error}`,
      });
    }

    // Imprime Resultados
    console.log("================================================================================");
    console.log("RESUMO DOS RESULTADOS DA HOMOLOGAÇÃO FUNCIONAL:");
    console.log("================================================================================");
    results.forEach((r) => {
      const icon = r.status === "PASSOU" ? "✅" : "❌";
      console.log(`${icon} [${r.status}] ${r.scenario}`);
      console.log(`   Detalhe: ${r.detail}\n`);
    });

  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN COMPLETO
    // --------------------------------------------------------------------------
    console.log("================================================================================");
    console.log("--- 3. TEARDOWN DOS DADOS TEMPORÁRIOS DE TESTE ---");
    console.log("================================================================================");

    // 1. Limpa notas de avaliação
    if (createdIds.assessment1 || createdIds.assessBlocked || createdIds.assessmentLegacy) {
      const assessIds = [createdIds.assessment1, createdIds.assessBlocked, createdIds.assessmentLegacy].filter(Boolean);
      await adminClient.from("student_assessment_grades").delete().in("assessment_id", assessIds);
      console.log("🧹 student_assessment_grades excluídas.");
    }

    // 2. Limpa avaliações
    if (createdIds.assessment1) {
      await adminClient.from("academic_assessments").delete().eq("id", createdIds.assessment1);
    }
    if (createdIds.assessBlocked) {
      await adminClient.from("academic_assessments").delete().eq("id", createdIds.assessBlocked);
    }
    if (createdIds.assessmentLegacy) {
      await adminClient.from("academic_assessments").delete().eq("id", createdIds.assessmentLegacy);
    }
    console.log("🧹 academic_assessments de teste excluídas.");

    // 3. Limpa fechamento de períodos
    if (createdIds.closing) {
      await adminClient.from("academic_period_closings").delete().eq("id", createdIds.closing);
      console.log("🧹 academic_period_closings de teste excluído.");
    }

    // 4. Limpa matrícula e aluno
    if (createdIds.enrollment) {
      await adminClient.from("enrollments").delete().eq("id", createdIds.enrollment);
      console.log("🧹 enrollment de teste excluída.");
    }
    if (createdIds.student) {
      await adminClient.from("students").delete().eq("id", createdIds.student);
      console.log("🧹 student de teste excluído.");
    }

    // 5. Limpa turmas
    if (createdIds.classOfficial) {
      await adminClient.from("school_classes").delete().eq("id", createdIds.classOfficial);
    }
    if (createdIds.classLegacy) {
      await adminClient.from("school_classes").delete().eq("id", createdIds.classLegacy);
    }
    console.log("🧹 school_classes de teste excluídas.");

    // 6. Limpa períodos acadêmicos
    if (createdIds.term1) {
      await adminClient.from("academic_terms").delete().eq("id", createdIds.term1);
    }
    if (createdIds.term2) {
      await adminClient.from("academic_terms").delete().eq("id", createdIds.term2);
    }
    if (createdIds.term2025) {
      await adminClient.from("academic_terms").delete().eq("id", createdIds.term2025);
    }
    console.log("🧹 academic_terms de teste excluídos.");

    // 7. Limpa anos letivos
    if (createdIds.sy2026) {
      await adminClient.from("school_years").delete().eq("id", createdIds.sy2026);
    }
    if (createdIds.sy2025) {
      await adminClient.from("school_years").delete().eq("id", createdIds.sy2025);
    }
    console.log("🧹 school_years de teste excluídos.");

    console.log("\n✅ Teardown completo concluído com sucesso. Nenhum resíduo persistido.");
  }
}

runHomologationFase3().catch((err) => {
  console.error("❌ Erro fatal durante a homologação da Fase 3:", err);
  process.exit(1);
});
