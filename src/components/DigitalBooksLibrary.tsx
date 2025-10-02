import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FolderOpen, BookOpen } from 'lucide-react';

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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          ← Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            Digital Books Library
          </h1>
          <p className="text-muted-foreground">Browse books by subject</p>
        </div>

        {!selectedSubject ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject}
                className="cursor-pointer hover-scale bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 backdrop-blur-sm"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="p-6 md:p-8 text-center">
                  <FolderOpen className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl md:text-2xl font-bold">{subject}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
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
              className="mb-6"
            >
              ← All Subjects
            </Button>
            <h2 className="text-2xl font-bold mb-6">{selectedSubject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredBooks.map((book) => (
                <Card
                  key={book.id}
                  className="cursor-pointer hover-scale bg-card/80 backdrop-blur-sm border-primary/20"
                  onClick={() => onBookClick(book)}
                >
                  <CardContent className="p-6">
                    <FileText className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{book.title}</h3>
                    {book.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {book.description}
                      </p>
                    )}
                    {book.grade_level && (
                      <p className="text-xs text-muted-foreground">
                        Grade: {book.grade_level}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalBooksLibrary;
