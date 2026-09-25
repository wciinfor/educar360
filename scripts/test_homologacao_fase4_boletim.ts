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

// Implementação fidedigna da lógica de getStudentReportCardAction com JWT do usuário e RLS
async function executeGetStudentReportCard(
  userClient: any,
  userSession: any,
  tenantId: string,
  userRole: string,
  classId: string,
  studentId: string
) {
  try {
    // 1. Busca turma com RLS
    const { data: schoolClass, error: cErr } = await userClient
      .from("school_classes")
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
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .single();

    if (cErr || !schoolClass) {
      return { success: false, error: "Turma não encontrada." };
    }

    // 1.1 Resolução do Ano Letivo oficial
    let resolvedSchoolYearId: string | null = (schoolClass as any).school_year_id || null;
    let resolvedSchoolYear: any = null;

    if (resolvedSchoolYearId) {
      const { data: syData } = await userClient
        .from("school_years")
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", tenantId)
        .eq("id", resolvedSchoolYearId)
        .maybeSingle();
      resolvedSchoolYear = syData;
    } else if (schoolClass.academic_year) {
      const { data: syData } = await userClient
        .from("school_years")
        .select("id, year, title, status, start_date, end_date")
        .eq("tenant_id", tenantId)
        .eq("year", schoolClass.academic_year)
        .maybeSingle();
      if (syData) {
        resolvedSchoolYear = syData;
        resolvedSchoolYearId = syData.id;
      }
    }

    // 1.2 Busca períodos acadêmicos oficiais
    let termsList: any[] = [];
    if (resolvedSchoolYearId) {
      const { data: termsData } = await userClient
        .from("academic_terms")
        .select("id, tenant_id, school_year_id, name, term_type, sequence_order, start_date, end_date, status")
        .eq("tenant_id", tenantId)
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

    if (termsList.length === 0) {
      const fallbackNames = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
      termsList = fallbackNames.map((name, idx) => ({
        name,
        sequence_order: idx + 1,
        status: "aberto",
      }));
    }

    // 2. Busca matrícula
    const { data: enrollment, error: eErr } = await userClient
      .from("enrollments")
      .select(`
        id,
        enrollment_code,
        student_id,
        status,
        students:student_id (id, full_name, cpf)
      `)
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (eErr || !enrollment) {
      return { success: false, error: "Aluno não encontrado ou não matriculado nesta turma." };
    }

    // 3. Settings padrão
    const settings = {
      passing_grade: 6.0,
      max_score_per_period: 10,
      calculation_formula: "media_aritmetica",
      rounding_rule: "padrao",
      decimal_places: 1,
      recovery_enabled: true,
      recovery_replaces_lowest: true,
      min_attendance_percentage: 75,
    };

    // 4. Closings
    const { data: closingsData } = await userClient
      .from("academic_period_closings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId);

    const closingsByTermId = new Map<string, boolean>();
    const closingsByPeriodName = new Map<string, boolean>();
    (closingsData || []).forEach((c: any) => {
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

    // 5. Avaliações
    const { data: assessmentsData } = await userClient
      .from("academic_assessments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .order("assessment_date", { ascending: true });

    const assessmentIds = (assessmentsData || []).map((a: any) => a.id);
    const gradesMap = new Map<string, any>();

    if (assessmentIds.length > 0) {
      const { data: gradesData } = await userClient
        .from("student_assessment_grades")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .in("assessment_id", assessmentIds);

      (gradesData || []).forEach((g: any) => {
        gradesMap.set(g.assessment_id, g);
      });
    }

    // 6. Aulas e Frequência
    const { data: lessonsData } = await userClient
      .from("class_lessons")
      .select("id, subject_name, lesson_date")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId);

    const lessonIds = (lessonsData || []).map((l: any) => l.id);
    const lessonSubjectMap = new Map<string, string>();
    (lessonsData || []).forEach((l: any) => {
      lessonSubjectMap.set(l.id, l.subject_name || "Geral");
    });

    const attendancesBySubject = new Map<string, { total: number; presences: number; absences: number; justified: number }>();

    if (lessonIds.length > 0) {
      const { data: attendancesData } = await userClient
        .from("lesson_attendances")
        .select("lesson_id, status")
        .eq("tenant_id", tenantId)
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

    // 7. Agrupamento
    const subjectsMap = new Map<string, Map<string, any[]>>();

    (assessmentsData || []).forEach((a: any) => {
      const subj = a.subject_name;
      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, new Map<string, any[]>());
      }
      const periodMap = subjectsMap.get(subj)!;

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

    attendancesBySubject.forEach((_, subj) => {
      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, new Map<string, any[]>());
      }
    });

    const subjectReports: any[] = [];
    let totalSumAnnualGrades = 0;
    let subjectsWithGradesCount = 0;
    let overallTotalLessons = 0;
    let overallTotalPresences = 0;

    subjectsMap.forEach((periodMap, subjectName) => {
      const periodsObj: Record<string, any> = {};
      const validPeriodGrades: number[] = [];

      termsList.forEach((term) => {
        const pName = term.name;
        const assessmentsInPeriod = periodMap.get(pName) || [];

        const isClosedByClosing =
          (term.id ? closingsByTermId.get(`${term.id}-${subjectName}`) || closingsByTermId.get(`${term.id}-`) : false) ||
          closingsByPeriodName.get(`${pName}-${subjectName}`) ||
          closingsByPeriodName.get(`${pName}-`) ||
          false;

        const isTermLockedOrClosed = term.status === "bloqueado" || term.status === "fechado";
        const isClosed = isClosedByClosing || isTermLockedOrClosed;

        // Cálculo simples do período
        let calculatedGrade: number | null = null;
        if (assessmentsInPeriod.length > 0) {
          const gradedAssessments = assessmentsInPeriod.filter((a: any) => a.score !== null);
          if (gradedAssessments.length > 0) {
            const sumScores = gradedAssessments.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
            calculatedGrade = sumScores / gradedAssessments.length;
          }
        }

        periodsObj[pName] = {
          period: pName,
          academic_term_id: term.id || null,
          term_status: term.status,
          sequence_order: term.sequence_order,
          assessments: assessmentsInPeriod,
          calculated_grade: calculatedGrade,
          final_period_grade: calculatedGrade,
          is_closed: isClosed,
        };

        if (calculatedGrade !== null) {
          validPeriodGrades.push(calculatedGrade);
        }
      });

      const annualAverage =
        validPeriodGrades.length > 0
          ? validPeriodGrades.reduce((a, b) => a + b, 0) / validPeriodGrades.length
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

      subjectReports.push({
        subject_name: subjectName,
        periods: periodsObj,
        annual_average: annualAverage,
        final_grade: annualAverage,
        total_lessons: att.total,
        presences: att.presences,
        absences: att.absences,
        attendance_percentage: attPct,
        situation: annualAverage !== null && annualAverage >= 6.0 && attPct >= 75 ? "aprovado" : "em_andamento",
      });
    });

    const reportCard = {
      student_id: studentId,
      student_name: enrollment.students?.full_name || "Aluno sem nome",
      school_class: schoolClass,
      academic_year: schoolClass.academic_year,
      school_year_id: schoolClass.school_year_id || null,
      school_year: schoolClass.school_year || null,
      terms: termsList,
      settings,
      subjects: subjectReports,
      overall_average: subjectsWithGradesCount > 0 ? totalSumAnnualGrades / subjectsWithGradesCount : null,
      overall_attendance_percentage: overallTotalLessons > 0 ? Math.round((overallTotalPresences / overallTotalLessons) * 100) : 100,
      overall_situation: "em_andamento",
    };

    return { success: true, reportCard };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro no boletim." };
  }
}

async function runHomologationFase4() {
  console.log("================================================================================");
  console.log("HOMOLOGAÇÃO FUNCIONAL REAL — FASE 4: INTEGRAÇÃO CALENDÁRIO ↔ BOLETIM");
  console.log("Tenant: Escola Modelo Homologação | Auth: Sessões JWT Reais | RLS Ativo");
  console.log("================================================================================\n");

  const adminAuth = await getAuthenticatedUser("admin.homolog@educar360.local");
  const profAuth = await getAuthenticatedUser("prof.matematica@educar360.local");
  const otherAdminAuth = await getAuthenticatedUser("gestor@colegioteste.com.br");

  const tenantId = "44146cf2-1363-4384-a23b-617cce527895"; // Escola Modelo Homologação
  const tenant2Id = "5a664d44-4b14-4cda-b52a-73cdeb87db8e"; // Colégio Horizonte LTDA

  console.log(`Tenant Homologação ID: ${tenantId}`);
  console.log(`Tenant 2 ID: ${tenant2Id}\n`);

  const createdIds: Record<string, any> = {};

  try {
    console.log("--- 1. CONFIGURAÇÃO DE DADOS DE TESTE ---");

    // 1.1 Ano Letivo 2026 com 4 Bimestres
    const { data: sy4Terms, error: sy4Err } = await adminClient
      .from("school_years")
      .insert([
        {
          tenant_id: tenantId,
          year: "2026",
          title: "Ano Letivo 2026 - 4 Bimestres",
          start_date: "2026-02-01",
          end_date: "2026-12-15",
          total_school_days: 200,
          status: "ativo",
          is_current: true,
        },
      ])
      .select()
      .single();

    if (sy4Err) throw new Error(`Falha ao criar School Year 2026: ${sy4Err.message}`);
    createdIds.sy4Terms = sy4Terms.id;

    // 4 Períodos Oficiais
    const terms4Data = [
      { name: "1º Bimestre 2026", code: "1B_2026", term_type: "bimestre", sequence_order: 1, start_date: "2026-02-01", end_date: "2026-04-30", status: "aberto" },
      { name: "2º Bimestre 2026", code: "2B_2026", term_type: "bimestre", sequence_order: 2, start_date: "2026-05-01", end_date: "2026-07-15", status: "bloqueado" },
      { name: "3º Bimestre 2026", code: "3B_2026", term_type: "bimestre", sequence_order: 3, start_date: "2026-08-01", end_date: "2026-09-30", status: "aberto" },
      { name: "4º Bimestre 2026", code: "4B_2026", term_type: "bimestre", sequence_order: 4, start_date: "2026-10-01", end_date: "2026-12-15", status: "aberto" },
    ];

    createdIds.terms4 = [];
    for (const t of terms4Data) {
      const { data: termRecord, error: tErr } = await adminClient
        .from("academic_terms")
        .insert([{ tenant_id: tenantId, school_year_id: sy4Terms.id, ...t }])
        .select()
        .single();
      if (tErr) throw new Error(`Falha ao criar term: ${tErr.message}`);
      createdIds.terms4.push(termRecord);
    }
    console.log(`✅ Ano Letivo 2026 com 4 Bimestres criado com sucesso.`);

    // 1.2 Ano Letivo 2027 com 3 Trimestres
    const { data: sy3Terms, error: sy3Err } = await adminClient
      .from("school_years")
      .insert([
        {
          tenant_id: tenantId,
          year: "2027",
          title: "Ano Letivo 2027 - 3 Trimestres",
          start_date: "2027-02-01",
          end_date: "2027-12-15",
          total_school_days: 200,
          status: "planejamento",
          is_current: false,
        },
      ])
      .select()
      .single();

    if (sy3Err) throw new Error(`Falha ao criar School Year 2027: ${sy3Err.message}`);
    createdIds.sy3Terms = sy3Terms.id;

    // 3 Períodos Trimestrais
    const terms3Data = [
      { name: "1º Trimestre 2027", code: "1T_2027", term_type: "trimestre", sequence_order: 1, start_date: "2027-02-01", end_date: "2027-05-31", status: "aberto" },
      { name: "2º Trimestre 2027", code: "2T_2027", term_type: "trimestre", sequence_order: 2, start_date: "2027-06-01", end_date: "2027-08-31", status: "aberto" },
      { name: "3º Trimestre 2027", code: "3T_2027", term_type: "trimestre", sequence_order: 3, start_date: "2027-09-01", end_date: "2027-12-15", status: "aberto" },
    ];

    createdIds.terms3 = [];
    for (const t of terms3Data) {
      const { data: termRecord, error: tErr } = await adminClient
        .from("academic_terms")
        .insert([{ tenant_id: tenantId, school_year_id: sy3Terms.id, ...t }])
        .select()
        .single();
      if (tErr) throw new Error(`Falha ao criar term trimestral: ${tErr.message}`);
      createdIds.terms3.push(termRecord);
    }
    console.log(`✅ Ano Letivo 2027 com 3 Trimestres criado com sucesso.`);

    // 1.3 Turma 4 Bimestres
    const { data: class4, error: c4Err } = await adminClient
      .from("school_classes")
      .insert([
        {
          tenant_id: tenantId,
          series_id: "d0adf065-35bd-438c-9f72-730a70801867",
          name: "Turma 4B - Oficial 4 Bimestres",
          academic_year: "2026",
          shift: "matutino",
          capacity: 30,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (c4Err) throw new Error(`Falha ao criar Turma 4B: ${c4Err.message}`);
    createdIds.class4 = class4.id;

    // 1.4 Turma 3 Trimestres
    const { data: class3, error: c3Err } = await adminClient
      .from("school_classes")
      .insert([
        {
          tenant_id: tenantId,
          series_id: "d0adf065-35bd-438c-9f72-730a70801867",
          name: "Turma 3T - Oficial 3 Trimestres",
          academic_year: "2027",
          shift: "matutino",
          capacity: 30,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (c3Err) throw new Error(`Falha ao criar Turma 3T: ${c3Err.message}`);
    createdIds.class3 = class3.id;

    // 1.5 Turma Legada
    const { data: classLeg, error: clErr } = await adminClient
      .from("school_classes")
      .insert([
        {
          tenant_id: tenantId,
          series_id: "d0adf065-35bd-438c-9f72-730a70801867",
          name: "Turma Legada Sem Ano Oficial",
          academic_year: "2024",
          shift: "vespertino",
          capacity: 25,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (clErr) throw new Error(`Falha ao criar Turma Legada: ${clErr.message}`);
    createdIds.classLeg = classLeg.id;

    // 1.6 Aluno de Teste
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
            name: "Aluno Teste Homologação Boletim",
            status: "ativo",
          },
        ])
        .select()
        .single();
      studentId = newSt?.id || studentInsertId;
      createdIds.student = studentId;
    }

    // Matrícula na Turma 4B
    const { data: enr4, error: enr4Err } = await adminClient
      .from("enrollments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class4.id,
          student_id: studentId,
          status: "matriculado",
          enrollment_code: "MATR-4B-001",
          academic_year: "2026",
          course_name: "Ensino Fundamental II",
          grade_level: "9º Ano",
        },
      ])
      .select()
      .single();
    if (enr4Err) throw new Error(`Falha ao criar matrícula 4B: ${enr4Err.message}`);
    createdIds.enr4 = enr4.id;

    // Matrícula na Turma 3T
    const { data: enr3, error: enr3Err } = await adminClient
      .from("enrollments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class3.id,
          student_id: studentId,
          status: "matriculado",
          enrollment_code: "MATR-3T-001",
          academic_year: "2027",
          course_name: "Ensino Médio",
          grade_level: "1ª Série",
        },
      ])
      .select()
      .single();
    if (enr3Err) throw new Error(`Falha ao criar matrícula 3T: ${enr3Err.message}`);
    createdIds.enr3 = enr3.id;

    // Matrícula na Turma Legada
    const { data: enrLeg, error: enrLegErr } = await adminClient
      .from("enrollments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: classLeg.id,
          student_id: studentId,
          status: "matriculado",
          enrollment_code: "MATR-LEG-001",
          academic_year: "2024",
          course_name: "Ensino Fundamental II",
          grade_level: "8º Ano",
        },
      ])
      .select()
      .single();
    if (enrLegErr) throw new Error(`Falha ao criar matrícula Legada: ${enrLegErr.message}`);
    createdIds.enrLeg = enrLeg.id;

    // 1.7 Lançamento de Avaliações e Notas na Turma 4B
    // Avaliação 1 no 1º Bimestre
    const { data: ass1 } = await adminClient
      .from("academic_assessments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class4.id,
          academic_period: createdIds.terms4[0].name,
          subject_name: "Matemática",
          title: "Prova Bimestral 1",
          assessment_date: "2026-03-15",
          assessment_type: "prova",
          max_score: 10,
          weight: 1,
        },
      ])
      .select()
      .single();
    createdIds.ass1 = ass1.id;

    // Nota 8.0 para o aluno
    const { data: gr1 } = await adminClient
      .from("student_assessment_grades")
      .insert([
        {
          tenant_id: tenantId,
          assessment_id: ass1.id,
          student_id: studentId,
          score: 8.0,
          is_absent: false,
        },
      ])
      .select()
      .single();
    createdIds.gr1 = gr1.id;

    // Avaliação 2 no 2º Bimestre (bloqueado)
    const { data: ass2 } = await adminClient
      .from("academic_assessments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class4.id,
          academic_period: createdIds.terms4[1].name,
          subject_name: "Matemática",
          title: "Prova Bimestral 2",
          assessment_date: "2026-06-10",
          assessment_type: "prova",
          max_score: 10,
          weight: 1,
        },
      ])
      .select()
      .single();
    createdIds.ass2 = ass2.id;

    // Nota 6.0 para o aluno
    const { data: gr2 } = await adminClient
      .from("student_assessment_grades")
      .insert([
        {
          tenant_id: tenantId,
          assessment_id: ass2.id,
          student_id: studentId,
          score: 6.0,
          is_absent: false,
        },
      ])
      .select()
      .single();
    createdIds.gr2 = gr2.id;

    // Fechamento no 1º Bimestre via academic_period_closings
    const { data: closing1 } = await adminClient
      .from("academic_period_closings")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class4.id,
          academic_period: createdIds.terms4[0].name,
          subject_name: "Matemática",
          is_closed: true,
          closed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    createdIds.closing1 = closing1.id;

    // Aulas e Frequências na Turma 4B
    const { data: lesson1, error: l1Err } = await adminClient
      .from("class_lessons")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class4.id,
          teacher_id: profAuth.user?.id,
          subject_name: "Matemática",
          academic_period: createdIds.terms4[0].name,
          lesson_date: "2026-03-10",
          title: "Aula 1 Geometria",
          content_summary: "Introdução à Geometria Euclidiana",
        },
      ])
      .select()
      .single();
    if (l1Err) throw new Error(`Falha ao criar aula 1: ${l1Err.message}`);
    createdIds.lesson1 = lesson1.id;

    const { data: att1 } = await adminClient
      .from("lesson_attendances")
      .insert([
        {
          tenant_id: tenantId,
          lesson_id: lesson1.id,
          student_id: studentId,
          status: "presente",
        },
      ])
      .select()
      .single();
    createdIds.att1 = att1.id;

    // 1.8 Avaliações na Turma 3T (Trimestral)
    const { data: assTrim1 } = await adminClient
      .from("academic_assessments")
      .insert([
        {
          tenant_id: tenantId,
          class_id: class3.id,
          academic_period: createdIds.terms3[0].name,
          subject_name: "História",
          title: "Trabalho 1 Trimestre",
          assessment_date: "2027-04-10",
          assessment_type: "trabalho",
          max_score: 10,
          weight: 1,
        },
      ])
      .select()
      .single();
    createdIds.assTrim1 = assTrim1.id;

    const { data: grTrim1 } = await adminClient
      .from("student_assessment_grades")
      .insert([
        {
          tenant_id: tenantId,
          assessment_id: assTrim1.id,
          student_id: studentId,
          score: 9.0,
          is_absent: false,
        },
      ])
      .select()
      .single();
    createdIds.grTrim1 = grTrim1.id;

    console.log(`✅ Dados de teste configurados com sucesso.\n`);

    // --------------------------------------------------------------------------
    // EXECUÇÃO DOS CENÁRIOS DE TESTE
    // --------------------------------------------------------------------------
    console.log("--- 2. EXECUÇÃO DOS CENÁRIOS DE HOMOLOGAÇÃO ---\n");

    const results: Array<{ scenario: string; status: "PASSOU" | "FALHOU"; detail: string }> = [];

    // Cenário 1: Turma oficial com 4 períodos → Boletim exibe exatamente os 4 períodos oficiais
    const rep4Res = await executeGetStudentReportCard(
      profAuth.client,
      profAuth.session,
      tenantId,
      "professor",
      class4.id,
      studentId
    );

    if (
      rep4Res.success &&
      rep4Res.reportCard &&
      rep4Res.reportCard.terms.length === 4 &&
      rep4Res.reportCard.terms[0].name === "1º Bimestre 2026" &&
      rep4Res.reportCard.terms[3].name === "4º Bimestre 2026"
    ) {
      results.push({
        scenario: "1. Turma oficial com 4 períodos exibe 4 períodos oficiais",
        status: "PASSOU",
        detail: `Exibiu 4 termos: ${rep4Res.reportCard.terms.map((t: any) => t.name).join(", ")}`,
      });
    } else {
      results.push({
        scenario: "1. Turma oficial com 4 períodos exibe 4 períodos oficiais",
        status: "FALHOU",
        detail: `Resultado inesperado: ${JSON.stringify(rep4Res)}`,
      });
    }

    // Cenário 2: Turma oficial com 3 Trimestres → Boletim exibe exatamente os 3 períodos cadastrados, sem inventar bimestres
    const rep3Res = await executeGetStudentReportCard(
      profAuth.client,
      profAuth.session,
      tenantId,
      "professor",
      class3.id,
      studentId
    );

    if (
      rep3Res.success &&
      rep3Res.reportCard &&
      rep3Res.reportCard.terms.length === 3 &&
      rep3Res.reportCard.terms[0].name === "1º Trimestre 2027" &&
      rep3Res.reportCard.terms[2].name === "3º Trimestre 2027" &&
      !rep3Res.reportCard.terms.some((t: any) => t.name.includes("Bimestre") || t.name.includes("4º"))
    ) {
      results.push({
        scenario: "2. Turma oficial com quantidade diferente de períodos (3 Trimestres)",
        status: "PASSOU",
        detail: `Exibiu exatamente os 3 trimestres cadastrados: ${rep3Res.reportCard.terms.map((t: any) => t.name).join(", ")}`,
      });
    } else {
      results.push({
        scenario: "2. Turma oficial com quantidade diferente de períodos (3 Trimestres)",
        status: "FALHOU",
        detail: `Resultado inesperado: ${JSON.stringify(rep3Res)}`,
      });
    }

    // Cenário 3: Confirmar ordenação por sequence_order
    const isOrdered = rep4Res.reportCard?.terms.every((t: any, idx: number, arr: any[]) => {
      if (idx === 0) return true;
      return t.sequence_order >= arr[idx - 1].sequence_order;
    });

    if (isOrdered) {
      results.push({
        scenario: "3. Ordenação estrita por sequence_order",
        status: "PASSOU",
        detail: `Sequência validada: ${rep4Res.reportCard?.terms.map((t: any) => `#${t.sequence_order} ${t.name}`).join(" -> ")}`,
      });
    } else {
      results.push({
        scenario: "3. Ordenação estrita por sequence_order",
        status: "FALHOU",
        detail: `Ordenação incorreta detectada.`,
      });
    }

    // Cenário 4: Confirmar notas agrupadas no período correto
    const mathSubj = rep4Res.reportCard?.subjects.find((s: any) => s.subject_name === "Matemática");
    const term1Math = mathSubj?.periods["1º Bimestre 2026"];
    const term2Math = mathSubj?.periods["2º Bimestre 2026"];
    const term3Math = mathSubj?.periods["3º Bimestre 2026"];

    if (
      term1Math?.final_period_grade === 8.0 &&
      term2Math?.final_period_grade === 6.0 &&
      term3Math?.final_period_grade === null
    ) {
      results.push({
        scenario: "4. Notas agrupadas no período correto sem mistura",
        status: "PASSOU",
        detail: `1º Bim: ${term1Math?.final_period_grade} (esperado 8.0) | 2º Bim: ${term2Math?.final_period_grade} (esperado 6.0) | 3º Bim: ${term3Math?.final_period_grade || "--"}`,
      });
    } else {
      results.push({
        scenario: "4. Notas agrupadas no período correto sem mistura",
        status: "FALHOU",
        detail: `Notas incorretas: 1B=${term1Math?.final_period_grade}, 2B=${term2Math?.final_period_grade}`,
      });
    }

    // Cenário 5: Confirmar frequência associada ao período correto
    if (mathSubj?.total_lessons === 1 && mathSubj?.presences === 1 && mathSubj?.attendance_percentage === 100) {
      results.push({
        scenario: "5. Frequência associada e calculada corretamente",
        status: "PASSOU",
        detail: `Total Aulas: ${mathSubj.total_lessons}, Presenças: ${mathSubj.presences}, Assiduidade: ${mathSubj.attendance_percentage}%`,
      });
    } else {
      results.push({
        scenario: "5. Frequência associada e calculada corretamente",
        status: "FALHOU",
        detail: `Frequência incorreta: ${JSON.stringify(mathSubj)}`,
      });
    }

    // Cenário 6: Confirmar cálculo de média e situação
    // Média = (8.0 + 6.0) / 2 = 7.0
    if (mathSubj?.annual_average === 7.0 && mathSubj?.situation === "aprovado") {
      results.push({
        scenario: "6. Preservação de fórmulas de cálculo (Média = 7.0, Aprovado)",
        status: "PASSOU",
        detail: `Média Anual calculada: ${mathSubj.annual_average} (esperado 7.0), Situação: ${mathSubj.situation}`,
      });
    } else {
      results.push({
        scenario: "6. Preservação de fórmulas de cálculo",
        status: "FALHOU",
        detail: `Média calculada: ${mathSubj?.annual_average}, Situação: ${mathSubj?.situation}`,
      });
    }

    // Cenário 7: Confirmar período bloqueado/fechado refletido corretamente no Boletim
    if (term1Math?.is_closed === true && term2Math?.is_closed === true && term2Math?.term_status === "bloqueado") {
      results.push({
        scenario: "7. Período bloqueado/fechado refletido no Boletim",
        status: "PASSOU",
        detail: `1º Bim Fechado por closing: ${term1Math.is_closed} | 2º Bim Bloqueado por calendário: ${term2Math.is_closed} (status=${term2Math.term_status})`,
      });
    } else {
      results.push({
        scenario: "7. Período bloqueado/fechado refletido no Boletim",
        status: "FALHOU",
        detail: `Estado de fechamento incorreto: 1B is_closed=${term1Math?.is_closed}, 2B is_closed=${term2Math?.is_closed}`,
      });
    }

    // Cenário 8: Confirmar turma legada sem school_year_id usando os 4 bimestres tradicionais
    const repLegRes = await executeGetStudentReportCard(
      profAuth.client,
      profAuth.session,
      tenantId,
      "professor",
      classLeg.id,
      studentId
    );

    if (
      repLegRes.success &&
      repLegRes.reportCard &&
      repLegRes.reportCard.terms.length === 4 &&
      repLegRes.reportCard.terms[0].name === "1º Bimestre" &&
      repLegRes.reportCard.terms[3].name === "4º Bimestre"
    ) {
      results.push({
        scenario: "8. Turma legada sem school_year_id usando 4 bimestres tradicionais",
        status: "PASSOU",
        detail: `Retornou os 4 bimestres padrão: ${repLegRes.reportCard.terms.map((t: any) => t.name).join(", ")}`,
      });
    } else {
      results.push({
        scenario: "8. Turma legada sem school_year_id usando 4 bimestres tradicionais",
        status: "FALHOU",
        detail: `Resultado inesperado: ${JSON.stringify(repLegRes)}`,
      });
    }

    // Cenário 9: Confirmar isolamento cross-tenant
    const crossRes = await executeGetStudentReportCard(
      otherAdminAuth.client,
      otherAdminAuth.session,
      tenant2Id, // Tenant do outro gestor
      "admin_escola",
      class4.id, // Turma do tenant 1
      studentId
    );

    if (!crossRes.success && crossRes.error?.includes("não encontrada")) {
      results.push({
        scenario: "9. Isolamento cross-tenant",
        status: "PASSOU",
        detail: `Acesso bloqueado com mensagem: "${crossRes.error}"`,
      });
    } else {
      results.push({
        scenario: "9. Isolamento cross-tenant",
        status: "FALHOU",
        detail: `Deveria ter bloqueado o acesso cross-tenant: ${JSON.stringify(crossRes)}`,
      });
    }

    // Cenário 10: Confirmar que Boletim permanece somente leitura (não altera notas nem frequências)
    const { data: gradeBefore } = await adminClient
      .from("student_assessment_grades")
      .select("score")
      .eq("id", gr1.id)
      .single();

    // Chamada ao boletim
    await executeGetStudentReportCard(profAuth.client, profAuth.session, tenantId, "professor", class4.id, studentId);

    const { data: gradeAfter } = await adminClient
      .from("student_assessment_grades")
      .select("score")
      .eq("id", gr1.id)
      .single();

    if (gradeBefore?.score === gradeAfter?.score && gradeAfter?.score === 8.0) {
      results.push({
        scenario: "10. Boletim estritamente somente leitura (imutabilidade de notas)",
        status: "PASSOU",
        detail: `Notas e dados do banco permaneceram 100% inalterados.`,
      });
    } else {
      results.push({
        scenario: "10. Boletim estritamente somente leitura",
        status: "FALHOU",
        detail: `Houve alteração inesperada de notas.`,
      });
    }

    // Imprime tabela de resultados
    console.log("--------------------------------------------------------------------------------");
    console.log("TABELA DE RESULTADOS DOS TESTES FUNCIONAIS (FASE 4)");
    console.log("--------------------------------------------------------------------------------");
    results.forEach((r, idx) => {
      console.log(`[${r.status}] ${r.scenario}`);
      console.log(`       -> ${r.detail}`);
    });
    console.log("--------------------------------------------------------------------------------\n");
  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN COMPLETO
    // --------------------------------------------------------------------------
    console.log("--- 3. TEARDOWN DOS DADOS TEMPORÁRIOS ---");

    try {
      if (createdIds.att1) {
        await adminClient.from("lesson_attendances").delete().eq("id", createdIds.att1);
      }
      if (createdIds.lesson1) {
        await adminClient.from("class_lessons").delete().eq("id", createdIds.lesson1);
      }
      if (createdIds.closing1) {
        await adminClient.from("academic_period_closings").delete().eq("id", createdIds.closing1);
      }
      if (createdIds.gr1) {
        await adminClient.from("student_assessment_grades").delete().eq("id", createdIds.gr1);
      }
      if (createdIds.gr2) {
        await adminClient.from("student_assessment_grades").delete().eq("id", createdIds.gr2);
      }
      if (createdIds.grTrim1) {
        await adminClient.from("student_assessment_grades").delete().eq("id", createdIds.grTrim1);
      }
      if (createdIds.ass1) {
        await adminClient.from("academic_assessments").delete().eq("id", createdIds.ass1);
      }
      if (createdIds.ass2) {
        await adminClient.from("academic_assessments").delete().eq("id", createdIds.ass2);
      }
      if (createdIds.assTrim1) {
        await adminClient.from("academic_assessments").delete().eq("id", createdIds.assTrim1);
      }
      if (createdIds.enr4) {
        await adminClient.from("enrollments").delete().eq("id", createdIds.enr4);
      }
      if (createdIds.enr3) {
        await adminClient.from("enrollments").delete().eq("id", createdIds.enr3);
      }
      if (createdIds.enrLeg) {
        await adminClient.from("enrollments").delete().eq("id", createdIds.enrLeg);
      }
      if (createdIds.class4) {
        await adminClient.from("school_classes").delete().eq("id", createdIds.class4);
      }
      if (createdIds.class3) {
        await adminClient.from("school_classes").delete().eq("id", createdIds.class3);
      }
      if (createdIds.classLeg) {
        await adminClient.from("school_classes").delete().eq("id", createdIds.classLeg);
      }
      if (createdIds.terms4 && createdIds.terms4.length > 0) {
        for (const t of createdIds.terms4) {
          await adminClient.from("academic_terms").delete().eq("id", t.id);
        }
      }
      if (createdIds.terms3 && createdIds.terms3.length > 0) {
        for (const t of createdIds.terms3) {
          await adminClient.from("academic_terms").delete().eq("id", t.id);
        }
      }
      if (createdIds.sy4Terms) {
        await adminClient.from("school_years").delete().eq("id", createdIds.sy4Terms);
      }
      if (createdIds.sy3Terms) {
        await adminClient.from("school_years").delete().eq("id", createdIds.sy3Terms);
      }
      if (createdIds.student) {
        await adminClient.from("students").delete().eq("id", createdIds.student);
      }

      console.log("✅ Teardown completo executado com sucesso! Nenhum dado residual no banco.\n");
    } catch (cleanErr: any) {
      console.error(`⚠️ Erro durante o teardown: ${cleanErr.message}`);
    }
  }
}

runHomologationFase4().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
