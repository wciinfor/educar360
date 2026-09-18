-- ==============================================================================
-- EDUCAR360 - ATUALIZAÇÃO DA ESTRUTURA COMERCIAL OFICIAL DE PLANOS SAAS
-- ==============================================================================
-- - Start: até 100 alunos — R$ 199/mês (19900 centavos)
-- - Essencial: até 200 alunos — R$ 299/mês (29900 centavos)
-- - Profissional: até 500 alunos — R$ 499/mês (49900 centavos)
-- - Enterprise: acima de 500 alunos — Sob Consulta (0 centavos / sob consulta)
-- ==============================================================================

-- 1. Upsert dos Planos Oficiais na tabela saas_plans
INSERT INTO public.saas_plans (name, code, description, price_cents, billing_cycle, max_students, is_active, features)
VALUES 
(
  'Start',
  'start',
  'Ideal para pequenas escolas, creches e instituições em fase inicial com até 100 alunos.',
  19900,
  'monthly',
  100,
  TRUE,
  '["Secretaria Escolar Digital", "Módulo Acadêmico & Diário", "Controle de Matrículas", "Portal do Aluno Responsivo", "Isolamento Estrito RLS", "Suporte via Chamados"]'::jsonb
),
(
  'Essencial',
  'essencial',
  'Para escolas em crescimento com até 200 alunos que necessitam de mais robustez.',
  29900,
  'monthly',
  200,
  TRUE,
  '["Todos os recursos do Start", "Até 200 alunos ativos", "Matrículas & Contratos", "Controle de Frequência & Notas", "Portal do Responsável", "Suporte por Email e Chamados"]'::jsonb
),
(
  'Profissional',
  'profissional',
  'Para instituições consolidadas de até 500 alunos que exigem gestão financeira e comunicação integrada.',
  49900,
  'monthly',
  500,
  TRUE,
  '["Todos os recursos do Essencial", "Até 500 alunos ativos", "Módulo Financeiro & Boletos", "Comunicação Integrada com Pais", "Portais Aluno, Pai e Professor", "Suporte Prioritário por WhatsApp"]'::jsonb
),
(
  'Enterprise',
  'enterprise',
  'Para redes de ensino e instituições acima de 500 alunos que demandam atendimento personalizado.',
  0,
  'monthly',
  NULL,
  TRUE,
  '["Alunos e Usuários Ilimitados", "Acima de 500 alunos", "Múltiplas Unidades / Multi-Tenant", "Auditoria Avançada de Dados", "APIs & Webhooks de Integração", "Gerente de Contas Dedicado"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_cycle = EXCLUDED.billing_cycle,
  max_students = EXCLUDED.max_students,
  is_active = EXCLUDED.is_active,
  features = EXCLUDED.features,
  updated_at = timezone('utc'::text, now());
