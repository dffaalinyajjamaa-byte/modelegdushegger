import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Search, Users, Plus, Image as ImageIcon, FileText, Mic, MoreVertical, Flag, Ban, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Stories from './Stories';
import Channels from './Channels';
import GroupChatDialog from './GroupChatDialog';

interface MessengerProps {
  user: User;
  onBack: () => void;
}

interface MessagingUser {
  id: string;
  user_id: string;
  name: string;
  profile_pic: string | null;
  status: string;
  search_id: string | null;
}

interface Chat {
  id: string;
  chat_id: string;
  is_group: boolean;
  group_name: string | null;
  members: string[];
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'pdf' | 'image' | 'audio' | 'file';
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  status: 'sent' | 'delivered' | 'seen';
  timestamp: string;
  seen_by: string[];
}

export default function Messenger({ user, onBack }: MessengerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<MessagingUser | null>(null);
  const [view, setView] = useState<'chats' | 'channels'>('chats');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeMessaging();
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chat_id);
      subscribeToMessages(selectedChat.chat_id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeMessaging = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const { data: messagingUser } = await supabase
      .from('messaging_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!messagingUser && profile) {
      const { data } = await supabase
        .from('messaging_users')
        .insert({
          user_id: user.id,
          name: profile.full_name,
          search_id: `user_${user.id.substring(0, 8)}`,
          status: 'online'
        })
        .select()
        .single();
      setCurrentUser(data);
    } else {
      setCurrentUser(messagingUser);
    }
  };

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user.id]);

    if (data && !error) {
      setChats(data);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (data && !error) {
      setMessages(data as Message[]);
      markMessagesAsSeen(chatId);
    }
  };

  const subscribeToMessages = (chatId: string) => {
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsSeen = async (chatId: string) => {
    const { data: messagesToUpdate } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .neq('sender_id', user.id);

    if (messagesToUpdate) {
      for (const msg of messagesToUpdate) {
        const seenBy = msg.seen_by || [];
        if (!seenBy.includes(user.id)) {
          await supabase
            .from('messages')
            .update({ 
              status: 'seen',
              seen_by: [...seenBy, user.id]
            })
            .eq('id', msg.id);
        }
      }
    }
  };

  const searchUsers = async () => {
    const { data } = await supabase
      .from('messaging_users')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,search_id.ilike.%${searchQuery}%`)
      .neq('user_id', user.id);

    setUsers(data || []);
  };

  const createChat = async (otherUserId: string) => {
    const chatId = [user.id, otherUserId].sort().join('_');
    
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (existingChat) {
      setSelectedChat(existingChat);
      return;
    }

    const { data, error } = await supabase
      .from('chats')
      .insert({
        chat_id: chatId,
        members: [user.id, otherUserId],
        created_by: user.id
      })
      .select()
      .single();

    if (data && !error) {
      setSelectedChat(data);
      fetchChats();
    }
  };

  const sendMessage = async (type: 'text' | 'pdf' | 'image' | 'audio' | 'file' = 'text', fileUrl?: string, fileName?: string) => {
    if (!selectedChat || (!newMessage.trim() && type === 'text')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.chat_id,
          sender_id: user.id,
          type,
          content: type === 'text' ? newMessage : null,
          file_url: fileUrl,
          file_name: fileName,
          status: 'sent'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({
      title: 'Uploading file...',
      description: 'Please wait'
    });

    // File upload logic will be implemented with storage
    // For now, show a message
    toast({
      title: 'File upload',
      description: 'File upload functionality will be available soon',
    });
  };

  const reportMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('reported_messages')
      .insert({
        message_id: messageId,
        reported_by: user.id,
        reason: 'Inappropriate content'
      });

    if (!error) {
      toast({
        title: 'Message reported',
        description: 'Thank you for helping keep our community safe'
      });
    }
  };

  const blockUser = async (userId: string) => {
    const { error } = await supabase
      .from('blocked_users')
      .insert({
        user_id: user.id,
        blocked_user_id: userId
      });

    if (!error) {
      toast({
        title: 'User blocked',
        description: 'You will no longer receive messages from this user'
      });
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = (chat: Chat) => {
    if (chat.is_group) return chat.group_name || 'Group Chat';
    const otherUserId = chat.members.find(m => m !== user.id);
    const otherUser = users.find(u => u.user_id === otherUserId);
    return otherUser?.name || 'User';
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - Telegram Style */}
      <Card className="w-80 flex flex-col glass-card border-border/40">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="flex items-center justify-between">
            <span className="text-foreground">Chats</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Find Users</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button onClick={searchUsers}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => createChat(u.user_id)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarFallback>{u.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.search_id}</p>
                            </div>
                          </div>
                          <Badge variant={u.status === 'online' ? 'default' : 'secondary'}>
                            {u.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 border-b cursor-pointer hover:bg-muted transition ${
                  selectedChat?.id === chat.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {chat.is_group ? <Users className="w-4 h-4" /> : getChatName(chat)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getChatName(chat)}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.is_group ? `${chat.members.length} members` : 'Direct message'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area - Telegram Style */}
      <Card className="flex-1 flex flex-col glass-card border-border/40">
        {selectedChat ? (
          <>
            {/* Telegram-style Header */}
            <CardHeader className="border-b border-border/40 backdrop-blur-xl bg-card/80 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/30">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {getChatName(selectedChat)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{getChatName(selectedChat)}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.is_group ? `${selectedChat.members.length} members` : 'online'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            {/* Messages Area - Telegram Style */}
            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col bg-background/50">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user.id;
                    const senderName = isOwnMessage ? 'You' : getChatName(selectedChat);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Avatar for received messages */}
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 border-2 border-border/30 flex-shrink-0 self-end">
                            <AvatarFallback className="bg-gradient-to-br from-accent to-secondary text-white text-xs">
                              {getChatName(selectedChat)[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {/* Message Container with Name */}
                        <div className={`w-full max-w-[85%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {/* Sender Name */}
                          <p className="text-xs font-semibold mb-1 text-muted-foreground px-2">
                            {senderName}
                          </p>
                          
                          {/* Message Bubble */}
                          <div
                            className={`relative px-4 py-2 w-full ${
                              isOwnMessage
                                ? 'message-bubble-telegram-user text-white'
                                : 'message-bubble-telegram-other text-foreground'
                            }`}
                          >
                            {msg.type === 'text' && <p className="break-words text-sm">{msg.content}</p>}
                            {msg.type === 'image' && (
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-sm">Image</span>
                              </div>
                            )}
                            {msg.type === 'pdf' && (
                              <div className="flex items-center gap-2 p-2 bg-background/20 rounded">
                                <FileText className="w-4 h-4 text-destructive" />
                                <span className="text-sm">{msg.file_name || 'PDF Document'}</span>
                              </div>
                            )}
                            {msg.type === 'audio' && (
                              <div className="flex items-center gap-2">
                                <Mic className="w-4 h-4" />
                                <span className="text-sm">Voice message</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Timestamp below bubble */}
                          <div className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-2`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOwnMessage && (
                              <span className={msg.status === 'seen' ? 'text-accent' : ''}>
                                {msg.status === 'seen' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input Area - Telegram Style */}
              <div className="flex gap-2 mt-4 p-3 glass-card rounded-2xl border-primary/20">
                {/* Message Input */}
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message"
                  disabled={loading}
                  className="flex-1 glass-input border-0 focus-visible:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                />

                {/* Send/Voice Button */}
                {newMessage.trim() ? (
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={loading}
                    className="gradient-primary shadow-neon hover:shadow-glow tap-scale rounded-full"
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                ) : (
                  <label htmlFor="audio-upload">
                    <Button type="button" variant="ghost" size="icon" disabled={loading} asChild className="hover:bg-primary/20">
                      <span className="cursor-pointer">
                        <Mic className="w-4 h-4 text-primary" />
                      </span>
                    </Button>
                  </label>
                )}
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'audio')}
                />
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Select a chat to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

const MessageCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);