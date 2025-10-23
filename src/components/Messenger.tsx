import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Send, Paperclip, Mic, Search, 
  MoreVertical, Check, CheckCheck 
} from 'lucide-react';
import { toast } from 'sonner';

interface MessengerProps {
  user: User;
  onBack: () => void;
}

interface Chat {
  id: string;
  chat_id: string;
  group_name: string | null;
  is_group: boolean;
  members: string[];
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: string;
  timestamp: string;
  status: string;
  seen_by: string[];
  file_url?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

const Messenger = ({ user, onBack }: MessengerProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chat_id);
      subscribeToMessages(selectedChat.chat_id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url');
    
    if (data) {
      const profileMap: Record<string, Profile> = {};
      data.forEach(profile => {
        profileMap[profile.user_id] = profile;
      });
      setProfiles(profileMap);
    }
  };

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user.id])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
      return;
    }

    setChats(data || []);
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = (chatId: string) => {
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: selectedChat.chat_id,
        sender_id: user.id,
        content: newMessage,
        type: 'text',
        status: 'sent',
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = (chat: Chat) => {
    if (chat.is_group) return chat.group_name || 'Group Chat';
    const otherUserId = chat.members.find(id => id !== user.id);
    return otherUserId ? profiles[otherUserId]?.full_name || 'User' : 'Chat';
  };

  const getStatusIcon = (message: Message) => {
    if (message.sender_id !== user.id) return null;
    if (message.seen_by?.length > 1) {
      return <CheckCheck size={14} className="text-blue-400" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck size={14} className="text-white/60" />;
    }
    return <Check size={14} className="text-white/60" />;
  };

  const filteredChats = chats.filter(chat =>
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex flex-col md:flex-row">
      {/* Chat List Sidebar */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col bg-background/95 backdrop-blur-sm border-r`}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={20} />
            </Button>
            <h2 className="text-xl font-bold gradient-text">Model Communication</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredChats.map((chat) => {
            const otherUserId = chat.members.find(id => id !== user.id);
            const profile = otherUserId ? profiles[otherUserId] : null;
            
            return (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 border-b cursor-pointer hover:bg-accent transition-smooth ${
                  selectedChat?.id === chat.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-400 text-white">
                      {getChatName(chat).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{getChatName(chat)}</p>
                    <p className="text-sm text-muted-foreground truncate">Tap to open chat</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-background/95 backdrop-blur-sm">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center gap-3 bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedChat(null)}
              className="md:hidden"
            >
              <ArrowLeft size={20} />
            </Button>
            <Avatar>
              <AvatarImage src={profiles[selectedChat.members.find(id => id !== user.id) || '']?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-400 text-white">
                {getChatName(selectedChat).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{getChatName(selectedChat)}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical size={20} />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwn = message.sender_id === user.id;
                const sender = profiles[message.sender_id];

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white rounded-br-sm'
                          : 'bg-secondary text-foreground rounded-bl-sm'
                      } shadow-elegant`}
                    >
                      {!isOwn && selectedChat.is_group && (
                        <p className="text-xs font-semibold mb-1 opacity-80">
                          {sender?.full_name || 'User'}
                        </p>
                      )}
                      <p className="text-sm break-words">{message.content}</p>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="text-[10px] opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {getStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-gradient-to-r from-orange-500/5 via-pink-500/5 to-purple-500/5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip size={20} />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                className="flex-1"
              />
              {newMessage.trim() ? (
                <Button
                  onClick={sendMessage}
                  disabled={loading}
                  size="icon"
                  className="bg-gradient-to-br from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                >
                  <Send size={20} />
                </Button>
              ) : (
                <Button variant="ghost" size="icon">
                  <Mic size={20} />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-semibold">Select a chat to start messaging</p>
            <p className="text-sm">Connect with classmates and teachers</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messenger;
