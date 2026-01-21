import { Card } from '@/components/ui/card';
import { Lightbulb, Clock, Repeat, Brain, HelpCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AISuggestionCardProps {
  suggestions: {
    best_listening_time: string;
    recommended_repeats: number;
    memory_tip: string;
    quiz_suggestion: string;
    next_action: string;
  };
}

export default function AISuggestionCard({ suggestions }: AISuggestionCardProps) {
  const items = [
    {
      icon: Clock,
      label: 'Best Time to Listen',
      value: suggestions.best_listening_time,
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      icon: Repeat,
      label: 'Recommended Repeats',
      value: `${suggestions.recommended_repeats} times`,
      color: 'text-purple-500 bg-purple-500/10'
    },
    {
      icon: Brain,
      label: 'Memory Tip',
      value: suggestions.memory_tip,
      color: 'text-pink-500 bg-pink-500/10'
    },
    {
      icon: HelpCircle,
      label: 'Quiz Yourself',
      value: suggestions.quiz_suggestion,
      color: 'text-orange-500 bg-orange-500/10'
    },
    {
      icon: ArrowRight,
      label: 'Next Action',
      value: suggestions.next_action,
      color: 'text-green-500 bg-green-500/10'
    },
  ];

  return (
    <Card className="p-4 bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-violet-500" />
        </div>
        <h3 className="font-semibold">AI Study Tips</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-background/50 rounded-lg"
            >
              <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <p className="text-sm mt-0.5">{item.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}