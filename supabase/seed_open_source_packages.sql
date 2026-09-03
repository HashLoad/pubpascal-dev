-- Seed: todos os projetos open-source de isaquesp@gmail.com (ModernDelphiWorks)
-- Execute no Supabase SQL Editor com service role (postgres).
-- Re-executar é seguro — ON CONFLICT em repository_url.

-- 1. Nidus — framework modular para aplicações e microsserviços (NestJS-style)
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'Nidus',
  'nidus',
  'Framework modular e escalável para aplicações e microsserviços em Delphi, inspirado no NestJS. Oferece Dependency Injection automatizado, Validation Pipes com atributos RTTI, Guards de segurança, object pooling de alta concorrência e microsserviços RPC nativos via Indy/Synapse.',
  'https://github.com/ModernDelphiWorks/Nidus',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi'],
  'active',
  8
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 2. ModernSyntax — toolkit de programação funcional para Delphi
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'ModernSyntax',
  'modernsyntax',
  'Toolkit de programação funcional e extensão de sintaxe moderna para Delphi. Inclui TOption<T> para null safety, TResultPair<S,F> para tratamento funcional de erros, TMatch<T> para pattern matching expressivo, TScheduler para async/await sem sincronização manual e suporte a currying.',
  'https://github.com/ModernDelphiWorks/ModernSyntax',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi'],
  'active',
  16
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 3. MetaDbDiff — comparação de metadados e geração de scripts DDL
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'MetaDbDiff',
  'metadbdiff',
  'Engine de comparação de metadados de banco de dados e geração de scripts DDL para Delphi e Lazarus. Compara model-to-database (entidades ORM vs. schema físico) ou database-to-database, gerando SQL cirúrgico para sincronizar tabelas, colunas, tipos, chaves primárias/estrangeiras e índices.',
  'https://github.com/ModernDelphiWorks/MetaDbDiff',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi', 'Lazarus'],
  'active',
  0
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 4. Janus — ORM framework completo com RTTI, master-detail e lazy loading
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'Janus',
  'janus',
  'Framework ORM de alto desempenho para Delphi que faz a ponte entre modelos de objetos e bancos de dados relacionais. Usa atributos RTTI para mapeamento de entidades, suporta hierarquias master-detail automáticas (TManagerDataSet), lazy loading transparente via proxies e inclui wizard interativo de geração de código no IDE Delphi.',
  'https://github.com/ModernDelphiWorks/Janus',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi'],
  'active',
  0
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 5. InjectContainer — DI framework thread-safe com cache RTTI otimizado
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'InjectContainer',
  'injectcontainer',
  'Framework de Dependency Injection thread-safe e alto desempenho para Delphi. Cache RTTI personalizado com 40-60% de ganho de velocidade na resolução, detecção automática de dependências circulares e ciclos de vida completos: Singleton, Factory, LazyLoad e Interface-based. Projetado para ambientes servidor de alta concorrência.',
  'https://github.com/ModernDelphiWorks/InjectContainer',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi'],
  'active',
  3
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 6. FluentSQL — gerador de SQL/MQL agnóstico de banco de dados (strings-only)
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'FluentSQL',
  'fluentsql',
  'Biblioteca de geração de SQL/MQL agnóstica de banco de dados para Delphi e Lazarus. API fluente e orientada a objetos para construir DML (SELECT, INSERT, UPDATE, DELETE) e DDL como strings puras — sem conexão ativa. Suporta Firebird, MySQL, PostgreSQL, MSSQL, SQLite, Oracle e MongoDB (MQL).',
  'https://github.com/ModernDelphiWorks/FluentSQL',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi', 'Lazarus'],
  'active',
  0
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 7. Colligo — biblioteca LINQ-like com lazy evaluation para coleções
--    (ex-FluentQuery; rebrand na v0.3.0. Em banco já semeado com o nome
--    antigo, renomeie antes a linha existente:
--      UPDATE public.packages
--         SET name = 'Colligo', slug = 'colligo',
--             repository_url = 'https://github.com/ModernDelphiWorks/Colligo'
--       WHERE repository_url = 'https://github.com/ModernDelphiWorks/FluentQuery';)
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'Colligo',
  'colligo',
  'Biblioteca funcional de manipulação de coleções para Delphi e Lazarus, inspirada no LINQ do C#. Implementa IColligoEnumerable<T> e IColligoQueryable<T> com Lazy Evaluation (execução adiada) e zero alocações intermediárias. Cobre filtragem, projeção, particionamento, ordenação, joins, set operations e agregações.',
  'https://github.com/ModernDelphiWorks/Colligo',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi', 'Lazarus'],
  'active',
  13
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;

-- 8. DataEngine — abstração de engine de banco de dados com pooling e cache
INSERT INTO public.packages (
  publisher_id, name, slug, description,
  repository_url, license_type, license_name,
  platforms, languages, status, stars
)
SELECT
  u.id,
  'DataEngine',
  'dataengine',
  'Framework de abstração de engine de banco de dados para Delphi e Lazarus. Interface uniforme sobre FireDAC, dbExpress, UniDAC e Zeos via injeção de fábrica. Inclui connection pooling multi-tenant com isolamento por tenant, monitoramento de queries de alta precisão e cache client-side inteligente com invalidação automática em operações DML.',
  'https://github.com/ModernDelphiWorks/DataEngine',
  'open_source',
  'MIT',
  ARRAY['Windows', 'Linux', 'macOS', 'Android', 'iOS'],
  ARRAY['Delphi', 'Lazarus'],
  'active',
  0
FROM auth.users u
WHERE u.email = 'isaquesp@gmail.com'
ON CONFLICT (repository_url) DO UPDATE
  SET status      = EXCLUDED.status,
      description  = EXCLUDED.description,
      platforms    = EXCLUDED.platforms,
      languages    = EXCLUDED.languages;
