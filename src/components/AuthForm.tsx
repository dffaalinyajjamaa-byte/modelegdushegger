import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';

interface AuthFormProps {
  onAuthChange: () => void;
}

const AuthForm = ({ onAuthChange }: AuthFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.startsWith('+')) {
      toast.error('Please include country code (e.g., +251...)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ phoneNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            phoneNumber, 
            otp,
            fullName: fullName || 'User'
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Sign in with the magic link
      if (data.session?.properties?.hashed_token) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: data.session.properties.hashed_token,
          type: 'magiclink',
        });

        if (signInError) throw signInError;
      }

      toast.success(data.isNewUser ? 'Baga Nagaan Gara Model Egdu Dhuftan 🎓' : 'Welcome back! 🎓');
      onAuthChange();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 shadow-elegant">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/src/assets/logo.png" alt="Model Egdu" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">
            {otpSent ? 'Verify Your Number' : 'Welcome to Model Egdu'}
          </CardTitle>
          <CardDescription className="text-white/80">
            {otpSent ? 'Enter the code sent to your phone' : 'Sign in with your phone number'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Full Name (Optional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white flex items-center gap-2">
                  <Phone size={16} />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  placeholder="+251912345678"
                />
                <p className="text-xs text-white/60">Include country code (e.g., +251 for Ethiopia)</p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 transition-smooth"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-white/80 text-sm">
                    Code sent to <span className="font-semibold text-white">{phoneNumber}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="text-xs text-white/60 hover:text-white underline"
                  >
                    Change number
                  </button>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-white/20 border-white/30 text-white text-xl" />
                      <InputOTPSlot index={1} className="bg-white/20 border-white/30 text-white text-xl" />
                      <InputOTPSlot index={2} className="bg-white/20 border-white/30 text-white text-xl" />
                      <InputOTPSlot index={3} className="bg-white/20 border-white/30 text-white text-xl" />
                      <InputOTPSlot index={4} className="bg-white/20 border-white/30 text-white text-xl" />
                      <InputOTPSlot index={5} className="bg-white/20 border-white/30 text-white text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 transition-smooth"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full text-center text-sm text-white/60 hover:text-white transition-smooth"
              >
                Didn't receive code? Resend
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
