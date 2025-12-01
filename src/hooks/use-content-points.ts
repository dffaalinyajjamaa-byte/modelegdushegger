import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useContentPoints = () => {
  const { toast } = useToast();

  const awardPointsForContent = async (userId: string, contentType: 'video' | 'book' | 'exam', contentId: string) => {
    const pointsMap = {
      video: 50,
      book: 30,
      exam: 60,
    };

    const points = pointsMap[contentType];

    try {
      // Check if already awarded for this content
      const { data: existing } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', `${contentType}_opened`)
        .eq('title', contentId)
        .single();

      if (existing) {
        return; // Already awarded points
      }

      // Award points
      await supabase.rpc('award_points', {
        p_user_id: userId,
        p_points: points,
        p_activity_type: `${contentType}_opened`,
      });

      // Log activity
      await supabase.from('user_activity_log').insert({
        user_id: userId,
        activity_type: `${contentType}_opened`,
        title: contentId,
        start_time: new Date().toISOString(),
      });

      toast({
        title: `+${points} Points!`,
        description: `You earned ${points} points for opening this ${contentType}`,
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  return { awardPointsForContent };
};
