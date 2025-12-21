-- Fix security warnings

-- Update cleanup function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: otp_codes table intentionally has no RLS policies
-- It's only accessed via edge functions using service role key
-- This is secure because anon/authenticated users cannot access it directly