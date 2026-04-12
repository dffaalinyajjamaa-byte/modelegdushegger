import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Loader2, FileText, Edit2, Save, X } from 'lucide-react';

interface AdminNationalExamsProps {
  user: User;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  year: number;
  pdf_url: string;
  grade_level: string | null;
  description: string | null;
}

const SUBJECTS = [
  'Afaan Oromoo', 'Afaan Ingiliffaa', 'Afaan Amaara', 'Herreega',
  'Saayinsii Waliigalaa', 'Saayinsi Naannoo', 'Lammummaa', 'Hawaasa', 'Gadaa fi Safuu'
];

export default function AdminNationalExams({ user }: AdminNationalExamsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [year, setYear] = useState('2016');
  const [gradeLevel, setGradeLevel] = useState('Grade 8');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Exam>>({});
  const [filterGrade, setFilterGrade] = useState('all');
  const { toast } = useToast();

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    const { data } = await supabase.from('national_exams').select('*').order('year', { ascending: false });
    setExams((data as any[]) || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!title || !subject || !year) {
      toast({ title: 'Missing fields', description: 'Fill in all fields', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      let pdfUrl = '';
      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`;
        const { error: uploadErr } = await supabase.storage.from('national-exam-pdfs').upload(fileName, pdfFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('national-exam-pdfs').getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }
      
      const { error } = await supabase.from('national_exams').insert({
        title,
        subject,
        year: parseInt(year),
        grade_level: gradeLevel,
        pdf_url: pdfUrl || 'pending',
        description: `${gradeLevel} National Exam - ${subject} ${year}`,
      } as any);
      if (error) throw error;
      
      toast({ title: 'Exam added successfully' });
      setTitle(''); setSubject(''); setPdfFile(null);
      fetchExams();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('national_exams').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Exam deleted' });
      fetchExams();
    }
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from('national_exams').update(editData as any).eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Exam updated' });
      setEditingId(null);
      fetchExams();
    }
  };

  const filtered = filterGrade === 'all' ? exams : exams.filter(e => e.grade_level === filterGrade);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Upload Form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add National Exam</h3>
          <Input placeholder="Exam title" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Grade 6">Grade 6</SelectItem>
              <SelectItem value="Grade 8">Grade 8</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <Label className="text-xs">PDF File (optional - can use Google Drive URL)</Label>
            <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="mt-1" />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Add Exam
          </Button>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'Grade 6', 'Grade 8'].map(g => (
          <Button key={g} variant={filterGrade === g ? 'default' : 'outline'} size="sm" onClick={() => setFilterGrade(g)}>
            {g === 'all' ? 'All' : g}
          </Button>
        ))}
        <Badge variant="secondary" className="ml-auto">{filtered.length} exams</Badge>
      </div>

      {/* Exam List */}
      <div className="space-y-2">
        {filtered.map(exam => (
          <Card key={exam.id}>
            <CardContent className="p-3">
              {editingId === exam.id ? (
                <div className="space-y-2">
                  <Input value={editData.title || ''} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(exam.id)}><Save className="w-3 h-3 mr-1" />Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{exam.title}</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{exam.subject}</Badge>
                      <Badge variant="outline" className="text-[10px]">{exam.year}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{exam.grade_level || 'N/A'}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(exam.id); setEditData(exam); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(exam.id)}>
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
