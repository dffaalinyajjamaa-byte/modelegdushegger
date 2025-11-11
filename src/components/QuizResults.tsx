import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RotateCcw, Home } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
}

interface QuizResultsProps {
  questions: Question[];
  userAnswers: Record<number, number>;
  score: number;
  totalMarks: number;
  onRetake: () => void;
  onBackToHome: () => void;
}

export default function QuizResults({
  questions,
  userAnswers,
  score,
  totalMarks,
  onRetake,
  onBackToHome,
}: QuizResultsProps) {
  const percentage = Math.round((score / totalMarks) * 100);
  const passed = percentage >= 50;

  return (
    <div className="space-y-6 pb-24 animate-slide-up">
      <Card className="glass-card border-2 border-primary/30">
        <CardHeader className="text-center">
          <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {passed ? (
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-3xl mb-2">
            {percentage}%
          </CardTitle>
          <p className="text-muted-foreground">
            {score} out of {totalMarks} correct
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {questions.map((q, index) => {
          const userAnswerIndex = userAnswers[q.id];
          const correctAnswerIndex = q.options.findIndex(
            opt => opt.startsWith(q.answer + '.')
          );
          const isCorrect = userAnswerIndex === correctAnswerIndex;

          return (
            <Card key={q.id} className={`glass-card border-2 ${
              isCorrect ? 'border-green-500/30' : 'border-red-500/30'
            }`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Badge variant={isCorrect ? 'default' : 'destructive'}>
                    Q{index + 1}
                  </Badge>
                  <CardTitle className="text-base flex-1">{q.question}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((option, i) => {
                  const isUserAnswer = i === userAnswerIndex;
                  const isCorrectAnswer = i === correctAnswerIndex;

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border-2 ${
                        isCorrectAnswer
                          ? 'border-green-500 bg-green-500/10'
                          : isUserAnswer
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm">{option}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 glass-card border-t border-border/40">
        <div className="flex gap-2">
          <Button onClick={onRetake} variant="outline" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Quiz
          </Button>
          <Button onClick={onBackToHome} className="flex-1">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
