import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Volume2, Globe } from 'lucide-react';
import { GEMINI_VOICES } from '@/hooks/use-voice-settings';

interface VoiceSettings {
  voice_id: string;
  speech_speed: number;
  language_preference: string;
  continuous_listening: boolean;
  auto_speak_responses: boolean;
}

interface LiveTeacherSettingsProps {
  settings: VoiceSettings;
  onUpdateSettings: (settings: Partial<VoiceSettings>) => void;
  onBack: () => void;
}

export const LiveTeacherSettings: React.FC<LiveTeacherSettingsProps> = ({
  settings,
  onUpdateSettings,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Voice Selection */}
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                Voice Selection (Gemini)
              </Label>
              <Select
                value={settings.voice_id}
                onValueChange={(value) => onUpdateSettings({ voice_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speech Speed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Speech Speed</Label>
                <span className="text-sm text-muted-foreground">{settings.speech_speed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[settings.speech_speed]}
                onValueChange={([value]) => onUpdateSettings({ speech_speed: value })}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </Card>

          {/* Output Language Preference */}
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Output Language
              </Label>
              <p className="text-sm text-muted-foreground">
                AI accepts input in any language but responds only in your selected language
              </p>
              <Select
                value={settings.language_preference}
                onValueChange={(value) => onUpdateSettings({ language_preference: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oromo">Afaan Oromoo (Oromo Only)</SelectItem>
                  <SelectItem value="english">English Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Interaction Settings */}
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-semibold">Interaction Settings</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Continuous Listening</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect when you're speaking
                </p>
              </div>
              <Switch
                checked={settings.continuous_listening}
                onCheckedChange={(checked) => onUpdateSettings({ continuous_listening: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Auto-Speak Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically speak AI responses
                </p>
              </div>
              <Switch
                checked={settings.auto_speak_responses}
                onCheckedChange={(checked) => onUpdateSettings({ auto_speak_responses: checked })}
              />
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong>Multilingual Input:</strong> You can speak or type in any language (Oromo, English, Amharic, Arabic, etc.). 
              The AI will understand and respond in your selected output language.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};