-- supabase/seed.sql
-- Dados iniciais aplicados apos cada `supabase db reset`.
-- NAO contem dados sensiveis reais. NAO sobrescreve dados existentes em prod.

-- ━━━━━━━━━━━━━━━━━━━━━━ USUARIO ADMIN INICIAL ━━━━━━━━━━━━━━━━━━━

-- O Plano 3 (CLI) substitui isso por bootstrap interativo.
-- Para dev local: hash placeholder; Plano 2 (Edge Fn validar-senha-admin)
-- recebera um hash real gerado pela CLI.
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at,
                        instance_id, aud, role, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@altis.local',
  '$2a$10$qkLkmVcVl/dXdJ.K9hMnL.NJTwIPfxXVPVxKAzZ0qZ.qOTL.lk5j6',
  NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfis_operadores (id, nome_completo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Local')
ON CONFLICT (id) DO NOTHING;

-- Define senha admin de DEV via helper PL/pgSQL (bcrypt cost 12).
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

INSERT INTO public.premios (id, evento_id, nome, descricao, cor_hex,
                            peso_base, estoque_inicial, estoque_atual,
                            ordem_roleta, e_premio_real) VALUES
  ('cccccccc-1111-1111-1111-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Vale R$10', 'Vale-compra de R$10 em qualquer loja Altis',
   '#4afad4', 1, 100, 100, 1, true),

  ('cccccccc-2222-2222-2222-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Camiseta Altis', 'Camiseta exclusiva Altis Sistemas',
   '#f7b32b', 2, 20, 20, 2, true),

  ('cccccccc-3333-3333-3333-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Smart TV 32"', 'TV LED 32 polegadas',
   '#e74c3c', 10, 1, 1, 3, true),

  ('cccccccc-9999-9999-9999-cccccccccccc',
   'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
   'Nao foi dessa vez', 'Obrigado por participar!',
   '#555555', 30, 0, 0, 99, false)
ON CONFLICT (id) DO NOTHING;
