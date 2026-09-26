-- Seed: planos Silver/Bronze + ativa Janus (prata) e JsonFlow (bronze)

-- 1. Plano Prata Mensal — R$3,00
INSERT INTO public.plans (tier, billing_cycle, price_cents, currency, features, is_active, sort_order)
VALUES (
  'silver', 'monthly', 300, 'BRL',
  '{"items": ["Badge Prata no card do pacote", "Destaque na listagem de pacotes", "Ícone de destaque na página de detalhes", "Renovação automática mensal"]}',
  true, 2
)
ON CONFLICT (tier, billing_cycle) DO UPDATE
  SET price_cents = EXCLUDED.price_cents,
      features    = EXCLUDED.features,
      is_active   = EXCLUDED.is_active,
      sort_order  = EXCLUDED.sort_order;

-- 2. Plano Bronze Mensal — R$1,50
INSERT INTO public.plans (tier, billing_cycle, price_cents, currency, features, is_active, sort_order)
VALUES (
  'bronze', 'monthly', 150, 'BRL',
  '{"items": ["Badge Bronze no card do pacote", "Destaque moderado na listagem", "Renovação automática mensal"]}',
  true, 3
)
ON CONFLICT (tier, billing_cycle) DO UPDATE
  SET price_cents = EXCLUDED.price_cents,
      features    = EXCLUDED.features,
      is_active   = EXCLUDED.is_active,
      sort_order  = EXCLUDED.sort_order;

-- 3. Janus → Silver
UPDATE public.packages
SET highlight_level     = 'silver',
    sponsorship_ends_at = NOW() + INTERVAL '1 month'
WHERE slug = 'janus';

-- 4. JsonFlow → Bronze
UPDATE public.packages
SET highlight_level     = 'bronze',
    sponsorship_ends_at = NOW() + INTERVAL '1 month'
WHERE slug = 'jsonflow';

-- 5. Subscription Janus/Silver
INSERT INTO public.subscriptions (publisher_id, package_id, plan_id, provider, status, sponsorship_ends_at)
SELECT
  prof.id,
  pkg.id,
  pl.id,
  'manual',
  'active',
  NOW() + INTERVAL '1 month'
FROM auth.users u
JOIN  public.profiles prof ON prof.id = u.id
CROSS JOIN (SELECT id FROM public.packages WHERE slug = 'janus') pkg
CROSS JOIN (SELECT id FROM public.plans   WHERE tier = 'silver' AND billing_cycle = 'monthly') pl
WHERE u.email = 'isaquesp@gmail.com';

-- 6. Subscription JsonFlow/Bronze
INSERT INTO public.subscriptions (publisher_id, package_id, plan_id, provider, status, sponsorship_ends_at)
SELECT
  prof.id,
  pkg.id,
  pl.id,
  'manual',
  'active',
  NOW() + INTERVAL '1 month'
FROM auth.users u
JOIN  public.profiles prof ON prof.id = u.id
CROSS JOIN (SELECT id FROM public.packages WHERE slug = 'jsonflow') pkg
CROSS JOIN (SELECT id FROM public.plans   WHERE tier = 'bronze' AND billing_cycle = 'monthly') pl
WHERE u.email = 'isaquesp@gmail.com';
