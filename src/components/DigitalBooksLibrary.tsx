import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FolderOpen, BookOpen, ArrowLeft } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';

interface DigitalBooksLibraryProps {
  user: User;
  onBack: () => void;
  onBookClick: (book: any) => void;
}

interface Book {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  url: string;
}

const DigitalBooksLibrary = ({ user, onBack, onBookClick }: DigitalBooksLibraryProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'pdf')
      .order('subject', { ascending: true });

    if (data && !error) {
      setBooks(data);
    }
    setLoading(false);
  };

  const subjects = Array.from(new Set(books.map(book => book.subject))).filter(Boolean);

  const filteredBooks = selectedSubject
    ? books.filter(book => book.subject === selectedSubject)
    : books;

  return (
    <div className="min-h-screen mobile-p">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="outline" className="mb-4 glass-card hover:neon-glow-cyan tap-scale">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3 motivational-text">
            <BookOpen className="w-7 h-7 md:w-8 md:h-8" />
            Digital Books
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Browse by subject</p>
        </div>

        {!selectedSubject ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {subjects.map((subject) => (
              <Card
                key={subject}
                className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-cyan border-primary/30"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="p-4 md:p-6 text-center">
                  <FolderOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-primary" />
                  <h3 className="text-base md:text-lg font-bold">{subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {books.filter(b => b.subject === subject).length} books
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div>
            <Button
              onClick={() => setSelectedSubject(null)}
              variant="outline"
              className="mb-4 glass-card hover:neon-glow-cyan tap-scale"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Subjects
            </Button>
            <h2 className="text-xl md:text-2xl font-bold mb-4">{selectedSubject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredBooks.map((book) => {
                const bookUrl = validateContentUrl(book.url, 'pdf');
                return (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover-scale tap-scale glass-card hover:neon-glow-purple border-secondary/20"
                    onClick={() => onBookClick({ ...book, url: bookUrl })}
                  >
                    <CardContent className="p-4">
                      <div className="glass-card rounded-xl p-4 mb-3 flex items-center justify-center shadow-neon">
                        <FileText className="w-10 h-10 md:w-12 md:h-12 text-secondary" />
                      </div>
                      <h3 className="text-sm md:text-base font-semibold mb-1 line-clamp-2">{book.title}</h3>
                      {book.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {book.description}
                        </p>
                      )}
                      {book.grade_level && (
                        <p className="text-xs text-secondary">
                          {book.grade_level}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalBooksLibrary;
