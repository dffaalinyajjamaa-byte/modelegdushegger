import React, { useEffect, useRef, useState } from 'react';
import { Mic, X, Loader2, Waves } from 'lucide-react';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, getAudioContext } from '@/services/audioUtils';
import HologramAvatar from './HologramAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface LiveTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LiveTeacherModal: React.FC<LiveTeacherModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null); 
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // WebSocket & Session Management
  const wsRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isSessionActive = useRef<boolean>(false);
  
  // Audio Visualization Ref
  const animationFrameRef = useRef<number>(0);
  const audioLevelRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  const startSession = async () => {
    try {
      if (isSessionActive.current) return;

      setError(null);
      setStatus("Starting Gemini Live...");
      setUserTranscript("");
      setIsProcessing(false);
      
      // Get WebSocket URL from edge function
      const { data: wsData, error: wsError } = await supabase.functions.invoke('gemini-live', {
        body: { action: 'get-ws-url' }
      });

      if (wsError || !wsData?.wsUrl) {
        throw new Error(wsError?.message || "Failed to get WebSocket URL");
      }

      // Create audio contexts
      const inputCtx = getAudioContext(16000);
      inputAudioContextRef.current = inputCtx;

      const outputCtx = getAudioContext(24000);
      audioContextRef.current = outputCtx;
      
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 64;
      analyserRef.current = outputAnalyser;
      
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 64;
      inputAnalyserRef.current = inputAnalyser;

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      
      // Get microphone stream
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = audioStream;

      const source = inputCtx.createMediaStreamSource(audioStream);
      sourceRef.current = source;
      source.connect(inputAnalyser);

      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      inputAnalyser.connect(processor);
      processor.connect(inputCtx.destination);

      isSessionActive.current = true;

      // Connect to WebSocket
      const ws = new WebSocket(wsData.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSessionActive.current) return;
        
        // Send setup message
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.5-flash-preview-native-audio-dialog',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
              },
            },
            systemInstruction: {
              parts: [{
                text: `You are Model Egdu, an advanced AI teacher and real-time translator for Ethiopian students. 
                Respond ALWAYS in AFAAN OROMOO. 
                You are capable of teaching complex Grade 8 concepts and providing instant translations.
                Speak clearly, concisely, and maintain a professional yet encouraging tone.
                This is an audio-only session.`
              }]
            }
          }
        }));

        setIsConnected(true);
        setStatus("Online");
        visualize();

        // Audio feed
        processor.onaudioprocess = (e) => {
          if (!isSessionActive.current || ws.readyState !== WebSocket.OPEN) return; 
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: pcmBlob.mimeType,
                data: pcmBlob.data
              }]
            }
          }));
        };
      };

      ws.onmessage = async (event) => {
        if (!isSessionActive.current) return;

        try {
          const msg = JSON.parse(event.data);

          if (msg.serverContent?.inputTranscription) {
            setUserTranscript(msg.serverContent.inputTranscription.text || "");
            setIsProcessing(true);
          }

          if (msg.serverContent?.turnComplete) {
            setIsTalking(false);
            setIsProcessing(false);
            setTimeout(() => { if (isSessionActive.current) setUserTranscript(""); }, 4000);
          }

          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            setIsProcessing(false);
            setIsTalking(true);
            const ctx = audioContextRef.current;
            if (!ctx) return;
            
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000, 1);
            
            const audioSource = ctx.createBufferSource();
            audioSource.buffer = buffer;
            audioSource.connect(analyserRef.current!);
            analyserRef.current!.connect(ctx.destination);
            
            audioSource.addEventListener('ended', () => {
              scheduledSourcesRef.current.delete(audioSource);
              if (scheduledSourcesRef.current.size === 0) setIsTalking(false);
            });
            audioSource.start(nextStartTimeRef.current);
            scheduledSourcesRef.current.add(audioSource);
            nextStartTimeRef.current += buffer.duration;
          }

          if (msg.serverContent?.interrupted) {
            scheduledSourcesRef.current.forEach(s => s.stop());
            scheduledSourcesRef.current.clear();
            setIsTalking(false);
            nextStartTimeRef.current = 0;
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      ws.onclose = () => stopSession();
      ws.onerror = () => stopSession();

    } catch (err) {
      console.error('Session error:', err);
      setError("Connection failed. Try again.");
      stopSession();
    }
  };

  const visualize = () => {
    if (!isSessionActive.current) return;
    const dataArray = new Uint8Array(64);
    const currentAnalyser = isTalking ? analyserRef.current : inputAnalyserRef.current;
    if (currentAnalyser) {
      currentAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < 64; i++) sum += dataArray[i];
      audioLevelRef.current = Math.min(1, (sum / 64) / 45); 
    }
    animationFrameRef.current = requestAnimationFrame(visualize);
  };

  const stopSession = async () => {
    isSessionActive.current = false;
    cancelAnimationFrame(animationFrameRef.current);

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    if (processorRef.current) try { processorRef.current.disconnect(); } catch (e) {}
    if (sourceRef.current) try { sourceRef.current.disconnect(); } catch (e) {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    
    scheduledSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    scheduledSourcesRef.current.clear();
    
    if (audioContextRef.current) await audioContextRef.current.close().catch(() => {});
    if (inputAudioContextRef.current) await inputAudioContextRef.current.close().catch(() => {});
    
    setIsConnected(false);
    setIsTalking(false);
    setIsProcessing(false);
    setStatus("");
    audioLevelRef.current = 0;
  };

  if (!isOpen) return null;

  const avatarState: 'idle' | 'listening' | 'speaking' | 'thinking' = 
    !isConnected ? 'idle' : isTalking ? 'speaking' : isProcessing ? 'thinking' : 'listening';

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
      <div className="bg-[#050505] w-full max-w-2xl h-full md:h-auto rounded-none md:rounded-[3rem] border-none md:border md:border-white/10 shadow-[0_0_120px_rgba(0,135,81,0.25)] flex flex-col overflow-hidden relative">
        
        {/* Futuristic Header */}
        <div className="p-6 md:p-8 flex justify-between items-center border-b border-white/5 bg-black/40 z-30">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#008751] animate-pulse shadow-[0_0_15px_#008751]' : 'bg-gray-700'}`} />
            <div>
              <h3 className="text-xl md:text-2xl font-black brand-font text-white tracking-widest uppercase">MODEL EGDU <span className="text-[#008751]">LIVE</span></h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em]">Gemini AI Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Immersive Viewport */}
        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-[#020202] min-h-[400px]">
          {/* Background Viz */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <HologramAvatar state={avatarState} className="w-full h-full scale-150 blur-3xl" audioLevelRef={audioLevelRef} />
          </div>

          <div className="relative z-10 w-full flex flex-col items-center gap-16">
            <div className="w-72 h-72 md:w-80 md:h-80 relative group">
              <HologramAvatar state={avatarState} className="w-full h-full" audioLevelRef={audioLevelRef} />
              {isTalking && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.3 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute -inset-8 rounded-full border border-[#008751]/10 blur-xl pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Shared Transcript Overlay */}
          <div className="absolute bottom-16 left-0 w-full px-12 z-30 pointer-events-none">
            <AnimatePresence mode="wait">
              {userTranscript ? (
                <motion.div 
                  key="transcript"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mx-auto max-w-2xl bg-black/60 backdrop-blur-md border border-[#008751]/30 p-4 rounded-3xl text-center shadow-2xl"
                >
                  <p className="text-green-400 font-bold text-lg md:text-xl italic leading-tight">
                    "{userTranscript}"
                  </p>
                </motion.div>
              ) : status && !isConnected && (
                <motion.div 
                  key="status"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <span className="text-gray-500 text-[12px] font-black uppercase tracking-[0.6em] animate-pulse">
                    {status}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Display */}
          {error && (
            <div className="absolute bottom-32 left-0 w-full px-12 z-30">
              <div className="mx-auto max-w-md bg-red-900/50 border border-red-500/30 p-3 rounded-xl text-center">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Futuristic Control Panel */}
        <div className="p-8 md:p-10 bg-black/80 border-t border-white/5 flex flex-col items-center gap-10 z-40">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-10 w-full animate-in slide-in-from-bottom-6 duration-500">
              <div className="text-center max-w-md">
                <h4 className="text-[#008751] font-black uppercase tracking-widest text-xs mb-2">Voice Classroom</h4>
                <p className="text-gray-400 text-sm">Speak with Model Egdu in Afaan Oromoo for tutoring or instant translation.</p>
              </div>

              <button 
                onClick={startSession} 
                disabled={!!status}
                className="group relative flex items-center gap-6 bg-[#008751] text-white px-16 md:px-20 py-6 md:py-8 rounded-[3rem] font-black text-xl md:text-2xl hover:bg-[#00a86b] transition-all shadow-[0_0_50px_rgba(0,135,81,0.4)] active:scale-95 disabled:opacity-50"
              >
                {status ? <Loader2 className="animate-spin w-8 h-8" /> : <Mic size={32} />}
                <span className="tracking-tighter uppercase">{status ? "Initializing..." : "Begin Live Session"}</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-8 max-w-4xl px-4">
              {/* Active Session Indicator */}
              <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/10 shadow-inner">
                <Waves className="text-[#008751] animate-pulse" size={24} />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-[#008751] uppercase tracking-[0.3em]">Live Feed</span>
                  <span className="text-white text-[10px] font-bold uppercase">Multimodal AI</span>
                </div>
              </div>

              {/* Real-time Audio Visualizer Segment */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-end px-1">
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">{isTalking ? 'AI Responding' : 'Listening...'}</span>
                  <div className="flex gap-1 h-4 items-end">
                    {[...Array(8)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ 
                          height: isTalking ? [4, 16, 4] : (audioLevelRef.current > 0.1 ? [4, 10, 4] : [4, 4, 4]) 
                        }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.05 }}
                        className={`w-1 rounded-full ${isTalking ? 'bg-[#008751]' : 'bg-[#FCDD09]'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <motion.div 
                    animate={{ width: `${audioLevelRef.current * 100}%` }}
                    className={`h-full rounded-full transition-all ${isTalking ? 'bg-[#008751]' : 'bg-[#FCDD09]'}`}
                  />
                </div>
              </div>

              {/* End Session Button */}
              <button 
                onClick={() => { stopSession(); onClose(); }}
                className="p-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-2xl text-red-400 transition-all"
              >
                <X size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTeacherModal;
