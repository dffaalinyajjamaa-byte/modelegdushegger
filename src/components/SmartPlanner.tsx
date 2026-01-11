import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CalendarClock, Loader2 } from 'lucide-react';
import SmartPlannerSetup from './smart-planner/SmartPlannerSetup';
import SmartPlannerSubjects from './smart-planner/SmartPlannerSubjects';
import SmartPlannerView from './smart-planner/SmartPlannerView';
import { useToast } from '@/hooks/use-toast';

interface SmartPlannerProps {
  user: User;
  onBack: () => void;
}

export interface DaySchedule {
  day_of_week: string;
  school_start: string;
  school_end: string;
  rest_start: string;
  rest_end: string;
  dinner_start: string;
  dinner_end: string;
}

export interface SubjectSelection {
  subject: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StudySession {
  from: string;
  to: string;
  subject: string;
}

export interface DayPlan {
  day: string;
  school_time: { from: string; to: string };
  study_sessions: StudySession[];
}

export interface SmartPlan {
  week: string;
  timezone: string;
  days: DayPlan[];
  weekly_summary: {
    focus_subjects: string[];
    ai_tip: string;
  };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SmartPlanner({ user, onBack }: SmartPlannerProps) {
  const [step, setStep] = useState<'setup' | 'subjects' | 'view'>('setup');
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [subjects, setSubjects] = useState<SubjectSelection[]>([]);
  const [plan, setPlan] = useState<SmartPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExistingData();
  }, [user.id]);

  const loadExistingData = async () => {
    try {
      // Load schedules
      const { data: scheduleData } = await supabase
        .from('smart_planner_settings')
        .select('*')
        .eq('user_id', user.id);

      if (scheduleData && scheduleData.length > 0) {
        setSchedules(scheduleData.map(s => ({
          day_of_week: s.day_of_week,
          school_start: s.school_start || '',
          school_end: s.school_end || '',
          rest_start: s.rest_start || '',
          rest_end: s.rest_end || '',
          dinner_start: s.dinner_start || '',
          dinner_end: s.dinner_end || '',
        })));
      } else {
        // Initialize with default empty schedules
        setSchedules(DAYS.map(day => ({
          day_of_week: day,
          school_start: '08:00',
          school_end: '15:00',
          rest_start: '13:00',
          rest_end: '14:00',
          dinner_start: '19:00',
          dinner_end: '20:00',
        })));
      }

      // Load subjects
      const { data: subjectData } = await supabase
        .from('smart_planner_subjects')
        .select('*')
        .eq('user_id', user.id);

      if (subjectData && subjectData.length > 0) {
        setSubjects(subjectData.map(s => ({
          subject: s.subject,
          priority: s.priority as 'high' | 'medium' | 'low',
        })));
      }

      // Load existing plan for current week
      const currentWeek = getWeekNumber(new Date());
      const currentYear = new Date().getFullYear();

      const { data: planData } = await supabase
        .from('smart_planner_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_index', currentWeek)
        .eq('year', currentYear)
        .maybeSingle();

      if (planData?.plan_data) {
        setPlan(planData.plan_data as unknown as SmartPlan);
        setStep('view');
      } else if (scheduleData && scheduleData.length > 0 && subjectData && subjectData.length > 0) {
        // User has setup but no plan for this week
        setStep('view');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const saveSchedules = async (newSchedules: DaySchedule[]) => {
    try {
      // Delete existing and insert new
      await supabase
        .from('smart_planner_settings')
        .delete()
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('smart_planner_settings')
        .insert(newSchedules.map(s => ({
          user_id: user.id,
          day_of_week: s.day_of_week,
          school_start: s.school_start || null,
          school_end: s.school_end || null,
          rest_start: s.rest_start || null,
          rest_end: s.rest_end || null,
          dinner_start: s.dinner_start || null,
          dinner_end: s.dinner_end || null,
        })));

      if (error) throw error;
      setSchedules(newSchedules);
      setStep('subjects');
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule settings",
        variant: "destructive",
      });
    }
  };

  const saveSubjects = async (newSubjects: SubjectSelection[]) => {
    try {
      // Delete existing and insert new
      await supabase
        .from('smart_planner_subjects')
        .delete()
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('smart_planner_subjects')
        .insert(newSubjects.map(s => ({
          user_id: user.id,
          subject: s.subject,
          priority: s.priority,
        })));

      if (error) throw error;
      setSubjects(newSubjects);
      setStep('view');
    } catch (error) {
      console.error('Error saving subjects:', error);
      toast({
        title: "Error",
        description: "Failed to save subject selections",
        variant: "destructive",
      });
    }
  };

  const generatePlan = async () => {
    if (subjects.length === 0) {
      toast({
        title: "No subjects selected",
        description: "Please select at least one subject to study",
        variant: "destructive",
      });
      setStep('subjects');
      return;
    }

    setGenerating(true);
    try {
      const currentWeek = getWeekNumber(new Date());
      const currentYear = new Date().getFullYear();

      const response = await supabase.functions.invoke('generate-smart-plan', {
        body: {
          schedules,
          subjects,
          week_index: currentWeek,
        },
      });

      if (response.error) throw response.error;

      const generatedPlan = response.data as SmartPlan;
      setPlan(generatedPlan);

      // Save to database - delete existing and insert new
      await supabase
        .from('smart_planner_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('week_index', currentWeek)
        .eq('year', currentYear);

      const { error: insertError } = await supabase
        .from('smart_planner_plans')
        .insert([{
          user_id: user.id,
          week_index: currentWeek,
          year: currentYear,
          plan_data: JSON.parse(JSON.stringify(generatedPlan)),
        }]);

      if (insertError) console.error('Save error:', insertError);

      toast({
        title: "Plan Generated!",
        description: "Your weekly study plan is ready",
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate study plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Smart Planner</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {['setup', 'subjects', 'view'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['setup', 'subjects', 'view'].indexOf(step)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div className={`w-12 h-1 mx-1 ${
                i < ['setup', 'subjects', 'view'].indexOf(step)
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'setup' && (
        <SmartPlannerSetup
          schedules={schedules}
          onSave={saveSchedules}
          onBack={onBack}
        />
      )}

      {step === 'subjects' && (
        <SmartPlannerSubjects
          subjects={subjects}
          onSave={saveSubjects}
          onBack={() => setStep('setup')}
        />
      )}

      {step === 'view' && (
        <SmartPlannerView
          plan={plan}
          generating={generating}
          onGenerate={generatePlan}
          onEditSchedule={() => setStep('setup')}
          onEditSubjects={() => setStep('subjects')}
        />
      )}
    </div>
  );
}
