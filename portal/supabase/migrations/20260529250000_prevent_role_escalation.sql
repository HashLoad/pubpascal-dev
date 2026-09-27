-- Security: stop users from self-promoting to admin.
-- The "Users can update their own profile" RLS policy (needed so publishers can
-- edit full_name) is row-level, not column-level — so it also lets a user set
-- their own `role`. This BEFORE UPDATE trigger reverts any role change unless the
-- caller is an admin, or there is no end-user JWT (service role / SQL editor).
-- Run in the Supabase SQL Editor (or via `supabase db push`).

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles p
         WHERE p.id = auth.uid() AND p.role = 'admin'
       ) THEN
      NEW.role := OLD.role; -- non-admin end user: keep the previous role
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function, not an API surface.
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
