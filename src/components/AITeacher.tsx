import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Bot, User as UserIcon, Sparkles, Plus, Image as ImageIcon, FileText } from 'lucide-react';

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
  const [language] = useState<'om'>('om'); // Only Afaan Oromo supported
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
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

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-oromo`;
      
      // Build conversation history for context
      const conversationMessages = messages.map(msg => ([
        { role: 'user', content: msg.message },
        { role: 'assistant', content: msg.response }
      ])).flat();
      
      // Add current message
      conversationMessages.push({ role: 'user', content: userMessage });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return "Maaloo yeroo muraasa booda yaali. Fedhiin baay'ee guddaa jira.";
        }
        if (response.status === 402) {
          return "Tajaajilli kun yeroo ammaa hin argamu. Maaloo booda yaali.";
        }
        throw new Error('Failed to get AI response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
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
              fullResponse += content;
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      return fullResponse || 'Deebiin hin argamne. Maaloo irra deebi\'ii yaali.';
    } catch (error) {
      console.error('Error getting AI response:', error);
      return 'Dhiifama, dogongora tokkotu uumame. Maaloo irra deebi\'ii yaali.';
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage('');
    setUploadedImage(null);
    setUploadedPDF(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !uploadedImage && !uploadedPDF) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');

    try {
      let contextMessage = userMessage;
      
      // Add context for uploaded files
      if (uploadedImage) {
        contextMessage += ' [User uploaded an image]';
      }
      if (uploadedPDF) {
        contextMessage += ' [User uploaded a PDF document]';
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(contextMessage);

      // Save to database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          language: 'om'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setMessages(prev => [...prev, data]);
      
      // Clear uploaded files after sending
      setUploadedImage(null);
      setUploadedPDF(null);

      // Log activity
      onLogActivity('ai_chat', `Barsiisaa AI gaafate: ${userMessage}`, {
        language: 'om',
        response_length: aiResponse.length,
        has_image: !!uploadedImage,
        has_pdf: !!uploadedPDF
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
      {/* Fixed Header - ChatGPT Style */}
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
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleNewChat}
          className="ripple"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area - ChatGPT Style */}
      <ScrollArea className="flex-1 app-content" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 animate-pulse">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Ask me anything about your lessons, homework, or any topic you'd like to learn!
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
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors ripple"
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
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="max-w-[80%] bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                  </div>
                </div>
              </div>
            ))
          )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3 px-2">
                    {/* User Message - Right Aligned */}
                    <div className="flex items-end gap-2 justify-end">
                      <div className="message-bubble-user text-white px-4 py-3 max-w-[80%] text-sm md:text-base">
                        <p className="break-words">{msg.message}</p>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center flex-shrink-0 shadow-neon">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    
                    {/* AI Response - Left Aligned */}
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-neon">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="message-bubble-ai text-foreground px-4 py-3 max-w-[80%] text-sm md:text-base">
                        <p className="break-words">{msg.response}</p>
                        <Badge variant="outline" className="mt-2 text-xs border-primary/30">
                          Afaan Oromoo
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex items-end gap-2 px-2">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-neon">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="message-bubble-ai px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* File Upload Indicators */}
            {(uploadedImage || uploadedPDF) && (
              <div className="flex gap-2">
                {uploadedImage && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Suuraa maxxanfame
                  </Badge>
                )}
                {uploadedPDF && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    PDF maxxanfame
                  </Badge>
                )}
              </div>
            )}
            
            {/* Message Input - Glass Style */}
            <div className="flex gap-2 p-2 glass-card rounded-2xl border-primary/20">
              <div className="flex gap-1">
                <label htmlFor="image-upload">
                  <Button type="button" variant="ghost" size="icon" disabled={loading} asChild className="hover:neon-glow-cyan">
                    <span className="cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-primary" />
                    </span>
                  </Button>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setUploadedImage(e.target.files?.[0] || null)}
                />
                
                <label htmlFor="pdf-upload">
                  <Button type="button" variant="ghost" size="icon" disabled={loading} asChild className="hover:neon-glow-cyan">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 text-primary" />
                    </span>
                  </Button>
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setUploadedPDF(e.target.files?.[0] || null)}
                />
              </div>
              
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 glass-input border-0 focus-visible:ring-primary"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={loading || (!message.trim() && !uploadedImage && !uploadedPDF)}
                className="gradient-primary shadow-neon hover:shadow-glow tap-scale"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}