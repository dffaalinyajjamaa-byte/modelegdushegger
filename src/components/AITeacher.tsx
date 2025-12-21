import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Sparkles, Plus, Mic, MicOff, Globe, ChevronDown, Volume2, VolumeX, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useGeminiSTT } from '@/hooks/use-gemini-stt';
import aiTeacherRobot from '@/assets/ai-teacher-robot.png';

interface AITeacherProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  language: string;
  created_at: string;
}

type TranslationStatus = 'idle' | 'understanding' | 'translating' | 'responding';

// Language configuration
const LANGUAGES = [
  { code: 'om', name: 'Afaan Oromoo', speechCode: 'om-ET' },
  { code: 'en', name: 'English', speechCode: 'en-US' },
  { code: 'am', name: 'አማርኛ', speechCode: 'am-ET' },
] as const;

type LanguageCode = typeof LANGUAGES[number]['code'];

export default function AITeacher({ user, onLogActivity }: AITeacherProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  const [language, setLanguage] = useState<LanguageCode>('om');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingTTS, setLoadingTTS] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Use Gemini STT hook
  const handleTranscript = useCallback((text: string) => {
    setMessage(prev => {
      const trimmedPrev = prev.trim();
      if (trimmedPrev.toLowerCase().endsWith(text.toLowerCase())) {
        return prev;
      }
      return trimmedPrev ? `${trimmedPrev} ${text}` : text;
    });
  }, []);

  const handleSTTError = useCallback((error: string) => {
    toast({
      title: "Voice input error",
      description: error,
      variant: "destructive"
    });
  }, [toast]);

  const { isListening, isProcessing, toggleListening, stopListening } = useGeminiSTT({
    language,
    onTranscript: handleTranscript,
    onError: handleSTTError,
  });

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  // Text-to-Speech function using Gemini TTS edge function
  const handleSpeak = async (text: string, messageId: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingMessageId(null);
      return;
    }

    // Stop any ongoing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setLoadingTTS(messageId);
    
    try {
      const cleanText = text.replace(/[*#_`]/g, ''); // Remove markdown
      
      // Call Gemini TTS edge function
      const { data, error } = await supabase.functions.invoke('gemini-tts', {
        body: { text: cleanText, language }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Play the audio from base64
        const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setSpeakingMessageId(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setSpeakingMessageId(null);
          audioRef.current = null;
          toast({
            title: "Audio playback failed",
            variant: "destructive"
          });
        };

        setSpeakingMessageId(messageId);
        await audio.play();
      } else if (data?.text) {
        // Fallback to browser TTS if Gemini returns text instead of audio
        const utterance = new SpeechSynthesisUtterance(data.text);
        const langMap: Record<string, string> = {
          'om': 'om-ET',
          'en': 'en-US',
          'am': 'am-ET'
        };
        utterance.lang = langMap[language] || 'en-US';
        utterance.rate = 0.9;
        
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => {
          setSpeakingMessageId(null);
          toast({ title: "Speech synthesis failed", variant: "destructive" });
        };
        
        setSpeakingMessageId(messageId);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const langMap: Record<string, string> = {
        'om': 'om-ET',
        'en': 'en-US',
        'am': 'am-ET'
      };
      utterance.lang = langMap[language] || 'en-US';
      utterance.rate = 0.9;
      
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    } finally {
      setLoadingTTS(null);
    }
  };

  const generateAIResponse = async (userMessage: string, retryCount = 0): Promise<string> => {
    try {
      setError(null);
      
      // Build conversation history
      const conversationHistory = messages.map(msg => ([
        { role: 'user', content: msg.message },
        { role: 'assistant', content: msg.response }
      ])).flat();

      console.log('[AI Teacher] Sending request with Google Search enabled');
      
      // Use Supabase functions.invoke for cleaner API
      const { data, error: invokeError } = await supabase.functions.invoke('ai-teacher-oromo', {
        body: {
          message: userMessage,
          conversationHistory: conversationHistory,
          language: language,
          useSearch: true,
        }
      });

      if (invokeError) {
        console.error('[AI Teacher] Function error:', invokeError);
        
        if (retryCount < 2) {
          console.log(`[AI Teacher] Retrying... Attempt ${retryCount + 1}`);
          setRetrying(true);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          setRetrying(false);
          return generateAIResponse(userMessage, retryCount + 1);
        }
        
        throw invokeError;
      }

      console.log('[AI Teacher] Response received:', data?.response?.substring(0, 100));
      
      if (!data?.response) {
        console.error('[AI Teacher] Empty response received');
        return "Gaaffii kee hubadhe, garuu deebii kennuu hin dandeenye. Maaloo gaaffii biraa gaafadhu.";
      }
      
      return data.response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return "Dogongora tokko uumame. Maaloo yeroo muraasa booda yaali.";
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage('');
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Stop listening if active
    if (isListening) {
      stopListening();
    }
    
    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setTranslationStatus('understanding');

    try {
      // Update status to translating
      setTimeout(() => setTranslationStatus('translating'), 500);
      
      let aiResponse = await generateAIResponse(userMessage);
      
      setTranslationStatus('responding');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          language: language,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
      }

      onLogActivity('ai_chat', `AI Teacher asked: ${userMessage}`, {
        language: language,
        response_length: aiResponse.length
      });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
      setTranslationStatus('idle');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <div className="app-screen overflow-x-hidden">
      {/* Fixed Header */}
      <div className="app-header border-b bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary">
            <img src={aiTeacherRobot} alt="AI Teacher" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-bold text-base">AI Teacher</h2>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-9 px-2">
                <Globe className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">{currentLang?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={language === lang.code ? 'bg-accent' : ''}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNewChat}
            className="ripple"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 app-content overflow-x-hidden" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary mb-6 animate-pulse">
              <img src={aiTeacherRobot} alt="AI Teacher" className="w-full h-full object-cover" />
            </div>
              <h3 className="text-2xl font-bold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Ask me anything about your lessons, homework, or any topic!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  "Explain photosynthesis",
                  "Help with math homework",
                  "History of Ethiopia",
                  "Science experiment ideas"
                ].map((prompt, idx) => (
                  <Card 
                    key={idx}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setMessage(prompt)}
                  >
                    <p className="text-sm font-medium">{prompt}</p>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="w-full max-w-[85%] flex flex-col items-end">
                    <p className="text-xs font-semibold mb-1 text-muted-foreground px-2">You</p>
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 w-full">
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* AI Message */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                    <img src={aiTeacherRobot} alt="AI Teacher" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-full max-w-[85%] flex flex-col">
                    <div className="flex items-center gap-2 mb-1 px-2">
                      <p className="text-xs font-semibold text-muted-foreground">AI Teacher</p>
                      {/* TTS Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-primary/10 transition-all"
                        onClick={() => handleSpeak(msg.response, msg.id)}
                        disabled={loadingTTS === msg.id}
                      >
                        {loadingTTS === msg.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : speakingMessageId === msg.id ? (
                          <VolumeX className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 w-full">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.response}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex-shrink-0">
                <img src={aiTeacherRobot} alt="AI Teacher" className="w-full h-full object-cover" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 space-y-2">
                {/* Translation Status Indicator */}
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                  {translationStatus === 'understanding' && (
                    <>🧠 Hubachaa jira... (Understanding...)</>
                  )}
                  {translationStatus === 'translating' && (
                    <>🔄 Hiikaa jira... (Translating...)</>
                  )}
                  {translationStatus === 'responding' && (
                    <>✨ Deebisaa qopheessaa jira... (Preparing response...)</>
                  )}
                </div>
                {retrying && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    🔄 Irra deebi'ee yaalaa jira... (Retrying...)
                  </div>
                )}
                <div className="flex space-x-2">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="app-footer border-t bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            {/* Voice Input Button with Gemini STT */}
            <Button
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              onClick={toggleListening}
              disabled={isProcessing}
              className={`shrink-0 ${isListening ? 'animate-pulse' : ''}`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            
            <AutoExpandingTextarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? "Listening..." : isProcessing ? "Processing..." : "Ask me anything..."}
              className="flex-1 min-h-[44px]"
              disabled={loading}
            />
            <Button 
              size="icon"
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
