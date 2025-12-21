import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGeminiSTTOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useGeminiSTT(options: UseGeminiSTTOptions = {}) {
  const { language = 'om', onTranscript, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          // Combine audio chunks into a single blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              // Send to Gemini STT edge function
              const { data, error } = await supabase.functions.invoke('gemini-stt', {
                body: { audio: base64Audio, language }
              });

              if (error) {
                console.error('[useGeminiSTT] Function error:', error);
                onError?.(error.message || 'Transcription failed');
                return;
              }

              if (data?.text) {
                onTranscript?.(data.text);
              }
            } catch (err) {
              console.error('[useGeminiSTT] Error:', err);
              onError?.(err instanceof Error ? err.message : 'Transcription failed');
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (err) {
          console.error('[useGeminiSTT] Processing error:', err);
          setIsProcessing(false);
          onError?.(err instanceof Error ? err.message : 'Audio processing failed');
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsListening(true);
      
    } catch (err) {
      console.error('[useGeminiSTT] Microphone access error:', err);
      onError?.('Could not access microphone');
    }
  }, [language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    toggleListening,
  };
}
