/**
 * EDUCAR360 - SUÍTE DE TESTES DE ISOLAMENTO JWT E VALIDAÇÃO RBAC/RLS
 * 
 * Executa testes automatizados de leitura e isolamento multi-tenant
 * utilizando sessões JWT reais e independentes para cada um dos 4 perfis.
 * 
 * Modo de Execução: SOMENTE-LEITURA / NÃO-MUTÁVEL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjkfwcqdclfsyspjwnes.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ahueCUm7y-TKkbA26h668w_4WH4wYLk';

const MANIFEST_PATH = path.resolve(process.cwd(), 'homologation-manifest.json');

async function runJwtIsolationTests() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`[ERRO] Manifesto de homologação não encontrado em ${MANIFEST_PATH}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const tenantId = manifest.createdRecords.tenantId;
  const otherTenantId = 'a8d29b00-349f-43b6-8968-07e59c16911e'; // Colégio Horizonte
  const testPassword = 'Homolog@2026_EducarTest!';

  console.log('=== INICIANDO TESTES JWT DE LEITURA E ISOLAMENTO ===');
  console.log(`Tenant Homologação: ${tenantId} (${manifest.tenantSlug})\n`);

  const results = [];

  function record(testName, profile, expected, observed, classification, details = '') {
    results.push({ testName, profile, expected, observed, classification, details });
    console.log(`[${classification}] (${profile}) ${testName} => ${observed}`);
  }

  async function createSession(email) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password: testPassword });
    if (error || !data.session) {
      throw new Error(`Falha de autenticação para ${email}: ${error?.message || 'Sessão nula'}`);
    }
    return { client, user: data.user, token: data.session.access_token };
  }

  // 1. ADMIN_ESCOLA
  console.log('--- 1. Perfil: ADMIN_ESCOLA (admin.homolog@educar360.local) ---');
  const admin = await createSession('admin.homolog@educar360.local');

  const { data: admClasses, error: admClErr } = await admin.client
    .from('school_classes')
    .select('id, name')
    .eq('tenant_id', tenantId);

  record(
    'Leitura de turmas do tenant',
    'admin_escola',
    'Retornar 1 turma (9º Ano A — 2026)',
    admClErr ? `Erro: ${admClErr.message}` : `Retornou ${admClasses?.length || 0} turma(s): ${admClasses?.map(c => c.name).join(', ')}`,
    admClasses?.length === 1 ? 'SUCESSO_ESPERADO' : 'FALHA'
  );

  const { data: admEnr, error: admEnrErr } = await admin.client
    .from('enrollments')
    .select('id, enrollment_code, status')
    .eq('tenant_id', tenantId);

  record(
    'Leitura de matrículas do tenant',
    'admin_escola',
    'Retornar 3 matrículas',
    admEnrErr ? `Erro: ${admEnrErr.message}` : `Retornou ${admEnr?.length || 0} matrícula(s)`,
    admEnr?.length === 3 ? 'SUCESSO_ESPERADO' : 'FALHA'
  );

  const { data: admCross, error: admCrossErr } = await admin.client
    .from('school_classes')
    .select('id, name')
    .eq('tenant_id', otherTenantId);

  record(
    'Isolamento Cross-Tenant (Turmas de outro tenant)',
    'admin_escola',
    'Retornar 0 registros (bloqueado por RLS)',
    admCrossErr ? `Erro: ${admCrossErr.message}` : `Retornou ${admCross?.length || 0} registro(s)`,
    admCross?.length === 0 ? 'RESULTADO_VAZIO_ESPERADO' : 'QUEBRA_ISOLAMENTO'
  );

  // 2. SECRETARIA
  console.log('\n--- 2. Perfil: SECRETARIA (secretaria.homolog@educar360.local) ---');
  const sec = await createSession('secretaria.homolog@educar360.local');

  const { data: secStudents, error: secStErr } = await sec.client
    .from('students')
    .select('id, full_name, cpf')
    .eq('tenant_id', tenantId);

  record(
    'Leitura de alunos do tenant',
    'secretaria',
    'Retornar 3 alunos',
    secStErr ? `Erro: ${secStErr.message}` : `Retornou ${secStudents?.length || 0} alunos`,
    secStudents?.length === 3 ? 'SUCESSO_ESPERADO' : 'FALHA'
  );

  const { data: secCross, error: secCrossErr } = await sec.client
    .from('students')
    .select('id')
    .eq('tenant_id', otherTenantId);

  record(
    'Isolamento Cross-Tenant (Alunos de outro tenant)',
    'secretaria',
    'Retornar 0 registros',
    secCrossErr ? `Erro: ${secCrossErr.message}` : `Retornou ${secCross?.length || 0} registro(s)`,
    secCross?.length === 0 ? 'RESULTADO_VAZIO_ESPERADO' : 'QUEBRA_ISOLAMENTO'
  );

  // 3. PROFESSOR ALOCADO
  console.log('\n--- 3. Perfil: PROFESSOR ALOCADO (prof.matematica@educar360.local) ---');
  const profAlocado = await createSession('prof.matematica@educar360.local');

  const { data: profAlloc, error: profAllocErr } = await profAlocado.client
    .from('teacher_class_allocations')
    .select('id, subject_name, class_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', profAlocado.user.id);

  record(
    'Consulta de alocações próprias',
    'professor (alocado)',
    'Retornar 1 alocação de Matemática',
    profAllocErr ? `Erro: ${profAllocErr.message}` : `Retornou ${profAlloc?.length || 0} alocação: ${profAlloc?.[0]?.subject_name}`,
    profAlloc?.length === 1 ? 'SUCESSO_ESPERADO' : 'FALHA'
  );

  const { data: profStudents, error: profStErr } = await profAlocado.client
    .from('enrollments')
    .select('id, student_id, status, students(full_name)')
    .eq('tenant_id', tenantId)
    .eq('class_id', manifest.createdRecords.classIds[0])
    .eq('status', 'matriculado');

  record(
    'Consulta de alunos para Diário (status: matriculado)',
    'professor (alocado)',
    'Retornar 2 alunos matriculados',
    profStErr ? `Erro: ${profStErr.message}` : `Retornou ${profStudents?.length || 0} alunos: ${profStudents?.map(s => s.students?.full_name).join(', ')}`,
    profStudents?.length === 2 ? 'SUCESSO_ESPERADO' : 'FALHA'
  );

  // 4. PROFESSOR NÃO ALOCADO
  console.log('\n--- 4. Perfil: PROFESSOR NÃO ALOCADO (prof.historia@educar360.local) ---');
  const profNaoAlocado = await createSession('prof.historia@educar360.local');

  const { data: noAllocs, error: noAllocErr } = await profNaoAlocado.client
    .from('teacher_class_allocations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', profNaoAlocado.user.id);

  record(
    'Consulta de alocações próprias (sem turmas)',
    'professor (não alocado)',
    'Retornar 0 alocações ativas',
    noAllocErr ? `Erro: ${noAllocErr.message}` : `Retornou ${noAllocs?.length || 0} alocações`,
    noAllocs?.length === 0 ? 'RESULTADO_VAZIO_ESPERADO' : 'FALHA'
  );

  console.log('\n=== FIM DOS TESTES JWT ===');
  return results;
}

if (require.main === module) {
  runJwtIsolationTests().catch(err => {
    console.error('[FALHA FATAL NOS TESTES JWT]:', err);
    process.exit(1);
  });
}

module.exports = { runJwtIsolationTests };
