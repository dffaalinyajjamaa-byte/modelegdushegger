import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, BookOpen, Star } from 'lucide-react';
import { SubjectSelection } from '../SmartPlanner';

interface SmartPlannerSubjectsProps {
  subjects: SubjectSelection[];
  onSave: (subjects: SubjectSelection[]) => void;
  onBack: () => void;
}

const AVAILABLE_SUBJECTS = [
  { id: 'afaan-oromo', name: 'Afaan Oromo', color: 'bg-green-500' },
  { id: 'afaan-amaaraa', name: 'Afaan Amaaraa', color: 'bg-yellow-500' },
  { id: 'english', name: 'English', color: 'bg-blue-500' },
  { id: 'herrega', name: 'Herrega (Math)', color: 'bg-orange-500' },
  { id: 'saayinsii', name: 'Saayinsii (Science)', color: 'bg-cyan-500' },
  { id: 'gadaa', name: 'Gadaa', color: 'bg-purple-500' },
  { id: 'lammummaa-safuu', name: 'Lammummaa / Safuu', color: 'bg-pink-500' },
  { id: 'hawaasa', name: 'Hawaasa (Social)', color: 'bg-indigo-500' },
];

const PRIORITIES: Array<{ value: 'high' | 'medium' | 'low'; label: string; color: string }> = [
  { value: 'high', label: 'High', color: 'bg-red-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
];

export default function SmartPlannerSubjects({ subjects, onSave, onBack }: SmartPlannerSubjectsProps) {
  const [localSubjects, setLocalSubjects] = useState<SubjectSelection[]>(subjects);

  const toggleSubject = (subjectName: string) => {
    const exists = localSubjects.find(s => s.subject === subjectName);
    if (exists) {
      setLocalSubjects(prev => prev.filter(s => s.subject !== subjectName));
    } else {
      setLocalSubjects(prev => [...prev, { subject: subjectName, priority: 'medium' }]);
    }
  };

  const updatePriority = (subjectName: string, priority: 'high' | 'medium' | 'low') => {
    setLocalSubjects(prev =>
      prev.map(s => s.subject === subjectName ? { ...s, priority } : s)
    );
  };

  const isSelected = (subjectName: string) => 
    localSubjects.some(s => s.subject === subjectName);

  const getPriority = (subjectName: string) => 
    localSubjects.find(s => s.subject === subjectName)?.priority || 'medium';

  const handleSubmit = () => {
    onSave(localSubjects);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Select Your Subjects
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose subjects to include in your study plan and set their priority
          </p>
        </div>

        <div className="grid gap-4">
          {AVAILABLE_SUBJECTS.map(subject => {
            const selected = isSelected(subject.name);
            const priority = getPriority(subject.name);

            return (
              <div
                key={subject.id}
                className={`p-4 rounded-xl border transition-all ${
                  selected 
                    ? 'bg-primary/10 border-primary/50' 
                    : 'bg-muted/50 border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={subject.id}
                      checked={selected}
                      onCheckedChange={() => toggleSubject(subject.name)}
                    />
                    <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                    <Label
                      htmlFor={subject.id}
                      className="text-base font-medium cursor-pointer"
                    >
                      {subject.name}
                    </Label>
                  </div>

                  {selected && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div className="flex gap-1">
                        {PRIORITIES.map(p => (
                          <button
                            key={p.value}
                            onClick={() => updatePriority(subject.name, p.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              priority === p.value
                                ? `${p.color} text-white`
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {localSubjects.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>{localSubjects.length}</strong> subjects selected • 
              <span className="text-red-500 ml-2">{localSubjects.filter(s => s.priority === 'high').length} High</span> • 
              <span className="text-yellow-500 ml-2">{localSubjects.filter(s => s.priority === 'medium').length} Medium</span> • 
              <span className="text-green-500 ml-2">{localSubjects.filter(s => s.priority === 'low').length} Low</span>
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={localSubjects.length === 0} className="gap-2">
          Generate Plan
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
