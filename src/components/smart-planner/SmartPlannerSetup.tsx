import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Clock, ArrowRight } from 'lucide-react';
import { DaySchedule } from '../SmartPlanner';
import { useToast } from '@/hooks/use-toast';

interface SmartPlannerSetupProps {
  schedules: DaySchedule[];
  onSave: (schedules: DaySchedule[]) => void;
  onBack: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SmartPlannerSetup({ schedules, onSave, onBack }: SmartPlannerSetupProps) {
  const [localSchedules, setLocalSchedules] = useState<DaySchedule[]>(schedules);
  const [use24Hour, setUse24Hour] = useState(true);
  const { toast } = useToast();

  const updateSchedule = (day: string, field: keyof DaySchedule, value: string) => {
    setLocalSchedules(prev => 
      prev.map(s => s.day_of_week === day ? { ...s, [field]: value } : s)
    );
  };

  const copyMondayToAll = () => {
    const monday = localSchedules.find(s => s.day_of_week === 'Monday');
    if (!monday) return;

    setLocalSchedules(prev => 
      prev.map(s => s.day_of_week === 'Saturday' ? s : {
        ...s,
        school_start: monday.school_start,
        school_end: monday.school_end,
        rest_start: monday.rest_start,
        rest_end: monday.rest_end,
        dinner_start: monday.dinner_start,
        dinner_end: monday.dinner_end,
      })
    );

    toast({
      title: "Copied!",
      description: "Monday's schedule copied to Tuesday–Friday",
    });
  };

  const handleSubmit = () => {
    onSave(localSchedules);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Weekly Schedule Setup
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set your school, rest, and dinner times for each day
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyMondayToAll}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Monday to All
          </Button>
        </div>

        <div className="space-y-4">
          {DAYS.map(day => {
            const schedule = localSchedules.find(s => s.day_of_week === day) || {
              day_of_week: day,
              school_start: '',
              school_end: '',
              rest_start: '',
              rest_end: '',
              dinner_start: '',
              dinner_end: '',
            };

            return (
              <div
                key={day}
                className={`p-4 rounded-xl border ${
                  day === 'Saturday' 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{day}</h3>
                  {day === 'Saturday' && (
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full">
                      Lighter Day
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* School Time */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">School Time</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.school_start}
                        onChange={(e) => updateSchedule(day, 'school_start', e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={schedule.school_end}
                        onChange={(e) => updateSchedule(day, 'school_end', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Rest Time */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Rest Time</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.rest_start}
                        onChange={(e) => updateSchedule(day, 'rest_start', e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={schedule.rest_end}
                        onChange={(e) => updateSchedule(day, 'rest_end', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Dinner Time */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Dinner Time</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.dinner_start}
                        onChange={(e) => updateSchedule(day, 'dinner_start', e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={schedule.dinner_end}
                        onChange={(e) => updateSchedule(day, 'dinner_end', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} className="gap-2">
          Next: Select Subjects
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
