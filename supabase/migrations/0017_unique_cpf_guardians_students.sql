-- ==============================================================================
-- EDUCAR360 - MÓDULO SECRETARIA: UNICIDADE DE CPF PARA RESPONSÁVEIS E ALUNOS
-- ==============================================================================
-- 1. Impede duplicidade de responsáveis com o mesmo CPF no mesmo tenant
-- 2. Impede duplicidade de alunos com o mesmo CPF no mesmo tenant
-- ==============================================================================

-- 1. Cria índice de unicidade de CPF por tenant para a tabela public.guardians
--    (Elimina duplicatas preexistentes mantendo o registro com vínculo ou mais recente)
DELETE FROM public.guardians g1
WHERE EXISTS (
    SELECT 1 FROM public.guardians g2
    WHERE g2.tenant_id = g1.tenant_id
      AND g2.cpf = g1.cpf
      AND (
          -- Se g2 tem vínculo em student_guardians e g1 não tem, remove g1
          (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.guardian_id = g2.id)
           AND NOT EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.guardian_id = g1.id))
          OR
          -- Se ambos têm ou nenhum tem, mantém o mais recente
          (g2.created_at > g1.created_at AND NOT EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.guardian_id = g1.id))
      )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_guardians_tenant_cpf
ON public.guardians (tenant_id, cpf);

-- 2. Cria índice de unicidade de CPF por tenant para a tabela public.students
--    (Apenas onde o CPF foi preenchido, permitindo múltiplos alunos sem CPF)
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_tenant_cpf
ON public.students (tenant_id, cpf)
WHERE cpf IS NOT NULL AND cpf != '';
