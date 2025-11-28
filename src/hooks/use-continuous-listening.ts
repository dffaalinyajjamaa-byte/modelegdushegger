import { useEffect } from 'react';
import { useVoiceActivityDetection } from './use-voice-activity-detection';

interface UseContinuousListeningProps {
  enabled: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendMessage: () => void;
}

export const useContinuousListening = ({
  enabled,
  isRecording,
  onStartRecording,
  onStopRecording,
  onSendMessage,
}: UseContinuousListeningProps) => {
  const { isDetectingSpeech, audioLevel } = useVoiceActivityDetection({
    enabled,
    onSpeechStart: () => {
      if (enabled && !isRecording) {
        onStartRecording();
      }
    },
    onSpeechEnd: () => {
      if (enabled && isRecording) {
        onStopRecording();
        // Small delay before sending to ensure recording is complete
        setTimeout(() => {
          onSendMessage();
        }, 500);
      }
    },
  });

  return { isDetectingSpeech, audioLevel };
};
