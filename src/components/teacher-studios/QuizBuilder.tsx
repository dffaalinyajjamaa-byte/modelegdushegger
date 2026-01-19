import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, ClipboardList, Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizBuilderProps {
  onSave: (quizData: {
    questions: Question[];
    timeLimit: number;
    passingScore: number;
  }) => void;
  onCancel: () => void;
}

export default function QuizBuilder({ onSave, onCancel }: QuizBuilderProps) {
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const { toast } = useToast();

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { 
        id: Date.now().toString(), 
        question: '', 
        options: ['', '', '', ''], 
        correctAnswer: 0 
      }
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      toast({
        title: "Cannot remove",
        description: "Quiz must have at least one question",
        variant: "destructive",
      });
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSave = () => {
    // Validate
    const isValid = questions.every(q => 
      q.question.trim() && 
      q.options.every(opt => opt.trim()) &&
      q.correctAnswer >= 0 && q.correctAnswer < 4
    );

    if (!isValid) {
      toast({
        title: "Incomplete Quiz",
        description: "Please fill in all questions and options",
        variant: "destructive",
      });
      return;
    }

    onSave({ questions, timeLimit, passingScore });
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-500" />
            Quiz Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quiz Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit (minutes)
              </Label>
              <Input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={5}
                max={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Select value={passingScore.toString()} onValueChange={(v) => setPassingScore(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[50, 60, 70, 80, 90].map(score => (
                    <SelectItem key={score} value={score.toString()}>{score}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <Card key={q.id} className="bg-background">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Question {qIndex + 1}</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Input
                    placeholder="Enter your question..."
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                  />

                  <RadioGroup
                    value={q.correctAnswer.toString()}
                    onValueChange={(v) => updateQuestion(q.id, 'correctAnswer', parseInt(v))}
                  >
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-3">
                          <RadioGroupItem value={optIndex.toString()} id={`${q.id}-opt-${optIndex}`} />
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                            className="flex-1"
                          />
                          {q.correctAnswer === optIndex && (
                            <span className="text-xs text-green-500 font-medium">Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Select the radio button next to the correct answer
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Quiz ({questions.length} questions)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
