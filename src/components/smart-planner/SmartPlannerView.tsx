import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Settings, BookOpen, Lightbulb, Loader2 } from 'lucide-react';
import { SmartPlan } from '../SmartPlanner';

interface SmartPlannerViewProps {
  plan: SmartPlan | null;
  generating: boolean;
  onGenerate: () => void;
  onEditSchedule: () => void;
  onEditSubjects: () => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  'Afaan Oromo': 'bg-green-500',
  'Afaan Amaaraa': 'bg-yellow-500',
  'English': 'bg-blue-500',
  'Herrega': 'bg-orange-500',
  'Herrega (Math)': 'bg-orange-500',
  'Saayinsii': 'bg-cyan-500',
  'Saayinsii (Science)': 'bg-cyan-500',
  'Gadaa': 'bg-purple-500',
  'Lammummaa / Safuu': 'bg-pink-500',
  'Hawaasa': 'bg-indigo-500',
  'Hawaasa (Social)': 'bg-indigo-500',
  'Revision': 'bg-gray-500',
};

export default function SmartPlannerView({ 
  plan, 
  generating, 
  onGenerate, 
  onEditSchedule, 
  onEditSubjects 
}: SmartPlannerViewProps) {
  if (!plan) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Generate Your Study Plan</h3>
          <p className="text-muted-foreground mb-6">
            Based on your schedule and selected subjects, our AI will create a personalized weekly study plan.
          </p>
          <Button onClick={onGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate Plan
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{plan.week}</h2>
          <p className="text-sm text-muted-foreground">Timezone: {plan.timezone}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditSchedule}>
            <Settings className="w-4 h-4 mr-2" />
            Edit Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={onEditSubjects}>
            <BookOpen className="w-4 h-4 mr-2" />
            Edit Subjects
          </Button>
          <Button size="sm" onClick={onGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Colorful Table View */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary/10">
                <th className="p-3 text-left font-semibold border-b">Day</th>
                <th className="p-3 text-left font-semibold border-b">Time</th>
                <th className="p-3 text-left font-semibold border-b">Subject</th>
              </tr>
            </thead>
            <tbody>
              {plan.days.map(day => 
                day.study_sessions && day.study_sessions.length > 0 ? (
                  day.study_sessions.map((session, i) => {
                    // Convert to 12-hour format (Addis Ababa time)
                    const formatTo12Hour = (time: string) => {
                      const [hours, minutes] = time.split(':').map(Number);
                      const period = hours >= 12 ? 'PM' : 'AM';
                      const hour12 = hours % 12 || 12;
                      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
                    };
                    
                    return (
                      <tr key={`${day.day}-${i}`} className="border-b hover:bg-muted/50 transition-colors">
                        {i === 0 && (
                          <td 
                            className="p-3 font-medium border-r" 
                            rowSpan={day.study_sessions.length}
                          >
                            {day.day}
                          </td>
                        )}
                        <td className="p-3 text-sm font-mono">
                          {formatTo12Hour(session.from)} - {formatTo12Hour(session.to)}
                        </td>
                        <td className="p-3">
                          <span 
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${
                              SUBJECT_COLORS[session.subject] || 'bg-gray-500'
                            }`}
                          >
                            {session.subject}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr key={day.day} className="border-b">
                    <td className="p-3 font-medium">{day.day}</td>
                    <td className="p-3 text-muted-foreground italic" colSpan={2}>
                      Free day - enjoy your rest!
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Weekly Summary */}
      {plan.weekly_summary && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">AI Tip</h3>
              <p className="text-muted-foreground">{plan.weekly_summary.ai_tip}</p>
              {plan.weekly_summary.focus_subjects && plan.weekly_summary.focus_subjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Focus subjects:</span>
                  {plan.weekly_summary.focus_subjects.map(subject => (
                    <span
                      key={subject}
                      className={`px-2 py-1 rounded-full text-xs text-white ${
                        SUBJECT_COLORS[subject] || 'bg-gray-500'
                      }`}
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Daily Details */}
      <div className="space-y-4">
        <h3 className="font-semibold">Daily Schedule</h3>
        {plan.days.map(day => (
          <Card
            key={day.day}
            className={`p-4 ${
              day.day === 'Saturday' ? 'bg-amber-500/10 border-amber-500/30' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">{day.day}</h4>
              {day.school_time && (
                <span className="text-sm text-muted-foreground">
                  School: {day.school_time.from} - {day.school_time.to}
                </span>
              )}
            </div>
            
            {day.study_sessions && day.study_sessions.length > 0 ? (
              <div className="grid gap-2">
                {day.study_sessions.map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        SUBJECT_COLORS[session.subject] || 'bg-gray-500'
                      }`}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{session.subject}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {session.from} - {session.to}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No study sessions - enjoy your free time!
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
