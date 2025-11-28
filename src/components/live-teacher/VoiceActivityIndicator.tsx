import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  level?: number;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({
  isActive,
  level = 0,
}) => {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{
          scale: isActive ? [1, 1.2, 1] : 1,
          backgroundColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
        }}
        transition={{ repeat: isActive ? Infinity : 0, duration: 0.5 }}
        className="p-2 rounded-full"
      >
        <Mic className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
      </motion.div>

      {/* Voice level bars */}
      {isActive && (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((bar) => (
            <motion.div
              key={bar}
              animate={{
                height: level > bar * 20 ? [8, 16, 8] : 8,
                backgroundColor: level > bar * 20 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              }}
              transition={{ repeat: Infinity, duration: 0.5, delay: bar * 0.05 }}
              className="w-1 rounded-full"
              style={{ height: 8 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
