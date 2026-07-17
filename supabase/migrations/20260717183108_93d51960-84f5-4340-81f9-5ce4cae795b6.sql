-- Switch has_role from SECURITY DEFINER to SECURITY INVOKER so it runs as the
-- calling user. The existing "users read own roles" RLS policy on public.user_roles
-- lets any authenticated user check their own roles, which is all has_role() needs
-- when invoked with auth.uid().
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
