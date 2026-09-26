-- Seed: demo do fluxo completo de plano Gold
-- Execute no Supabase SQL Editor com service role.
-- Re-executar é seguro — ON CONFLICT em todos os inserts.
--
-- O que este script faz (exatamente o que acontece em produção via Asaas webhook):
--   1. Cria o plano Gold Mensal de R$5,00 na tabela plans
--   2. Ativa o pacote Nidus com highlight_level='gold' + sponsorship_ends_at = +1 mês
--   3. Registra a subscription como 'active' (o webhook faz isso automaticamente)
--   4. Cadastra Isaque Pinheiro como parceiro platinum ativo

-- ====================================================================
-- 1. PLANO GOLD MENSAL — R$5,00 (500 centavos)
-- Em produção: admin cria via /admin/plans; aqui usamos preço simbólico de teste
-- ====================================================================
INSERT INTO public.plans (
  tier,
  billing_cycle,
  price_cents,
  currency,
  features,
  is_active,
  sort_order
) VALUES (
  'gold',
  'monthly',
  500,
  'BRL',
  '{"items": [
    "Badge Gold no card do pacote",
    "Destaque no topo da listagem de pacotes",
    "Ícone Trophy na página de detalhes",
    "Visibilidade máxima para parceiros Embarcadero",
    "Renovação automática mensal"
  ]}',
  true,
  1
)
ON CONFLICT (tier, billing_cycle) DO UPDATE
  SET price_cents = EXCLUDED.price_cents,
      features    = EXCLUDED.features,
      is_active   = EXCLUDED.is_active,
      sort_order  = EXCLUDED.sort_order;

-- ====================================================================
-- 2. ATIVAR NIDUS COMO GOLD + sponsorship_ends_at = +1 mês
-- Em produção: o webhook /api/webhooks/asaas faz exatamente este UPDATE
-- após receber PAYMENT_CONFIRMED do gateway Asaas
-- ====================================================================
UPDATE public.packages
SET
  highlight_level     = 'gold',
  sponsorship_ends_at = NOW() + INTERVAL '1 month'
WHERE slug = 'nidus';

-- ====================================================================
-- 3. SUBSCRIPTION ATIVA — vincula publisher + pacote + plano
-- Em produção: criada em 'draft' pelo startCheckout() e promovida a
-- 'active' pelo webhook quando o pagamento é confirmado
-- ====================================================================
INSERT INTO public.subscriptions (
  publisher_id,
  package_id,
  plan_id,
  provider,
  status,
  sponsorship_ends_at
)
SELECT
  prof.id                                                          AS publisher_id,
  pkg.id                                                          AS package_id,
  pl.id                                                           AS plan_id,
  'manual'                                                        AS provider,
  'active'                                                        AS status,
  NOW() + INTERVAL '1 month'                                      AS sponsorship_ends_at
FROM auth.users u
JOIN  public.profiles prof ON prof.id = u.id
CROSS JOIN (SELECT id FROM public.packages WHERE slug = 'nidus') pkg
CROSS JOIN (SELECT id FROM public.plans   WHERE tier = 'gold' AND billing_cycle = 'monthly') pl
WHERE u.email = 'isaquesp@gmail.com';

-- ====================================================================
-- 4. ISAQUE PINHEIRO COMO PARCEIRO PLATINUM
-- tier='platinum' é o mais alto na hierarquia de parceiros
-- logo_url = avatar do GitHub
-- ====================================================================
INSERT INTO public.partners (
  name,
  logo_url,
  website_url,
  description,
  status,
  tier,
  area,
  sort_order
) VALUES (
  'Isaque Pinheiro',
  'https://avatars.githubusercontent.com/u/4005289?v=4',
  'https://github.com/ModernDelphiWorks',
  'Embarcadero MVP e Senior Software Engineer. Criador do ecossistema ModernDelphiWorks — frameworks open-source de produção para Delphi e Lazarus.',
  'active',
  'platinum',
  'Open-Source / Delphi Frameworks',
  1
)
ON CONFLICT (name) DO UPDATE
  SET logo_url    = EXCLUDED.logo_url,
      website_url = EXCLUDED.website_url,
      description = EXCLUDED.description,
      status      = EXCLUDED.status,
      tier        = EXCLUDED.tier,
      area        = EXCLUDED.area,
      sort_order  = EXCLUDED.sort_order;
