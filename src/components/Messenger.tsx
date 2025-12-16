import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { 
  Send, Search, Plus, Image as ImageIcon, Paperclip, Mic,
  MoreVertical, Check, CheckCheck, Users, UserPlus, AlertCircle, 
  Ban, Pin, X, ArrowLeft, Reply, MessageSquare, SmilePlus
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble';
import AudioWaveform from './AudioWaveform';
import FileUploadProgress from './FileUploadProgress';
import GroupChatDialog from './GroupChatDialog';
import UserProfileDialog from './UserProfileDialog';
import MessageThread from './MessageThread';

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
  reply_to: string | null;
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
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<MessagingUser[]>([]);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, Array<{emoji: string; count: number; reacted: boolean}>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<number>();
  const { toast } = useToast();
  const { isMobile, isLandscape } = useScreenSize();
  
  // Typing indicator hook
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(
    selectedChat?.chat_id || null,
    user?.id || ''
  );

  // Get typing user names
  const getTypingUserNames = () => {
    const typingNames = typingUsers
      .map(uid => users.find(u => u.user_id === uid)?.name)
      .filter(Boolean);
    
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
    if (typingNames.length === 2) return `${typingNames.join(' and ')} are typing...`;
    return `${typingNames.length} people are typing...`;
  };

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

  // Search users by name or ID for the dedicated search modal with similarity matching
  const searchUsersByNameOrId = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    
    // Try to use the similarity function for better matching
    try {
      const { data, error } = await supabase
        .rpc('search_users_similar', {
          search_term: query,
          exclude_user_id: user.id
        });
      
      if (!error && data) {
        setUserSearchResults(data);
        return;
      }
    } catch (e) {
      console.log('Falling back to basic search');
    }
    
    // Fallback to basic search
    const { data } = await supabase
      .from('messaging_users')
      .select('*')
      .or(`name.ilike.%${query}%,search_id.ilike.%${query}%,user_id.ilike.%${query}%`)
      .neq('user_id', user.id)
      .limit(20);

    setUserSearchResults(data || []);
  };
  
  // Highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="bg-primary/40 text-primary-foreground font-bold px-0.5 rounded">{part}</span> : part
      );
    } catch {
      return text;
    }
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
      stopTyping(); // Stop typing when sending
      
      await supabase.from('messages').insert({
        chat_id: selectedChat.chat_id,
        sender_id: user.id,
        type: 'text',
        content: newMessage,
        status: 'sent',
        reply_to: replyingTo?.id || null,
      });

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleViewThread = (message: Message) => {
    setThreadMessage(message);
    setIsThreadOpen(true);
  };

  const handleSendReply = async (content: string, replyToId: string) => {
    if (!selectedChat) return;

    await supabase.from('messages').insert({
      chat_id: selectedChat.chat_id,
      sender_id: user.id,
      type: 'text',
      content: content,
      status: 'sent',
      reply_to: replyToId,
    });
  };

  const getReplyCount = (messageId: string) => {
    return messages.filter(m => m.reply_to === messageId).length;
  };

  const getRepliedMessage = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId);
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

  const handleReaction = (messageId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existingReactions = prev[messageId] || [];
      const existingReaction = existingReactions.find((r) => r.emoji === emoji);

      if (existingReaction) {
        return {
          ...prev,
          [messageId]: existingReactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
              : r
          ).filter(r => r.count > 0)
        };
      } else {
        return {
          ...prev,
          [messageId]: [...existingReactions, { emoji, count: 1, reacted: true }]
        };
      }
    });
  };

  const pinnedChatsList = chats.filter(chat => pinnedChats.includes(chat.chat_id));
  const unpinnedChatsList = chats.filter(chat => !pinnedChats.includes(chat.chat_id));

  // Show chat list or chat screen on mobile, both on desktop
  const showChatList = !isMobile || !selectedChat;
  const showChatScreen = !isMobile || selectedChat;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background">
      <div 
        className="flex overflow-hidden bg-background md:rounded-3xl md:shadow-2xl md:border"
        style={{ 
          width: '100%',
          height: '100dvh',
          maxWidth: 'min(100vw, calc(100dvh * 9 / 16))',
          maxHeight: '100dvh',
        }}
      >
      {/* Left Sidebar - Chat List */}
      {showChatList && (
        <div className={`${isMobile ? 'w-full h-full' : 'w-96 h-full'} border-r border-border/50 flex flex-col bg-background`}>
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Messages</h2>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => setIsUserSearchOpen(true)} title="Search Users">
                <Search className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsFindUserDialogOpen(true)} title="Find User">
                <UserPlus className="w-5 h-5" />
              </Button>
            </div>
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
      )}

      {/* Right Side - Chat Area */}
      {showChatScreen && (
        <div className={`${isMobile ? 'fixed inset-0 z-50' : 'flex-1'} flex flex-col bg-background`} style={isMobile ? { height: '100dvh' } : {}}>
          {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isMobile && (
                  <Button size="icon" variant="ghost" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="relative">
                  <ChatBubbleAvatar
                    src={selectedChat.is_group ? selectedChat.group_avatar_url || '' : getChatUser(selectedChat)?.profile_pic || ''}
                    fallback={selectedChat.is_group ? (selectedChat.group_name?.charAt(0) || 'G') : (getChatUser(selectedChat)?.name.charAt(0) || 'U')}
                    className="h-10 w-10"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
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
            <ScrollArea className="flex-1 p-4 bg-background">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const sender = users.find(u => u.user_id === message.sender_id);
                    const repliedMessage = getRepliedMessage(message.reply_to);
                    const replyCount = getReplyCount(message.id);
                    const reactions = messageReactions[message.id] || [];
                    
                    return (
                      <div key={message.id} className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <ChatBubbleAvatar
                          src={sender?.profile_pic || ''}
                          fallback={sender?.name.charAt(0).toUpperCase() || 'U'}
                          className="h-8 w-8"
                        />
                        
                        <div className={`flex flex-col gap-1 max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-foreground'
                          }`}>
                            {/* Replied Message Preview */}
                            {repliedMessage && (
                              <div className={`mb-2 pb-2 border-l-2 pl-2 rounded text-xs ${
                                isOwnMessage ? 'border-primary-foreground/30 bg-primary-foreground/10' : 'border-primary/30 bg-muted-foreground/10'
                              }`}>
                                <div className="font-semibold opacity-70">
                                  Replying to {users.find(u => u.user_id === repliedMessage.sender_id)?.name}
                                </div>
                                <div className="opacity-70 truncate">
                                  {repliedMessage.content}
                                </div>
                              </div>
                            )}
                            
                            {message.type === 'text' && (
                              <p className="text-sm break-words">{message.content}</p>
                            )}
                            
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
                              <span className={`text-xs ${isOwnMessage ? 'opacity-80' : 'opacity-60'}`}>
                                {new Date(message.timestamp || '').toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {isOwnMessage && (
                                <>
                                  {message.status === 'sent' && <Check className="w-3 h-3 opacity-80" />}
                                  {message.status === 'delivered' && <CheckCheck className="w-3 h-3 opacity-80" />}
                                  {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Reactions */}
                          {reactions.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() => handleReaction(message.id, reaction.emoji)}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${
                                    reaction.reacted
                                      ? 'bg-primary/20 text-primary'
                                      : 'bg-muted hover:bg-muted-foreground/10'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleReaction(message.id, '👍')}
                              title="React with 👍"
                            >
                              <SmilePlus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleReply(message)}
                              title="Reply to this message"
                            >
                              <Reply className="w-3 h-3" />
                            </Button>
                            {replyCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => handleViewThread(message)}
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {replyCount}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur-sm">
              {/* Typing Indicator */}
              {getTypingUserNames() && (
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{getTypingUserNames()}</span>
                </div>
              )}

              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between animate-slide-up">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Reply className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">
                        Replying to {users.find(u => u.user_id === replyingTo.sender_id)?.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {replyingTo.content}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <div className="relative flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={replyingTo ? "Reply to message..." : "Write a message..."}
                    className="pr-10 rounded-full bg-muted border-none focus-visible:ring-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={() => handleReaction(messages[messages.length - 1]?.id || '', '👍')}
                  >
                    <SmilePlus className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="flex-shrink-0 rounded-full"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center text-muted-foreground">
                <p>Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Search Dialog */}
      <Dialog open={isUserSearchOpen} onOpenChange={(open) => {
        setIsUserSearchOpen(open);
        if (!open) {
          setUserSearchQuery('');
          setUserSearchResults([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or user ID..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsersByNameOrId(e.target.value);
                }}
                className="pl-9"
                autoFocus
              />
            </div>
            
            {userSearchQuery && (
              <p className="text-xs text-muted-foreground">
                {userSearchResults.length} user{userSearchResults.length !== 1 ? 's' : ''} found
              </p>
            )}
            
            <ScrollArea className="h-72">
              <div className="space-y-2">
                {userSearchResults.length === 0 && userSearchQuery ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No users found</p>
                    <p className="text-xs mt-1">Try searching by name or ID</p>
                  </div>
                ) : (
                  userSearchResults.map((u) => (
                    <Card
                      key={u.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => {
                        createOrSelectChat(u);
                        setIsUserSearchOpen(false);
                        setUserSearchQuery('');
                        setUserSearchResults([]);
                      }}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <ChatBubbleAvatar src={u.profile_pic || ''} fallback={u.name[0]} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{highlightMatch(u.name, userSearchQuery)}</p>
                          <p className="text-xs text-muted-foreground truncate">{highlightMatch(u.search_id || '', userSearchQuery)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Chat
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Message Thread Dialog */}
      {threadMessage && (
        <MessageThread
          open={isThreadOpen}
          onOpenChange={setIsThreadOpen}
          rootMessage={threadMessage}
          currentUser={user}
          users={users}
          onSendReply={handleSendReply}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx"
      />
      </div>
    </div>
  );
}
