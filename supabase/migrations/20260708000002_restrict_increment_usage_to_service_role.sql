-- Revoke execute from all public roles (anon, authenticated, and any future PUBLIC grants)
REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, date) FROM authenticated;

-- Only service_role (used by the karl-chat Edge Function) can call it.
-- auth.uid() is NULL in service_role context, so the identity check is done
-- upstream in the Edge Function via supabase.auth.getUser(jwt) before any RPC call.
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, date) TO service_role;
