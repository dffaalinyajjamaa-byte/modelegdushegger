import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NationalExamsProps {
  user: User;
  onExamClick: (exam: NationalExam) => void;
}

interface NationalExam {
  id: string;
  title: string;
  subject: string;
  year: number;
  pdf_url: string;
  cover_image_url: string | null;
  description: string | null;
}

const subjectColors: { [key: string]: string } = {
  'Afaan Ingiliffaa': 'from-blue-500/20 to-blue-900/30',
  'Afaan Oromoo': 'from-green-500/20 to-green-900/30',
  'Hawaasa': 'from-purple-500/20 to-purple-900/30',
  'Saayinsii Waliigalaa': 'from-red-500/20 to-red-900/30',
  'Herrega': 'from-orange-500/20 to-orange-900/30',
  'Lammummaa': 'from-cyan-500/20 to-cyan-900/30',
};

// Extract Google Drive file ID from URL
const extractFileId = (url: string): string => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
};

export default function NationalExams({ user, onExamClick }: NationalExamsProps) {
  const [exams, setExams] = useState<NationalExam[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2017);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNationalExams();
  }, [selectedYear]);

  const fetchNationalExams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('national_exams')
        .select('*')
        .eq('year', selectedYear)
        .order('subject');

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching national exams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load national exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableYears = [2016, 2017];

  return (
    <div className="space-y-4">
      {/* Year Selector */}
      <div className="flex items-center gap-2 justify-center">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <div className="flex gap-2">
          {availableYears.map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card className="glass-card p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No exams available for {selectedYear}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exams.map((exam) => {
            const fileId = extractFileId(exam.pdf_url);
            const gradientClass = subjectColors[exam.subject] || 'from-gray-500/20 to-gray-900/30';

            return (
              <Card
                key={exam.id}
                className="glass-card hover-scale cursor-pointer overflow-hidden group"
                onClick={() => onExamClick(exam)}
              >
                {/* PDF Preview/Cover */}
                <div className={`relative h-48 bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
                  {fileId ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${fileId}/preview`}
                      className="w-full h-full pointer-events-none"
                      title={exam.title}
                      loading="lazy"
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-white/50" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Open PDF
                    </Button>
                  </div>
                </div>

                {/* Card Content */}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                    {exam.subject}
                  </h3>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {exam.year}
                    </Badge>
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
