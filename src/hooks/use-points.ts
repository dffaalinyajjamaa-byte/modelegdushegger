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
      const { data, error } = await supabase
        .from('user_rankings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      // If no ranking exists, create one
      if (!data) {
        const { data: newRanking, error: insertError } = await supabase
          .from('user_rankings')
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        return newRanking;
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
