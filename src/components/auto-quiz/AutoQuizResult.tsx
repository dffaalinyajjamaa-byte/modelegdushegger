import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, RotateCcw, ArrowLeft, Trophy, Award } from 'lucide-react';
import type { QuizQuestion } from './AutoQuiz';

interface AutoQuizResultProps {
  user: User;
  questions: QuizQuestion[];
  answers: Record<number, string>;
  timeTaken: number;
  bookId: string;
  subject: string;
  onRetry: () => void;
  onBack: () => void;
}

export default function AutoQuizResult({
  user, questions, answers, timeTaken, bookId, subject, onRetry, onBack
}: AutoQuizResultProps) {
  const [saved, setSaved] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= 50;

  // Save result
  useEffect(() => {
    if (saved) return;
    const saveResult = async () => {
      await supabase.from('auto_quiz_results').insert({
        user_id: user.id,
        book_id: bookId,
        subject,
        score,
        total,
        percentage,
        passed,
        answers,
        time_taken: timeTaken
      });
      setSaved(true);
    };
    saveResult();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Score Card */}
      <Card className={`border-2 ${passed ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
        <CardContent className="pt-6 text-center">
          {passed ? (
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          ) : (
            <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          )}
          
          <h2 className="text-3xl font-bold mb-2">
            {score}/{total}
          </h2>
          <div className={`text-5xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {percentage}%
          </div>
          <p className={`text-lg font-medium ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {passed ? '🎉 Passed!' : '❌ Not Passed'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Time: {formatTime(timeTaken)} | Subject: {subject}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onRetry} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => setShowExplanations(!showExplanations)}
      >
        {showExplanations ? 'Hide' : 'Show'} Answers & Explanations
      </Button>

      {/* Explanations */}
      {showExplanations && (
        <div className="space-y-4">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.answer;
            return (
              <Card key={i} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    Question {i + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{q.question}</p>
                  {!isCorrect && answers[i] && (
                    <p className="text-sm text-red-500">
                      Your answer: {answers[i]}. {q.options[answers[i] as keyof typeof q.options]}
                    </p>
                  )}
                  <p className="text-sm text-green-600">
                    Correct: {q.answer}. {q.options[q.answer as keyof typeof q.options]}
                  </p>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {q.explanation}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
