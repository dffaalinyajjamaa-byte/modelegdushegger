import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Loader2, CheckCircle, Clock, XCircle, BookOpen } from 'lucide-react';

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

  useEffect(() => {
    fetchBooks();
  }, []);

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
      // Upload PDF to storage
      const bucketName = grade.includes('6') ? 'books-for-grade-6-auto-quiz' : 'books-for-grade-8-auto-quiz';
      const fileName = `${Date.now()}_${pdfFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Insert book record
      const { data: bookData, error: insertError } = await supabase
        .from('auto_quiz_books')
        .insert({
          title,
          grade,
          subject,
          language,
          pdf_url: publicUrl,
          uploaded_by: user.id,
          processing_status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Trigger processing
      await supabase.functions.invoke('process-quiz-book', {
        body: { bookId: bookData.id, pdfUrl: publicUrl, language }
      });

      toast({ title: 'Book uploaded! Processing started...' });
      setTitle('');
      setSubject('');
      setPdfFile(null);
      fetchBooks();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    const { error } = await supabase.from('auto_quiz_books').delete().eq('id', bookId);
    if (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } else {
      toast({ title: 'Book deleted' });
      fetchBooks();
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Textbook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Book Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Mathematics Grade 8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Grade *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grade 6">Grade 6</SelectItem>
                  <SelectItem value="Grade 8">Grade 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language *</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oromo">Afaan Oromoo</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="amharic">Amharic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>PDF File *</Label>
            <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Uploading...</> : 'Upload & Process'}
          </Button>
        </CardContent>
      </Card>

      {/* Book List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Uploaded Books ({books.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : books.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No books uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {books.map(book => (
                <div key={book.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {statusIcon(book.processing_status)}
                    <div>
                      <p className="font-medium text-sm">{book.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {book.grade} · {book.subject} · {book.language}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(book.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
