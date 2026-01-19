import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizData {
  questions: Question[];
  timeLimit: number;
  passingScore: number;
}

interface EmbeddedQuizProps {
  user: User;
  quizId: string;
  quizData: QuizData;
  title: string;
  onComplete: (score: number, passed: boolean) => void;
  onClose: () => void;
}

export default function EmbeddedQuiz({ 
  user, 
  quizId, 
  quizData, 
  title, 
  onComplete, 
  onClose 
}: EmbeddedQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(quizData.timeLimit * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (timeLeft <= 0 && !isSubmitted) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleSubmit = async () => {
    const correctCount = quizData.questions.reduce((count, q, index) => {
      return count + (answers[index] === q.correctAnswer ? 1 : 0);
    }, 0);

    const finalScore = Math.round((correctCount / quizData.questions.length) * 100);
    const passed = finalScore >= quizData.passingScore;

    setScore(finalScore);
    setIsSubmitted(true);

    // Save to database
    try {
      await supabase.from('quiz_sessions').insert({
        user_id: user.id,
        exam_id: quizId,
        current_question: quizData.questions.length,
        answers: answers,
        time_remaining: timeLeft,
      });

      // Award points if passed
      if (passed) {
        await supabase.rpc('award_points', {
          p_user_id: user.id,
          p_points: 10,
          p_activity_type: 'quiz_completed',
        });
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
    }

    onComplete(finalScore, passed);
  };

  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;
  const question = quizData.questions[currentQuestion];

  if (isSubmitted) {
    const passed = score >= quizData.passingScore;
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {passed ? (
              <Trophy className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-muted-foreground">
              {passed 
                ? 'You passed the quiz!' 
                : `You need ${quizData.passingScore}% to pass. Try again!`}
            </p>
          </div>

          <div className="text-5xl font-bold">
            {score}%
          </div>

          <div className="text-sm text-muted-foreground">
            {quizData.questions.reduce((count, q, index) => 
              count + (answers[index] === q.correctAnswer ? 1 : 0), 0
            )} of {quizData.questions.length} correct
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => {
              setIsSubmitted(false);
              setCurrentQuestion(0);
              setAnswers({});
              setTimeLeft(quizData.timeLimit * 60);
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            timeLeft < 60 ? 'bg-red-500/20 text-red-500' : 'bg-muted'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {quizData.questions.length}
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <h3 className="text-xl font-semibold">{question.question}</h3>

        <RadioGroup
          value={answers[currentQuestion]?.toString()}
          onValueChange={(v) => handleAnswer(currentQuestion, parseInt(v))}
        >
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  answers[currentQuestion] === index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAnswer(currentQuestion, index)}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer font-normal"
                >
                  <span className="font-semibold mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion < quizData.questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={answers[currentQuestion] === undefined}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < quizData.questions.length}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Quiz
            </Button>
          )}
        </div>

        <div className="flex gap-2 justify-center flex-wrap">
          {quizData.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestion
                  ? 'bg-primary text-primary-foreground'
                  : answers[index] !== undefined
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
