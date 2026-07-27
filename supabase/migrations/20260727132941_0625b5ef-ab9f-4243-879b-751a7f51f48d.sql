
-- 1) Audit log table
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  actor_id uuid,
  target_user_id uuid,
  target_email text,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Grants (admin reads via the API; SECURITY DEFINER functions insert as owner)
GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

-- 3) RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit log"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "no client inserts on audit log"
  ON public.security_audit_log FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "no client updates on audit log"
  ON public.security_audit_log FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "no client deletes on audit log"
  ON public.security_audit_log FOR DELETE TO authenticated, anon
  USING (false);

CREATE INDEX security_audit_log_created_at_idx
  ON public.security_audit_log (created_at DESC);
CREATE INDEX security_audit_log_function_name_idx
  ON public.security_audit_log (function_name);

-- 4) Update trusted functions to write to the audit log
CREATE OR REPLACE FUNCTION public.handle_new_user_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.member_applications (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.security_audit_log (
    function_name, actor_id, target_user_id, target_email, action, details
  ) VALUES (
    'handle_new_user_application',
    NEW.id,
    NEW.id,
    NEW.email,
    'application_created',
    jsonb_build_object('status', 'pending')
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_grant_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _matched boolean := lower(NEW.email) = 'jesterofalltraits@protonmail.com';
BEGIN
  IF _matched THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'), (NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;

    UPDATE public.member_applications
      SET status = 'approved', decided_at = now(), decided_by = NEW.user_id
      WHERE id = NEW.id;

    INSERT INTO public.security_audit_log (
      function_name, actor_id, target_user_id, target_email, action, details
    ) VALUES (
      'auto_grant_owner_admin',
      NEW.user_id,
      NEW.user_id,
      NEW.email,
      'owner_auto_promoted',
      jsonb_build_object('roles_granted', ARRAY['admin','member'], 'application_id', NEW.id)
    );
  ELSE
    INSERT INTO public.security_audit_log (
      function_name, actor_id, target_user_id, target_email, action, details
    ) VALUES (
      'auto_grant_owner_admin',
      NEW.user_id,
      NEW.user_id,
      NEW.email,
      'skipped_non_owner',
      jsonb_build_object('application_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;
