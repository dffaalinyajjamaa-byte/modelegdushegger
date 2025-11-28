import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Clock, BookOpen, ArrowLeft, CheckCircle, XCircle, Globe, Book, Beaker, Users, Shield, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuizFeatureProps {
  user: User;
  onBack: () => void;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  duration_minutes: number;
  total_marks: number;
  questions: Question[];
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  marks: number;
}

const GRADE_8_SUBJECTS = [
  { id: 'Afaan Oromoo', name: 'Afaan Oromoo', icon: BookOpen, color: 'primary' },
  { id: 'English', name: 'English', icon: Globe, color: 'secondary' },
  { id: 'Amharic', name: 'Amharic', icon: Book, color: 'accent' },
  { id: 'Sayinsii Waligalaa', name: 'Sayinsii Waligalaa', icon: Beaker, color: 'primary' },
  { id: 'Gadaa', name: 'Gadaa', icon: Users, color: 'secondary' },
  { id: 'Lammummaa', name: 'Lammummaa', icon: Shield, color: 'accent' },
  { id: 'Herreega', name: 'Herreega', icon: Calculator, color: 'primary' },
];

export default function QuizFeature({ user, onBack }: QuizFeatureProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userRank, setUserRank] = useState(1);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizzes();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) setProfile(data);
  };

  useEffect(() => {
    if (selectedQuiz && timeLeft > 0 && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedQuiz, timeLeft, isPaused]);

  // Auto-save session every 10 seconds
  useEffect(() => {
    if (selectedQuiz && !isSubmitted && !isPaused) {
      const interval = setInterval(() => {
        saveQuizSession();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedQuiz, answers, currentQuestion, timeLeft, isSubmitted, isPaused]);

  const saveQuizSession = async () => {
    if (!selectedQuiz) return;
    
    try {
      await supabase.from('quiz_sessions').upsert({
        id: sessionId || undefined,
        user_id: user.id,
        exam_id: selectedQuiz.id,
        answers,
        current_question: currentQuestion,
        time_remaining: timeLeft,
        paused_at: isPaused ? new Date().toISOString() : null
      });
    } catch (error) {
      console.error('Error saving quiz session:', error);
    }
  };

  const loadQuizSession = async (quizId: string) => {
    try {
      const { data } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('exam_id', quizId)
        .maybeSingle();

      if (data) {
        setSessionId(data.id);
        setAnswers(data.answers as { [key: string]: number });
        setCurrentQuestion(data.current_question);
        setTimeLeft(data.time_remaining);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading quiz session:', error);
      return false;
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    saveQuizSession();
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const fetchQuizzes = async (subject?: string) => {
    let query = supabase
      .from('exams')
      .select('*')
      .eq('grade_level', 'Grade 8');

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data } = await query.order('created_at', { ascending: false });

    if (data) {
      setQuizzes(data as unknown as Quiz[]);
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    // Try to load existing session
    const hasSession = await loadQuizSession(quiz.id);
    
    if (!hasSession) {
      setSelectedQuiz(quiz);
      setTimeLeft(quiz.duration_minutes * 60);
      setCurrentQuestion(0);
      setAnswers({});
      setIsSubmitted(false);
      setSessionId(null);
    } else {
      setSelectedQuiz(quiz);
      setIsSubmitted(false);
      toast({
        title: 'Session Restored',
        description: 'Continuing from where you left off'
      });
    }
  };

  const handleAnswer = (questionId: string, answer: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!selectedQuiz) return;

    let totalScore = 0;
    selectedQuiz.questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        totalScore += q.marks;
      }
    });

    setScore(totalScore);
    setIsSubmitted(true);

    const questionsCorrect = selectedQuiz.questions.filter(q => answers[q.id] === q.correct_answer).length;
    const questionsWrong = selectedQuiz.questions.length - questionsCorrect;

    await supabase.from('exam_submissions').insert({
      exam_id: selectedQuiz.id,
      user_id: user.id,
      answers: answers,
      score: totalScore,
      total_marks: selectedQuiz.total_marks,
      questions_correct: questionsCorrect,
      questions_wrong: questionsWrong,
      time_taken: (selectedQuiz.duration_minutes * 60) - timeLeft
    });

    // Update daily stats
    await supabase.rpc('increment_daily_stat', {
      p_user_id: user.id,
      p_stat_type: 'exams',
      p_increment: 1
    });

    toast({
      title: 'Quiz Submitted!',
      description: `You scored ${totalScore}/${selectedQuiz.total_marks}`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedQuiz && !isSubmitted) {
    const question = selectedQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Quiz
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge>
              Question {currentQuestion + 1}/{selectedQuiz.questions.length}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedQuiz.title}</CardTitle>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
              <RadioGroup
                value={answers[question.id]?.toString()}
                onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
              >
                {question.options.map((option, optionIndex) => {
                  const isSelected = answers[question.id] === optionIndex;
                  const isCorrect = isSubmitted && question.correct_answer === optionIndex;
                  const isWrong = isSubmitted && isSelected && question.correct_answer !== optionIndex;
                  
                  return (
                    <div
                      key={optionIndex}
                      className={cn(
                        'flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-300',
                        !isSubmitted && 'quiz-option-default',
                        isSelected && !isSubmitted && 'quiz-option-selected',
                        isCorrect && 'quiz-option-correct',
                        isWrong && 'quiz-option-incorrect'
                      )}
                    >
                      <RadioGroupItem value={optionIndex.toString()} id={`option-${optionIndex}`} />
                      <Label htmlFor={`option-${optionIndex}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                      {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {isSubmitted && isWrong && <XCircle className="w-5 h-5 text-red-600" />}
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion === selectedQuiz.questions.length - 1 ? (
                <Button onClick={handleSubmit}>
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(selectedQuiz.questions.length - 1, prev + 1))}
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted && selectedQuiz) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Quiz Completed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">
                {score}/{selectedQuiz.total_marks}
              </div>
              <p className="text-lg text-muted-foreground">
                You scored {((score / selectedQuiz.total_marks) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setSelectedQuiz(null)} className="flex-1">
                Back to Quizzes
              </Button>
              <Button onClick={() => startQuiz(selectedQuiz)} className="flex-1">
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subject Selection Screen
  if (!selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Grade 8 Quizzes
            </h1>
            <p className="text-muted-foreground mt-2">Choose your subject</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GRADE_8_SUBJECTS.map((subject) => {
            const Icon = subject.icon;
            const subjectQuizzes = quizzes.filter(e => e.subject === subject.id);
            return (
              <Card
                key={subject.id}
                className="glass-card hover-scale cursor-pointer border-2 border-primary/30 transition-all hover:border-primary"
                onClick={() => {
                  setSelectedSubject(subject.id);
                  fetchQuizzes(subject.id);
                }}
              >
                <CardContent className="pt-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full gradient-${subject.color} flex items-center justify-center shadow-neon`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{subject.name}</h3>
                  <Badge variant="secondary">{subjectQuizzes.length} quiz{subjectQuizzes.length !== 1 ? 'zes' : ''}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz List Screen
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            {selectedSubject} Quizzes
          </h1>
          <Badge className="mt-2">Grade 8</Badge>
        </div>
        <Button variant="outline" onClick={() => setSelectedSubject(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subjects
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover-scale cursor-pointer glass-card border-primary/30">
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {quiz.duration_minutes} min
                </Badge>
                <Badge variant="outline">{quiz.total_marks} marks</Badge>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{quiz.questions?.length || 0} questions</span>
              </div>
              <Button onClick={() => startQuiz(quiz)} className="w-full gradient-primary">
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        ))}

        {quizzes.length === 0 && (
          <Card className="col-span-full glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No {selectedSubject} quizzes available yet. Check back later!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
