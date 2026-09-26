-- Seed: JsonFlow as a real example package under isaquesp@gmail.com
-- Run this in the Supabase SQL Editor (it reads auth.users, so it must run
-- as the postgres/service role — the SQL Editor does by default).
--
-- license_name below is only the INITIAL/fallback value: for GitHub-hosted
-- open-source packages the detail page mirrors the repo's current license live.
-- Re-running is safe (ON CONFLICT on the unique repository_url).

INSERT INTO public.packages (
  publisher_id,
  name,
  slug,
  description,
  repository_url,
  license_type,
  license_name,
  platforms,
  languages,
  status,
  stars
)
SELECT
  u.id,
  'JsonFlow',
  'jsonflow',
  'Framework completo e avançado para JSON em Delphi/Object Pascal: serialização, desserialização, validação por schema e API fluente.',
  'https://github.com/ModernDelphiWorks/JsonFlow',
  'open_source',
  'Apache-2.0',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi', 'Lazarus'],
  'active',
  6
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;
