-- Revoke public/anon/authenticated execute on trigger-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user_application() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_grant_owner_admin() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies for authenticated users; remove anon and public access
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;