import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Camera } from 'lucide-react';
import logo from '@/assets/model-egdu-logo.png';
import { motion } from 'framer-motion';

interface AuthFormProps {
  onAuthChange: () => void;
}

export default function AuthForm({ onAuthChange }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [age, setAge] = useState('');
  const [favoriteSubject, setFavoriteSubject] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 
    'English', 'Amharic', 'Afaan Oromoo', 'History', 
    'Geography', 'Civics', 'Economics', 'ICT'
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome Back!",
          description: "Successfully logged in to Model Egdu.",
        });
      } else {
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
        
        if (error) throw error;

        // Create profile
        if (authData.user) {
          const avatarUrl = await uploadAvatar(authData.user.id);

          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              email: email,
              full_name: fullName,
              grade: grade,
              role: 'student',
              avatar_url: avatarUrl,
              school_name: schoolName || null,
              age: age ? parseInt(age) : null,
              favorite_subject: favoriteSubject || null,
              goal: goal || null
            });
          
          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }
        
        toast({
          title: "Account Created Successfully!",
          description: "Welcome to Model Egdu! Please check your email to verify your account.",
        });
      }
      
      onAuthChange();
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-glow border-0 max-h-[90vh] overflow-y-auto">
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
                    <Input
                      id="grade"
                      type="text"
                      placeholder="e.g., Grade 9"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      required={!isLogin}
                      className="h-11"
                    />
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
                  <Label htmlFor="favoriteSubject">Favorite Subject</Label>
                  <Select value={favoriteSubject} onValueChange={setFavoriteSubject}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your favorite subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Label htmlFor="password">Password *</Label>
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
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
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
