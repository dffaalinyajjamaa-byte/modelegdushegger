import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceSettings {
  voice_id: string;
  speech_speed: number;
  language_preference: string;
  continuous_listening: boolean;
  auto_speak_responses: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  voice_id: 'pNInz6obpgDQGcFmaJgB',
  speech_speed: 1.0,
  language_preference: 'oromo',
  continuous_listening: false,
  auto_speak_responses: true,
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
          voice_id: data.voice_id,
          speech_speed: Number(data.speech_speed),
          language_preference: data.language_preference,
          continuous_listening: data.continuous_listening,
          auto_speak_responses: data.auto_speak_responses,
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

      const { error } = await supabase
        .from('live_teacher_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
        });

      if (error) throw error;

      toast({ title: 'Settings updated successfully' });
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
