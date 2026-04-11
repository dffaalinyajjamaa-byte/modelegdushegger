import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, GraduationCap } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  grade: string | null;
  role: string;
  school_name: string | null;
  created_at: string;
  avatar_url: string | null;
}

export default function AdminUserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade, role, school_name, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) setUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Role Summary */}
      <div className="grid grid-cols-3 gap-2">
        {['student', 'teacher', 'admin'].map(role => (
          <Card key={role}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{roleCounts[role] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{role}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(u => (
            <Card key={u.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden"
                  style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    u.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <Badge variant={
                    u.role === 'admin' ? 'destructive' : u.role === 'teacher' ? 'default' : 'secondary'
                  } className="text-[10px]">
                    {u.role}
                  </Badge>
                  {u.grade && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      <GraduationCap className="w-3 h-3" /> {u.grade}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
          )}
        </div>
      )}
    </div>
  );
}
