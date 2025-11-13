import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, Send, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookAIChatProps {
  user: User;
  bookId: string;
  bookTitle: string;
  currentPage?: number;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const BookAIChat = ({ user, bookId, bookTitle, currentPage, onClose }: BookAIChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, [bookId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    const { data } = await supabase
      .from('book_ai_chats')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (data) {
      const formattedMessages: ChatMessage[] = [];
      data.forEach(chat => {
        formattedMessages.push({
          role: 'user',
          content: chat.question,
          timestamp: new Date(chat.created_at)
        });
        formattedMessages.push({
          role: 'assistant',
          content: chat.answer,
          timestamp: new Date(chat.created_at)
        });
      });
      setMessages(formattedMessages);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-book-helper', {
        body: {
          bookId,
          bookTitle,
          currentPage,
          question: userMessage
        }
      });

      if (error) throw error;

      const assistantMessage = data.answer || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage, timestamp: new Date() }]);

      // Save to database
      await supabase.from('book_ai_chats').insert({
        user_id: user.id,
        book_id: bookId,
        page_number: currentPage,
        question: userMessage,
        answer: assistantMessage
      });
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Summarize this page', icon: Sparkles },
    { label: 'Explain in simple terms', icon: BookOpen },
    { label: 'Create quiz questions', icon: Sparkles }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{bookTitle}</h3>
              <p className="text-xs text-muted-foreground">
                {currentPage ? `Page ${currentPage}` : 'AI Book Helper'}
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Ask me anything about this book!</h4>
              <p className="text-sm text-muted-foreground">
                I can summarize, explain concepts, or answer your questions.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-secondary text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setInput(action.label)}
                className="rounded-full whitespace-nowrap"
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 rounded-full"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookAIChat;
