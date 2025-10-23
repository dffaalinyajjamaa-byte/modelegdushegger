-- Add phone_number column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

-- Create table for OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on otp_verifications
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone_number, expires_at);

-- Policy: Users can only see their own OTP records (though they won't directly access this)
CREATE POLICY "Users can view their own OTP records"
ON otp_verifications
FOR SELECT
USING (phone_number IN (
  SELECT phone_number FROM profiles WHERE user_id = auth.uid()
));

-- Clean up expired OTPs (optional, for data hygiene)
CREATE OR REPLACE FUNCTION clean_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;