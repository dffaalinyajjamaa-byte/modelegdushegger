import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  user_id: string;
  is_typing: boolean;
}

export function useTypingIndicator(chatId: string | null, currentUserId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`typing:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const data = payload.new as TypingUser;
          if (data && data.user_id !== currentUserId) {
            if (data.is_typing) {
              setTypingUsers(prev => 
                prev.includes(data.user_id) ? prev : [...prev, data.user_id]
              );
            } else {
              setTypingUsers(prev => prev.filter(id => id !== data.user_id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId]);

  // Update typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!chatId || isTypingRef.current === isTyping) return;
    
    isTypingRef.current = isTyping;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          chat_id: chatId,
          user_id: currentUserId,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'chat_id,user_id'
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [chatId, currentUserId]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    setTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing when message is sent
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (chatId) {
        setTyping(false);
      }
    };
  }, [chatId, setTyping]);

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
}
