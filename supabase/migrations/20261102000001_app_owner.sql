-- Owner identity for the multi-user split.
-- The owner's uid is inserted by hand in the SQL editor; it never lives in the repo.

CREATE TABLE IF NOT EXISTS public.app_owner (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton)
);

ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;
-- No policies: clients learn ownership only through is_owner().

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM app_owner WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
