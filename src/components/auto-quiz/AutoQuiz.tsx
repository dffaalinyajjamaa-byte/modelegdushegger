import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import AutoQuizSetup from './AutoQuizSetup';
import AutoQuizPlay from './AutoQuizPlay';
import AutoQuizResult from './AutoQuizResult';

interface AutoQuizProps {
  user: User;
  onBack: () => void;
}

export interface QuizQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string;
}

export type QuizPhase = 'setup' | 'playing' | 'result';

export default function AutoQuiz({ user, onBack }: AutoQuizProps) {
  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [bookId, setBookId] = useState('');
  const [subject, setSubject] = useState('');
  const [bookLanguage, setBookLanguage] = useState('en');

  const handleStartQuiz = (
    generatedQuestions: QuizQuestion[],
    selectedBookId: string,
    selectedSubject: string,
    language: string
  ) => {
    setQuestions(generatedQuestions);
    setBookId(selectedBookId);
    setSubject(selectedSubject);
    setBookLanguage(language);
    setAnswers({});
    setPhase('playing');
  };

  const handleFinishQuiz = (userAnswers: Record<number, string>, elapsed: number) => {
    setAnswers(userAnswers);
    setTimeTaken(elapsed);
    setPhase('result');
  };

  const handleRetry = () => {
    setPhase('setup');
    setQuestions([]);
    setAnswers({});
  };

  switch (phase) {
    case 'setup':
      return <AutoQuizSetup user={user} onBack={onBack} onStartQuiz={handleStartQuiz} />;
    case 'playing':
      return (
        <AutoQuizPlay
          questions={questions}
          onFinish={handleFinishQuiz}
          onBack={() => setPhase('setup')}
          bookLanguage={bookLanguage}
        />
      );
    case 'result':
      return (
        <AutoQuizResult
          user={user}
          questions={questions}
          answers={answers}
          timeTaken={timeTaken}
          bookId={bookId}
          subject={subject}
          onRetry={handleRetry}
          onBack={onBack}
        />
      );
  }
}
