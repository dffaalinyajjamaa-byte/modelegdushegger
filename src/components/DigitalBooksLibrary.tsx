import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ArrowLeft, PlayCircle } from 'lucide-react';
import { validateContentUrl } from '@/lib/content-utils';

interface DigitalBooksLibraryProps {
  user: User;
  onBack: () => void;
  onBookClick: (book: any) => void;
  embedded?: boolean;
}

interface Book {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  url: string;
  thumbnail_url?: string;
  cover_image_url?: string;
}

interface BookProgress {
  book_id: string;
  completion_percentage: number;
  last_read_at: string;
}

const DigitalBooksLibrary = ({ user, onBack, onBookClick, embedded = false }: DigitalBooksLibraryProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<Record<string, BookProgress>>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooksAndProgress();
  }, []);

  const fetchBooksAndProgress = async () => {
    // Fetch books
    const { data: booksData, error: booksError } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'pdf')
      .order('subject', { ascending: true });

    // Fetch progress
    const { data: progressData } = await supabase
      .from('book_progress' as any)
      .select('*')
      .eq('user_id', user.id);

    if (booksData && !booksError) {
      setBooks(booksData);
    }

    if (progressData) {
      const progressMap: Record<string, BookProgress> = {};
      progressData.forEach((p: any) => {
        progressMap[p.book_id] = p;
      });
      setProgress(progressMap);
    }

    setLoading(false);
  };

  const subjects = Array.from(new Set(books.map(book => book.subject))).filter(Boolean);

  const continueReadingBooks = books
    .filter(book => progress[book.id] && progress[book.id].completion_percentage > 0 && progress[book.id].completion_percentage < 100)
    .sort((a, b) => new Date(progress[b.id].last_read_at).getTime() - new Date(progress[a.id].last_read_at).getTime())
    .slice(0, 3);

  const filteredBooks = selectedSubject
    ? books.filter(book => book.subject === selectedSubject)
    : books;

  const getBookCover = (book: Book) => {
    if (book.cover_image_url) return book.cover_image_url;
    if (book.thumbnail_url) return book.thumbnail_url;
    
    // Fallback: gradient with subject-based color
    const colors: Record<string, string> = {
      'Hawaasa': 'from-blue-500 to-blue-600',
      'Herrega': 'from-green-500 to-green-600',
      'Lammummaa': 'from-purple-500 to-purple-600',
      'English': 'from-red-500 to-red-600',
      'Afaan Oromoo': 'from-yellow-500 to-yellow-600',
      'Og-Aarti': 'from-pink-500 to-pink-600',
      'F.J.Q': 'from-indigo-500 to-indigo-600',
      'Sayinsii Waligalaa': 'from-teal-500 to-teal-600',
      'Dhaweessumma': 'from-orange-500 to-orange-600',
      'ICT': 'from-cyan-500 to-cyan-600',
    };

    const gradient = colors[book.subject] || 'from-primary to-secondary';
    
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <BookOpen className="w-16 h-16 text-white/80" />
      </div>
    );
  };

  const displayBooks = embedded && !selectedSubject ? filteredBooks.slice(0, 6) : filteredBooks;

  return (
    <div className={embedded ? "" : "min-h-screen p-4 pb-24"}>
      <div className="max-w-7xl mx-auto space-y-6">
        {!embedded && (
          <Button onClick={onBack} variant="outline" className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Digital Books
          </h1>
          <p className="text-muted-foreground">Browse and continue reading</p>
        </div>

        {/* Continue Reading Section */}
        {continueReadingBooks.length > 0 && !selectedSubject && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Continue Reading</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueReadingBooks.map((book) => {
                const bookUrl = validateContentUrl(book.url, 'pdf');
                const bookProgress = progress[book.id];
                
                return (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                    onClick={() => onBookClick({ ...book, url: bookUrl })}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {typeof getBookCover(book) === 'string' ? (
                        <img 
                          src={getBookCover(book) as string} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getBookCover(book)
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <Progress value={bookProgress?.completion_percentage || 0} className="h-1 mb-2" />
                        <p className="text-white text-xs font-medium">
                          {bookProgress?.completion_percentage || 0}% Complete
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h3>
                      <p className="text-xs text-muted-foreground">{book.subject}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Books Section */}
        {!selectedSubject ? (
          <div>
            {!embedded && <h2 className="text-xl font-semibold mb-4">Browse by Subject</h2>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <Card
                  key={subject}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold mb-1">{subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      {books.filter(b => b.subject === subject).length} books
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Button
              onClick={() => setSelectedSubject(null)}
              variant="outline"
              className="mb-4 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Subjects
            </Button>
            {!embedded && <h2 className="text-2xl font-bold mb-4">{selectedSubject}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayBooks.map((book) => {
                const bookUrl = validateContentUrl(book.url, 'pdf');
                const bookProgress = progress[book.id];
                
                return (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                    onClick={() => onBookClick({ ...book, url: bookUrl })}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {typeof getBookCover(book) === 'string' ? (
                        <img 
                          src={getBookCover(book) as string} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getBookCover(book)
                      )}
                      {bookProgress && bookProgress.completion_percentage > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <Progress value={bookProgress.completion_percentage} className="h-1" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-xs line-clamp-2">{book.title}</h3>
                      {bookProgress && bookProgress.completion_percentage > 0 && (
                        <p className="text-xs text-primary mt-1">
                          {bookProgress.completion_percentage}%
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {embedded && !selectedSubject && books.length > 6 && (
              <div className="mt-6 text-center">
                <Button onClick={() => setSelectedSubject(subjects[0] || null)} variant="outline">
                  View All Books
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalBooksLibrary;
