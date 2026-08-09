REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.recommendation_notes FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_notes TO authenticated;
GRANT ALL ON public.recommendation_notes TO service_role;