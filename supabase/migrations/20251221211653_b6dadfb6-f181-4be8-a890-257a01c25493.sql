-- Add RLS policy for otp_codes table
-- Only edge functions with service role can access this table
-- This policy explicitly denies all direct access

CREATE POLICY "No direct access to OTP codes"
ON public.otp_codes
FOR ALL
USING (false)
WITH CHECK (false);