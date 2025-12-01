import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIStudyPlanProps {
  user: User;
}

interface StudyPlan {
  weeklyGoal: string;
  schedule: Array<{
    day: string;
    tasks: Array<{
      time: string;
      subject: string;
      topic: string;
      priority: string;
    }>;
  }>;
  recommendations: string[];
}

export default function AIStudyPlan({ user }: AIStudyPlanProps) {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generatePlan();
  }, []);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-plan');

      if (error) throw error;
      setStudyPlan(data);
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate study plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            AI Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!studyPlan) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            AI Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No study plan generated yet</p>
            <Button onClick={generatePlan}>
              <Target className="w-4 h-4 mr-2" />
              Generate Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            AI Study Plan
          </CardTitle>
          <Button size="sm" variant="outline" onClick={generatePlan} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {/* Weekly Goal */}
          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Weekly Goal</h3>
                <p className="text-sm text-muted-foreground">{studyPlan.weeklyGoal}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4 mb-6">
            {studyPlan.schedule.map((day, idx) => (
              <Card key={idx} className="p-4">
                <h4 className="font-semibold mb-3">{day.day}</h4>
                <div className="space-y-2">
                  {day.tasks.map((task, taskIdx) => (
                    <div key={taskIdx} className="flex items-start gap-3 p-2 rounded hover:bg-accent/50">
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {task.priority}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-muted-foreground">{task.time}</span>
                          <Badge variant="outline">{task.subject}</Badge>
                        </div>
                        <p className="text-sm">{task.topic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Recommendations</h3>
            </div>
            <ul className="space-y-2">
              {studyPlan.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
