import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Search, Plus, Image as ImageIcon, Paperclip, Mic,
  MoreVertical, Check, CheckCheck, Users, UserPlus, AlertCircle, 
  Ban, Pin, X, ArrowLeft
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble';
import AudioWaveform from './AudioWaveform';
import FileUploadProgress from './FileUploadProgress';
import GroupChatDialog from './GroupChatDialog';
import UserProfileDialog from './UserProfileDialog';

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
  group_avatar_url: string | null;
  members: string[];
  admins?: string[];
  created_by: string | null;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'file' | 'audio';
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: string | null;
  timestamp: string | null;
  seen_by: string[] | null;
}

export default function Messenger({ user, onBack }: MessengerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFindUserDialogOpen, setIsFindUserDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<MessagingUser | null>(null);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<number>();
  const { toast } = useToast();

  useEffect(() => {
    initializeMessaging();
    fetchChats();
    
    // Load pinned chats from localStorage
    const saved = localStorage.getItem(`pinnedChats_${user?.id}`);
    if (saved) setPinnedChats(JSON.parse(saved));
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      
      // Real-time subscription
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.chat_id}`
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeMessaging = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    const { data: messagingUser } = await supabase
      .from('messaging_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!messagingUser && profile) {
      await supabase.from('messaging_users').insert({
        user_id: user.id,
        name: profile.full_name,
        profile_pic: profile.avatar_url,
        search_id: `user_${user.id.substring(0, 8)}`,
        status: 'online'
      });
    }

    // Fetch all users
    const { data: allUsers } = await supabase
      .from('messaging_users')
      .select('*')
      .neq('user_id', user.id);
    
    if (allUsers) setUsers(allUsers);
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .contains('members', [user.id])
      .order('updated_at', { ascending: false });

    if (data) setChats(data);
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', selectedChat.chat_id)
      .order('timestamp', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const searchUsers = async () => {
    const { data } = await supabase
      .from('messaging_users')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,search_id.ilike.%${searchQuery}%`)
      .neq('user_id', user.id);

    setUsers(data || []);
  };

  const createOrSelectChat = async (otherUser: MessagingUser) => {
    const chatId = [user.id, otherUser.user_id].sort().join('_');
    
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (existingChat) {
      setSelectedChat(existingChat);
      setIsFindUserDialogOpen(false);
      return;
    }

    const { data } = await supabase
      .from('chats')
      .insert({
        chat_id: chatId,
        members: [user.id, otherUser.user_id],
        is_group: false,
        created_by: user.id
      })
      .select()
      .single();

    if (data) {
      setSelectedChat(data);
      fetchChats();
      setIsFindUserDialogOpen(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await supabase.from('messages').insert({
        chat_id: selectedChat.chat_id,
        sender_id: user.id,
        type: 'text',
        content: newMessage,
        status: 'sent'
      });

      setNewMessage('');
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    const uploadId = Date.now().toString();

    try {

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      await supabase.from('messages').insert({
        chat_id: selectedChat.chat_id,
        sender_id: user.id,
        type: fileType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        status: 'sent'
      });

      toast({ title: "File uploaded successfully" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const togglePinChat = (chatId: string) => {
    setPinnedChats(prev => {
      const newPinned = prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId];
      localStorage.setItem(`pinnedChats_${user?.id}`, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      setRecordingDuration(0);
      setIsRecordingModalOpen(true);
      
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: "Error", description: "Could not access microphone", variant: "destructive" });
    }
  };

  const stopVoiceRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setIsRecordingModalOpen(false);
  };

  const sendVoiceMessage = () => {
    toast({ title: "Voice message sent!" });
    stopVoiceRecording();
  };

  const handleReportMessage = async (messageId: string) => {
    await supabase.from('reported_messages').insert({
      message_id: messageId,
      reported_by: user.id,
      reason: 'Inappropriate content'
    });
    toast({ title: "Message reported", description: "Thank you for helping keep our community safe" });
  };

  const handleBlockUser = async (userId: string) => {
    await supabase.from('blocked_users').insert({
      user_id: user.id,
      blocked_user_id: userId
    });
    toast({ title: "User blocked", description: "You will no longer receive messages from this user" });
  };

  const getChatUser = (chat: Chat) => {
    const otherUserId = chat.members.find(m => m !== user.id);
    return users.find(u => u.user_id === otherUserId);
  };

  const getLastMessage = (chatId: string) => {
    return messages.find(m => m.chat_id === chatId);
  };

  const pinnedChatsList = chats.filter(chat => pinnedChats.includes(chat.chat_id));
  const unpinnedChatsList = chats.filter(chat => !pinnedChats.includes(chat.chat_id));

  return (
    <div className="h-full flex glass-card overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-full md:w-96 border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Messages</h2>
            <Button size="icon" variant="ghost" onClick={() => setIsFindUserDialogOpen(true)}>
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Chat List (Groups/Channels removed) */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {/* Pinned Chats */}
            {pinnedChatsList.length > 0 && (
              <div className="border-b border-border/50 bg-muted/20">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Pin className="w-3 h-3" />
                  Pinned
                </div>
                {pinnedChatsList.filter(chat => !chat.is_group).map((chat) => {
                  const otherUser = getChatUser(chat);
                  return (
                    <Card
                      key={chat.id}
                      className={`cursor-pointer m-2 hover:bg-accent/50 transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <CardContent className="p-3 flex items-center gap-3 relative">
                        <Pin className="w-3 h-3 text-primary absolute top-2 right-2" />
                        <ChatBubbleAvatar
                          src={otherUser?.profile_pic || ''}
                          fallback={otherUser?.name.charAt(0) || 'U'}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {otherUser?.name}
                          </h3>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.chat_id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Regular Chats (No Groups) */}
            {unpinnedChatsList.filter(chat => !chat.is_group).length === 0 && pinnedChatsList.filter(chat => !chat.is_group).length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <p>No chats yet. Start a conversation!</p>
              </div>
            ) : (
              unpinnedChatsList.filter(chat => !chat.is_group).map((chat) => {
                const otherUser = getChatUser(chat);
                return (
                  <Card
                    key={chat.id}
                    className={`cursor-pointer m-2 hover:bg-accent/50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <ChatBubbleAvatar
                        src={otherUser?.profile_pic || ''}
                        fallback={otherUser?.name.charAt(0) || 'U'}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {otherUser?.name}
                        </h3>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinChat(chat.chat_id);
                        }}
                      >
                        <Pin className="w-3 h-3" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setSelectedChat(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <ChatBubbleAvatar
                  src={selectedChat.is_group ? selectedChat.group_avatar_url || '' : getChatUser(selectedChat)?.profile_pic || ''}
                  fallback={selectedChat.is_group ? (selectedChat.group_name?.charAt(0) || 'G') : (getChatUser(selectedChat)?.name.charAt(0) || 'U')}
                  className="h-10 w-10"
                />
                <div>
                  <h3 className="font-semibold">
                    {getChatUser(selectedChat)?.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <Button size="icon" variant="ghost">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const sender = users.find(u => u.user_id === message.sender_id);
                  
                  return (
                    <ChatBubble key={message.id} variant={isOwnMessage ? "sent" : "received"}>
                      {!isOwnMessage && (
                        <ChatBubbleAvatar 
                          src={sender?.profile_pic || ''} 
                          fallback={sender?.name.charAt(0).toUpperCase() || 'U'}
                        />
                      )}
                      
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <ChatBubbleMessage variant={isOwnMessage ? "sent" : "received"}>
                          {message.type === 'text' && <p className="text-sm">{message.content}</p>}
                          
                          {message.type === 'image' && (
                            <div>
                              <img
                                src={message.file_url || ''}
                                alt="Shared image"
                                className="max-w-full rounded-lg mb-1"
                              />
                              {message.content && <p className="text-sm">{message.content}</p>}
                            </div>
                          )}
                          
                          {message.type === 'file' && (
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <div>
                                <p className="text-sm font-medium">{message.file_name}</p>
                                <p className="text-xs opacity-70">
                                  {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : ''}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {new Date(message.timestamp || '').toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isOwnMessage && (
                              <>
                                {message.status === 'sent' && <Check className="w-3 h-3" />}
                                {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                                {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-500" />}
                              </>
                            )}
                          </div>
                        </ChatBubbleMessage>
                        
                        {!isOwnMessage && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleReportMessage(message.id)}
                            >
                              <AlertCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isOwnMessage && (
                        <ChatBubbleAvatar 
                          src={sender?.profile_pic || ''} 
                          fallback={sender?.name.charAt(0).toUpperCase() || 'U'}
                        />
                      )}
                    </ChatBubble>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={startVoiceRecording}>
                  <Mic className="w-5 h-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Find User Dialog */}
      <Dialog open={isFindUserDialogOpen} onOpenChange={setIsFindUserDialogOpen}>
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
                    onClick={() => createOrSelectChat(u)}
                  >
                    <div className="flex items-center gap-2">
                      <ChatBubbleAvatar src={u.profile_pic || ''} fallback={u.name[0]} />
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.search_id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>


      {/* Voice Recording Modal */}
      <Dialog open={isRecordingModalOpen} onOpenChange={setIsRecordingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Message</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <AudioWaveform 
              isRecording={isRecording} 
              audioStream={audioStream}
              className="w-full h-20"
            />
            <div className="text-2xl font-mono">
              {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={stopVoiceRecording}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={sendVoiceMessage} disabled={recordingDuration === 0}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx"
      />
    </div>
  );
}
