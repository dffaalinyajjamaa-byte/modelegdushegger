import React, { useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Mic, X, Radio, Loader2, ArrowLeft } from 'lucide-react';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '@/services/audioUtils';
import HologramAvatar from './HologramAvatar';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface LiveTeacherProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
  onBack?: () => void;
}

export default function LiveTeacher({ user, onLogActivity, onBack }: LiveTeacherProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const { toast } = useToast();

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Advanced Audio Processing Refs
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  
  // WebSocket Session Management
  const wsRef = useRef<WebSocket | null>(null);
  const isSessionActive = useRef<boolean>(false);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Audio Visualization Ref
  const animationFrameRef = useRef<number>(0);
  const audioLevelRef = useRef(0);

  // Keyboard handling for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const handleClose = () => {
    stopSession();
    onBack?.();
  };

  const startSession = async () => {
    try {
      if (isConnected || isSessionActive.current) return;

      await stopSession();
      setError(null);
      setStatus("Walqabaachaa jira... (Connecting...)");
      setUserTranscript("");
      setIsProcessing(false);
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // Input Context (16kHz for speech recognition)
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;

      // Output Context (24kHz for Gemini voice)
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      // Audio Analysers for Visuals
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 32;
      outputAnalyser.smoothingTimeConstant = 0.8;
      analyserRef.current = outputAnalyser;
      
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 32;
      inputAnalyser.smoothingTimeConstant = 0.8;
      inputAnalyserRef.current = inputAnalyser;

      // Resume audio contexts if suspended
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      
      // Get Microphone Stream with enhanced audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Audio Processing Graph
      const source = inputCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // High-pass Filter (removes low rumble < 85Hz)
      const filter = inputCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 85;
      filterRef.current = filter;

      // Dynamics Compressor
      const compressor = inputCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressorRef.current = compressor;

      // Connect Graph: Source -> Filter -> Compressor -> [Analyser, Processor]
      source.connect(filter);
      filter.connect(compressor);
      compressor.connect(inputAnalyser);

      // ScriptProcessor for capturing audio
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      compressor.connect(processor);
      processor.connect(inputCtx.destination);

      isSessionActive.current = true;

      // Connect to edge function via WebSocket
      const wsUrl = `wss://asqxdhqcqexoxodrnjal.functions.supabase.co/gemini-live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to edge function");
        setStatus("Walqabame... (Connected)");
        
        // Start Visualizer Loop
        visualize();

        // Process Audio Chunks
        processor.onaudioprocess = (e) => {
          if (!isSessionActive.current || ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          
          try {
            ws.send(JSON.stringify({
              type: 'audio',
              data: pcmBlob.data
            }));
          } catch (err) {
            // Ignore send errors during state changes
          }
        };
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (!isSessionActive.current) return;

        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setIsConnected(true);
            setIsTalking(false);
            setIsProcessing(false);
            setStatus("Dhageeffachaa jira... (Listening...)");
          }
          
          if (data.type === 'audio') {
            setIsProcessing(false);
            setIsTalking(true);
            
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            
            try {
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(data.data),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              analyserRef.current!.connect(ctx.destination);

              source.addEventListener('ended', () => {
                scheduledSourcesRef.current.delete(source);
                if (scheduledSourcesRef.current.size === 0) {
                  setIsTalking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              scheduledSourcesRef.current.add(source);
              nextStartTimeRef.current += audioBuffer.duration;
            } catch (e) {
              console.error("Decoding error", e);
            }
          }
          
          if (data.type === 'text') {
            setUserTranscript(data.content);
            setIsProcessing(true);
          }
          
          if (data.type === 'turn_complete') {
            setIsTalking(false);
            setIsProcessing(false);
            setTimeout(() => {
              if (isSessionActive.current) setUserTranscript("");
            }, 2000);
            
            onLogActivity('ai_interactions', 'Live Teacher interaction', {
              transcript: userTranscript
            });
          }
          
          if (data.type === 'error') {
            setError(data.message);
          }
          
          if (data.type === 'disconnected') {
            setIsConnected(false);
            setStatus("Addaan citame (Disconnected)");
          }
        } catch (e) {
          console.error("Error processing message:", e);
        }
      };

      ws.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
        setError("Rakkoo walqunnaamtii (Connection Error)");
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (isSessionActive.current) {
          setIsConnected(false);
          setStatus("");
        }
      };

    } catch (err) {
      console.error("Failed to start session", err);
      setError("Rakkoo uumame (Connection Error)");
      setStatus("");
      stopSession();
      toast({
        title: 'Connection Failed',
        description: 'Could not start live session. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Audio Visualization Loop
  const visualize = () => {
    if (!isSessionActive.current) return;

    const bufferLength = 32;
    const dataArray = new Uint8Array(bufferLength);
    
    const currentAnalyser = isTalking ? analyserRef.current : inputAnalyserRef.current;

    if (currentAnalyser) {
      currentAnalyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      audioLevelRef.current = Math.min(1, average / 50);
    } else {
      audioLevelRef.current = 0;
    }

    animationFrameRef.current = requestAnimationFrame(visualize);
  };

  const stopSession = async () => {
    isSessionActive.current = false;
    cancelAnimationFrame(animationFrameRef.current);

    // Stop Input Processing
    if (processorRef.current) {
      try { 
        processorRef.current.disconnect(); 
        processorRef.current.onaudioprocess = null; 
      } catch (e) {}
      processorRef.current = null;
    }
    if (compressorRef.current) {
      try { compressorRef.current.disconnect(); } catch (e) {}
      compressorRef.current = null;
    }
    if (filterRef.current) {
      try { filterRef.current.disconnect(); } catch (e) {}
      filterRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop Output Playback
    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    scheduledSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    // Close Audio Contexts
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try { await audioContextRef.current.close(); } catch (e) {}
      }
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      if (inputAudioContextRef.current.state !== 'closed') {
        try { await inputAudioContextRef.current.close(); } catch (e) {}
      }
      inputAudioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsTalking(false);
    setIsProcessing(false);
    setUserTranscript("");
    audioLevelRef.current = 0;
  };

  // Determine avatar state
  let avatarState: 'idle' | 'listening' | 'speaking' | 'thinking' = 'idle';
  if (isConnected) {
    if (isTalking) {
      avatarState = 'speaking';
    } else if (isProcessing) {
      avatarState = 'thinking';
    } else {
      avatarState = 'listening';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="live-teacher-title">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#111] w-full max-w-md rounded-3xl border border-primary/50 shadow-[0_0_50px_rgba(var(--primary),0.3)] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-5 border-b border-border/30 flex justify-between items-center bg-background/50 backdrop-blur-xl z-10">
          <h3 id="live-teacher-title" className="text-lg font-bold text-foreground flex items-center gap-3">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-green-500 animate-pulse' : 'text-destructive'}`} />
            Live Teacher
          </h3>
          <Button 
            onClick={handleClose} 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-foreground/10 transition-all duration-300 hover:scale-110"
            aria-label="Close Modal"
          >
            <X size={20} />
          </Button>
        </div>

        {/* 3D Avatar Area */}
        <div className="h-96 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.1)_0%,hsl(var(--background))_100%)]">
          <div className="w-56 h-56">
            <HologramAvatar state={avatarState} className="w-full h-full" audioLevelRef={audioLevelRef} />
          </div>

          {/* Thinking Indicator */}
          {avatarState === 'thinking' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-32 z-20">
              <div className="bg-background/60 backdrop-blur-md px-4 py-2 rounded-full border border-primary/30 flex items-center gap-1.5 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
              </div>
            </div>
          )}
          
          {/* Real-time Transcript Overlay */}
          <div className="absolute bottom-20 left-4 right-4 text-center z-10 pointer-events-none min-h-[40px]">
            {userTranscript && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block bg-background/70 backdrop-blur-md text-primary text-sm px-4 py-2 rounded-2xl border border-primary/30 shadow-lg font-mono"
              >
                <Mic className="w-3 h-3 inline mr-2 animate-pulse" />
                {userTranscript}
              </motion.span>
            )}
          </div>
          
          <div className="absolute bottom-6 w-full flex justify-center px-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-xs px-4 py-2 rounded-lg border border-destructive/50 flex items-center gap-2" role="alert">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
                {error}
              </div>
            )}
            {status && !error && !isConnected && (
              <div className="bg-muted/80 text-foreground text-xs px-4 py-2 rounded-full border border-border animate-pulse" aria-live="polite">
                {status}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 flex justify-center gap-6 bg-background/50 backdrop-blur-xl border-t border-border/30">
          {!isConnected ? (
            <Button 
              onClick={startSession} 
              size="lg"
              className="flex items-center gap-3 px-8 py-6 rounded-full font-bold transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:scale-105"
            >
              <Loader2 className={`w-5 h-5 ${status.includes("Connecting") || status.includes("Walqabaa") ? "animate-spin" : ""}`} /> 
              {status.includes("Connecting") || status.includes("Walqabaa") ? "Walqabaachaa..." : "Jalqabi (Start)"}
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex items-center gap-4 w-full justify-center px-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${
                    isTalking 
                      ? 'bg-green-900/50 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)]' 
                      : isProcessing 
                        ? 'bg-yellow-900/50 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
                        : 'bg-muted text-primary shadow-inner'
                  } border border-border`}
                >
                  <Mic className={isTalking ? "animate-bounce" : isProcessing ? "animate-pulse" : ""} size={24} />
                </motion.div>
                <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <motion.div 
                    className={`h-full transition-colors duration-300 ${
                      isTalking ? 'bg-green-500' : isProcessing ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    animate={{
                      width: isTalking ? '75%' : isProcessing ? '50%' : '25%'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              <Button 
                onClick={stopSession} 
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground px-6 py-2 rounded-full transition-all duration-300 border border-transparent hover:border-border hover:scale-105"
              >
                Cufi (End Session)
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}