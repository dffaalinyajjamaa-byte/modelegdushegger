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
          const loadedMessages: ChatMessage[] = data.flatMap(msg => [
            { role: 'user' as const, content: msg.message, timestamp: new Date(msg.created_at).getTime() },
            { role: 'model' as const, content: msg.response, timestamp: new Date(msg.created_at).getTime() + 1 }
          ]);
          setMessages(prev => [...prev, ...loadedMessages]);
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
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Detect image request purely by keyword
      if (input.toLowerCase().includes('generate image') || input.toLowerCase().includes('draw')) {
        const imageUrl = await generateEducationalImage(input);
        setMessages(prev => [...prev, { role: 'model', content: 'Here is the image:', image: imageUrl, timestamp: Date.now() }]);
      } else {
        // Pass selected language for real-time translation/response generation
        const response = await generateTeacherResponse(userMsg.content, language, true, false);
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: response.text, 
          timestamp: Date.now(),
          groundingUrls: response.groundingChunks?.flatMap(c => 
            c.web ? [{ uri: c.web.uri, title: c.web.title || 'Source Link' }] : 
            c.maps ? [{ uri: c.maps.uri, title: c.maps.title || 'Map Location' }] : []
          ) 
        }]);

        // Save to Supabase
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          message: userMsg.content,
          response: response.text,
          language: LANG_CODES[language]?.split('-')[0] || 'om',
        });

        onLogActivity('ai_chat', `AI Chat: ${userMsg.content}`, { language });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, network error. Please try again.', isError: true, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = LANG_CODES[language] || 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      alert("Voice input is not supported in this browser.");
    }
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
    <div className="flex flex-col h-full bg-[#0b141a] overflow-hidden relative">
      {/* WhatsApp-style Header */}
      <div className="bg-[#202c33] p-3 flex items-center justify-between px-4 shadow-md z-10 border-b border-gray-700/30">
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

      {/* Chat Area */}
      <div 
        className="flex-1 bg-[#0b141a] overflow-y-auto p-4 relative scroll-smooth" 
        ref={scrollRef} 
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay', backgroundSize: '400px', backgroundColor: '#0b141a' }}
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
                          className="flex items-center gap-3 bg-[#111b21] hover:bg-[#182229] p-2.5 rounded-md transition-colors group border border-gray-800 hover:border-gray-600"
                        >
                          <div className="bg-blue-900/30 p-1.5 rounded shrink-0">
                            <Globe size={12} className="text-blue-400" />
                          </div>
                          <span className="text-xs text-gray-300 group-hover:text-blue-300 font-medium truncate">
                            {url.title || 'Visit Reference'}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Metadata */}
                <div className="flex justify-end items-center gap-1 mt-1">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'user' && <CheckCheck size={14} className="text-blue-400" />}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-[#202c33] rounded-xl p-4 px-5 rounded-tl-none shadow-sm flex items-center gap-1.5 w-fit">
                <motion.span 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                ></motion.span>
                <motion.span 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                ></motion.span>
                <motion.span 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                ></motion.span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area - with mobile navigation padding */}
      <div className="bg-[#202c33] p-3 pb-20 md:pb-3 flex items-end gap-2 z-20 border-t border-[#2a3942]">
        {/* Tools */}
        {!isListening && (
          <div className="flex gap-1 pb-1">
            <button 
              type="button"
              className="p-2 text-gray-400 hover:text-[#FCDD09] transition-colors rounded-full hover:bg-white/5" 
              aria-label="Add Emoji"
            >
              <Smile size={24} />
            </button>
          </div>
        )}

        {/* Input Field / Recording Visualization */}
        <div className={`flex-1 rounded-2xl px-4 py-3 flex items-center gap-2 border transition-all ${isListening ? 'bg-red-900/20 border-red-500/50' : 'bg-[#2a3942] border-transparent focus-within:border-[#008751]'}`}>
          {isListening ? (
            <div className="flex items-center justify-between w-full h-6">
              <div className="flex items-center gap-3 text-red-400 animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-mono font-bold">Listening ({LANG_LABELS[language]})...</span>
              </div>
              <div className="flex items-center gap-1 h-full">
                {[1,2,3,4,5,4,3,2].map((h, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [10, h*4, 10] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-1 bg-red-500 rounded-full"
                    style={{ height: 10 }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="bg-transparent border-none outline-none text-white w-full placeholder-gray-400 text-[16px]"
              aria-label="Type a message to the AI Teacher"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="pb-0.5 flex items-center gap-2">
          {input.trim() && !isListening ? (
            <button 
              type="button"
              onClick={handleSend}
              className="p-3.5 bg-[#008751] rounded-full text-white hover:bg-[#00a86b] transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
              aria-label="Send Message"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-3.5 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-[#008751] text-white hover:bg-[#00a86b]'
              }`}
              aria-label={isListening ? "Stop Recording" : "Start Voice Input"}
            >
              {isListening ? <Square size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiChat;
