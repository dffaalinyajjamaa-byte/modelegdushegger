import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useStreak = (userId: string | undefined) => {
  const [streak, setStreak] = useState({
    current: 0,
    longest: 0,
    lastActivity: null as Date | null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetchStreak();

    // Subscribe to changes
    const channel = supabase
      .channel(`streak-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_rankings',
          filter: `user_id=eq.${userId}`
        },
        () => fetchStreak()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchStreak = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_rankings')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStreak({
          current: data.current_streak || 0,
          longest: data.longest_streak || 0,
          lastActivity: data.last_activity_date ? new Date(data.last_activity_date) : null
        });
      } else {
        // Create initial ranking
        const { error: insertError } = await supabase
          .from('user_rankings')
          .insert({ user_id: userId });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async () => {
    if (!userId) return;

    try {
      await supabase.rpc('update_user_streak', {
        p_user_id: userId
      });
      
      await fetchStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  return {
    streak,
    loading,
    updateStreak,
    refetch: fetchStreak
  };
};
