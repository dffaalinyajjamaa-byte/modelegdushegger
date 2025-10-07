import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, BookOpen, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtraExamProps {
  user: User;
  onBack: () => void;
}

interface Exam {
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

export default function ExtraExam({ user, onBack }: ExtraExamProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam && timeLeft > 0) {
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
  }, [selectedExam, timeLeft]);

  const fetchExams = async () => {
    const { data } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setExams(data as unknown as Exam[]);
    }
  };

  const startExam = (exam: Exam) => {
    setSelectedExam(exam);
    setTimeLeft(exam.duration_minutes * 60);
    setCurrentQuestion(0);
    setAnswers({});
    setIsSubmitted(false);
  };

  const handleAnswer = (questionId: string, answer: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!selectedExam) return;

    let totalScore = 0;
    selectedExam.questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        totalScore += q.marks;
      }
    });

    setScore(totalScore);
    setIsSubmitted(true);

    await supabase.from('exam_submissions').insert({
      exam_id: selectedExam.id,
      user_id: user.id,
      answers: answers,
      score: totalScore,
      total_marks: selectedExam.total_marks
    });

    toast({
      title: 'Exam Submitted!',
      description: `You scored ${totalScore}/${selectedExam.total_marks}`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedExam && !isSubmitted) {
    const question = selectedExam.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedExam.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Exam
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </Badge>
            <Badge>
              Question {currentQuestion + 1}/{selectedExam.questions.length}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedExam.title}</CardTitle>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
              <RadioGroup
                value={answers[question.id]?.toString()}
                onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
              >
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
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
              {currentQuestion === selectedExam.questions.length - 1 ? (
                <Button onClick={handleSubmit}>
                  Submit Exam
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(selectedExam.questions.length - 1, prev + 1))}
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

  if (isSubmitted && selectedExam) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Exam Completed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">
                {score}/{selectedExam.total_marks}
              </div>
              <p className="text-lg text-muted-foreground">
                You scored {((score / selectedExam.total_marks) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setSelectedExam(null)} className="flex-1">
                Back to Exams
              </Button>
              <Button onClick={() => startExam(selectedExam)} className="flex-1">
                Retake Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Extra Exams
          </h1>
          <p className="text-muted-foreground mt-2">Test your knowledge with practice exams</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((exam) => (
          <Card key={exam.id} className="hover-scale cursor-pointer">
            <CardHeader>
              <CardTitle>{exam.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{exam.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{exam.subject}</Badge>
                {exam.grade_level && <Badge variant="outline">{exam.grade_level}</Badge>}
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {exam.duration_minutes} min
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{exam.questions?.length || 0} questions</span>
                <span>{exam.total_marks} marks</span>
              </div>
              <Button onClick={() => startExam(exam)} className="w-full">
                Start Exam
              </Button>
            </CardContent>
          </Card>
        ))}

        {exams.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No exams available yet. Check back later!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}