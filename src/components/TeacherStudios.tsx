import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, FileText, Video, Bell, ClipboardList, Crown, Star, Eye, Clock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TeacherStudiosProps {
  user: User;
  onBack: () => void;
}

interface TeacherUpload {
  id: string;
  teacher_id: string;
  teacher_name: string;
  school: string | null;
  type: string;
  title: string;
  description: string | null;
  file_url: string | null;
  content_data: any;
  grade_level: string | null;
  subject: string | null;
  views_count: number;
  created_at: string;
}

interface TopStudent {
  user_id: string;
  full_name: string;
  total_points: number;
  rank: number;
}

const uploadTypes = [
  { id: 'quiz', name: 'Quiz', icon: ClipboardList, color: 'text-orange-500' },
  { id: 'worksheet', name: 'Worksheet', icon: FileText, color: 'text-blue-500' },
  { id: 'announcement', name: 'Announcement', icon: Bell, color: 'text-yellow-500' },
  { id: 'video', name: 'Video', icon: Video, color: 'text-purple-500' },
];

const grades = ['Grade 6', 'Grade 8'];
const subjects = ['Mathematics', 'English', 'Afaan Oromoo', 'Amharic', 'Science', 'Social Studies', 'Civics', 'HPE'];

export default function TeacherStudios({ user, onBack }: TeacherStudiosProps) {
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<TeacherUpload[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  // Form state for teachers
  const [uploadType, setUploadType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchUploads();
    fetchTopStudents();
    fetchProfile();

    // Set up real-time subscription for new uploads
    const channel = supabase
      .channel('teacher_uploads_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_uploads',
        },
        (payload) => {
          setUploads(prev => [payload.new as TeacherUpload, ...prev]);
          toast({
            title: "New Content Added!",
            description: `A teacher just uploaded: ${(payload.new as TeacherUpload).title}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .maybeSingle();

      setIsTeacher(!!data);
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  const fetchTopStudents = async () => {
    try {
      // Get top 3 students by points
      const { data: rankings } = await supabase
        .from('user_rankings')
        .select('user_id, total_points, rank')
        .order('total_points', { ascending: false })
        .limit(3);

      if (rankings && rankings.length > 0) {
        // Get profiles for these users
        const userIds = rankings.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const studentsWithNames = rankings.map((r, index) => ({
          ...r,
          full_name: profiles?.find(p => p.user_id === r.user_id)?.full_name || 'Unknown',
          rank: index + 1,
        }));

        setTopStudents(studentsWithNames);
      }
    } catch (error) {
      console.error('Error fetching top students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTeacher) return;

    if (!uploadType || !title) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('teacher_uploads')
        .insert({
          teacher_id: user.id,
          teacher_name: profile?.full_name || 'Anonymous Teacher',
          school: profile?.school_name,
          type: uploadType,
          title,
          description,
          file_url: fileUrl || null,
          grade_level: gradeLevel || null,
          subject: subject || null,
        });

      if (error) throw error;

      toast({
        title: "Upload Successful!",
        description: "Your content has been shared with students.",
      });

      // Reset form
      setUploadType('');
      setTitle('');
      setDescription('');
      setFileUrl('');
      setGradeLevel('');
      setSubject('');
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Unable to upload content.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const uploadType = uploadTypes.find(t => t.id === type);
    if (uploadType) {
      const Icon = uploadType.icon;
      return <Icon className={`w-5 h-5 ${uploadType.color}`} />;
    }
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <h1 className="text-xl font-bold">Teacher Studios</h1>
            </div>
          </div>
          {isTeacher && (
            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
              <Crown className="w-3 h-3 mr-1" />
              Verified Teacher
            </Badge>
          )}
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Top Students Banner */}
        {topStudents.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" />
                Top Students
              </h3>
              <div className="flex gap-4 overflow-x-auto">
                {topStudents.map((student, index) => (
                  <div key={student.user_id} className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-1">
                        {student.full_name}
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-xs">
                          💙
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">{student.total_points} points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher Upload Section */}
        {isTeacher && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-yellow-500" />
                Share Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type *</Label>
                    <Select value={uploadType} onValueChange={setUploadType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`w-4 h-4 ${type.color}`} />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade Level</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subj => (
                          <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the content..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>File URL (Google Drive, YouTube, etc.)</Label>
                  <Input
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Share with Students
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Content Feed */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Latest Content
          </h2>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="announcement">News</TabsTrigger>
            </TabsList>

            {['all', 'quiz', 'worksheet', 'video', 'announcement'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                <AnimatePresence mode="popLayout">
                  {uploads
                    .filter(upload => tab === 'all' || upload.type === tab)
                    .map((upload, index) => (
                      <motion.div
                        key={upload.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-lg bg-muted">
                                {getTypeIcon(upload.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">{upload.title}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {upload.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {upload.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" />
                                    {upload.teacher_name}
                                    <Crown className="w-3 h-3 text-yellow-500" />
                                  </span>
                                  {upload.grade_level && (
                                    <Badge variant="secondary" className="text-xs">
                                      {upload.grade_level}
                                    </Badge>
                                  )}
                                  {upload.subject && (
                                    <Badge variant="secondary" className="text-xs">
                                      {upload.subject}
                                    </Badge>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(upload.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                              </div>
                              {upload.file_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(upload.file_url!, '_blank')}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </AnimatePresence>

                {uploads.filter(upload => tab === 'all' || upload.type === tab).length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Content Yet</h3>
                    <p className="text-muted-foreground">
                      {isTeacher ? "Be the first to share content!" : "Teachers will share content soon!"}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
