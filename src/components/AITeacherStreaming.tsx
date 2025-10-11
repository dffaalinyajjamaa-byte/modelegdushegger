import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Bot, User as UserIcon, Sparkles, Plus, Image as ImageIcon, FileText, History, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

export default function AITeacherStreaming({ user, onLogActivity }: AITeacherProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'om'>('en');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setChatHistory(data || []);
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

  const streamAIResponse = async (userMessage: string, selectedLanguage: string) => {
    try {
      const languagePrefix = selectedLanguage === 'om' 
        ? 'Please respond in Afaan Oromoo: ' 
        : '';

      const response = await fetch(
        'https://pdlugfyvocudumhdescp.supabase.co/functions/v1/ai-chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: languagePrefix + userMessage }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return data.response || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Error getting AI response:', error);
      return selectedLanguage === 'en' 
        ? 'I apologize, but I encountered an error. Please try again.'
        : 'Dhiifama, dogongora tokkotu uumame. Maaloo irra deebii yaali.';
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage('');
    setUploadedImage(null);
    setUploadedPDF(null);
    setStreamingResponse('');
  };

  const loadHistoryChat = (chatMsg: ChatMessage) => {
    setMessages([chatMsg]);
    setStreamingResponse('');
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !uploadedImage && !uploadedPDF) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');
    setStreamingResponse('');

    try {
      let contextMessage = userMessage;
      
      if (uploadedImage) {
        contextMessage += ' [User uploaded an image for analysis]';
      }
      if (uploadedPDF) {
        contextMessage += ' [User uploaded a PDF document for analysis]';
      }

      // Simulate streaming by getting response and displaying it gradually
      const aiResponse = await streamAIResponse(contextMessage, language);
      
      // Simulate character-by-character streaming
      let currentText = '';
      for (let i = 0; i < aiResponse.length; i++) {
        currentText += aiResponse[i];
        setStreamingResponse(currentText);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Save to database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          language: language
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setStreamingResponse('');
      
      setUploadedImage(null);
      setUploadedPDF(null);

      fetchChatHistory();

      onLogActivity('ai_chat', `Asked AI teacher: ${userMessage}`, {
        language,
        response_length: aiResponse.length,
        has_image: !!uploadedImage,
        has_pdf: !!uploadedPDF
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
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
    <div className="max-w-4xl mx-auto space-y-4 p-4 md:p-0">
      <Card className="shadow-glow animate-pulse-glow mobile-card">
        <CardHeader className="mobile-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center animate-float">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl">AI Teacher</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground">ChatGPT-style learning assistant</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Recent Questions</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-full mt-4">
                    <div className="space-y-2">
                      {chatHistory.map((chat) => (
                        <div
                          key={chat.id}
                          className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-smooth"
                          onClick={() => loadHistoryChat(chat)}
                        >
                          <p className="text-sm font-medium truncate">{chat.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(chat.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={handleNewChat}>
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">New</span>
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                EN
              </Button>
              <Button
                variant={language === 'om' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('om')}
              >
                OM
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <ScrollArea className="h-[60vh] md:h-96 pr-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && !streamingResponse && (
                  <div className="text-center py-8 text-muted-foreground animate-fade-in">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-float" />
                    <p className="text-lg font-semibold">
                      {language === 'en' 
                        ? "Start a conversation with your AI teacher!" 
                        : "Barsiisaa AI kee wajjin haasa'uu jalqabi!"
                      }
                    </p>
                    <p className="text-sm mt-2">
                      {language === 'en'
                        ? "Ask about Math, Science, study tips, or upload images/PDFs for analysis."
                        : "Waa'ee Herrega, Saayinsii, gorsa barnoota gaafi, ykn suuraa/PDF fe'i."
                      }
                    </p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3 animate-fade-in">
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 max-w-[85%] md:max-w-xs shadow-elegant">
                        <p className="text-sm md:text-base">{msg.message}</p>
                      </div>
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%] md:max-w-xs">
                        <p className="text-sm md:text-base whitespace-pre-wrap">{msg.response}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {msg.language === 'en' ? 'English' : 'Afaan Oromo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {streamingResponse && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%] md:max-w-xs">
                        <p className="text-sm md:text-base whitespace-pre-wrap">{streamingResponse}</p>
                        <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse">|</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {loading && !streamingResponse && (
                  <div className="flex items-start gap-3 animate-fade-in">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {(uploadedImage || uploadedPDF) && (
              <div className="flex gap-2 flex-wrap">
                {uploadedImage && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" />
                    {uploadedImage.name}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setUploadedImage(null)} />
                  </Badge>
                )}
                {uploadedPDF && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    {uploadedPDF.name}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setUploadedPDF(null)} />
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="flex gap-1">
                <label htmlFor="image-upload">
                  <Button type="button" variant="outline" size="icon" disabled={loading} asChild>
                    <span className="cursor-pointer">
                      <ImageIcon className="w-4 h-4" />
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
                  <Button type="button" variant="outline" size="icon" disabled={loading} asChild>
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4" />
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
                placeholder={
                  language === 'en' 
                    ? "Ask anything..." 
                    : "Waan kamiyyuu gaafi..."
                }
                disabled={loading}
                className="flex-1 rounded-2xl"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={loading || (!message.trim() && !uploadedImage && !uploadedPDF)}
                className="gradient-primary text-white rounded-2xl hover-scale"
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
