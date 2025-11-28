import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from './use-points';
import { useToast } from './use-toast';

export interface VideoProgress {
  id?: string;
  user_id?: string;
  content_id: string;
  playback_time: number;
  total_duration: number | null;
  percentage_watched: number;
  completed: boolean;
  points_awarded?: boolean;
  last_watched_at?: string;
  created_at?: string;
}

export const useVideoProgress = (userId: string, contentId: string) => {
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { awardPoints } = usePoints();
  const { toast } = useToast();

  useEffect(() => {
    fetchProgress();
  }, [contentId]);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProgress(data || null);
    } catch (error) {
      console.error('Error fetching video progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (
    playbackTime: number,
    totalDuration: number | null
  ) => {
    try {
      const percentageWatched = totalDuration
        ? Math.min(Math.round((playbackTime / totalDuration) * 100), 100)
        : 0;

      const completed = percentageWatched >= 90;

      const progressData = {
        user_id: userId,
        content_id: contentId,
        playback_time: playbackTime,
        total_duration: totalDuration,
        percentage_watched: percentageWatched,
        completed,
        points_awarded: progress?.points_awarded || false,
      };

      const { data, error } = await supabase
        .from('video_progress')
        .upsert(progressData, {
          onConflict: 'user_id,content_id',
        })
        .select()
        .single();

      if (error) throw error;

      setProgress(data);

      // Award points at 90% completion (once)
      if (
        completed &&
        !progress?.points_awarded &&
        !(data as any).points_awarded
      ) {
        await awardPoints(userId, 10, 'video_completed');
        
        // Update points_awarded flag
        const { data: updatedData } = await supabase
          .from('video_progress')
          .update({ points_awarded: true } as any)
          .eq('user_id', userId)
          .eq('content_id', contentId)
          .select()
          .single();

        if (updatedData) {
          setProgress(updatedData as VideoProgress);
        }

        toast({
          title: '🎉 Points Earned!',
          description: 'You earned 10 points for completing this video!',
        });
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  return {
    progress,
    loading,
    updateProgress,
    refetch: fetchProgress,
  };
};

export const useAllVideoProgress = (userId: string) => {
  const [progressMap, setProgressMap] = useState<Record<string, VideoProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllProgress();
  }, [userId]);

  const fetchAllProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const map: Record<string, VideoProgress> = {};
      data?.forEach((item: any) => {
        map[item.content_id] = item as VideoProgress;
      });
      
      setProgressMap(map);
    } catch (error) {
      console.error('Error fetching all video progress:', error);
    } finally {
      setLoading(false);
    }
  };

  return { progressMap, loading, refetch: fetchAllProgress };
};
