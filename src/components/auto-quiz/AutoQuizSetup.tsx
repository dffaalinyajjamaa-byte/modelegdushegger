import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2, ArrowLeft, Brain } from 'lucide-react';
import type { QuizQuestion } from './AutoQuiz';

interface AutoQuizSetupProps {
  user: User;
  onBack: () => void;
  onStartQuiz: (questions: QuizQuestion[], bookId: string, subject: string, language: string) => void;
}

interface Book {
  id: string;
  title: string;
  grade: string;
  subject: string;
  language: string;
  processing_status: string;
}

interface Unit {
  id: string;
  unit_number: number;
  unit_title: string;
}

export default function AutoQuizSetup({ user, onBack, onStartQuiz }: AutoQuizSetupProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<string>('20');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userGrade, setUserGrade] = useState<string>('');
  const { toast } = useToast();

  // Fetch user grade
  useEffect(() => {
    const fetchGrade = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('grade')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.grade) setUserGrade(data.grade);
    };
    fetchGrade();
  }, [user.id]);

  // Fetch books filtered by user grade
  useEffect(() => {
    if (!userGrade) return;
    const fetchBooks = async () => {
      setLoading(true);
      const gradeFilter = userGrade.includes('6') ? 'Grade 6' : 'Grade 8';
      const { data, error } = await supabase
        .from('auto_quiz_books')
        .select('*')
        .eq('grade', gradeFilter)
        .eq('processing_status', 'completed');
      
      if (error) {
        console.error('Error fetching books:', error);
      } else {
        setBooks((data || []) as Book[]);
      }
      setLoading(false);
    };
    fetchBooks();
  }, [userGrade]);

  // Fetch units when book is selected
  useEffect(() => {
    if (!selectedBook) {
      setUnits([]);
      setSelectedUnits([]);
      return;
    }
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('auto_quiz_units')
        .select('*')
        .eq('book_id', selectedBook)
        .order('display_order');
      
      if (error) {
        console.error('Error fetching units:', error);
      } else {
        setUnits((data || []) as Unit[]);
      }
    };
    fetchUnits();
  }, [selectedBook]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnits(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const selectAllUnits = () => {
    if (selectedUnits.length === units.length) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits(units.map(u => u.id));
    }
  };

  const handleGenerate = async () => {
    if (!selectedBook) {
      toast({ title: 'Please select a book', variant: 'destructive' });
      return;
    }

    const book = books.find(b => b.id === selectedBook);
    if (!book) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-auto-quiz', {
        body: {
          bookId: selectedBook,
          unitIds: selectedUnits.length > 0 ? selectedUnits : null,
          questionCount: parseInt(questionCount),
          language: book.language
        }
      });

      if (error) throw error;
      if (!data?.questions || data.questions.length === 0) {
        throw new Error('No questions generated');
      }

      onStartQuiz(data.questions, selectedBook, book.subject, book.language);
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Failed to generate quiz',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Auto Quiz</h2>
          <p className="text-sm text-muted-foreground">AI-powered quizzes from your textbooks</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Books Available</h3>
            <p className="text-muted-foreground">
              No textbooks have been uploaded for {userGrade || 'your grade'} yet. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Book Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Select Textbook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a book" />
                </SelectTrigger>
                <SelectContent>
                  {books.map(book => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} ({book.subject}) - {book.language.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Unit Selection */}
          {selectedBook && units.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Select Units</CardTitle>
                  <Button variant="outline" size="sm" onClick={selectAllUnits}>
                    {selectedUnits.length === units.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {units.map(unit => (
                  <label
                    key={unit.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedUnits.includes(unit.id)}
                      onCheckedChange={() => toggleUnit(unit.id)}
                    />
                    <span className="font-medium">Unit {unit.unit_number}:</span>
                    <span className="text-muted-foreground">{unit.unit_title}</span>
                  </label>
                ))}
                {selectedUnits.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No units selected — quiz will use all units
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Question Count */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Number of Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {['20', '40', '60', '70', '100'].map(count => (
                  <Button
                    key={count}
                    variant={questionCount === count ? 'default' : 'outline'}
                    onClick={() => setQuestionCount(count)}
                    className="text-lg font-bold"
                  >
                    {count}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ⏱️ Time: {Math.round(parseInt(questionCount) * 1.5)} minutes ({questionCount} × 1.5 min each)
              </p>
            </CardContent>
          </Card>

          {/* Start Button */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedBook || generating}
            className="w-full h-14 text-lg"
            variant="hero"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Brain className="mr-2 w-5 h-5" />
                Start Quiz
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
