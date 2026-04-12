import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, Plus, Video, BookOpen, Edit2, Save, X } from 'lucide-react';

interface AdminContentManagerProps {
  user: User;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  url: string;
  subject: string | null;
  grade_level: string | null;
  description: string | null;
  created_at: string;
}

export default function AdminContentManager({ user }: AdminContentManagerProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('video');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 8');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContentItem>>({});
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
    const { data } = await supabase.from('content').select('*').order('created_at', { ascending: false });
    setContent(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!title || !url) { toast({ title: 'Title and URL required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('content').insert({
      title, url, type, subject: subject || null, grade_level: gradeLevel, description: description || null,
      created_by: user.id,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Content added' }); setShowForm(false); setTitle(''); setUrl(''); setDescription(''); fetchContent(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('content').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchContent(); }
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from('content').update(editData).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Updated' }); setEditingId(null); fetchContent(); }
  };

  const filtered = filterType === 'all' ? content : content.filter(c => c.type === filterType);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'video', 'pdf'].map(t => (
            <Button key={t} variant={filterType === t ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(t)}>
              {t === 'all' ? 'All' : t === 'video' ? 'Videos' : 'Books'}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" />Add</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="URL (YouTube/PDF)" value={url} onChange={e => setUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF/Book</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grade 6">Grade 6</SelectItem>
                  <SelectItem value="Grade 8">Grade 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <Button onClick={handleAdd} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add Content
            </Button>
          </CardContent>
        </Card>
      )}

      <Badge variant="secondary">{filtered.length} items</Badge>

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id}>
            <CardContent className="p-3">
              {editingId === item.id ? (
                <div className="space-y-2">
                  <Input value={editData.title || ''} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                  <Input value={editData.url || ''} onChange={e => setEditData({ ...editData, url: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(item.id)}><Save className="w-3 h-3 mr-1" />Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.type === 'video' ? <Video className="w-4 h-4 text-primary shrink-0" /> : <BookOpen className="w-4 h-4 text-primary shrink-0" />}
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                      {item.subject && <Badge variant="outline" className="text-[10px]">{item.subject}</Badge>}
                      {item.grade_level && <Badge variant="secondary" className="text-[10px]">{item.grade_level}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditData(item); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
