import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptionDisplayProps {
  text: string;
  isFinal: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ text, isFinal }) => {
  if (!text) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`p-4 rounded-lg ${
          isFinal ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-muted-foreground'
        }`}
      >
        <p className="text-sm italic">
          {isFinal ? '✓ ' : '🎤 '}
          {text}
        </p>
      </motion.div>
    </AnimatePresence>
  );
};
