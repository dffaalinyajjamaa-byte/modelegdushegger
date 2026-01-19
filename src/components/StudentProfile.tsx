import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Save, School, Calendar, BookOpen, Target, Mail, User as UserIcon, Phone, Home, Users, ShieldCheck } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';

interface StudentProfileProps {
  user: User;
  onBack: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  grade: string | null;
  school_name: string | null;
  age: number | null;
  favorite_subject: string | null;
  goal: string | null;
  role: string;
  teaching_subject: string | null;
  education_level: string | null;
  home_address: string | null;
  family_phone: string | null;
  parent_name: string | null;
  emergency_contact: string | null;
  is_verified: boolean;
}

export default function StudentProfile({ user, onBack }: StudentProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const { toast } = useToast();

  const grades = ['Grade 6', 'Grade 8'];

  useEffect(() => {
    fetchProfile();
    checkTeacherRole();
  }, [user]);

  const checkTeacherRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'teacher')
      .maybeSingle();
    setIsTeacher(!!data);
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      if (data.avatar_url) {
        setAvatarPreview(data.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

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

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return profile?.avatar_url || null;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      return profile?.avatar_url || null;
    }
  };

  const checkVerificationStatus = () => {
    if (!profile) return false;
    // Check if all verification fields are filled
    return !!(
      profile.home_address?.trim() &&
      profile.family_phone?.trim() &&
      profile.parent_name?.trim() &&
      profile.emergency_contact?.trim()
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const avatarUrl = await uploadAvatar();
      const isNowVerified = checkVerificationStatus();

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          grade: profile.grade,
          school_name: profile.school_name,
          age: profile.age,
          favorite_subject: profile.favorite_subject,
          goal: profile.goal,
          avatar_url: avatarUrl,
          home_address: profile.home_address,
          family_phone: profile.family_phone,
          parent_name: profile.parent_name,
          emergency_contact: profile.emergency_contact,
          is_verified: isNowVerified,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, is_verified: isNowVerified } : null);

      toast({
        title: "Profile Updated",
        description: isNowVerified 
          ? "Your profile is now verified! You've earned the black badge." 
          : "Your profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Profile not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center space-y-4">
            <label htmlFor="avatar-upload" className="cursor-pointer group">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-primary/30 group-hover:border-primary/50 transition-all">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                      {profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
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
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
              {isTeacher && <VerifiedBadge type="gold" size="md" />}
              {!isTeacher && profile.is_verified && <VerifiedBadge type="black" size="md" />}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {profile.email}
            </p>
            {isTeacher && (
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.teaching_subject && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-sm">
                    {profile.teaching_subject}
                  </span>
                )}
                {profile.education_level && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-sm">
                    {profile.education_level}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="fullName"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : null })}
                  min={5}
                  max={100}
                />
              </div>

              {!isTeacher && (
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select 
                    value={profile.grade || ''} 
                    onValueChange={(value) => setProfile({ ...profile, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
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
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName" className="flex items-center gap-2">
                <School className="w-4 h-4" />
                School Name
              </Label>
              <Input
                id="schoolName"
                value={profile.school_name || ''}
                onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                placeholder="Enter your school name"
              />
            </div>

            {!isTeacher && (
              <div className="space-y-2">
                <Label htmlFor="goal" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Your Learning Goal
                </Label>
                <Input
                  id="goal"
                  value={profile.goal || ''}
                  onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                  placeholder="e.g., Pass national exam with high score"
                />
              </div>
            )}
          </div>

          {/* Student Verification Section - Only for students */}
          {!isTeacher && (
            <Card className={`border-2 ${profile.is_verified ? 'border-green-500/50 bg-green-500/5' : 'border-muted'}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className={`w-5 h-5 ${profile.is_verified ? 'text-green-500' : 'text-muted-foreground'}`} />
                  Student Verification
                  {profile.is_verified && <VerifiedBadge type="black" size="sm" />}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {profile.is_verified 
                    ? "You're verified! Your black badge is displayed across the app."
                    : "Complete all fields below to earn your verified black badge."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homeAddress" className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Home Address *
                  </Label>
                  <Input
                    id="homeAddress"
                    value={profile.home_address || ''}
                    onChange={(e) => setProfile({ ...profile, home_address: e.target.value })}
                    placeholder="Enter your home address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="familyPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Family Phone Number *
                  </Label>
                  <Input
                    id="familyPhone"
                    value={profile.family_phone || ''}
                    onChange={(e) => setProfile({ ...profile, family_phone: e.target.value })}
                    placeholder="Enter family phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentName" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Parent/Guardian Name *
                  </Label>
                  <Input
                    id="parentName"
                    value={profile.parent_name || ''}
                    onChange={(e) => setProfile({ ...profile, parent_name: e.target.value })}
                    placeholder="Enter parent or guardian name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contact *
                  </Label>
                  <Input
                    id="emergencyContact"
                    value={profile.emergency_contact || ''}
                    onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                    placeholder="Enter emergency contact number"
                  />
                </div>

                {!profile.is_verified && (
                  <p className="text-xs text-muted-foreground text-center">
                    Fill all fields above and save to get verified
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}