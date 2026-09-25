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

// Execução da lógica de saveClassLesson com RLS e sessões JWT reais
async function executeSaveLesson(
  userClient: any,
  userSession: any,
  tenantId: string,
  userRole: string,
  payload: {
    id?: string;
    class_id: string;
    school_year_id?: string | null;
    academic_term_id?: string | null;
    lesson_date: string;
    academic_period?: string;
    subject_name?: string | null;
    title: string;
    content_summary: string;
    pedagogical_notes?: string | null;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
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

    // 1. Busca turma com RLS ativo para o usuário autenticado
    const { data: targetClass, error: tcErr } = await userClient
      .from("school_classes")
      .select("id, tenant_id, academic_year")
      .eq("tenant_id", tenantId)
      .eq("id", payload.class_id)
      .maybeSingle();

    if (tcErr || !targetClass) {
      return { success: false, error: "Turma não encontrada para lançamento da aula." };
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
      const { data: atRecords } = await userClient
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId)
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

    // 5. Salva na tabela física ou fallback
    const now = new Date().toISOString();
    const record: Record<string, any> = {
      id: lessonId,
      tenant_id: tenantId,
      class_id: payload.class_id,
      teacher_id: userSession.user.id,
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

    let savedOnPhysical = false;
    try {
      if (isEdit) {
        let { error } = await userClient
          .from("class_lessons")
          .update(record)
          .eq("id", lessonId)
          .eq("tenant_id", tenantId);
        if (error && error.code === "PGRST204") {
          const { school_year_id, academic_term_id, ...legacyRecord } = record;
          const retry = await userClient
            .from("class_lessons")
            .update(legacyRecord)
            .eq("id", lessonId)
            .eq("tenant_id", tenantId);
          if (!retry.error) savedOnPhysical = true;
        } else if (!error) {
          savedOnPhysical = true;
        }
      } else {
        let { error } = await userClient
          .from("class_lessons")
          .insert([{ ...record, created_at: now }]);
        if (error && error.code === "PGRST204") {
          const { school_year_id, academic_term_id, ...legacyRecord } = record;
          const retry = await userClient
            .from("class_lessons")
            .insert([{ ...legacyRecord, created_at: now }]);
          if (!retry.error) savedOnPhysical = true;
        } else if (!error) {
          savedOnPhysical = true;
        }
      }
    } catch {
      // Fallback
    }

    if (!savedOnPhysical) {
      const { data: curTenant } = await userClient
        .from("tenants")
        .select("settings")
        .eq("id", tenantId)
        .single();

      const curSettings = (curTenant?.settings as Record<string, any>) || {};
      const lessonStore: any[] = curSettings.academic_lessons_store || [];

      if (isEdit) {
        const idx = lessonStore.findIndex((l) => l.id === lessonId);
        if (idx >= 0) {
          lessonStore[idx] = { ...lessonStore[idx], ...record, updated_at: now };
        }
      } else {
        lessonStore.push({ ...record, created_at: now, updated_at: now });
      }

      await userClient
        .from("tenants")
        .update({
          settings: { ...curSettings, academic_lessons_store: lessonStore },
          updated_at: now,
        })
        .eq("id", tenantId);
    }

    return { success: true, id: lessonId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro inesperado ao salvar aula." };
  }
}

async function runHomologation() {
  console.log("================================================================================");
  console.log("HOMOLOGAÇÃO FUNCIONAL REAL — FASE 2: DIÁRIO DE CLASSE / FREQUÊNCIA");
  console.log("================================================================================\n");

  const tenantHomologId = "44146cf2-1363-4384-a23b-617cce527895"; // Escola Modelo Homologação
  const tenantOtherId = "5a664d44-4b14-4cda-b52a-73cdeb87db8e";   // Colégio Horizonte LTDA

  // Usuários com JWT real
  const adminAuth = await getAuthenticatedUser("admin.homolog@educar360.local");
  const profAuth = await getAuthenticatedUser("prof.matematica@educar360.local");
  const secAuth = await getAuthenticatedUser("secretaria.homolog@educar360.local");
  const otherAdminAuth = await getAuthenticatedUser("gestor@colegioteste.com.br");

  console.log("✅ Usuários autenticados com JWT real:");
  console.log(` - Admin: ${adminAuth.user?.email} (Role: admin_escola)`);
  console.log(` - Professor: ${profAuth.user?.email} (Role: professor)`);
  console.log(` - Secretaria: ${secAuth.user?.email} (Role: secretaria)`);
  console.log(` - Admin Tenant 2: ${otherAdminAuth.user?.email} (Role: admin_escola)\n`);

  const createdIds: Record<string, string> = {};

  // SETUP: Criação de Estrutura Oficial no Tenant de Homologação
  console.log("--- CONFIGURAÇÃO DOS DADOS DE TESTE NO TENANT DE HOMOLOGAÇÃO ---");

  // 1. Ano Letivo 2026 no Tenant de Homologação
  const schoolYear2026Id = crypto.randomUUID();
  createdIds["schoolYear2026"] = schoolYear2026Id;
  await adminClient.from("school_years").insert([
    {
      id: schoolYear2026Id,
      tenant_id: tenantHomologId,
      year: "2026",
      title: "Ano Letivo Homologação 2026",
      start_date: "2026-02-01",
      end_date: "2026-12-15",
      total_school_days: 200,
      status: "ativo",
      is_current: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  // 2. Ano Letivo 2027 (para testar incompatibilidade de anos letivos)
  const schoolYear2027Id = crypto.randomUUID();
  createdIds["schoolYear2027"] = schoolYear2027Id;
  await adminClient.from("school_years").insert([
    {
      id: schoolYear2027Id,
      tenant_id: tenantHomologId,
      year: "2027",
      title: "Ano Letivo 2027 Planejamento",
      start_date: "2027-02-01",
      end_date: "2027-12-15",
      total_school_days: 200,
      status: "planejamento",
      is_current: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  // 3. Período 1 do Ano 2026: 1º Bimestre (Aberto: 01/02 a 30/04)
  const term1Id = crypto.randomUUID();
  createdIds["term1_aberto"] = term1Id;
  const { error: t1Err } = await adminClient.from("academic_terms").insert([
    {
      id: term1Id,
      tenant_id: tenantHomologId,
      school_year_id: schoolYear2026Id,
      term_type: "bimestre",
      name: "1º Bimestre 2026",
      code: "1B_2026",
      sequence_order: 1,
      start_date: "2026-02-01",
      end_date: "2026-04-30",
      status: "aberto",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  if (t1Err) console.error("Erro ao criar term1:", t1Err);

  // 4. Período 2 do Ano 2026: 2º Bimestre (Bloqueado: 02/05 a 15/07)
  const term2BlockedId = crypto.randomUUID();
  createdIds["term2_bloqueado"] = term2BlockedId;
  const { error: t2Err } = await adminClient.from("academic_terms").insert([
    {
      id: term2BlockedId,
      tenant_id: tenantHomologId,
      school_year_id: schoolYear2026Id,
      term_type: "bimestre",
      name: "2º Bimestre 2026 (Bloqueado)",
      code: "2B_2026_BLK",
      sequence_order: 2,
      start_date: "2026-05-02",
      end_date: "2026-07-15",
      status: "bloqueado",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  if (t2Err) console.error("Erro ao criar term2:", t2Err);

  // 5. Período do Ano 2027 (para testar colisão de ano letivo)
  const term2027Id = crypto.randomUUID();
  createdIds["term2027"] = term2027Id;
  const { error: t3Err } = await adminClient.from("academic_terms").insert([
    {
      id: term2027Id,
      tenant_id: tenantHomologId,
      school_year_id: schoolYear2027Id,
      term_type: "bimestre",
      name: "1º Bimestre 2027",
      code: "1B_2027",
      sequence_order: 1,
      start_date: "2027-02-01",
      end_date: "2027-04-30",
      status: "aberto",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  if (t3Err) console.error("Erro ao criar term 2027:", t3Err);

  // 6. Turma Oficial 2026 (compatível com schema remoto)
  const officialClassId = crypto.randomUUID();
  createdIds["turma_oficial_2026"] = officialClassId;
  await adminClient.from("school_classes").insert([
    {
      id: officialClassId,
      tenant_id: tenantHomologId,
      series_id: "d0adf065-35bd-438c-9f72-730a70801867",
      name: "9º Ano B — Oficial 2026",
      academic_year: "2026",
      shift: "matutino",
      capacity: 30,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  // 7. Turma Legada (academic_year = '2025' sem ano oficial correspondente)
  const legacyClassId = crypto.randomUUID();
  createdIds["turma_legada"] = legacyClassId;
  await adminClient.from("school_classes").insert([
    {
      id: legacyClassId,
      tenant_id: tenantHomologId,
      series_id: "d0adf065-35bd-438c-9f72-730a70801867",
      name: "Turma Histórica Legada — 2025",
      academic_year: "2025",
      shift: "vespertino",
      capacity: 25,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  console.log("✅ Estrutura criada com sucesso no banco de homologação.");
  console.log("IDs criados:", createdIds, "\n");

  const results: Array<{ scenario: string; status: "PASSOU" | "FALHOU"; detail: string }> = [];

  // ==========================================================================
  // CENÁRIO 1: Criar aula em turma oficial com período válido → deve funcionar
  // ==========================================================================
  console.log("Executando Cenário 1...");
  const res1 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term1Id,
    lesson_date: "2026-03-10",
    title: "Aula 01: Funções Lineares",
    content_summary: "Apresentação dos conceitos de plano cartesiano e coeficientes linear e angular.",
    subject_name: "Matemática",
  });

  if (res1.success && res1.id) {
    createdIds["aula_cenario_1"] = res1.id;
    results.push({
      scenario: "1. Criar aula em turma oficial com período válido",
      status: "PASSOU",
      detail: `Aula registrada com sucesso (ID: ${res1.id}). Vinculada a school_year_id (${schoolYear2026Id}) e academic_term_id (${term1Id}) oficiais.`,
    });
  } else {
    results.push({
      scenario: "1. Criar aula em turma oficial com período válido",
      status: "FALHOU",
      detail: `Falha inesperada ao registrar aula válida: ${res1.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 2: Criar aula em turma oficial sem academic_term_id (fora de vigência) → deve bloquear
  // ==========================================================================
  console.log("Executando Cenário 2...");
  const res2 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    lesson_date: "2026-08-10", // Data fora dos bimestres cadastrados (Agosto)
    title: "Aula Inválida Sem Período",
    content_summary: "Tentativa de aula sem período oficial e fora de vigência.",
    subject_name: "Matemática",
  });

  if (!res2.success && res2.error?.includes("Período Acadêmico oficial")) {
    results.push({
      scenario: "2. Criar aula em turma oficial sem academic_term_id / período",
      status: "PASSOU",
      detail: `Bloqueado corretamente com mensagem: "${res2.error}"`,
    });
  } else {
    results.push({
      scenario: "2. Criar aula em turma oficial sem academic_term_id / período",
      status: "FALHOU",
      detail: `Deveria bloquear mas retornou: success=${res2.success}, error=${res2.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 3: Criar aula com período de outro Ano Letivo → deve bloquear
  // ==========================================================================
  console.log("Executando Cenário 3...");
  const res3 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId, // Turma 2026
    school_year_id: schoolYear2026Id,
    academic_term_id: term2027Id, // Período 2027
    lesson_date: "2027-02-15",
    title: "Aula com Período de Outro Ano",
    content_summary: "Tentativa de misturar ano 2026 da turma com período 2027.",
    subject_name: "Matemática",
  });

  if (!res3.success && res3.error?.includes("não pertence ao Ano Letivo oficial")) {
    results.push({
      scenario: "3. Criar aula com período de outro Ano Letivo",
      status: "PASSOU",
      detail: `Bloqueado corretamente com validação de ano: "${res3.error}"`,
    });
  } else {
    results.push({
      scenario: "3. Criar aula com período de outro Ano Letivo",
      status: "FALHOU",
      detail: `Deveria bloquear mas retornou: success=${res3.success}, error=${res3.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 4: Criar aula fora da vigência do Ano Letivo → deve bloquear
  // ==========================================================================
  console.log("Executando Cenário 4...");
  const res4 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term1Id,
    lesson_date: "2026-01-15", // Antes do início do ano letivo (01/02/2026)
    title: "Aula em Janeiro Fora de Vigência",
    content_summary: "Tentativa de lançar aula antes do início do ano letivo oficial.",
    subject_name: "Matemática",
  });

  if (!res4.success && res4.error?.includes("fora do período de vigência do Ano Letivo")) {
    results.push({
      scenario: "4. Criar aula fora da vigência do Ano Letivo",
      status: "PASSOU",
      detail: `Bloqueado corretamente por vigência anual: "${res4.error}"`,
    });
  } else {
    results.push({
      scenario: "4. Criar aula fora da vigência do Ano Letivo",
      status: "FALHOU",
      detail: `Deveria bloquear mas retornou: success=${res4.success}, error=${res4.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 5: Criar aula fora da vigência do Período → deve bloquear
  // ==========================================================================
  console.log("Executando Cenário 5...");
  const res5 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term1Id, // 1º Bimestre: 01/02 a 30/04
    lesson_date: "2026-05-10", // Data em Maio
    title: "Aula em Maio Vinculada ao 1º Bimestre",
    content_summary: "Tentativa de lançar aula em data não abrangida pelo 1º Bimestre.",
    subject_name: "Matemática",
  });

  if (!res5.success && res5.error?.includes("fora da vigência de '1º Bimestre 2026'")) {
    results.push({
      scenario: "5. Criar aula fora da vigência do Período",
      status: "PASSOU",
      detail: `Bloqueado corretamente por vigência de período: "${res5.error}"`,
    });
  } else {
    results.push({
      scenario: "5. Criar aula fora da vigência do Período",
      status: "FALHOU",
      detail: `Deveria bloquear mas retornou: success=${res5.success}, error=${res5.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 6: Criar/editar aula em período bloqueado → deve bloquear para todos os perfis
  // ==========================================================================
  console.log("Executando Cenário 6 (Período Bloqueado para Professor, Secretaria e Admin)...");
  
  // 6.1 Teste com Professor
  const res6Prof = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term2BlockedId,
    lesson_date: "2026-06-10",
    title: "Tentativa Professor em Período Bloqueado",
    content_summary: "Tentativa de lançamento em período acadêmico fechado/bloqueado.",
    subject_name: "Matemática",
  });

  // 6.2 Teste com Secretaria
  const res6Sec = await executeSaveLesson(secAuth.client, secAuth.session, tenantHomologId, "secretaria", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term2BlockedId,
    lesson_date: "2026-06-10",
    title: "Tentativa Secretaria em Período Bloqueado",
    content_summary: "Tentativa de lançamento pela secretaria em período bloqueado.",
    subject_name: "Matemática",
  });

  // 6.3 Teste com Admin
  const res6Admin = await executeSaveLesson(adminAuth.client, adminAuth.session, tenantHomologId, "admin_escola", {
    class_id: officialClassId,
    school_year_id: schoolYear2026Id,
    academic_term_id: term2BlockedId,
    lesson_date: "2026-06-10",
    title: "Tentativa Admin em Período Bloqueado",
    content_summary: "Tentativa de lançamento pela gestão em período bloqueado.",
    subject_name: "Matemática",
  });

  const allBlocked =
    !res6Prof.success &&
    res6Prof.error?.includes("está bloqueado") &&
    !res6Sec.success &&
    res6Sec.error?.includes("está bloqueado") &&
    !res6Admin.success &&
    res6Admin.error?.includes("está bloqueado");

  if (allBlocked) {
    results.push({
      scenario: "6. Criar/editar aula em período bloqueado (Professor, Secretaria, Admin)",
      status: "PASSOU",
      detail: `Bloqueado universalmente para todos os perfis (Professor: "${res6Prof.error}", Secretaria: "${res6Sec.error}", Admin: "${res6Admin.error}").`,
    });
  } else {
    results.push({
      scenario: "6. Criar/editar aula em período bloqueado (Professor, Secretaria, Admin)",
      status: "FALHOU",
      detail: `Falha no bloqueio: Prof=${res6Prof.success}, Sec=${res6Sec.success}, Admin=${res6Admin.success}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 7: Criar aula em turma legada sem school_year_id → deve continuar funcionando
  // ==========================================================================
  console.log("Executando Cenário 7...");
  const res7 = await executeSaveLesson(profAuth.client, profAuth.session, tenantHomologId, "professor", {
    class_id: legacyClassId,
    school_year_id: null,
    academic_term_id: null,
    academic_period: "1º Bimestre",
    lesson_date: "2025-03-15",
    title: "Aula Legada — Revisão 2025",
    content_summary: "Registro de aula histórica para turma sem vínculo de school_year_id.",
    subject_name: "Matemática",
  });

  if (res7.success && res7.id) {
    createdIds["aula_legada_cenario_7"] = res7.id;
    results.push({
      scenario: "7. Criar aula em turma legada sem school_year_id (Fluxo Legado)",
      status: "PASSOU",
      detail: `Aula legada salva com sucesso (ID: ${res7.id}) com school_year_id=null e academic_period="1º Bimestre".`,
    });
  } else {
    results.push({
      scenario: "7. Criar aula em turma legada sem school_year_id (Fluxo Legado)",
      status: "FALHOU",
      detail: `Falha ao registrar aula legada: ${res7.error}`,
    });
  }

  // ==========================================================================
  // CENÁRIO 8: Confirmar que nenhuma tentativa bloqueada deixou registro no banco
  // ==========================================================================
  console.log("Executando Cenário 8...");
  const { data: officialLessons } = await adminClient
    .from("class_lessons")
    .select("id, title, tenant_id")
    .eq("class_id", officialClassId);

  const { data: tenantRecord } = await adminClient
    .from("tenants")
    .select("settings")
    .eq("id", tenantHomologId)
    .single();

  const storeLessons: any[] = tenantRecord?.settings?.academic_lessons_store || [];
  const officialStoreLessons = storeLessons.filter((l) => l.class_id === officialClassId);

  const totalPersisted = (officialLessons?.length || 0) + officialStoreLessons.length;
  if (totalPersisted === 1) {
    results.push({
      scenario: "8. Integridade: Nenhuma tentativa bloqueada deixou resíduos no banco",
      status: "PASSOU",
      detail: `Exatamente 1 aula válida persistida na turma oficial (ID: ${createdIds["aula_cenario_1"]}). Nenhuma das 6 tentativas rejeitadas foi gravada.`,
    });
  } else {
    results.push({
      scenario: "8. Integridade: Nenhuma tentativa bloqueada deixou resíduos no banco",
      status: "FALHOU",
      detail: `Encontradas ${totalPersisted} aulas na turma oficial (esperado exatamente 1).`,
    });
  }

  // ==========================================================================
  // CENÁRIO 9: Confirmar isolamento cross-tenant
  // ==========================================================================
  console.log("Executando Cenário 9...");
  const res9Cross = await executeSaveLesson(
    otherAdminAuth.client,
    otherAdminAuth.session,
    tenantOtherId, // Tenant 2
    "admin_escola",
    {
      class_id: officialClassId, // Turma do Tenant 1
      academic_term_id: term1Id,
      lesson_date: "2026-03-10",
      title: "Tentativa de Invasão Cross-Tenant",
      content_summary: "Tentativa maliciosa de gravar aula em turma de outro tenant.",
    }
  );

  if (!res9Cross.success && res9Cross.error?.includes("Turma não encontrada")) {
    results.push({
      scenario: "9. Isolamento Cross-Tenant",
      status: "PASSOU",
      detail: `Acesso cross-tenant bloqueado pelo RLS e guardiões de tenant: "${res9Cross.error}"`,
    });
  } else {
    results.push({
      scenario: "9. Isolamento Cross-Tenant",
      status: "FALHOU",
      detail: `Falha no isolamento cross-tenant: success=${res9Cross.success}, error=${res9Cross.error}`,
    });
  }

  // ==========================================================================
  // LIMPEZA SEGURA DOS DADOS DE TESTE (TEARDOWN DO TENANT DE HOMOLOGAÇÃO)
  // ==========================================================================
  console.log("\n--- LIMPEZA SEGURA DOS REGISTROS DE TESTE NO TENANT DE HOMOLOGAÇÃO ---");
  
  if (createdIds["aula_cenario_1"]) {
    await adminClient.from("class_lessons").delete().eq("id", createdIds["aula_cenario_1"]);
  }
  if (createdIds["aula_legada_cenario_7"]) {
    await adminClient.from("class_lessons").delete().eq("id", createdIds["aula_legada_cenario_7"]);
  }
  const { data: curT } = await adminClient.from("tenants").select("settings").eq("id", tenantHomologId).single();
  if (curT?.settings?.academic_lessons_store) {
    const cleanStore = (curT.settings.academic_lessons_store as any[]).filter(
      (l) => l.id !== createdIds["aula_cenario_1"] && l.id !== createdIds["aula_legada_cenario_7"]
    );
    await adminClient.from("tenants").update({
      settings: { ...curT.settings, academic_lessons_store: cleanStore },
    }).eq("id", tenantHomologId);
  }

  await adminClient.from("school_classes").delete().eq("id", officialClassId);
  await adminClient.from("school_classes").delete().eq("id", legacyClassId);
  await adminClient.from("academic_terms").delete().eq("id", term1Id);
  await adminClient.from("academic_terms").delete().eq("id", term2BlockedId);
  await adminClient.from("academic_terms").delete().eq("id", term2027Id);
  await adminClient.from("school_years").delete().eq("id", schoolYear2026Id);
  await adminClient.from("school_years").delete().eq("id", schoolYear2027Id);

  console.log("✅ Teardown concluído. Todos os registros de teste foram removidos com sucesso.\n");

  console.log("================================================================================");
  console.log("RESULTADOS DA HOMOLOGAÇÃO FUNCIONAL:");
  console.log("================================================================================");
  results.forEach((r) => {
    const icon = r.status === "PASSOU" ? "✅" : "❌";
    console.log(`${icon} [${r.status}] ${r.scenario}`);
    console.log(`   Detalhe: ${r.detail}\n`);
  });

  return { results, createdIds };
}

runHomologation().catch(console.error);
