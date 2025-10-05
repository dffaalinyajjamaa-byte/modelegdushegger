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
  const [language, setLanguage] = useState<'en' | 'om'>('en');
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

  const generateAIResponse = async (userMessage: string, selectedLanguage: string) => {
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
      const aiResponse = await generateAIResponse(contextMessage, language);

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

      // Update local state
      setMessages(prev => [...prev, data]);
      
      // Clear uploaded files after sending
      setUploadedImage(null);
      setUploadedPDF(null);

      // Log activity
      onLogActivity('ai_chat', `Asked AI teacher: ${userMessage}`, {
        language,
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
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Teacher</CardTitle>
                <p className="text-muted-foreground">Your personal learning assistant</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
              <Button
                variant={language === 'om' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('om')}
              >
                Afaan Oromo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat Messages */}
            <ScrollArea className="h-96 pr-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg">
                      {language === 'en' 
                        ? "Start a conversation with your AI teacher!" 
                        : "Barsiisaa AI kee wajjin haasa'uu jalqabi!"
                      }
                    </p>
                    <p className="text-sm mt-2">
                      {language === 'en'
                        ? "Ask about Herrega, Saayinsii, study tips, or any learning topic."
                        : "Waa'ee Herrega, Saayinsii, gorsa barnoota, ykn mata duree barnoota kamiyyuu gaafi."
                      }
                    </p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {/* User Message */}
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-xs shadow-elegant">
                        <p>{msg.message}</p>
                      </div>
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2 max-w-xs">
                        <p>{msg.response}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {msg.language === 'en' ? 'English' : 'Afaan Oromo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
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
            
            {/* File Upload Indicators */}
            {(uploadedImage || uploadedPDF) && (
              <div className="flex gap-2">
                {uploadedImage && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Image attached
                  </Badge>
                )}
                {uploadedPDF && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    PDF attached
                  </Badge>
                )}
              </div>
            )}
            
            {/* Message Input */}
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
                    ? "Ask your AI teacher anything..." 
                    : "Barsiisaa AI kee waan kamiyyuu gaafi..."
                }
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={loading || (!message.trim() && !uploadedImage && !uploadedPDF)}
                variant="primary"
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