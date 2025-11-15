import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Beaker, Calculator, Globe, Brain, Microscope } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SubjectProgress {
  subject: string;
  duration_minutes: number;
  icon: JSX.Element;
  color: string;
}

interface SubjectProgressCardsProps {
  userId: string;
}

const SUBJECT_CONFIG: Record<string, { icon: JSX.Element; color: string }> = {
  'Afaan Oromoo': { icon: <BookOpen className="w-6 h-6" />, color: 'blue' },
  'Herrega (History)': { icon: <Globe className="w-6 h-6" />, color: 'blue' },
  'Saayinsii (Science)': { icon: <Beaker className="w-6 h-6" />, color: 'blue' },
  'Herreega Uumamaa (Biology)': { icon: <Microscope className="w-6 h-6" />, color: 'pink' },
  'Mathematics': { icon: <Calculator className="w-6 h-6" />, color: 'blue' },
  'English': { icon: <BookOpen className="w-6 h-6" />, color: 'blue' },
  'Default': { icon: <Brain className="w-6 h-6" />, color: 'blue' }
};

const SubjectProgressCards = ({ userId }: SubjectProgressCardsProps) => {
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectProgress();
  }, [userId]);

  const fetchSubjectProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('subject, duration_minutes')
        .eq('user_id', userId)
        .not('subject', 'is', null);

      if (error) throw error;

      // Aggregate by subject
      const subjectMap = new Map<string, number>();
      data?.forEach(activity => {
        const current = subjectMap.get(activity.subject) || 0;
        subjectMap.set(activity.subject, current + (activity.duration_minutes || 0));
      });

      const progressData: SubjectProgress[] = Array.from(subjectMap.entries())
        .map(([subject, duration]) => {
          const config = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG['Default'];
          return {
            subject,
            duration_minutes: duration,
            icon: config.icon,
            color: config.color
          };
        })
        .sort((a, b) => b.duration_minutes - a.duration_minutes)
        .slice(0, 8);

      setSubjects(progressData);
    } catch (error) {
      console.error('Error fetching subject progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="subject-grid">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="subject-card subject-card-blue animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="subject-grid">
        {['Afaan Oromoo', 'Saayinsii (Science)', 'Mathematics', 'English'].map((subject) => {
          const config = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG['Default'];
          return (
            <Card key={subject} className={`subject-card subject-card-${config.color}`}>
              <div className="subject-card-icon">{config.icon}</div>
              <div className="subject-card-content">
                <h3 className="subject-card-title">{subject}</h3>
                <p className="subject-card-time">0h 0m</p>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="subject-grid">
      {subjects.map((subject) => (
        <Card 
          key={subject.subject} 
          className={`subject-card subject-card-${subject.color} hover-scale cursor-pointer`}
        >
          <div className="subject-card-icon">{subject.icon}</div>
          <div className="subject-card-content">
            <h3 className="subject-card-title">{subject.subject}</h3>
            <p className="subject-card-time">{formatDuration(subject.duration_minutes)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SubjectProgressCards;
