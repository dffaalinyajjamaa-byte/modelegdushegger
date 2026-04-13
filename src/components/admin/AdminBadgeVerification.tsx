import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Search, BadgeCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_verified: boolean;
  role: string;
  grade: string | null;
}

export default function AdminBadgeVerification() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('id, user_id, full_name, email, avatar_url, is_verified, role, grade').order('full_name');
    setProfiles((data || []) as Profile[]);
    setLoading(false);
  };

  const toggleVerification = async (profile: Profile) => {
    setToggling(profile.id);
    const { error } = await supabase.from('profiles').update({ is_verified: !profile.is_verified }).eq('id', profile.id);
    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } else {
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_verified: !p.is_verified } : p));
      toast({ title: profile.is_verified ? 'Badge removed' : 'Badge granted ✓' });
    }
    setToggling(null);
  };

  const filtered = profiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(profile => (
            <Card key={profile.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {profile.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{profile.full_name}</p>
                    {profile.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{profile.email} · {profile.role} · {profile.grade || 'N/A'}</p>
                </div>
                <Switch
                  checked={profile.is_verified || false}
                  onCheckedChange={() => toggleVerification(profile)}
                  disabled={toggling === profile.id}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
