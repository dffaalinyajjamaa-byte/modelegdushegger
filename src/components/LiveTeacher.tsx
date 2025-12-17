import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, VolumeX, ArrowLeft, Download, Save, Settings, MoreVertical, Camera, X, SwitchCamera } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
type TranslationStatus = 'idle' | 'understanding' | 'translating' | 'responding';

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
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  
  // Webcam state
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamIntervalRef = useRef<number | null>(null);
  
  const { settings, updateSettings, loading: settingsLoading } = useVoiceSettings();
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<{ stop?: () => void } | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Fix webcam black screen - set srcObject after video element renders
  useEffect(() => {
    if (previewVideoRef.current && webcamStream && isWebcamEnabled) {
      previewVideoRef.current.srcObject = webcamStream;
      previewVideoRef.current.play().catch(console.error);
    }
  }, [webcamStream, isWebcamEnabled]);

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
      recognition.lang = 'om-ET'; // Always Oromo for Live Teacher
      
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
  }, [settings.continuous_listening]);

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

  // Helper function to play PCM audio from Gemini native audio
  // With Windows 10 fallback for webkitAudioContext
  const playPCMAudio = async (base64Data: string, mimeType: string = 'audio/pcm;rate=24000'): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Decode base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse sample rate from mimeType (e.g., "audio/pcm;rate=24000")
        const sampleRateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;

        // Create AudioContext with Windows 10 fallback
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }
        const audioContext = new AudioContextClass({ sampleRate });
        
        // Convert PCM Int16 to Float32
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
        }

        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        // Play audio
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          audioContext.close();
          resolve();
        };
        source.start();
        
        // Store reference for stopping
        audioRef.current = { 
          stop: () => {
            try {
              source.stop();
              audioContext.close();
            } catch (e) {
              // Already stopped
            }
            resolve();
          }
        };
      } catch (error) {
        console.error('Error playing PCM audio:', error);
        reject(error);
      }
    });
  };

  const speak = async (text: string) => {
    if (!settings.auto_speak_responses) return;

    try {
      setIsSpeaking(true);
      
      // Use Gemini TTS with native audio for proper Oromo pronunciation
      const { data, error } = await supabase.functions.invoke('gemini-tts', {
        body: { 
          text,
          voice: settings.voice_id || 'Puck',
        }
      });

      if (error) throw error;

      // Check if we got native audio data from Gemini
      if (data?.audioData) {
        console.log('Playing native Gemini audio for Oromo');
        await playPCMAudio(data.audioData, data.mimeType || 'audio/pcm;rate=24000');
        setIsSpeaking(false);
        return;
      }

      // Fallback to Web Speech API if no native audio
      if (data?.text && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.text);
        utterance.rate = settings.speech_speed;
        utterance.lang = 'om-ET';
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
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
    // Stop Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Stop native audio playback
    if (audioRef.current?.stop) {
      audioRef.current.stop();
    }
    audioRef.current = null;
    setIsSpeaking(false);
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
    setTranslationStatus('understanding');

    try {
      // Show translating status after a short delay
      setTimeout(() => setTranslationStatus('translating'), 600);
      
      const { data, error } = await supabase.functions.invoke('ai-teacher-oromo', {
        body: {
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          language: 'oromo', // Always Oromo
          useSearch: true,
        }
      });

      setConnectionStatus('connected');
      setTranslationStatus('responding');

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (!data || !data.response) {
        throw new Error('No response from AI');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      await speak(data.response);

      // No translation needed - always Oromo output

      onLogActivity('ai_interactions', 'AI Live Teacher interaction', {
        message: userMessage.content,
        response: data.response,
        emotion: data.emotion
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionStatus('disconnected');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setTranslationStatus('idle');
    }
  };

  // Webcam functions
  const startWebcam = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      // Stop existing stream first
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      
      const quality = settings.video_quality || 'medium';
      const resolution = quality === 'low' ? 512 : quality === 'high' ? 1024 : 720;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: resolution }, 
          height: { ideal: resolution },
          facingMode: facing
        }
      });
      
      setWebcamStream(stream);
      setIsWebcamEnabled(true);
      setCameraFacing(facing);
      // Note: srcObject will be set by useEffect after video element renders
      
      toast({ title: 'Webcam enabled', description: facing === 'user' ? 'Front camera' : 'Back camera' });
    } catch (error) {
      console.error('Webcam error:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    await startWebcam(newFacing);
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    if (webcamIntervalRef.current) {
      clearInterval(webcamIntervalRef.current);
      webcamIntervalRef.current = null;
    }
    setIsWebcamEnabled(false);
  };

  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !isWebcamEnabled) return null;
    
    const quality = settings.video_quality || 'medium';
    const size = quality === 'low' ? 512 : quality === 'high' ? 1024 : 720;
    
    canvasRef.current.width = size;
    canvasRef.current.height = size;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(videoRef.current, 0, 0, size, size);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7);
    return imageData.split(',')[1]; // Return base64 data only
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
            language: 'oromo', // Always Oromo
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
            <ConnectionStatus status={connectionStatus} language="oromo" />
            
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
                  <ChatBubbleMessage variant="received">
                    {/* Translation Status Indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                        {translationStatus === 'understanding' && (
                          <>🧠 Hubachaa jira... (Understanding...)</>
                        )}
                        {translationStatus === 'translating' && (
                          <>🌍 Gara Afaan Oromootti hiikaa jira... (Translating to Oromo...)</>
                        )}
                        {translationStatus === 'responding' && (
                          <>✨ Deebisaa kennaa jira... (Responding...)</>
                        )}
                        {translationStatus === 'idle' && (
                          <>⏳ Loading...</>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </ChatBubbleMessage>
                </ChatBubble>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Hidden video element for frame capture */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Webcam Preview */}
      {isWebcamEnabled && webcamStream && (
        <div className="absolute top-20 right-4 z-20">
          <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-black relative">
            <video 
              ref={previewVideoRef}
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            <div className="absolute bottom-1 right-1 flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6"
                onClick={switchCamera}
                title={cameraFacing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
              >
                <SwitchCamera className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-6 w-6"
                onClick={stopWebcam}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

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

            {/* Webcam Toggle */}
            <Button
              variant={isWebcamEnabled ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => isWebcamEnabled ? stopWebcam() : startWebcam()}
              title={isWebcamEnabled ? 'Disable webcam' : 'Enable webcam'}
              className={cn(isWebcamEnabled && 'ring-2 ring-primary')}
            >
              <Camera className={cn('h-5 w-5', isWebcamEnabled && 'text-primary')} />
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
