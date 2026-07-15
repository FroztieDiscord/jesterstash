-- Auto-grant admin+member roles to the workspace owner's email on signup.
CREATE OR REPLACE FUNCTION public.auto_grant_owner_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'jesterofalltraits@protonmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'), (NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;

    UPDATE public.member_applications
      SET status = 'approved', decided_at = now(), decided_by = NEW.user_id
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_owner_admin_trg ON public.member_applications;
CREATE TRIGGER auto_grant_owner_admin_trg
AFTER INSERT ON public.member_applications
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_owner_admin();

-- If the account already exists, promote it now.
DO $$
DECLARE
  existing_app RECORD;
BEGIN
  SELECT id, user_id INTO existing_app
  FROM public.member_applications
  WHERE lower(email) = 'jesterofalltraits@protonmail.com'
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_app.user_id, 'admin'), (existing_app.user_id, 'member')
    ON CONFLICT DO NOTHING;

    UPDATE public.member_applications
      SET status = 'approved', decided_at = now(), decided_by = existing_app.user_id
      WHERE id = existing_app.id;
  END IF;
END $$;