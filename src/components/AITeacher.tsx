import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';

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
    // Simulate AI response based on language and content
    const responses = {
      en: {
        greeting: "Hello! I'm your AI teacher. How can I help you learn today?",
        herrega: "Herrega is a beautiful subject! Let me help you understand the concepts better. Based on your question, I recommend watching the Herrega Grade 8 video lessons available in your content library.",
        saayinsii: "Science (Saayinsii) is fascinating! For Grade 8 Saayinsii, we have excellent video lessons that explain complex concepts in simple terms. Would you like me to guide you to specific topics?",
        task: "I can help you manage your study tasks! Try creating specific, measurable goals like 'Complete Chapter 3 exercises' or 'Review Herrega Unit 2 notes'.",
        motivation: "You're doing amazing! Remember, every expert was once a beginner. Keep learning, keep growing! 🌟",
        default: "That's a great question! I'm here to help you learn. You can ask me about Herrega, Saayinsii, study tips, or anything related to your education. I can also recommend video lessons and study materials from your content library."
      },
      om: {
        greeting: "Akkam! Ani barsiisaa AI kee ti. Har'a barnoota kee keessatti akkamitti si gargaaruu danda'a?",
        herrega: "Herrega barnoota bareedduu dha! Yaad-rimee kana caalaatti akka hubattu si gargaaruu danda'a. Gaaffii kee irratti hundaa'uudhaan, viidiyoo barnootaa Herrega Kutaa 8 mana kitaaba qabiyyee kee keessatti argamu ilaaluu si gorsa.",
        saayinsii: "Saayinsii (Science) nama hawwata! Saayinsii Kutaa 8tiif, viidiyoo barnoota gaarii yaad-rimee walxaxaa karaa salphaadhaan ibsan qabna. Mata duree addaa tokkotti si qajeelchuu barbaaddaa?",
        task: "Hojiiwwan barnoota kee bulchuuf si gargaaruu danda'a! Galma addaa fi tilmaamamuu uumuu yaali akka 'Shoora 3 shaakala xumuruun' ykn 'Herrega Yuunitii 2 yaadannoo gamaaggamuu'.",
        motivation: "Ati hojii gaarii hojjechaa jirta! Yaadadhu, ogeessi hundi jalqaba barataa turaniiru. Baruu itti fufi, guddachuu itti fufi! 🌟",
        default: "Gaaffiin kee gaarii dha! Akka bartu si gargaaruuf as jira. Waa'ee Herrega, Saayinsii, gorsa barnoota, ykn wanti barnoota keetiin walqabatu tokko illee na gaafachuu dandeessa. Akkasumas viidiyoo barnoota fi meeshaalee barnoota mana kitaaba qabiyyee keetii gorsuun danda'a."
      }
    };

    const langResponses = responses[selectedLanguage];
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('akkam')) {
      return langResponses.greeting;
    } else if (lowerMessage.includes('herrega')) {
      return langResponses.herrega;
    } else if (lowerMessage.includes('saayinsii') || lowerMessage.includes('science')) {
      return langResponses.saayinsii;
    } else if (lowerMessage.includes('task') || lowerMessage.includes('hojii')) {
      return langResponses.task;
    } else if (lowerMessage.includes('motivation') || lowerMessage.includes('encourage')) {
      return langResponses.motivation;
    } else {
      return langResponses.default;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');

    try {
      // Generate AI response
      const aiResponse = await generateAIResponse(userMessage, language);

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

      // Log activity
      onLogActivity('ai_chat', `Asked AI teacher: ${userMessage}`, {
        language,
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
            
            {/* Message Input */}
            <div className="flex gap-2">
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
                disabled={loading || !message.trim()}
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