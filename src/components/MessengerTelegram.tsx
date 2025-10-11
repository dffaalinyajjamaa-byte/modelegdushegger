import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Send, Search, Users, Plus, Image as ImageIcon, FileText, Mic, MoreVertical, Flag, Ban, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function MessengerTelegram({ user, onBack }: MessengerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<MessagingUser | null>(null);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    initializeMessaging();
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chat_id);
      const cleanup = subscribeToMessages(selectedChat.chat_id);
      return cleanup;
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
      await supabase
        .from('messaging_users')
        .update({ status: 'online' })
        .eq('user_id', user.id);
    }
  };

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user.id])
      .order('updated_at', { ascending: false });

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
        if ((payload.new as Message).sender_id !== user.id) {
          markMessagesAsSeen(chatId);
        }
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
      
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('chat_id', selectedChat.chat_id);
      
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

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = (chat: Chat) => {
    if (chat.is_group) return chat.group_name || 'Group Chat';
    const otherUserId = chat.members.find(m => m !== user.id);
    const otherUser = users.find(u => u.user_id === otherUserId);
    return otherUser?.name || 'User';
  };

  const getStatusIcon = (status: 'sent' | 'delivered' | 'seen') => {
    switch (status) {
      case 'seen':
        return <CheckCheck className="w-4 h-4 text-primary" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Check className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const ChatList = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xl font-semibold gradient-primary bg-clip-text text-transparent">Chats</h2>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" className="gradient-primary text-white rounded-full hover-scale">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="mobile-card">
            <DialogHeader>
              <DialogTitle>Find Users</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-2xl"
                />
                <Button onClick={searchUsers} className="gradient-primary text-white rounded-2xl">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 hover:bg-muted rounded-2xl cursor-pointer transition-smooth hover-scale"
                      onClick={() => createChat(u.user_id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="gradient-secondary text-white">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.search_id}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={u.status === 'online' ? 'default' : 'secondary'}
                        className={u.status === 'online' ? 'gradient-primary text-white' : ''}
                      >
                        {u.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-4 rounded-2xl cursor-pointer transition-smooth hover-scale ${
                selectedChat?.id === chat.id ? 'gradient-primary text-white' : 'hover:bg-muted'
              }`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={selectedChat?.id === chat.id ? 'bg-white text-primary' : 'gradient-accent text-white'}>
                    {chat.is_group ? <Users className="w-5 h-5" /> : getChatName(chat)[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getChatName(chat)}</p>
                  <p className={`text-sm truncate ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {chat.is_group ? `${chat.members.length} members` : 'Tap to open'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const ChatWindow = () => (
    <>
      <div className="border-b p-4 mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Avatar className="w-10 h-10">
              <AvatarFallback className="gradient-hero text-white">{getChatName(selectedChat!)[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{getChatName(selectedChat!)}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedChat!.is_group ? 'Group chat' : 'Online'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[80%] md:max-w-[70%]`}>
                <div
                  className={`rounded-2xl p-3 ${
                    msg.sender_id === user.id
                      ? 'gradient-primary text-white shadow-glow'
                      : 'bg-muted'
                  }`}
                >
                  {msg.type === 'text' && <p className="text-sm md:text-base whitespace-pre-wrap">{msg.content}</p>}
                  {msg.type === 'image' && (
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-sm">Image</span>
                    </div>
                  )}
                  {msg.type === 'pdf' && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
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
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground px-2">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.sender_id === user.id && getStatusIcon(msg.status)}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full hover-scale">
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full hover-scale">
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full hover-scale">
            <Mic className="w-4 h-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 rounded-2xl"
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={loading || !newMessage.trim()}
            className="gradient-primary text-white rounded-full hover-scale"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-background">
        {!selectedChat ? <ChatList /> : <ChatWindow />}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <Card className="w-80 flex flex-col mobile-card">
        <ChatList />
      </Card>

      <Card className="flex-1 flex flex-col mobile-card">
        {selectedChat ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center animate-fade-in">
              <Users className="w-16 h-16 mx-auto mb-4 text-primary animate-float" />
              <p className="text-lg">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
