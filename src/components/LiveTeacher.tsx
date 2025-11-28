import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, VolumeX, ArrowLeft, Download, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AudioWaveform from './AudioWaveform';
import SiriOrb from './ui/siri-orb';
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from './ui/chat-bubble';
import { MessageLoading } from './ui/message-loading';

interface LiveTeacherProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
  onBack?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function LiveTeacher({ user, onLogActivity, onBack }: LiveTeacherProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'om-ET'; // Oromo (Ethiopia) - fallback to 'en-US' if not supported
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setInputText(prev => prev + ' ' + finalTranscript);
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
        if (isRecording) {
          recognition.start();
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioStream();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
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
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopAudioStream();
  };

  const stopAudioStream = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  };

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Stop any ongoing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      console.log('Generating speech with ElevenLabs...');
      
      // Call ElevenLabs TTS edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { 
          text,
          voice: 'pNInz6obpgDQGcFmaJgB' // Adam voice (multilingual)
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Create audio element from base64
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          audioRef.current = null;
          toast({
            title: 'Audio Playback Error',
            description: 'Failed to play audio response',
            variant: 'destructive',
          });
        };
        
        await audio.play();
        console.log('Speech playback started');
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsSpeaking(false);
      toast({
        title: 'Text-to-Speech Error',
        description: 'Failed to generate speech. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-oromo`;
      
      const conversationMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      conversationMessages.push({ role: 'user', content: userMessage.content });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      // Add placeholder assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              // Update the last message with accumulated content
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (newMessages[lastIdx]?.role === 'assistant') {
                  newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    content: assistantContent,
                  };
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Speak the complete response
      if (assistantContent) {
        speak(assistantContent);
      }

      onLogActivity('ai', 'Live AI Teacher interaction', {
        language: 'oromo',
        mode: 'live',
      });

      // Auto-save session after each conversation
      await saveSession();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response from AI teacher',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async () => {
    try {
      if (messages.length === 0) return;

      const sessionData = {
        user_id: user.id,
        session_name: `Session ${new Date().toLocaleDateString()}`,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
        language: 'oromo',
      };

      if (currentSessionId) {
        // Update existing session
        const { error } = await supabase
          .from('live_teacher_sessions')
          .update(sessionData)
          .eq('id', currentSessionId);
        
        if (error) throw error;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('live_teacher_sessions')
          .insert(sessionData)
          .select()
          .single();
        
        if (error) throw error;
        if (data) setCurrentSessionId(data.id);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const exportSession = () => {
    if (messages.length === 0) {
      toast({
        title: 'No Messages',
        description: 'There are no messages to export',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      sessionName: `Live Teacher Session - ${new Date().toLocaleString()}`,
      language: 'oromo',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toLocaleString(),
      })),
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-teacher-session-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Session Exported',
      description: 'Conversation history downloaded successfully',
    });
  };

  return (
    <div className="app-screen">
      {/* Header */}
      <div className="glass-card border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center shadow-glow">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Live AI Teacher</h2>
              <p className="text-xs text-muted-foreground">Voice & Text in Oromo</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isSpeaking && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopSpeaking}
              >
                <VolumeX className="w-4 h-4" />
              </Button>
            )}
            {messages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveSession}
                  title="Save session"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSession}
                  title="Export conversation"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SiriOrb - Center Visual */}
      {(loading || isSpeaking) && (
        <div className="flex justify-center py-8">
          <SiriOrb 
            size="160px" 
            isActive={loading || isSpeaking}
            animationDuration={isSpeaking ? 15 : 20}
          />
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 app-content">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mb-6">
                <SiriOrb size="120px" isActive={false} />
              </div>
              <p className="text-muted-foreground mb-2">
                Start speaking or type your question
              </p>
              <p className="text-sm text-muted-foreground">
                AI will respond in Oromo with voice
              </p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} variant={msg.role === 'user' ? 'sent' : 'received'}>
              {msg.role === 'assistant' && (
                <ChatBubbleAvatar src="" fallback="AI" />
              )}
              <ChatBubbleMessage variant={msg.role === 'user' ? 'sent' : 'received'}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
          
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <ChatBubble variant="received">
              <ChatBubbleAvatar src="" fallback="AI" />
              <ChatBubbleMessage variant="received" isLoading>
                <MessageLoading />
              </ChatBubbleMessage>
            </ChatBubble>
          )}
        </div>
      </ScrollArea>

      {/* Waveform Visualization */}
      {isRecording && (
        <div className="px-4 py-2 border-t border-border/40">
          <AudioWaveform isRecording={isRecording} audioStream={audioStream} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/40 app-footer">
        <div className="max-w-3xl mx-auto px-4 py-4 flex gap-2">
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <AutoExpandingTextarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your question or use voice..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1"
          />
          
          <Button
            onClick={sendMessage}
            disabled={!inputText.trim() || loading}
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
