-- Workspace graph foundation — workspaces / workspace_nodes / workspace_edges.
-- Epic 1/6 — Demand 1/3 — Schema + RLS for the workspace DAG (ESP-002).
--
-- A Workspace is "N repos as one working set": a header (name, owner, visibility),
-- a set of dependency nodes, and directed edges declaring dependencies. The graph
-- is a DAG enforced at the data layer (not only the UI).
--
-- ADR-046: three tables under public — header (workspaces) → nodes (workspace_nodes)
--   → edges (workspace_edges), all ON DELETE CASCADE. Owner is profiles(id) (matches
--   packages.publisher_id; auth.uid() = owner_id still holds since profiles.id =
--   auth.users.id). Root is a node flag + partial unique index, not a
--   workspaces.root_node_id FK (which would create a circular dependency).
-- ADR-047: a node targets exactly one of package_id (real FK) or external_link_id
--   (plain UUID — its FK is deferred to Epic 2; see the inline ALTER TABLE below).
-- ADR-048: cycle + cross-workspace rejection via a SECURITY INVOKER trigger.
-- ADR-049: RLS — owner-full + public SELECT; nodes/edges inherit parent visibility.
--
-- Additive only: no ALTER on existing tables, no data migration.

-- ---------------------------------------------------------------------------
-- 1. workspaces — owner-scoped workspace header (ADR-046, ESP AC2).
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    visibility      TEXT NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private', 'public')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_workspace_updated
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Dominant lookup: a profile's workspaces.
CREATE INDEX idx_workspaces_owner_id ON public.workspaces (owner_id);

-- RLS: owner sees all of theirs; anyone sees public workspaces (ADR-049).
CREATE POLICY "Owner or public can view workspaces"
    ON public.workspaces FOR SELECT
    USING (owner_id = auth.uid() OR visibility = 'public');

-- RLS: a user creates workspaces only for themselves.
CREATE POLICY "Owner can insert own workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- RLS: only the owner updates their workspaces.
CREATE POLICY "Owner can update own workspaces"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());

-- RLS: only the owner deletes their workspaces.
CREATE POLICY "Owner can delete own workspaces"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. workspace_nodes — graph nodes; target XOR + ref-pin + root flag
--    (ADR-046, ADR-047, ESP AC3/AC4/AC5).
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspace_nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    package_id      UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    -- external_link_id: plain nullable UUID, NO FK this demand (ADR-047). The
    -- external_repo_links table is Epic 2 — Demand 1/2. Once it exists, add:
    --   ALTER TABLE public.workspace_nodes
    --     ADD CONSTRAINT fk_workspace_nodes_external_link
    --     FOREIGN KEY (external_link_id)
    --     REFERENCES public.external_repo_links(id) ON DELETE CASCADE;
    -- No app path writes a non-null external_link_id before then.
    external_link_id UUID,
    ref_type        TEXT CHECK (ref_type IN ('branch', 'tag', 'version')),
    ref_value       TEXT,
    is_root         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Target XOR: exactly one of package_id / external_link_id (BR2, ADR-047).
    CONSTRAINT chk_workspace_nodes_target_xor
        CHECK ((package_id IS NULL) <> (external_link_id IS NULL)),
    -- Ref-pin co-presence: both set or both null (null pair = track default branch, BR3).
    CONSTRAINT chk_workspace_nodes_ref_pin
        CHECK ((ref_type IS NULL) = (ref_value IS NULL))
);

ALTER TABLE public.workspace_nodes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER on_workspace_node_updated
    BEFORE UPDATE ON public.workspace_nodes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- A package appears at most once per workspace (BR2 uniqueness).
CREATE UNIQUE INDEX idx_workspace_nodes_unique_package
    ON public.workspace_nodes (workspace_id, package_id)
    WHERE package_id IS NOT NULL;

-- An external link appears at most once per workspace.
CREATE UNIQUE INDEX idx_workspace_nodes_unique_external_link
    ON public.workspace_nodes (workspace_id, external_link_id)
    WHERE external_link_id IS NOT NULL;

-- At most one root node per workspace (BR5).
CREATE UNIQUE INDEX idx_workspace_nodes_single_root
    ON public.workspace_nodes (workspace_id)
    WHERE is_root;

-- Dominant lookups: nodes by workspace, nodes by package.
CREATE INDEX idx_workspace_nodes_workspace_id ON public.workspace_nodes (workspace_id);
CREATE INDEX idx_workspace_nodes_package_id ON public.workspace_nodes (package_id);

-- RLS: nodes inherit the parent workspace visibility for SELECT (ADR-049).
CREATE POLICY "Owner or public can view workspace nodes"
    ON public.workspace_nodes FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid() OR visibility = 'public'
        )
    );

-- RLS: only the parent-workspace owner inserts nodes.
CREATE POLICY "Owner can insert workspace nodes"
    ON public.workspace_nodes FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- RLS: only the parent-workspace owner updates nodes.
CREATE POLICY "Owner can update workspace nodes"
    ON public.workspace_nodes FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- RLS: only the parent-workspace owner deletes nodes.
CREATE POLICY "Owner can delete workspace nodes"
    ON public.workspace_nodes FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 3. workspace_edges — directed dependency edges (ADR-046, ESP AC6).
--    Structural guards declarative; cycle/cross-workspace guard is the trigger below.
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspace_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    from_node_id    UUID NOT NULL REFERENCES public.workspace_nodes(id) ON DELETE CASCADE,
    to_node_id      UUID NOT NULL REFERENCES public.workspace_nodes(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- No self-loop (BR4).
    CONSTRAINT chk_workspace_edges_no_self_loop CHECK (from_node_id <> to_node_id),
    -- No duplicate edge per workspace (BR4).
    CONSTRAINT uq_workspace_edges_unique UNIQUE (workspace_id, from_node_id, to_node_id)
);

ALTER TABLE public.workspace_edges ENABLE ROW LEVEL SECURITY;

-- Dominant lookups: edges by workspace, by endpoint.
CREATE INDEX idx_workspace_edges_workspace_id ON public.workspace_edges (workspace_id);
CREATE INDEX idx_workspace_edges_from_node_id ON public.workspace_edges (from_node_id);
CREATE INDEX idx_workspace_edges_to_node_id ON public.workspace_edges (to_node_id);

-- RLS: edges inherit the parent workspace visibility for SELECT (ADR-049).
CREATE POLICY "Owner or public can view workspace edges"
    ON public.workspace_edges FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid() OR visibility = 'public'
        )
    );

-- RLS: only the parent-workspace owner inserts edges.
CREATE POLICY "Owner can insert workspace edges"
    ON public.workspace_edges FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- RLS: only the parent-workspace owner updates edges.
CREATE POLICY "Owner can update workspace edges"
    ON public.workspace_edges FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- RLS: only the parent-workspace owner deletes edges.
CREATE POLICY "Owner can delete workspace edges"
    ON public.workspace_edges FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 4. Cycle + cross-workspace guard (ADR-048, ESP AC7/AC11).
--    BEFORE INSERT OR UPDATE on workspace_edges. SECURITY INVOKER, search_path = ''.
--    Every object schema-qualified; no EXECUTE grant (the trigger fires without it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspace_edges_prevent_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    from_workspace UUID;
    to_workspace   UUID;
BEGIN
    -- (1) Both endpoints must belong to NEW.workspace_id (reject cross-workspace).
    SELECT workspace_id INTO from_workspace
        FROM public.workspace_nodes WHERE id = NEW.from_node_id;
    SELECT workspace_id INTO to_workspace
        FROM public.workspace_nodes WHERE id = NEW.to_node_id;

    IF from_workspace IS DISTINCT FROM NEW.workspace_id
       OR to_workspace IS DISTINCT FROM NEW.workspace_id THEN
        RAISE EXCEPTION
            'workspace_edges: both nodes must belong to workspace % (from=%, to=%)',
            NEW.workspace_id, from_workspace, to_workspace;
    END IF;

    -- (2) Reachability: if to_node_id can already reach from_node_id, the new edge
    --     closes a cycle. Walk edges forward from NEW.to_node_id within the workspace.
    IF EXISTS (
        WITH RECURSIVE reachable(node_id) AS (
            SELECT NEW.to_node_id
            UNION
            SELECT e.to_node_id
                FROM public.workspace_edges e
                JOIN reachable r ON e.from_node_id = r.node_id
                WHERE e.workspace_id = NEW.workspace_id
        )
        SELECT 1 FROM reachable WHERE node_id = NEW.from_node_id
    ) THEN
        RAISE EXCEPTION
            'workspace_edges: edge %->% would create a cycle in workspace %',
            NEW.from_node_id, NEW.to_node_id, NEW.workspace_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER workspace_edges_prevent_cycle_trigger
    BEFORE INSERT OR UPDATE ON public.workspace_edges
    FOR EACH ROW EXECUTE FUNCTION public.workspace_edges_prevent_cycle();

-- ---------------------------------------------------------------------------
-- 5. set_workspace_root_node — atomic root assignment (ADR-055).
--    PostgREST cannot express SET is_root = (id = $nodeId); this RPC does it
--    in one UPDATE touching all nodes in the workspace at once.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_workspace_root_node(
    p_workspace_id uuid,
    p_node_id      uuid
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    UPDATE public.workspace_nodes
    SET is_root = (id = p_node_id)
    WHERE workspace_id = p_workspace_id;
$$;
