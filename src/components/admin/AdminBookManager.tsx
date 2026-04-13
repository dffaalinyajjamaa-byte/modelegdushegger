import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Trash2, Loader2, CheckCircle, Clock,
  BookOpen, RefreshCw, FileText, Eye
} from 'lucide-react';

interface AdminBookManagerProps {
  user: User;
}

interface Book {
  id: string;
  title: string;
  grade: string;
  subject: string;
  language: string;
  pdf_url: string;
  processing_status: string;
  created_at: string;
}

export default function AdminBookManager({ user }: AdminBookManagerProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('Grade 8');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('oromo');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const subjects = [
    'Mathematics', 'English', 'Afaan Oromoo', 'Amharic',
    'General Science', 'Social Studies', 'Civics', 'Physics',
    'Chemistry', 'Biology', 'History', 'Geography'
  ];

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auto_quiz_books')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setBooks((data || []) as Book[]);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!pdfFile || !title || !subject) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const bucketName = grade.includes('6') ? 'books-for-grade-6-auto-quiz' : 'books-for-grade-8-auto-quiz';
      const fileName = `${Date.now()}_${pdfFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, pdfFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Set status to 'ready' immediately — no processing needed
      const { error: insertError } = await supabase
        .from('auto_quiz_books')
        .insert({
          title, grade, subject, language,
          pdf_url: publicUrl,
          uploaded_by: user.id,
          processing_status: 'ready'
        });
      if (insertError) throw insertError;

      toast({ title: '📚 Book uploaded!', description: 'Book is ready for quiz generation.' });
      setTitle('');
      setSubject('');
      setPdfFile(null);
      fetchBooks();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book?')) return;
    const { error } = await supabase.from('auto_quiz_books').delete().eq('id', bookId);
    if (!error) { toast({ title: 'Book deleted' }); fetchBooks(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload New Textbook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Book Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Mathematics Grade 8" className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grade 6">Grade 6</SelectItem>
                  <SelectItem value="Grade 8">Grade 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oromo">Oromoo</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="amharic">Amharic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">PDF File</Label>
            <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="mt-1" />
          </div>
          <Button onClick={handleUpload} disabled={uploading || !pdfFile || !title || !subject} className="w-full" size="sm">
            {uploading ? <><Loader2 className="mr-2 w-3 h-3 animate-spin" />Uploading...</> : <><Upload className="mr-2 w-3 h-3" />Upload Book</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Books ({books.length})</h3>
          <Button variant="ghost" size="sm" onClick={fetchBooks} className="h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : books.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No books uploaded yet</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {books.map(book => (
              <Card key={book.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    <p className="text-[10px] text-muted-foreground">{book.grade} · {book.subject}</p>
                  </div>
                  <Badge variant="default" className="text-[10px] gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(book.pdf_url, '_blank')}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(book.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
