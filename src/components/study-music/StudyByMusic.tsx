import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Music, Library, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import MusicUploadCard from './MusicUploadCard';
import LanguageSelector from './LanguageSelector';
import MusicStyleSelector from './MusicStyleSelector';
import GenerateButton from './GenerateButton';
import MusicPlayer from './MusicPlayer';
import AISuggestionCard from './AISuggestionCard';
import MyMusicLibrary from './MyMusicLibrary';

interface StudyByMusicProps {
  user: User;
  onBack: () => void;
}

type Language = 'om' | 'am' | 'en';
type MusicStyle = 'calm' | 'lofi' | 'hiphop' | 'traditional' | 'instrumental';

interface GeneratedTrack {
  id: string;
  title: string;
  audioUrl: string | null;
  lyricsText: string;
  subject: string;
  grade: string;
  musicStyle: string;
  status: string;
  suggestions?: {
    best_listening_time: string;
    recommended_repeats: number;
    memory_tip: string;
    quiz_suggestion: string;
    next_action: string;
  };
}

export default function StudyByMusic({ user, onBack }: StudyByMusicProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedStyle, setSelectedStyle] = useState<MusicStyle>('calm');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  
  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'extracting' | 'lyrics' | 'music' | 'suggestions'>('idle');
  const [generatedTrack, setGeneratedTrack] = useState<GeneratedTrack | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Load user profile for grade
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('grade')
        .eq('user_id', user.id)
        .single();
      
      if (data?.grade) {
        setGrade(data.grade);
      }
    };
    loadProfile();
  }, [user.id]);

  // Poll for music status with proper cleanup
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const pollStatus = async () => {
      if (!taskId || !generatedTrack?.id) return;

      try {
        console.log('Polling music status for taskId:', taskId);
        const { data, error } = await supabase.functions.invoke('check-music-status', {
          body: { taskId, trackId: generatedTrack.id }
        });

        if (error) throw error;
        if (!isMounted) return;

        console.log('Poll result:', data.status);

        if (data.status === 'completed' && data.audioUrl) {
          // Clear interval and reset task
          if (intervalId) clearInterval(intervalId);
          setTaskId(null);
          setGenerationStep('suggestions');
          
          // Generate AI suggestions
          const { data: suggestionsData } = await supabase.functions.invoke('generate-study-suggestions', {
            body: {
              trackId: generatedTrack.id,
              lyricsText: generatedTrack.lyricsText,
              subject,
              language: selectedLanguage
            }
          });

          if (isMounted) {
            setGeneratedTrack(prev => prev ? {
              ...prev,
              audioUrl: data.audioUrl,
              status: 'completed',
              suggestions: suggestionsData?.suggestions
            } : null);
            
            setIsGenerating(false);
            setGenerationStep('idle');
            toast.success('Your study music is ready! 🎵');
          }
        } else if (data.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
          if (isMounted) {
            setTaskId(null);
            setIsGenerating(false);
            setGenerationStep('idle');
            toast.error('Music generation failed. Please try again.');
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    };

    if (taskId && generatedTrack?.id) {
      // Initial poll after a short delay
      const initialTimeout = setTimeout(pollStatus, 5000);
      
      // Then poll every 30 seconds (Suno takes time to generate)
      intervalId = setInterval(pollStatus, 30000);

      return () => {
        isMounted = false;
        clearTimeout(initialTimeout);
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [taskId, generatedTrack?.id, generatedTrack?.lyricsText, subject, selectedLanguage]);

  const handleGenerate = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF first');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('extracting');

    try {
      // Step 1: Extract text from PDF
      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-pdf-text', {
        body: { fileUrl: uploadedFile.url }
      });

      if (extractError || !extractData?.extractedText) {
        throw new Error(extractError?.message || 'Failed to extract text');
      }

      setGenerationStep('lyrics');

      // Step 2: Generate lyrics
      const { data: lyricsData, error: lyricsError } = await supabase.functions.invoke('generate-study-lyrics', {
        body: {
          extractedText: extractData.extractedText,
          language: selectedLanguage,
          musicStyle: selectedStyle,
          subject,
          title: uploadedFile.name.replace('.pdf', '')
        }
      });

      if (lyricsError || !lyricsData?.lyricsText) {
        throw new Error(lyricsError?.message || 'Failed to generate lyrics');
      }

      // Step 3: Create upload record
      const { data: uploadRecord, error: uploadError } = await supabase
        .from('study_music_uploads')
        .insert({
          user_id: user.id,
          file_url: uploadedFile.url,
          file_name: uploadedFile.name,
          subject,
          grade,
          extracted_text: extractData.extractedText
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Step 4: Create lyrics record
      const { data: lyricsRecord, error: lyricsRecordError } = await supabase
        .from('study_music_lyrics')
        .insert({
          upload_id: uploadRecord.id,
          language: selectedLanguage,
          lyrics_text: lyricsData.lyricsText
        })
        .select()
        .single();

      if (lyricsRecordError) throw lyricsRecordError;

      // Step 5: Create track record
      const trackTitle = lyricsData.suggestedTitle || `Study: ${subject || uploadedFile.name.replace('.pdf', '')}`;
      
      const { data: trackRecord, error: trackError } = await supabase
        .from('study_music_tracks')
        .insert({
          lyrics_id: lyricsRecord.id,
          user_id: user.id,
          music_style: selectedStyle,
          title: trackTitle,
          subject,
          grade,
          status: 'pending'
        })
        .select()
        .single();

      if (trackError) throw trackError;

      setGeneratedTrack({
        id: trackRecord.id,
        title: trackTitle,
        audioUrl: null,
        lyricsText: lyricsData.lyricsText,
        subject,
        grade,
        musicStyle: selectedStyle,
        status: 'pending'
      });

      setGenerationStep('music');

      // Step 6: Generate music
      const { data: musicData, error: musicError } = await supabase.functions.invoke('generate-study-music', {
        body: {
          lyricsText: lyricsData.lyricsText,
          musicStyle: selectedStyle,
          title: trackTitle,
          trackId: trackRecord.id,
          userId: user.id
        }
      });

      if (musicError || !musicData?.taskId) {
        throw new Error(musicError?.message || 'Failed to start music generation');
      }

      setTaskId(musicData.taskId);
      toast.info('Music is being generated. This may take 1-3 minutes...');

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
      setIsGenerating(false);
      setGenerationStep('idle');
    }
  };

  const handleTrackSelect = (track: GeneratedTrack) => {
    setGeneratedTrack(track);
    setActiveTab('create');
  };

  const resetGeneration = () => {
    setUploadedFile(null);
    setGeneratedTrack(null);
    setTaskId(null);
    setGenerationStep('idle');
    setIsGenerating(false);
    setSubject('');
  };

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
              <Music className="h-6 w-6 text-pink-500" />
              <h1 className="text-xl font-bold">Study by Music</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'library')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              My Music
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {!generatedTrack?.audioUrl ? (
                <>
                  {/* Upload Card */}
                  <MusicUploadCard
                    userId={user.id}
                    uploadedFile={uploadedFile}
                    onFileUploaded={setUploadedFile}
                    subject={subject}
                    onSubjectChange={setSubject}
                    grade={grade}
                    onGradeChange={setGrade}
                    disabled={isGenerating}
                  />

                  {/* Language Selector */}
                  <LanguageSelector
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    disabled={isGenerating}
                  />

                  {/* Music Style Selector */}
                  <MusicStyleSelector
                    selectedStyle={selectedStyle}
                    onStyleChange={setSelectedStyle}
                    disabled={isGenerating}
                  />

                  {/* Generate Button */}
                  <GenerateButton
                    isGenerating={isGenerating}
                    generationStep={generationStep}
                    disabled={!uploadedFile}
                    onGenerate={handleGenerate}
                  />
                </>
              ) : (
                <>
                  {/* Music Player */}
                  <MusicPlayer
                    track={generatedTrack}
                    onClose={resetGeneration}
                  />

                  {/* AI Suggestions */}
                  {generatedTrack.suggestions && (
                    <AISuggestionCard suggestions={generatedTrack.suggestions} />
                  )}

                  {/* Create Another Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={resetGeneration}
                  >
                    Create Another Study Song
                  </Button>
                </>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="library">
            <MyMusicLibrary
              userId={user.id}
              onTrackSelect={handleTrackSelect}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}