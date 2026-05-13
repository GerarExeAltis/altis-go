-- supabase/seed.sql
-- Dados iniciais aplicados apos cada `supabase db reset`.
-- NAO contem dados sensiveis reais. NAO sobrescreve dados existentes em prod.

-- ━━━━━━━━━━━━━━━━━━━━━━ USUARIO ADMIN INICIAL ━━━━━━━━━━━━━━━━━━━

-- O Plano 3 (CLI) substitui isso por bootstrap interativo.
-- Para dev local: hash placeholder; Plano 2 (Edge Fn validar-senha-admin)
-- recebera um hash real gerado pela CLI.
-- IMPORTANTE: GoTrue moderno rejeita NULL nos campos *_token e email_change;
-- precisa string vazia ''. Sem isso, login retorna
-- "Database error querying schema" via Scan error.
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at,
                        instance_id, aud, role, email_confirmed_at,
                        confirmation_token, recovery_token,
                        email_change_token_new, email_change_token_current,
                        email_change, reauthentication_token,
                        phone_change, phone_change_token)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@altis.local',
  extensions.crypt('senha123', extensions.gen_salt('bf', 10)),
  NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  NOW(),
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  confirmation_token = '', recovery_token = '',
  email_change_token_new = '', email_change_token_current = '',
  email_change = '', reauthentication_token = '',
  phone_change = '', phone_change_token = '';

INSERT INTO public.perfis_operadores (id, nome_completo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Local')
ON CONFLICT (id) DO NOTHING;

-- Define senha admin de DEV via helper PL/pgSQL.
-- A funcao recebe a senha em PLAINTEXT e faz crypt + gen_salt('bf', 12) internamente.
-- NAO passar hash pre-computado aqui (causa hash-do-hash, impossivel de validar).
-- Plano 3 (CLI) sobrescreve com senha real no bootstrap interativo.
SELECT private.definir_senha_admin('admin123');

-- ━━━━━━━━━━━━━━━━━━━━━━ LOJAS EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.lojas (id, nome, cidade) VALUES
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Loja Caxias',  'Caxias do Sul'),
  ('aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'Loja Bento',   'Bento Goncalves'),
  ('aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa', 'Loja Garibaldi','Garibaldi')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ EVENTO DE EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.eventos (id, nome, descricao, data_inicio, data_fim, status, criado_por)
VALUES (
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
  'Evento Demo',
  'Evento de exemplo para desenvolvimento local',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'ativo',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━ PREMIOS EXEMPLO ━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO public.premios (id, evento_id, nome, descricao,
                            peso_base, estoque_inicial, estoque_atual,
                            ordem_roleta, e_premio_real) VALUES
  ('cccccccc-1111-1111-1111-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Vale R$10', 'Vale-compra de R$10 em qualquer loja Altis',
   1, 100, 100, 1, true),

  ('cccccccc-2222-2222-2222-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Camiseta Altis', 'Camiseta exclusiva Altis Sistemas',
   2, 20, 20, 2, true),

  ('cccccccc-3333-3333-3333-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Smart TV 32"', 'TV LED 32 polegadas',
   10, 1, 1, 3, true),

  ('cccccccc-9999-9999-9999-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Nao foi dessa vez', 'Obrigado por participar!',
   30, 0, 0, 99, false)
ON CONFLICT (id) DO NOTHING;
