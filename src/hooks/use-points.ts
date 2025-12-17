import { supabase } from '@/integrations/supabase/client';

export const usePoints = () => {
  const awardPoints = async (userId: string, points: number, activityType: string) => {
    try {
      // Call the database function to award points
      const { error } = await supabase.rpc('award_points', {
        p_user_id: userId,
        p_points: points,
        p_activity_type: activityType
      });

      if (error) throw error;

      // Update rankings
      await supabase.rpc('update_rankings');

      return { success: true };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, error };
    }
  };

  const getUserRanking = async (userId: string) => {
    try {
      // Use upsert to handle race conditions
      const { data, error } = await supabase
        .from('user_rankings')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Error with user ranking:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user ranking:', error);
      return null;
    }
  };

  return {
    awardPoints,
    getUserRanking
  };
};
