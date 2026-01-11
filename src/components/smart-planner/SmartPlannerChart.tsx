import { Card } from '@/components/ui/card';
import { SmartPlan } from '../SmartPlanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SmartPlannerChartProps {
  plan: SmartPlan;
}

const SUBJECT_COLORS: Record<string, string> = {
  'Afaan Oromo': '#22c55e',
  'Afaan Amaaraa': '#eab308',
  'English': '#3b82f6',
  'Herrega': '#f97316',
  'Herrega (Math)': '#f97316',
  'Saayinsii': '#06b6d4',
  'Saayinsii (Science)': '#06b6d4',
  'Gadaa': '#a855f7',
  'Lammummaa / Safuu': '#ec4899',
  'Hawaasa': '#6366f1',
  'Hawaasa (Social)': '#6366f1',
  'Revision': '#6b7280',
};

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const getSessionDuration = (from: string, to: string): number => {
  const fromMin = timeToMinutes(from);
  const toMin = timeToMinutes(to);
  return Math.max(0, toMin - fromMin);
};

export default function SmartPlannerChart({ plan }: SmartPlannerChartProps) {
  // Calculate subject distribution across the week
  const subjectTotals: Record<string, number> = {};
  
  plan.days.forEach(day => {
    day.study_sessions?.forEach(session => {
      const duration = getSessionDuration(session.from, session.to);
      subjectTotals[session.subject] = (subjectTotals[session.subject] || 0) + duration;
    });
  });

  const barChartData = Object.entries(subjectTotals).map(([subject, minutes]) => ({
    subject: subject.length > 12 ? subject.substring(0, 12) + '...' : subject,
    fullSubject: subject,
    minutes,
    hours: Math.round(minutes / 60 * 10) / 10,
    fill: SUBJECT_COLORS[subject] || '#6b7280',
  }));

  // Timeline data for visual representation
  const timelineData = plan.days.map(day => {
    const dayData: Record<string, string | number> = { day: day.day };
    
    day.study_sessions?.forEach(session => {
      const duration = getSessionDuration(session.from, session.to);
      dayData[session.subject] = ((dayData[session.subject] as number) || 0) + duration;
    });
    
    return dayData;
  });

  // Get all unique subjects for the stacked bar chart
  const allSubjects = [...new Set(
    plan.days.flatMap(day => 
      day.study_sessions?.map(s => s.subject) || []
    )
  )];

  return (
    <div className="space-y-6">
      {/* Weekly Timeline Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Weekly Study Distribution</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${Math.round(value / 60)}h`}
              />
              <YAxis 
                type="category" 
                dataKey="day" 
                width={80}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${Math.round(value)} min`, 
                  name
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {allSubjects.map(subject => (
                <Bar
                  key={subject}
                  dataKey={subject}
                  stackId="a"
                  fill={SUBJECT_COLORS[subject] || '#6b7280'}
                  radius={[0, 4, 4, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Subject Hours Bar Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Total Hours by Subject</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="subject" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${props.payload.hours} hours (${props.payload.minutes} min)`, 
                  props.payload.fullSubject
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="hours" 
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              >
                {barChartData.map((entry, index) => (
                  <rect
                    key={`bar-${index}`}
                    fill={entry.fill}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Color Legend */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Subject Colors</h4>
        <div className="flex flex-wrap gap-3">
          {allSubjects.map(subject => (
            <div key={subject} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: SUBJECT_COLORS[subject] || '#6b7280' }}
              />
              <span className="text-sm text-muted-foreground">{subject}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
