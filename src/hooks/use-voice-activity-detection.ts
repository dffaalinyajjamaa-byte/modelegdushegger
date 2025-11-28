import { useState, useEffect, useRef } from 'react';

interface UseVoiceActivityDetectionProps {
  enabled: boolean;
  threshold?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export const useVoiceActivityDetection = ({
  enabled,
  threshold = 0.01,
  onSpeechStart,
  onSpeechEnd,
}: UseVoiceActivityDetectionProps) => {
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const speechTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (enabled) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => stopDetection();
  }, [enabled]);

  const startDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;

      source.connect(analyserRef.current);

      detectAudioLevel();
    } catch (error) {
      console.error('Error starting VAD:', error);
    }
  };

  const detectAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);

    // Detect speech
    if (normalizedLevel > threshold) {
      if (!isDetectingSpeech) {
        setIsDetectingSpeech(true);
        onSpeechStart?.();
      }

      // Reset silence timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      // Set timeout for speech end (1 second of silence)
      speechTimeoutRef.current = setTimeout(() => {
        setIsDetectingSpeech(false);
        onSpeechEnd?.();
      }, 1000);
    }

    animationFrameRef.current = requestAnimationFrame(detectAudioLevel);
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsDetectingSpeech(false);
    setAudioLevel(0);
  };

  return { isDetectingSpeech, audioLevel };
};
