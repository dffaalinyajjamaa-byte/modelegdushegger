import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Play, Clock, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Track {
  id: string;
  title: string;
  audioUrl: string | null;
  lyricsText: string;
  subject: string;
  grade: string;
  musicStyle: string;
  status: string;
  timesPlayed: number;
  createdAt: string;
  suggestions?: {
    best_listening_time: string;
    recommended_repeats: number;
    memory_tip: string;
    quiz_suggestion: string;
    next_action: string;
  };
}

interface MyMusicLibraryProps {
  userId: string;
  onTrackSelect: (track: Track) => void;
}

const styleIcons: Record<string, string> = {
  calm: '🎹',
  lofi: '🎧',
  hiphop: '🎤',
  traditional: '🪘',
  instrumental: '🎼',
};

const styleColors: Record<string, string> = {
  calm: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  lofi: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  hiphop: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
  traditional: 'from-green-500/20 to-yellow-500/20 border-green-500/30',
  instrumental: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
};

export default function MyMusicLibrary({ userId, onTrackSelect }: MyMusicLibraryProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchTracks();
  }, [userId]);

  const fetchTracks = async () => {
    try {
      // Fetch tracks with lyrics
      const { data: tracksData, error: tracksError } = await supabase
        .from('study_music_tracks')
        .select(`
          id,
          title,
          audio_url,
          subject,
          grade,
          music_style,
          status,
          times_played,
          created_at,
          lyrics_id
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Fetch lyrics for each track
      const tracksWithLyrics = await Promise.all(
        (tracksData || []).map(async (track) => {
          const { data: lyricsData } = await supabase
            .from('study_music_lyrics')
            .select('lyrics_text')
            .eq('id', track.lyrics_id)
            .single();

          const { data: suggestionsData } = await supabase
            .from('study_music_suggestions')
            .select('*')
            .eq('track_id', track.id)
            .single();

          return {
            id: track.id,
            title: track.title || 'Untitled',
            audioUrl: track.audio_url,
            lyricsText: lyricsData?.lyrics_text || '',
            subject: track.subject || '',
            grade: track.grade || '',
            musicStyle: track.music_style,
            status: track.status,
            timesPlayed: track.times_played || 0,
            createdAt: track.created_at,
            suggestions: suggestionsData ? {
              best_listening_time: suggestionsData.best_listening_time,
              recommended_repeats: suggestionsData.recommended_repeats,
              memory_tip: suggestionsData.memory_tip,
              quiz_suggestion: suggestionsData.quiz_suggestion,
              next_action: suggestionsData.next_action
            } : undefined
          };
        })
      );

      setTracks(tracksWithLyrics);
      
      // Extract unique subjects
      const uniqueSubjects = [...new Set(tracksWithLyrics.map(t => t.subject).filter(Boolean))];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTracks = filterSubject === 'all'
    ? tracks
    : tracks.filter(t => t.subject === filterSubject);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your music...</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Music Yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Create your first study song by uploading a PDF and generating music!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Track Grid */}
      <div className="grid gap-4">
        {filteredTracks.map((track, index) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2 bg-gradient-to-br ${
                styleColors[track.musicStyle] || styleColors.calm
              }`}
              onClick={() => onTrackSelect(track)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-2xl">
                  {styleIcons[track.musicStyle] || '🎵'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{track.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{track.subject || 'General'}</span>
                    <span>•</span>
                    <span>{track.grade || 'All Grades'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {track.timesPlayed} plays
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(track.createdAt)}
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="flex-shrink-0"
                  disabled={track.status !== 'completed'}
                >
                  {track.status === 'completed' ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              </div>
              
              {track.status !== 'completed' && (
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  {track.status === 'processing' && 'Still generating...'}
                  {track.status === 'pending' && 'Waiting to generate...'}
                  {track.status === 'failed' && 'Generation failed'}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}