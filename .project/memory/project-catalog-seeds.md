---
name: project-catalog-seeds
description: O catálogo de pacotes do operador é reproduzível via supabase/seed_*.sql
  (resolve dono por EMAIL). Deletar o auth user faz CASCADE e apaga tudo — recuperar
  re-rodando os seeds.
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: project
---
# Catálogo de pacotes do operador = seed-based (recuperável)

Os pacotes reais do operador (isaquesp@gmail.com / ModernDelphiWorks) vêm de **`supabase/seed_*.sql`**, não só do form `/publish`:
- **`seed_open_source_packages.sql`** = os **8 repos** ModernDelphiWorks: Nidus, ModernSyntax, MetaDbDiff, Janus, InjectContainer, FluentSQL, FluentQuery, DataEngine. Todos `status='active'`, license MIT, com descrição + `repository_url` GitHub.
- `seed_jsonflow.sql` = JsonFlow (demo). `seed_silver_bronze.sql` = tiers Janus(silver)/JsonFlow(bronze) + ativa. `seed_demo_gold_plan.sql` = Nidus(gold).

**Característica-chave:** todos resolvem `publisher_id`/`owner_id` por **`auth.users WHERE email='isaquesp@gmail.com'`** (não ID hardcoded) e são **idempotentes** (`ON CONFLICT (repository_url) DO UPDATE`). Logo, re-rodar com o usuário novo (mesmo email) **recria tudo apontando pro dono certo**, sem editar.

## ⚠️ Footgun de CASCADE (incidente 2026-06-09)
Operador excluiu o auth user antigo (pra criar um com senha p/ login no preview). O schema (`init_schema.sql`) tem cadeia `ON DELETE CASCADE`: `auth.users → profiles → packages (publisher_id NOT NULL) → package_versions`. Resultado: **deletar o auth user apaga TUDO** (não vira órfão — `publisher_id NOT NULL` impede). `total_pacotes` foi a 0.
**Recuperação que funcionou:** re-rodar `seed_open_source_packages.sql` (resolveu pelo email do novo user 9650e3f1-...) → 9 pacotes active de volta. Catálogo voltou a "9 packages found".
**Heads-up p/ launch:** CASCADE em delete de user é footgun — considerar soft-delete / RESTRICT / transferência de ownership no futuro (decisão de produto, não urgente). Ver [[project-execution-plan]].