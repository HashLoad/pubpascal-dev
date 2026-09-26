-- CLI tokens — hashed-at-rest, scoped bearer credentials for headless CLI auth.
-- Epic 4/6 — Demand 2/2 (CLI auth token, ADR-076, ESP-002).
--
-- Tokens grant manifest-read only (RN-009, BR1). Plaintext is never stored —
-- only the SHA-256 hex hash and a non-secret display prefix (BR3). Owner-only
-- RLS (SELECT/INSERT/UPDATE — no DELETE; revoke is an UPDATE of revoked_at,
-- BR4/BR5). Verification reads are service-role by-hash (ADR-077, A3).
-- Additive only: no existing table altered (AC-13).

CREATE TABLE public.cli_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label           TEXT,
    scope           TEXT NOT NULL DEFAULT 'manifest:read',
    token_prefix    TEXT NOT NULL,
    token_hash      TEXT NOT NULL UNIQUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at    TIMESTAMP WITH TIME ZONE,
    expires_at      TIMESTAMP WITH TIME ZONE,
    revoked_at      TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_cli_tokens_scope CHECK (scope = 'manifest:read')
);

-- ---------------------------------------------------------------------------
-- Owner-only RLS (ADR-076, BR4). No DELETE policy — revoke is UPDATE (BR5).
-- ---------------------------------------------------------------------------
ALTER TABLE public.cli_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own CLI tokens"
    ON public.cli_tokens FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Owner can insert own CLI tokens"
    ON public.cli_tokens FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own CLI tokens"
    ON public.cli_tokens FOR UPDATE
    USING (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Indexes: UNIQUE on token_hash (fast by-hash lookup, AC-13) + owner_id index.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX idx_cli_tokens_token_hash ON public.cli_tokens (token_hash);

CREATE INDEX idx_cli_tokens_owner_id ON public.cli_tokens (owner_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger — reuses the shared function (not redefined here).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER on_cli_token_updated
    BEFORE UPDATE ON public.cli_tokens
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
