import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import type { QuizQuestion } from './AutoQuiz';

interface AutoQuizPlayProps {
  questions: QuizQuestion[];
  onFinish: (answers: Record<number, string>, timeTaken: number) => void;
  onBack: () => void;
  bookLanguage: string;
}

export default function AutoQuizPlay({ questions, onFinish, onBack, bookLanguage }: AutoQuizPlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const totalSeconds = Math.round(questions.length * 1.5 * 60);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          onFinish(answers, elapsed);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAnswer = useCallback((option: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  }, [currentIndex]);

  const handleSubmit = () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    onFinish(answers, elapsed);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < 60;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Q {currentIndex + 1}/{questions.length}
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isLowTime ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Question */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-lg font-semibold mb-6">{question.question}</p>

          <div className="space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map(option => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[currentIndex] === option
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <span className="font-bold mr-3">{option}.</span>
                {question.options[option]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>

        <div className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </div>

        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button variant="hero" onClick={handleSubmit}>
            <Flag className="w-4 h-4 mr-1" />
            Submit
          </Button>
        )}
      </div>

      {/* Question Navigator */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
              i === currentIndex
                ? 'bg-primary text-primary-foreground'
                : answers[i]
                  ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
