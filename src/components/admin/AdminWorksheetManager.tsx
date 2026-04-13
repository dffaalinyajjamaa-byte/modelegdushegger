import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Loader2, FileText, Eye } from 'lucide-react';

interface AdminWorksheetManagerProps {
  user: User;
}

interface Worksheet {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  pdf_url: string;
  created_at: string;
}

const subjects = [
  'Mathematics', 'English', 'Afaan Oromoo', 'Amharic', 'General Science',
  'Social Studies', 'Civics', 'Gadaa fi Safuu', 'Lammummaa'
];

export default function AdminWorksheetManager({ user }: AdminWorksheetManagerProps) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 8');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchWorksheets(); }, []);

  const fetchWorksheets = async () => {
    setLoading(true);
    const { data } = await supabase.from('worksheets').select('*').order('created_at', { ascending: false });
    setWorksheets((data || []) as Worksheet[]);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!pdfFile || !title || !subject) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage.from('worksheets').upload(fileName, pdfFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('worksheets').getPublicUrl(fileName);

      const { error } = await supabase.from('worksheets').insert({
        title, subject, grade_level: gradeLevel, pdf_url: publicUrl, uploaded_by: user.id
      });
      if (error) throw error;

      toast({ title: '📄 Worksheet uploaded!' });
      setTitle(''); setSubject(''); setPdfFile(null);
      fetchWorksheets();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this worksheet?')) return;
    await supabase.from('worksheets').delete().eq('id', id);
    fetchWorksheets();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Worksheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Math Practice Set 1" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grade</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grade 6">Grade 6</SelectItem>
                  <SelectItem value="Grade 8">Grade 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">PDF File</Label>
            <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="mt-1" />
          </div>
          <Button onClick={handleUpload} disabled={uploading || !pdfFile || !title || !subject} className="w-full" size="sm">
            {uploading ? <><Loader2 className="mr-2 w-3 h-3 animate-spin" />Uploading...</> : <><Upload className="mr-2 w-3 h-3" />Upload</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Worksheets ({worksheets.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : worksheets.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No worksheets yet</CardContent></Card>
        ) : worksheets.map(w => (
          <Card key={w.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{w.title}</p>
                <p className="text-[10px] text-muted-foreground">{w.grade_level} · {w.subject}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(w.pdf_url, '_blank')}>
                <Eye className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(w.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
