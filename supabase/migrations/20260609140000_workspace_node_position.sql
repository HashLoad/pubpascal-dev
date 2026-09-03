-- workspace_node_positions — persisted canvas position for the visual DAG builder.
-- The graph builder lets the owner drop + drag nodes; this records where each
-- node sits so the layout survives a reload (the v7 builder UX).
--
-- UI-ONLY: positions are a presentation concern. The workspace MANIFEST the CLI
-- consumes (clone_url + ref + edges) does NOT include x/y — the CLI never reads
-- node positions. Invisible to the CLI contract.
--
-- A 1:1 SATELLITE table (NOT new columns on workspace_nodes) so this migration
-- degrades gracefully: the node insert/read paths stay untouched, and a missing
-- position just falls back to the deterministic auto-layout (graph-layout.ts) —
-- mirroring package_likes / package_version_sbom. Keyed by node_id.

CREATE TABLE public.workspace_node_positions (
    node_id     UUID PRIMARY KEY REFERENCES public.workspace_nodes(id) ON DELETE CASCADE,
    position_x  DOUBLE PRECISION NOT NULL,
    position_y  DOUBLE PRECISION NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workspace_node_positions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER on_workspace_node_position_updated
    BEFORE UPDATE ON public.workspace_node_positions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- A position is visible whenever its node is (node visibility inherits the
-- workspace's public/owner rule). Read for owner + public; write owner-only.
CREATE POLICY "View positions of visible nodes"
    ON public.workspace_node_positions FOR SELECT
    USING (
        node_id IN (
            SELECT n.id FROM public.workspace_nodes n
            JOIN public.workspaces w ON w.id = n.workspace_id
            WHERE w.owner_id = auth.uid() OR w.visibility = 'public'
        )
    );

CREATE POLICY "Owner can insert positions for own nodes"
    ON public.workspace_node_positions FOR INSERT
    WITH CHECK (
        node_id IN (
            SELECT n.id FROM public.workspace_nodes n
            JOIN public.workspaces w ON w.id = n.workspace_id
            WHERE w.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owner can update positions for own nodes"
    ON public.workspace_node_positions FOR UPDATE
    USING (
        node_id IN (
            SELECT n.id FROM public.workspace_nodes n
            JOIN public.workspaces w ON w.id = n.workspace_id
            WHERE w.owner_id = auth.uid()
        )
    );

-- No DELETE policy: rows are removed by the ON DELETE CASCADE from workspace_nodes.
