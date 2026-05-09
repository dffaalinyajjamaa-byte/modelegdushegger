import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Smile, Mic, CheckCheck, Languages, Globe, Square } from 'lucide-react';
import { generateTeacherResponse, generateEducationalImage } from '@/services/geminiService';
import { ChatMessage } from '@/types/chat';
import HologramAvatar from './HologramAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useLearningTime } from '@/hooks/use-learning-time';
import { GlassTypingDots } from './ui/skeleton-glass';

interface AiChatProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

const LANG_CODES: Record<string, string> = {
  'Afaan Oromoo': 'om-ET',
  'English': 'en-US',
  'Amharic': 'am-ET'
};

const LANG_LABELS: Record<string, string> = {
  'Afaan Oromoo': 'OM',
  'English': 'EN',
  'Amharic': 'AM'
};

const AiChat: React.FC<AiChatProps> = ({ user, onLogActivity }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Hello! I am your AI Teacher. How can I help you with your studies today?', timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<string>('Afaan Oromoo');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Time spent in AI chat counts as study time
  useLearningTime(user.id, true);

  // Load chat history from Supabase
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
          const loadedMessages: ChatMessage[] = [];
          data.forEach((msg) => {
            loadedMessages.push({ role: 'user', content: msg.message, timestamp: new Date(msg.created_at).getTime() });
            if (msg.response) {
              loadedMessages.push({ role: 'system', content: msg.response, timestamp: new Date(msg.created_at).getTime() + 1 });
            }
          });
          setMessages(prev => [prev[0], ...loadedMessages]);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchChatHistory();
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveChatMessage = async (message: string, response: string) => {
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        message,
        response,
        language
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
      const shouldGenerateImage = userMessage.toLowerCase().includes('draw') || 
        userMessage.toLowerCase().includes('image') ||
        userMessage.toLowerCase().includes('picture') ||
        userMessage.toLowerCase().includes('show me') ||
        userMessage.toLowerCase().includes('fakkii');

      let imageUrl: string | undefined;
      if (shouldGenerateImage) {
        try { imageUrl = await generateEducationalImage(userMessage); } catch (e) { console.error('Image gen error:', e); }
      }

      const response = await generateTeacherResponse(userMessage, language);
      const responseText = typeof response === 'string' ? response : response.text;
      const groundingUrls = typeof response === 'string' ? undefined : response.groundingChunks?.filter(c => c.web).map(c => ({ uri: c.web!.uri, title: c.web!.title || '' }));
      const newMessage: ChatMessage = {
        role: 'system',
        content: responseText,
        timestamp: Date.now(),
        image: imageUrl,
        groundingUrls
      };
      setMessages(prev => [...prev, newMessage]);
      await saveChatMessage(userMessage, responseText);
      onLogActivity('ai_chat', `AI Chat in ${language}: ${userMessage.slice(0, 50)}...`);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'system', content: 'Sorry, I encountered an error. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODES[language] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const languages = ['Afaan Oromoo', 'English', 'Amharic'];

  return (
    <div className="mx-auto max-w-2xl w-full pt-2 pb-32 md:pb-6 px-2 md:px-4 min-h-screen flex flex-col">
      {/* Compact Messege header — pill dropdown */}
      <div className="lg-island lg-press sticky top-2 z-30 mx-1 mb-3 flex items-center justify-between px-3 py-2 rounded-full">
        <button
          aria-label="Menu"
          className="w-8 h-8 rounded-full lg-glass flex items-center justify-center"
        >
          <MoreVertical size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowLangMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold tracking-tight"
          >
            Messege
            <span className="text-[10px] font-medium text-muted-foreground ml-1">{LANG_LABELS[language]}</span>
            <Languages size={12} className="opacity-60" />
          </button>
          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                className="absolute left-1/2 -translate-x-1/2 top-10 lg-glass rounded-2xl py-1 w-44 z-50 shadow-xl"
              >
                {languages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between rounded-xl transition-colors hover:bg-foreground/5 ${language === lang ? 'font-semibold' : ''}`}
                  >
                    {lang}
                    {language === lang && <CheckCheck size={14} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button aria-label="Voice" className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md lg-press">
          <Mic size={14} />
        </button>
      </div>

      {/* Messages — glass bubbles */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-1 space-y-3 scroll-smooth overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="log"
        aria-live="polite"
      >
        <div className="flex justify-center my-3">
          <span className="lg-glass text-muted-foreground text-[10px] font-medium uppercase tracking-wider px-3 py-1 rounded-full">Today</span>
        </div>

        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] px-4 py-3 text-[14px] leading-relaxed border shadow-[0_2px_18px_-8px_rgba(0,0,0,0.15)] ${
                msg.role === 'user'
                  ? 'bg-foreground/95 text-background border-foreground/20 rounded-[26px] rounded-br-[10px]'
                  : 'lg-glass border-white/30 dark:border-white/10 rounded-[26px] rounded-bl-[10px]'
              }`}
            >
              {msg.image && (
                <div className="mb-2.5 rounded-2xl overflow-hidden">
                  <img src={msg.image} alt="" className="w-full h-auto object-cover" />
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-2 border-t border-foreground/10">
                  <p className="text-[10px] uppercase opacity-60 font-semibold mb-1.5 tracking-wider">Sources</p>
                  <div className="flex flex-col gap-1.5">
                    {msg.groundingUrls.map((url, i) => (
                      <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors">
                        <Globe size={11} className="opacity-70 shrink-0" />
                        <span className="text-[11px] truncate opacity-80">{url.title || url.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className={`flex items-center gap-1 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] opacity-50">{formatTime(msg.timestamp)}</span>
                {msg.role === 'user' && <CheckCheck size={12} className="opacity-70" />}
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="lg-glass rounded-[26px] rounded-bl-[10px] px-4 py-3 border border-white/30 dark:border-white/10">
              <GlassTypingDots />
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating glass composer — sits a bit above the bottom nav */}
      <div
        className="fixed left-0 right-0 z-30 px-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="lg-glass rounded-[32px] border border-white/30 dark:border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] flex items-end gap-2 px-2.5 py-2">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-foreground/70 hover:bg-foreground/5 transition-colors" aria-label="Emoji">
              <Smile size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message in ${language}...`}
              className="flex-1 bg-transparent text-[15px] py-2.5 placeholder:text-foreground/40 focus:outline-none"
            />
            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-md active:scale-90 transition-transform disabled:opacity-50"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-foreground text-background'
                }`}
                aria-label={isListening ? 'Stop' : 'Voice'}
              >
                {isListening ? <Square size={16} /> : <Mic size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
