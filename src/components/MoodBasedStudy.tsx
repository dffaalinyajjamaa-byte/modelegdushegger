import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, Zap, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MoodBasedStudyProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

type Mood = 'focused' | 'relaxed' | 'energetic';

interface MoodPreference {
  current_mood: Mood;
  theme_preference: string | null;
  animation_speed: string;
}

const moodConfig = {
  focused: {
    icon: Brain,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-700',
    bgClass: 'bg-blue-50',
    description: 'Deep work mode - minimize distractions',
    animationSpeed: 'slow',
    suggestions: [
      'Use the Pomodoro technique (25 min work, 5 min break)',
      'Study complex topics like Math or Science',
      'Work on problem-solving exercises',
    ]
  },
  relaxed: {
    icon: Heart,
    color: 'text-green-500',
    gradient: 'from-green-500 to-green-700',
    bgClass: 'bg-green-50',
    description: 'Calm learning - absorb information steadily',
    animationSpeed: 'normal',
    suggestions: [
      'Review notes and summaries',
      'Watch educational videos',
      'Read textbook chapters',
    ]
  },
  energetic: {
    icon: Zap,
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-700',
    bgClass: 'bg-orange-50',
    description: 'High energy mode - active learning',
    animationSpeed: 'fast',
    suggestions: [
      'Practice with flashcards',
      'Take practice quizzes',
      'Engage in group discussions',
    ]
  }
};

export default function MoodBasedStudy({ user, onLogActivity }: MoodBasedStudyProps) {
  const [currentMood, setCurrentMood] = useState<Mood>('focused');
  const [preferences, setPreferences] = useState<MoodPreference | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeMoodPreferences();
    fetchMoodPreferences();
  }, [user]);

  useEffect(() => {
    if (currentMood) {
      applyMoodSettings(currentMood);
    }
  }, [currentMood]);

  const initializeMoodPreferences = async () => {
    const { data: existing } = await supabase
      .from('study_mood_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      await supabase
        .from('study_mood_preferences')
        .insert({
          user_id: user.id,
          current_mood: 'focused'
        });
    }
  };

  const fetchMoodPreferences = async () => {
    const { data } = await supabase
      .from('study_mood_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setPreferences({
        current_mood: data.current_mood as Mood,
        theme_preference: data.theme_preference,
        animation_speed: data.animation_speed
      });
      setCurrentMood(data.current_mood as Mood);
    }
  };

  const updateMood = async (mood: Mood) => {
    try {
      await supabase
        .from('study_mood_preferences')
        .update({
          current_mood: mood,
          animation_speed: moodConfig[mood].animationSpeed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      setCurrentMood(mood);
      
      toast({
        title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Mode Activated!`,
        description: moodConfig[mood].description,
      });

      onLogActivity('mood_change', `Changed study mood to ${mood}`);
    } catch (error) {
      console.error('Error updating mood:', error);
    }
  };

  const applyMoodSettings = (mood: Mood) => {
    const config = moodConfig[mood];
    const root = document.documentElement;

    // Update CSS variables based on mood
    switch (mood) {
      case 'focused':
        root.style.setProperty('--animation-speed', '3s');
        root.style.setProperty('--mood-primary', '#3B82F6');
        break;
      case 'relaxed':
        root.style.setProperty('--animation-speed', '5s');
        root.style.setProperty('--mood-primary', '#10B981');
        break;
      case 'energetic':
        root.style.setProperty('--animation-speed', '1.5s');
        root.style.setProperty('--mood-primary', '#F97316');
        break;
    }
  };

  const config = moodConfig[currentMood];
  const MoodIcon = config.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      {/* Mood Selector */}
      <Card className="shadow-glow animate-pulse-glow mobile-card">
        <CardHeader className="mobile-header">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            How are you feeling today?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(moodConfig) as Mood[]).map((mood) => {
              const Icon = moodConfig[mood].icon;
              const isActive = currentMood === mood;
              
              return (
                <Button
                  key={mood}
                  onClick={() => updateMood(mood)}
                  variant={isActive ? 'default' : 'outline'}
                  className={`h-auto py-6 flex-col gap-3 hover-scale transition-smooth ${
                    isActive ? `bg-gradient-to-br ${moodConfig[mood].gradient} text-white` : ''
                  }`}
                >
                  <Icon className={`w-8 h-8 ${isActive ? 'text-white' : moodConfig[mood].color}`} />
                  <div className="text-center">
                    <div className="font-semibold capitalize">{mood}</div>
                    <div className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {moodConfig[mood].description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Mood Display */}
      <Card className={`shadow-glow animate-fade-in mobile-card ${config.bgClass}`}>
        <CardHeader className="mobile-header">
          <CardTitle className="flex items-center gap-2">
            <MoodIcon className={`w-6 h-6 ${config.color}`} />
            {currentMood.charAt(0).toUpperCase() + currentMood.slice(1)} Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <p className="text-sm md:text-base text-muted-foreground">
              {config.description}
            </p>
            
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recommended Activities
              </h3>
              <ul className="space-y-2">
                {config.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm p-3 bg-background rounded-xl animate-fade-in"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 ${config.color} bg-current`} />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Speed Indicator */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Animation Speed</span>
            </div>
            <div className="text-sm text-muted-foreground capitalize">
              {config.animationSpeed}
            </div>
          </div>
          
          {/* Animated preview */}
          <div className="mt-4 h-16 bg-gradient-to-r from-primary to-secondary rounded-lg overflow-hidden">
            <div
              className="h-full w-8 bg-white/30 backdrop-blur-sm animate-pulse-glow"
              style={{
                animation: `pulse-glow ${config.animationSpeed === 'slow' ? '3s' : config.animationSpeed === 'normal' ? '2s' : '1s'} ease-in-out infinite`
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}