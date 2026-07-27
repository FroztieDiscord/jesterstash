
-- member_applications: explicit deny for user-side writes
CREATE POLICY "no client inserts on applications"
  ON public.member_applications FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "no client updates on applications"
  ON public.member_applications FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "no client deletes on applications"
  ON public.member_applications FOR DELETE TO authenticated, anon
  USING (false);

-- user_roles: explicit deny for user-side writes (prevents privilege escalation)
CREATE POLICY "no client inserts on roles"
  ON public.user_roles FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "no client updates on roles"
  ON public.user_roles FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "no client deletes on roles"
  ON public.user_roles FOR DELETE TO authenticated, anon
  USING (false);
