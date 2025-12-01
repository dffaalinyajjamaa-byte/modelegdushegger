import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble';
import { Send, X, ArrowLeft, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageThreadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootMessage: any;
  currentUser: User;
  users: any[];
  onSendReply: (content: string, replyToId: string) => Promise<void>;
}

interface ThreadMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  type: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: string | null;
  timestamp: string | null;
  seen_by: string[] | null;
  reply_to: string | null;
  thread_level: number;
}

export default function MessageThread({
  open,
  onOpenChange,
  rootMessage,
  currentUser,
  users,
  onSendReply,
}: MessageThreadProps) {
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && rootMessage) {
      fetchThread();
      
      // Subscribe to new replies in this thread
      const channel = supabase
        .channel(`thread_${rootMessage.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `reply_to=eq.${rootMessage.id}`,
        }, () => {
          fetchThread();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, rootMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchThread = async () => {
    if (!rootMessage) return;

    try {
      const { data, error } = await supabase.rpc('get_message_thread', {
        message_id: rootMessage.id,
      });

      if (error) throw error;
      
      // Map the response to match our interface
      const mappedMessages = (data || []).map((msg: any) => ({
        id: msg.msg_id,
        chat_id: msg.msg_chat_id,
        sender_id: msg.msg_sender_id,
        type: msg.msg_type,
        content: msg.msg_content,
        file_url: msg.msg_file_url,
        file_name: msg.msg_file_name,
        file_size: msg.msg_file_size,
        status: msg.msg_status,
        timestamp: msg.msg_timestamp,
        seen_by: msg.msg_seen_by,
        reply_to: msg.msg_reply_to,
        thread_level: msg.thread_level,
      }));
      
      setThreadMessages(mappedMessages);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast({
        title: 'Error loading thread',
        variant: 'destructive',
      });
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || loading) return;

    setLoading(true);
    try {
      await onSendReply(newReply, rootMessage.id);
      setNewReply('');
      await fetchThread();
    } catch (error) {
      toast({
        title: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSenderName = (senderId: string) => {
    const user = users.find(u => u.user_id === senderId);
    return user?.name || 'Unknown';
  };

  const replyCount = threadMessages.length - 1; // Subtract root message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Thread
              {replyCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({replyCount} {replyCount === 1 ? 'reply' : 'replies'})
                </span>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Thread Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {threadMessages.map((message, index) => {
              const isOwnMessage = message.sender_id === currentUser?.id;
              const sender = users.find(u => u.user_id === message.sender_id);
              const isRootMessage = index === 0;

              return (
                <div
                  key={message.id}
                  className={`${message.thread_level > 0 ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''}`}
                >
                  <ChatBubble variant={isOwnMessage ? "sent" : "received"}>
                    {!isOwnMessage && (
                      <ChatBubbleAvatar 
                        src={sender?.profile_pic || ''} 
                        fallback={sender?.name.charAt(0).toUpperCase() || 'U'}
                      />
                    )}
                    
                    <div className="flex flex-col gap-1 max-w-[70%]">
                      {!isOwnMessage && (
                        <span className="text-xs text-muted-foreground px-2">
                          {sender?.name}
                        </span>
                      )}
                      
                      <ChatBubbleMessage 
                        variant={isOwnMessage ? "sent" : "received"}
                        className={isRootMessage ? 'ring-2 ring-primary/50' : ''}
                      >
                        {isRootMessage && (
                          <div className="text-xs font-semibold mb-1 opacity-70">
                            Original Message
                          </div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(message.timestamp || '').toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </ChatBubbleMessage>
                    </div>

                    {isOwnMessage && (
                      <ChatBubbleAvatar 
                        src={sender?.profile_pic || ''} 
                        fallback={sender?.name.charAt(0).toUpperCase() || 'U'}
                      />
                    )}
                  </ChatBubble>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply Input */}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
              placeholder="Reply to this thread..."
              className="flex-1"
              disabled={loading}
            />
            <Button 
              onClick={handleSendReply} 
              disabled={!newReply.trim() || loading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
