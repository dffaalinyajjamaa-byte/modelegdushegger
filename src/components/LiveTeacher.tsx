import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, VolumeX, ArrowLeft, Download, Save, Settings, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SiriOrb } from '@/components/ui/siri-orb';
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from '@/components/ui/chat-bubble';
import { LiveTeacherHome } from './live-teacher/LiveTeacherHome';
import { LiveTeacherSettings } from './live-teacher/LiveTeacherSettings';
import { LiveTeacherHistory } from './live-teacher/LiveTeacherHistory';
import { LiveTeacherTranscript } from './live-teacher/LiveTeacherTranscript';
import { ConnectionStatus } from './live-teacher/ConnectionStatus';
import { VoiceActivityIndicator } from './live-teacher/VoiceActivityIndicator';
import { TranscriptionDisplay } from './live-teacher/TranscriptionDisplay';
import { QuickPrompts } from './live-teacher/QuickPrompts';
import { useVoiceSettings } from '@/hooks/use-voice-settings';
import { useContinuousListening } from '@/hooks/use-continuous-listening';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LiveTeacherProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
  onBack?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type Screen = 'home' | 'chat' | 'settings' | 'history' | 'transcript';

export default function LiveTeacher({ user, onLogActivity, onBack }: LiveTeacherProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  const { settings, updateSettings, loading: settingsLoading } = useVoiceSettings();
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentScreen !== 'chat') return;

      // Space to toggle recording (when input not focused)
      if (e.code === 'Space' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        isRecording ? stopRecording() : startRecording();
      }

      // Escape to interrupt AI
      if (e.code === 'Escape') {
        stopSpeaking();
      }

      // Ctrl+Enter to send
      if (e.ctrlKey && e.code === 'Enter') {
        sendMessage();
      }

      // Ctrl+N for new conversation
      if (e.ctrlKey && e.code === 'KeyN') {
        e.preventDefault();
        handleNewConversation();
      }

      // Ctrl+S to save
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        saveSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentScreen, isRecording, inputText]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language_preference === 'english' ? 'en-US' : 'om-ET';
      
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        if (interim) {
          setInterimTranscript(interim);
        }
        
        if (final) {
          setInputText(prev => (prev + ' ' + final).trim());
          setInterimTranscript('');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access to use voice input',
            variant: 'destructive',
          });
        }
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        if (isRecording && !settings.continuous_listening) {
          recognition.start();
        }
      };
      
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioStream();
    };
  }, [settings.language_preference, settings.continuous_listening]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentScreen === 'history') {
      fetchSessions();
    }
  }, [currentScreen]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecording(true);
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      toast({ title: 'Recording started' });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
  };

  const stopAudioStream = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  };

  // Continuous listening hook - must come after startRecording and stopRecording are defined
  const { isDetectingSpeech, audioLevel } = useContinuousListening({
    enabled: settings.continuous_listening && currentScreen === 'chat',
    isRecording,
    onStartRecording: startRecording,
    onStopRecording: stopRecording,
    onSendMessage: () => {
      if (inputText.trim()) {
        sendMessage();
      }
    },
  });

  const speak = async (text: string) => {
    if (!settings.auto_speak_responses) return;

    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { 
          text,
          voice: settings.voice_id,
        }
      });

      if (error) throw error;

      if (data.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.playbackRate = settings.speech_speed;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setIsSpeaking(false);
      toast({
        title: 'Speech Error',
        description: 'Could not generate speech',
        variant: 'destructive',
      });
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setConnectionStatus('connecting');

    try {
      const { data, error } = await supabase.functions.invoke('ai-teacher-oromo', {
        body: {
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          language: settings.language_preference
        }
      });

      setConnectionStatus('connected');

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      await speak(data.response);

      onLogActivity('ai_interactions', 'AI Live Teacher interaction', {
        message: userMessage.content,
        response: data.response
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionStatus('disconnected');
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async () => {
    try {
      const sessionName = `Session ${new Date().toLocaleDateString()}`;
      
      if (currentSessionId) {
        const { error } = await supabase
          .from('live_teacher_sessions')
          .update({
            messages: messages as any,
            session_name: sessionName,
          })
          .eq('id', currentSessionId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('live_teacher_sessions')
          .insert([{
            user_id: user.id,
            messages: messages as any,
            session_name: sessionName,
            language: settings.language_preference,
          }])
          .select()
          .single();

        if (error) throw error;
        setCurrentSessionId(data.id);
      }

      toast({ title: 'Session saved successfully' });
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Save failed',
        variant: 'destructive',
      });
    }
  };

  const exportSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const transcript = (session.messages || [])
      .map((msg: Message) => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.session_name || 'session'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Session exported' });
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_teacher_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('live_teacher_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({ title: 'Session deleted' });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Delete failed',
        variant: 'destructive',
      });
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputText('');
    stopSpeaking();
    toast({ title: 'New conversation started' });
  };

  const handleViewSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setSelectedSession(session);
      setCurrentScreen('transcript');
    }
  };

  const handleStartChat = () => {
    setCurrentScreen('chat');
    setConnectionStatus('connected');
  };

  const suggestedPrompts = messages.length === 0 ? [
    "Explain photosynthesis",
    "Help me with math",
    "Tell me about history",
    "Practice English with me",
  ] : [];

  // Render different screens
  if (currentScreen === 'home') {
    return (
      <LiveTeacherHome
        onStartChat={handleStartChat}
        onViewHistory={() => setCurrentScreen('history')}
        onOpenSettings={() => setCurrentScreen('settings')}
        totalSessions={sessions.length}
        totalMinutes={0}
      />
    );
  }

  if (currentScreen === 'settings') {
    return (
      <LiveTeacherSettings
        settings={settings}
        onUpdateSettings={updateSettings}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'history') {
    return (
      <LiveTeacherHistory
        sessions={sessions}
        onBack={() => setCurrentScreen('home')}
        onViewSession={handleViewSession}
        onDeleteSession={deleteSession}
        onExportSession={exportSession}
      />
    );
  }

  if (currentScreen === 'transcript' && selectedSession) {
    return (
      <LiveTeacherTranscript
        sessionName={selectedSession.session_name || 'Untitled Session'}
        messages={selectedSession.messages || []}
        createdAt={selectedSession.created_at}
        onBack={() => {
          setCurrentScreen('history');
          setSelectedSession(null);
        }}
      />
    );
  }

  // Chat screen
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('home')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Live Teacher</h1>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus status={connectionStatus} language={settings.language_preference} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewConversation}>
                  New Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={saveSession}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentScreen('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {messages.length === 0 ? (
          <div className="text-center space-y-8">
            <SiriOrb 
              size="150px" 
              isActive={loading || isSpeaking || isRecording}
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Ready to learn</h2>
              <p className="text-muted-foreground">
                {settings.continuous_listening ? 'Speak anytime - I\'m listening' : 'Press the mic or type to start'}
              </p>
            </div>
            {suggestedPrompts.length > 0 && (
              <QuickPrompts
                prompts={suggestedPrompts}
                onSelectPrompt={(prompt) => {
                  setInputText(prompt);
                  setTimeout(() => sendMessage(), 100);
                }}
              />
            )}
          </div>
        ) : (
          <ScrollArea ref={scrollAreaRef} className="flex-1 w-full max-w-4xl">
            <div className="space-y-4 p-4">
              {messages.map((message, index) => (
                <ChatBubble key={index} variant={message.role === 'user' ? 'sent' : 'received'}>
                  <ChatBubbleAvatar
                    src={message.role === 'user' ? undefined : undefined}
                    fallback={message.role === 'user' ? 'U' : 'AI'}
                  />
                  <ChatBubbleMessage variant={message.role === 'user' ? 'sent' : 'received'}>
                    {message.content}
                  </ChatBubbleMessage>
                </ChatBubble>
              ))}
              {loading && (
                <ChatBubble variant="received">
                  <ChatBubbleAvatar fallback="AI" />
                  <ChatBubbleMessage variant="received" isLoading />
                </ChatBubble>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          {/* Interim transcript */}
          {interimTranscript && (
            <TranscriptionDisplay text={interimTranscript} isFinal={false} />
          )}

          {/* Voice Activity Indicator */}
          {settings.continuous_listening && (
            <div className="flex items-center justify-center">
              <VoiceActivityIndicator isActive={isDetectingSpeech} level={audioLevel * 100} />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-end gap-2">
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || settings.continuous_listening}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <AutoExpandingTextarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={settings.continuous_listening ? "Speak or type..." : "Type your message..."}
              className="flex-1"
              disabled={loading}
            />

            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <Send className="h-5 w-5" />
            </Button>

            {isSpeaking && (
              <Button
                variant="outline"
                size="icon"
                onClick={stopSpeaking}
              >
                <VolumeX className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-muted-foreground text-center">
            Space: Record • Esc: Stop AI • Ctrl+Enter: Send • Ctrl+S: Save
          </div>
        </div>
      </div>
    </div>
  );
}
