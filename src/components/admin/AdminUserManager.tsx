import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Search, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  grade: string | null;
  role: string;
  school_name: string | null;
  created_at: string;
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
        .select('id, full_name, email, grade, role, school_name, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error) setUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Users ({users.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.role === 'teacher' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-blue-500/20 text-blue-600'
                  }`}>
                    {user.role}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{user.grade || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
