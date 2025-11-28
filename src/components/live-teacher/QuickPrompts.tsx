import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface QuickPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ prompts, onSelectPrompt }) => {
  if (prompts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Suggested prompts</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectPrompt(prompt)}
              className="text-xs"
            >
              {prompt}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
