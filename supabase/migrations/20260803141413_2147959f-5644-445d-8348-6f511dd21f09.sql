REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.predictions FROM anon, authenticated;
REVOKE ALL ON public.actual_outcomes FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actual_outcomes TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.predictions TO service_role;
GRANT ALL ON public.actual_outcomes TO service_role;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.predictions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.actual_outcomes FORCE ROW LEVEL SECURITY;