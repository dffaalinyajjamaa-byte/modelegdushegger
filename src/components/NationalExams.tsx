import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, BookOpen, ArrowLeft, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useContentPoints } from '@/hooks/use-content-points';
import { motion, AnimatePresence } from 'framer-motion';
import PDFViewer from './PDFViewer';

interface NationalExamsProps {
  user: User;
  onBack: () => void;
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

const subjectColors: { [key: string]: { gradient: string; border: string } } = {
  'Afaan Ingiliffaa': { gradient: 'from-blue-500/20 to-blue-900/30', border: 'border-blue-500/30 hover:border-blue-500/60' },
  'Afaan Oromoo': { gradient: 'from-green-500/20 to-green-900/30', border: 'border-green-500/30 hover:border-green-500/60' },
  'Hawaasa': { gradient: 'from-purple-500/20 to-purple-900/30', border: 'border-purple-500/30 hover:border-purple-500/60' },
  'Saayinsii Waliigalaa': { gradient: 'from-red-500/20 to-red-900/30', border: 'border-red-500/30 hover:border-red-500/60' },
  'Herrega': { gradient: 'from-orange-500/20 to-orange-900/30', border: 'border-orange-500/30 hover:border-orange-500/60' },
  'Lammummaa': { gradient: 'from-cyan-500/20 to-cyan-900/30', border: 'border-cyan-500/30 hover:border-cyan-500/60' },
  'English': { gradient: 'from-indigo-500/20 to-indigo-900/30', border: 'border-indigo-500/30 hover:border-indigo-500/60' },
};

const subjectIcons: { [key: string]: string } = {
  'Afaan Ingiliffaa': '🇬🇧',
  'Afaan Oromoo': '📚',
  'Hawaasa': '🌍',
  'Saayinsii Waliigalaa': '🔬',
  'Herrega': '📐',
  'Lammummaa': '⚖️',
  'English': '🇬🇧',
};

// Extract Google Drive file ID from URL
const extractFileId = (url: string): string => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
};

export default function NationalExams({ user, onBack }: NationalExamsProps) {
  const [exams, setExams] = useState<NationalExam[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<NationalExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGrade, setUserGrade] = useState<string | null>(null);
  const { toast } = useToast();
  const { awardPointsForContent } = useContentPoints();

  useEffect(() => {
    fetchUserGrade();
  }, [user.id]);

  useEffect(() => {
    if (userGrade !== null) {
      fetchSubjects();
    }
  }, [userGrade]);

  useEffect(() => {
    if (selectedSubject) {
      fetchExamsBySubject();
    }
  }, [selectedSubject]);

  const fetchUserGrade = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('grade')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserGrade(data?.grade || null);
    } catch (error) {
      console.error('Error fetching user grade:', error);
      setUserGrade(null);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      
      // Build query - filter by grade if user has a grade set
      let query = supabase
        .from('national_exams')
        .select('subject, description')
        .order('subject');

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter exams by user's grade level (e.g., "Grade 6" users shouldn't see "Grade 8" exams)
      const filteredData = data?.filter(exam => {
        if (!userGrade) return true; // Show all if no grade set
        
        const gradeNum = userGrade.replace(/\D/g, ''); // Extract number from "Grade 6"
        const examDesc = exam.description?.toLowerCase() || '';
        
        // If exam description mentions a specific grade, check if it matches user's grade
        if (examDesc.includes('grade 8') && gradeNum !== '8') return false;
        if (examDesc.includes('grade 6') && gradeNum !== '6') return false;
        
        return true;
      });
      
      // Get unique subjects from filtered exams
      const uniqueSubjects = Array.from(new Set(filteredData?.map(e => e.subject) || []));
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExamsBySubject = async () => {
    if (!selectedSubject) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('national_exams')
        .select('*')
        .eq('subject', selectedSubject)
        .order('year', { ascending: false });

      if (error) throw error;
      
      // Filter exams by user's grade level
      const filteredExams = data?.filter(exam => {
        if (!userGrade) return true;
        
        const gradeNum = userGrade.replace(/\D/g, '');
        const examDesc = exam.description?.toLowerCase() || '';
        
        if (examDesc.includes('grade 8') && gradeNum !== '8') return false;
        if (examDesc.includes('grade 6') && gradeNum !== '6') return false;
        
        return true;
      });
      
      setExams(filteredExams || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedExam) {
      setSelectedExam(null);
    } else if (selectedSubject) {
      setSelectedSubject(null);
      setExams([]);
    } else {
      onBack();
    }
  };

  const getTitle = () => {
    if (selectedExam) return selectedExam.title;
    if (selectedSubject) return selectedSubject;
    return 'National Exams';
  };

  // If viewing a PDF
  if (selectedExam) {
    return (
      <PDFViewer
        content={{
          id: selectedExam.id,
          title: selectedExam.title,
          description: selectedExam.description || '',
          type: 'pdf',
          url: selectedExam.pdf_url,
          grade_level: 'Grade 6',
          subject: selectedExam.subject
        }}
        user={user}
        onBack={() => setSelectedExam(null)}
        onLogActivity={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{getTitle()}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <AnimatePresence mode="wait">
          {/* Subject Selection */}
          {!selectedSubject && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <FileText className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">Practice National Exams</h2>
                <p className="text-muted-foreground">Choose a subject to start practicing</p>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="h-32 animate-pulse bg-muted" />
                  ))}
                </div>
              ) : subjects.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No exams available</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {subjects.map((subject, index) => {
                    const colors = subjectColors[subject] || { gradient: 'from-gray-500/20 to-gray-900/30', border: 'border-gray-500/30 hover:border-gray-500/60' };
                    const icon = subjectIcons[subject] || '📖';
                    
                    return (
                      <motion.button
                        key={subject}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedSubject(subject)}
                        className={`group bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow`}
                      >
                        <span className="text-4xl block mb-3">{icon}</span>
                        <h3 className="font-semibold text-sm">{subject}</h3>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Exam List by Subject */}
          {selectedSubject && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <p className="text-muted-foreground">Select an exam to practice</p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="h-48 animate-pulse bg-muted" />
                  ))}
                </div>
              ) : exams.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No exams available for {selectedSubject}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exams.map((exam, index) => {
                    const fileId = extractFileId(exam.pdf_url);
                    const colors = subjectColors[exam.subject] || { gradient: 'from-gray-500/20 to-gray-900/30', border: 'border-gray-500/30' };

                    return (
                      <motion.div
                        key={exam.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group overflow-hidden"
                          onClick={() => {
                            awardPointsForContent(user.id, 'exam', exam.id);
                            setSelectedExam(exam);
                          }}
                        >
                          {/* PDF Preview/Cover */}
                          <div className={`relative h-40 bg-gradient-to-br ${colors.gradient} flex items-center justify-center overflow-hidden`}>
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
                                Open Exam
                              </Button>
                            </div>
                          </div>

                          {/* Card Content */}
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                              {exam.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {exam.year}
                              </Badge>
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}