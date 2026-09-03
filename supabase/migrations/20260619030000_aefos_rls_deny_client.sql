-- aefos.* tables (the Aefos product, sharing this Supabase project) had RLS
-- enabled but NO policies (Supabase linter 0008) — locked to clients, reached
-- only via the service-role backend. Add an explicit deny-all client policy so
-- the lint clears while keeping them backend-only: service_role bypasses RLS, so
-- the Aefos backend is unaffected; anon/authenticated stay denied (no behaviour
-- change — they had no access already). If a table later needs client access,
-- replace its policy with the appropriate one. Idempotent.
DROP POLICY IF EXISTS backend_only_no_client_access ON aefos.leads;
CREATE POLICY backend_only_no_client_access ON aefos.leads
  FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS backend_only_no_client_access ON aefos.license_activations;
CREATE POLICY backend_only_no_client_access ON aefos.license_activations
  FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS backend_only_no_client_access ON aefos.license_keys;
CREATE POLICY backend_only_no_client_access ON aefos.license_keys
  FOR ALL TO public USING (false) WITH CHECK (false);
