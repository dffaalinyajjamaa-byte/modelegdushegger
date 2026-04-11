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
  Upload, Trash2, Loader2, CheckCircle, Clock, XCircle,
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

interface BookUnit {
  id: string;
  unit_number: number;
  unit_title: string;
  display_order: number;
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
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [bookUnits, setBookUnits] = useState<Record<string, BookUnit[]>>({});
  const [reprocessing, setReprocessing] = useState<string | null>(null);
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

  const fetchUnits = async (bookId: string) => {
    if (bookUnits[bookId]) return;
    const { data } = await supabase
      .from('auto_quiz_units')
      .select('id, unit_number, unit_title, display_order')
      .eq('book_id', bookId)
      .order('display_order', { ascending: true });
    setBookUnits(prev => ({ ...prev, [bookId]: (data || []) as BookUnit[] }));
  };

  const toggleExpand = (bookId: string) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
    } else {
      setExpandedBook(bookId);
      fetchUnits(bookId);
    }
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

      const { data: bookData, error: insertError } = await supabase
        .from('auto_quiz_books')
        .insert({
          title, grade, subject, language,
          pdf_url: publicUrl,
          uploaded_by: user.id,
          processing_status: 'processing'
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      supabase.functions.invoke('process-quiz-book', {
        body: { bookId: bookData.id, pdfUrl: publicUrl, language }
      });

      toast({ title: '📚 Book uploaded!', description: 'Processing has started. Units will appear shortly.' });
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

  const handleReprocess = async (book: Book) => {
    setReprocessing(book.id);
    try {
      await supabase.from('auto_quiz_books').update({ processing_status: 'processing' }).eq('id', book.id);
      await supabase.functions.invoke('process-quiz-book', {
        body: { bookId: book.id, pdfUrl: book.pdf_url, language: book.language }
      });
      toast({ title: 'Reprocessing started' });
      fetchBooks();
    } catch {
      toast({ title: 'Reprocess failed', variant: 'destructive' });
    } finally {
      setReprocessing(null);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book and all its units/chunks?')) return;
    const { error } = await supabase.from('auto_quiz_books').delete().eq('id', bookId);
    if (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } else {
      toast({ title: 'Book deleted' });
      setExpandedBook(null);
      fetchBooks();
    }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { icon: typeof CheckCircle; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { icon: CheckCircle, label: 'Ready', variant: 'default' },
      processing: { icon: Loader2, label: 'Processing', variant: 'secondary' },
      failed: { icon: XCircle, label: 'Failed', variant: 'destructive' },
      pending: { icon: Clock, label: 'Pending', variant: 'outline' },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="text-[10px] gap-1">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload New Textbook
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
            {uploading ? <><Loader2 className="mr-2 w-3 h-3 animate-spin" />Uploading & Processing...</> : <><Upload className="mr-2 w-3 h-3" />Upload & Process</>}
          </Button>
        </CardContent>
      </Card>

      {/* Books List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Books ({books.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchBooks} className="h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No books uploaded yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a textbook PDF above to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {books.map(book => (
              <Card key={book.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Book Header */}
                  <button
                    onClick={() => toggleExpand(book.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {book.grade} · {book.subject} · {book.language === 'oromo' ? 'Oromoo' : book.language === 'amharic' ? 'Amharic' : 'English'}
                      </p>
                    </div>
                    {statusBadge(book.processing_status)}
                  </button>

                  {/* Expanded Details */}
                  {expandedBook === book.id && (
                    <div className="border-t px-3 pb-3 pt-2 space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
                      {/* Units */}
                      {bookUnits[book.id] ? (
                        bookUnits[book.id].length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Units ({bookUnits[book.id].length})
                            </p>
                            {bookUnits[book.id].map(unit => (
                              <div key={unit.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary">
                                  {unit.unit_number}
                                </span>
                                <span className="flex-1 truncate">{unit.unit_title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No units detected</p>
                        )
                      ) : (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline" size="sm" className="flex-1 h-8 text-xs"
                          onClick={() => window.open(book.pdf_url, '_blank')}
                        >
                          <Eye className="w-3 h-3 mr-1" /> View PDF
                        </Button>
                        {(book.processing_status === 'failed' || book.processing_status === 'pending') && (
                          <Button
                            variant="outline" size="sm" className="flex-1 h-8 text-xs"
                            onClick={() => handleReprocess(book)}
                            disabled={reprocessing === book.id}
                          >
                            {reprocessing === book.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 mr-1" />
                            )}
                            Reprocess
                          </Button>
                        )}
                        <Button
                          variant="destructive" size="sm" className="h-8 text-xs px-3"
                          onClick={() => handleDelete(book.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
