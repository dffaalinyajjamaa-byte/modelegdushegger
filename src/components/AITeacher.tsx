import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Bot, Sparkles, Plus } from 'lucide-react';

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

export default function AITeacher({ user, onLogActivity }: AITeacherProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  const generateAIResponse = async (userMessage: string, retryCount = 0): Promise<string> => {
    try {
      setError(null);
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-oromo`;
      
      const conversationMessages = messages.map(msg => ([
        { role: 'user', content: msg.message },
        { role: 'assistant', content: msg.response }
      ])).flat();
      
      conversationMessages.push({ role: 'user', content: userMessage });

      console.log('[AI Teacher] Sending request to:', CHAT_URL);
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      console.log('[AI Teacher] Response status:', response.status);

      if (!response.ok) {
        if (response.status === 429) {
          setError("Fedhiin baay'ee guddaa jira. Maaloo daqiiqaa 1 booda yaali.");
          return "Maaloo yeroo muraasa booda yaali. Fedhiin baay'ee guddaa jira.";
        }
        if (response.status === 402) {
          setError("Tajaajilli kun yeroo ammaa hin argamu.");
          return "Tajaajilli kun yeroo ammaa hin argamu. Maaloo booda yaali.";
        }
        
        // Retry logic for transient errors
        if (retryCount < 2) {
          console.log(`[AI Teacher] Retrying... Attempt ${retryCount + 1}`);
          setRetrying(true);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          setRetrying(false);
          return generateAIResponse(userMessage, retryCount + 1);
        }
        
        throw new Error(`AI Teacher error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullResponse = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            if (dataStr === '[DONE]') {
              streamDone = true;
              break;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log('[AI Teacher] Parsed data:', data);
              
              // Lovable AI Gateway returns OpenAI-compatible format
              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;
                fullResponse += content;
                console.log('[AI Teacher] Received content chunk:', content.substring(0, 50));
              }
            } catch (e) {
              console.error('[AI Teacher] Error parsing line:', e, 'Line:', dataStr.substring(0, 100));
            }
          }
        }
      }

      console.log('[AI Teacher] Stream complete. Full response length:', fullResponse.length);
      
      if (!fullResponse || fullResponse.trim().length === 0) {
        console.error('[AI Teacher] Empty response received');
        return "Gaaffii kee hubadhe, garuu deebii kennuu hin dandeenye. Maaloo gaaffii biraa gaafadhu.";
      }
      
      return fullResponse;
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
    
    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    try {
      let aiResponse = await generateAIResponse(userMessage);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          language: 'om',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
      }

      onLogActivity('ai_chat', `Barsiisaa AI gaafate: ${userMessage}`, {
        language: 'om',
        response_length: aiResponse.length
      });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-screen">
      {/* Fixed Header */}
      <div className="app-header border-b bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base">AI Teacher</h2>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
      <ScrollArea className="flex-1 app-content" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 animate-pulse">
                <Sparkles className="w-10 h-10 text-white" />
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
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

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-xl p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
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
            className="rounded-2xl bg-muted border-0"
            disabled={loading}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || loading}
            size="icon"
            className="rounded-full h-11 w-11 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
