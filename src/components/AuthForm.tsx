import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Camera, Mail, RefreshCw, WifiOff, ArrowLeft } from 'lucide-react';
import logo from '@/assets/model-egdu-logo.png';
import { motion } from 'framer-motion';

interface AuthFormProps {
  onAuthChange: () => void;
}

// Retry helper function for Windows 10 compatibility
const retryWithDelay = async <T,>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

// Wait for profile to be created by trigger
const waitForProfile = async (userId: string, maxAttempts: number = 5): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) return true;
    await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
  }
  return false;
};

// Test connection to Supabase
const testConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 400;
  } catch {
    return false;
  }
};

export default function AuthForm({ onAuthChange }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRetry, setShowRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Check network status - FIXED: was useState, now useEffect
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRetry(false);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const grades = ['Grade 6', 'Grade 8'];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Avatar upload failed",
        description: "Continuing with default avatar",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Reset Email Sent!",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      let errorMessage = 'Unable to send reset email. Please try again.';
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        setShowRetry(false);
        setIsOffline(false);
        toast({
          title: "Connected!",
          description: "Connection restored. You can now sign in.",
        });
      } else {
        toast({
          title: "Still Unable to Connect",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection Failed",
        description: "Unable to reach the server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowRetry(false);

    try {
      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('NETWORK_ERROR');
      }

      // Test connection before attempting auth (helps Windows 10)
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('NETWORK_ERROR');
      }

      if (isLogin) {
        // Login with retry for Windows 10 compatibility
        const { error } = await retryWithDelay(async () => {
          const result = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (result.error) throw result.error;
          return result;
        }, 3, 1000);
        
        if (error) throw error;
        
        toast({
          title: "Welcome Back!",
          description: "Successfully logged in to Model Egdu.",
        });
      } else {
        // Signup
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              role: 'student',
              grade: grade
            }
          }
        });
        
        if (error) {
          // Handle specific error messages
          if (error.message.includes('User already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }

        // Wait for trigger to create profile, then UPDATE with additional fields
        if (authData.user) {
          // Wait for profile to be created by database trigger
          const profileCreated = await waitForProfile(authData.user.id);
          
          if (profileCreated) {
            // Upload avatar first
            const avatarUrl = await uploadAvatar(authData.user.id);

            // UPDATE the profile with additional fields (trigger already created the basic profile)
            await retryWithDelay(async () => {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: fullName,
                  grade: grade,
                  avatar_url: avatarUrl,
                  school_name: schoolName || null,
                  age: age ? parseInt(age) : null,
                  goal: goal || null
                })
                .eq('user_id', authData.user!.id);
              
              if (updateError) throw updateError;
            });
          } else {
            console.warn('Profile not created by trigger, account created but profile incomplete');
          }
        }
        
        toast({
          title: "Account Created Successfully!",
          description: "Welcome to Model Egdu! You can now start learning.",
        });
      }
      
      onAuthChange();
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific error types with friendly messages
      let errorMessage = error.message || 'An unexpected error occurred';
      let errorTitle = 'Authentication Error';
      
      const isNetworkError = 
        error.message === 'NETWORK_ERROR' ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.name === 'TypeError' ||
        error.message?.includes('NetworkError');
      
      if (isNetworkError) {
        errorTitle = 'Connection Error';
        errorMessage = 'Unable to connect to the server. This may be due to network settings. Please try again.';
        setShowRetry(true);
        setIsOffline(true);
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (error.message?.includes('row-level security')) {
        errorMessage = 'Unable to complete registration. Please try again.';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-glow border-0">
          <CardHeader className="text-center space-y-4">
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">
                {resetEmailSent ? 'Check Your Email' : 'Forgot Password?'}
              </CardTitle>
              <CardDescription className="mt-2">
                {resetEmailSent 
                  ? 'We sent a password reset link to your email.'
                  : "Enter your email and we'll send you a reset link."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Mail className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setResetEmailSent(false);
                    setIsForgotPassword(false);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsForgotPassword(false)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-glow border-0 max-h-[90vh] overflow-y-auto">
        {/* Offline Warning */}
        {isOffline && (
          <div className="bg-destructive/10 border-b border-destructive/20 p-3 flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">You appear to be offline. Please check your connection.</span>
          </div>
        )}
        
        {/* Retry Connection UI */}
        {showRetry && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Connection Issue Detected</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Having trouble connecting? This can happen on Windows 10. Try these steps:
            </p>
            <ul className="text-xs text-muted-foreground mb-3 list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Disable any VPN or proxy</li>
              <li>Try refreshing the page</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Retry Connection {retryCount > 0 && `(${retryCount}/3)`}
            </Button>
          </div>
        )}
        
        <CardHeader className="text-center space-y-4">
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
          >
            <img 
              src={logo} 
              alt="Model Egdu" 
              className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-full shadow-2xl border-4 border-primary/20" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <CardTitle className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
              {isLogin ? 'Welcome Back' : 'Join Model Egdu'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isLogin 
                ? 'Sign in to continue your learning journey' 
                : 'Start your digital education today'}
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="flex flex-col items-center space-y-3 mb-4">
                  <label htmlFor="avatar-upload" className="cursor-pointer group">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-primary/30 group-hover:border-primary/50 transition-all">
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                            <Camera className="w-10 h-10" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Click to upload profile picture (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Your age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={5}
                      max={100}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level *</Label>
                    <Select value={grade} onValueChange={setGrade} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    type="text"
                    placeholder="Enter your school name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Your Learning Goal</Label>
                  <Input
                    id="goal"
                    type="text"
                    placeholder="e.g., Pass national exam with high score"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                {isLogin && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-primary p-0 h-auto"
                    onClick={() => setIsForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={loading || isOffline}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>

            {isOffline && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            )}
            
            <div className="text-center pt-4">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
