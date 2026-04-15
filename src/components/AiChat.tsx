import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Smile, Mic, CheckCheck, Languages, Globe, Square } from 'lucide-react';
import { generateTeacherResponse, generateEducationalImage } from '@/services/geminiService';
import { ChatMessage } from '@/types/chat';
import HologramAvatar from './HologramAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100vh-6rem)] bg-[#0b141a] overflow-hidden relative rounded-xl">
      {/* WhatsApp-style Header */}
      <div className="bg-[#202c33] p-3 flex items-center justify-between px-4 shadow-md z-10 border-b border-gray-700/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-600 bg-black">
            <HologramAvatar state={isLoading ? 'thinking' : 'idle'} className="w-full h-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-100 font-semibold text-sm">AI Teacher</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              {isLoading ? 'typing...' : (
                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> online</>
              )}
              <span className="mx-1">•</span> {language}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400 relative">
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={`p-2 rounded-full transition-all ${showLangMenu ? 'bg-white/10 text-[#FCDD09]' : 'hover:text-white hover:bg-white/5'}`}
              aria-label="Change Response Language"
            >
              <Languages size={20} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 bg-[#202c33] border border-gray-700 rounded-lg shadow-xl w-40 py-1 z-50 overflow-hidden"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${language === lang ? 'text-[#008751] font-bold' : 'text-gray-300'}`}
                    >
                      {lang}
                      {language === lang && <CheckCheck size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="p-1 hover:text-white hover:bg-white/5 rounded-full transition-colors" aria-label="More Options">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area - scrollable */}
      <div 
        className="flex-1 overflow-y-auto p-4 pb-6 relative scroll-smooth min-h-0 overscroll-contain" 
        ref={scrollRef} 
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay', backgroundSize: '400px', backgroundColor: '#0b141a', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="absolute inset-0 bg-[#0b141a]/93 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-3" role="log" aria-live="polite">
          {/* Date Divider */}
          <div className="flex justify-center my-6">
            <span className="bg-[#202c33] text-gray-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm border border-gray-800">Today</span>
          </div>

          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-xl p-3 px-4 relative shadow-sm text-[14px] leading-relaxed ${
                msg.role === 'user' ? 'bg-[#005c4b] text-white rounded-tr-sm shadow-md' : 'bg-[#202c33] text-gray-100 rounded-tl-sm shadow-md'
              }`}>
                {msg.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img src={msg.image} alt="Generated visual" className="w-full h-auto object-cover" />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {/* Grounding Sources */}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-700/50">
                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-2 tracking-wider">Sources Used</p>
                    <div className="flex flex-col gap-2">
                      {msg.groundingUrls.map((url, i) => (
                        <a 
                          key={i} 
                          href={url.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-gray-700/40"
                        >
                          <Globe size={12} className="text-blue-400 shrink-0" />
                          <span className="text-[11px] text-blue-300 truncate">{url.title || url.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className={`flex items-center gap-1 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'user' && <CheckCheck size={14} className="text-blue-400" />}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[#202c33] rounded-xl rounded-tl-sm p-3 px-4 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-gray-500 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#202c33] p-3 flex items-center gap-2 border-t border-gray-700/30 shrink-0">
        <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors" aria-label="Emoji">
          <Smile size={22} />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={`Type a message in ${language}...`}
          className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00a884] transition-all"
        />
        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#00a884]/90 transition-all active:scale-90 disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00a884] text-white hover:bg-[#00a884]/90'
            }`}
            aria-label={isListening ? 'Stop' : 'Voice'}
          >
            {isListening ? <Square size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default AiChat;
