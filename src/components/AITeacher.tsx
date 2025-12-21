import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Sparkles, Plus, Mic, MicOff, Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [isListening, setIsListening] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchChatHistory();
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript.trim();
          }
        }
        
        // Only add final transcripts, avoiding duplicates
        if (finalTranscript) {
          setMessage(prev => {
            const trimmedPrev = prev.trim();
            // Prevent duplicating if the transcript was already added
            if (trimmedPrev.endsWith(finalTranscript)) return prev;
            return trimmedPrev ? `${trimmedPrev} ${finalTranscript}` : finalTranscript;
          });
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update speech recognition language when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      const langConfig = LANGUAGES.find(l => l.code === language);
      recognitionRef.current.lang = langConfig?.speechCode || 'en-US';
    }
  }, [language]);

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

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        const langConfig = LANGUAGES.find(l => l.code === language);
        recognitionRef.current.lang = langConfig?.speechCode || 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
          useSearch: true, // Enable Google Search for real-time info
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
  const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

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
                    <p className="text-xs font-semibold mb-1 text-muted-foreground px-2">AI Teacher</p>
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
                    <>🌍 Gara Afaan Oromootti hiikaa jira... (Translating to Oromo...)</>
                  )}
                  {translationStatus === 'responding' && (
                    <>✨ Deebisaa kennaa jira... (Responding...)</>
                  )}
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - with mobile navigation padding */}
      <div className="border-t bg-background/95 backdrop-blur-xl p-4 pb-24 md:pb-4 safe-area-bottom overflow-x-hidden">
        <div className="max-w-3xl mx-auto flex gap-2 items-end overflow-x-hidden">
          <AutoExpandingTextarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask me anything... (Shift+Enter for new line)"
            className="rounded-2xl bg-muted border-0 flex-1 min-w-0"
            disabled={loading}
          />
          
          {/* Voice Input Button */}
          {hasSpeechRecognition && (
            <Button
              onClick={toggleListening}
              disabled={loading}
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              className={`rounded-full h-11 w-11 flex-shrink-0 transition-all ${
                isListening ? 'animate-pulse ring-2 ring-destructive ring-offset-2' : ''
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || loading}
            size="icon"
            className="rounded-full h-11 w-11 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Listening Indicator */}
        {isListening && (
          <div className="max-w-3xl mx-auto mt-2">
            <div className="flex items-center gap-2 text-xs text-destructive animate-pulse">
              <div className="flex gap-0.5">
                <span className="w-1 h-3 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <span className="w-1 h-2 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-5 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-3 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span>Listening in {currentLang?.name}...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
