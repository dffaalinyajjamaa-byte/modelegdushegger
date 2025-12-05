import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceSettings {
  voice_id: string;
  speech_speed: number;
  continuous_listening: boolean;
  auto_speak_responses: boolean;
  realtime_audio: boolean;
}

// Gemini voice options - optimized for Oromo
export const GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck - Professional (Best for Oromo)' },
  { id: 'Zephyr', name: 'Zephyr - Warm Female' },
  { id: 'Kore', name: 'Kore - Neutral' },
  { id: 'Charon', name: 'Charon - Deep Male' },
  { id: 'Fenrir', name: 'Fenrir - Energetic' },
];

const DEFAULT_SETTINGS: VoiceSettings = {
  voice_id: 'Puck',
  speech_speed: 1.0,
  continuous_listening: false,
  auto_speak_responses: true,
  realtime_audio: false,
};

export const useVoiceSettings = () => {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('live_teacher_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          voice_id: data.voice_id || DEFAULT_SETTINGS.voice_id,
          speech_speed: Number(data.speech_speed) || DEFAULT_SETTINGS.speech_speed,
          continuous_listening: data.continuous_listening ?? DEFAULT_SETTINGS.continuous_listening,
          auto_speak_responses: data.auto_speak_responses ?? DEFAULT_SETTINGS.auto_speak_responses,
          realtime_audio: false, // Default to false, user can enable
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<VoiceSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // Don't save realtime_audio to DB (it's session-only)
      const { realtime_audio, ...dbSettings } = updatedSettings;

      const { error } = await supabase
        .from('live_teacher_settings')
        .upsert({
          user_id: user.id,
          ...dbSettings,
          language_preference: 'oromo', // Always Oromo
        });

      if (error) throw error;

      toast({ title: 'Settings updated' });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  return { settings, updateSettings, loading };
};
