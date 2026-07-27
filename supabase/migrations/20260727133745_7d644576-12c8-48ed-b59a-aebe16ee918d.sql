ALTER PUBLICATION supabase_realtime ADD TABLE public.security_audit_log;
ALTER TABLE public.security_audit_log REPLICA IDENTITY FULL;