-- External repo links — owner-private repository link object.
-- Epic 2/6 — Demand 1/2 — `external_repo_links` schema + owner-only RLS (ESP-002).
--
-- A workspace node can target a repo the portal does not publish: a third-party
-- upstream or the owner's own unpublished pushable repo. This table persists the
-- link (canonical upstream_url, optional fork_url, write_target routing hint) and
-- locks it to its owner. The portal is metadata-only (RN-007) — no credentials,
-- no git contact.
--
-- ADR-057: owner-scoped self-contained table (reusable across nodes/workspaces).
-- ADR-058: owner-only RLS; no public-read inheritance (fork_url must never leak).
-- ADR-059: resolves the deferred external_link_id FK promised by ADR-047 forward-note.
--
-- Additive only: new table objects + one FK ALTER on workspace_nodes.

-- ---------------------------------------------------------------------------
-- 1. external_repo_links — owner-private repo link (ADR-057).
-- ---------------------------------------------------------------------------
CREATE TABLE public.external_repo_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    upstream_url    TEXT NOT NULL,
    fork_url        TEXT,
    write_target    TEXT NOT NULL DEFAULT 'none',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- BR2: write_target must be 'fork' or 'none'.
    CONSTRAINT chk_external_repo_links_write_target
        CHECK (write_target IN ('fork', 'none')),
    -- BR3: a 'fork' write_target requires fork_url to be non-null.
    CONSTRAINT chk_external_repo_links_fork_requires_url
        CHECK (write_target = 'none' OR fork_url IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- 2. Owner-only RLS (ADR-058, RN-005, BR4).
--    No visibility clause; no workspace-inheritance sub-select anywhere.
--    Fork URLs must never be visible to non-owners even inside a public workspace.
-- ---------------------------------------------------------------------------
ALTER TABLE public.external_repo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own external repo links"
    ON public.external_repo_links FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Owner can insert own external repo links"
    ON public.external_repo_links FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own external repo links"
    ON public.external_repo_links FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own external repo links"
    ON public.external_repo_links FOR DELETE
    USING (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger — reuses the shared function (not redefined here).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER on_external_repo_link_updated
    BEFORE UPDATE ON public.external_repo_links
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Owner index — dominant lookup: a profile's links (ADR-057).
-- ---------------------------------------------------------------------------
CREATE INDEX idx_external_repo_links_owner_id ON public.external_repo_links (owner_id);

-- ---------------------------------------------------------------------------
-- 5. Resolve the deferred FK (ADR-059, ADR-047 forward-note, BR5).
--    external_link_id was a plain nullable UUID in workspace_nodes (no FK) because
--    the target table did not exist. Now it does. This is the only change to
--    workspace_nodes; ON DELETE CASCADE mirrors the package_id arm (ADR-046).
--    Safe because no workspace_nodes row holds a non-null external_link_id today.
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspace_nodes
    ADD CONSTRAINT fk_workspace_nodes_external_link
    FOREIGN KEY (external_link_id)
    REFERENCES public.external_repo_links(id) ON DELETE CASCADE;
