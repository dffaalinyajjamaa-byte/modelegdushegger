-- Fix search_path for clean_expired_otps function
CREATE OR REPLACE FUNCTION clean_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;