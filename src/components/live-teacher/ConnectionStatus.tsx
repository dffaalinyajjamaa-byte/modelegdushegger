import React from 'react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  language?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, language }) => {
  const statusConfig = {
    connected: { color: 'bg-green-500', label: 'Connected' },
    connecting: { color: 'bg-yellow-500', label: 'Connecting...' },
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ scale: status === 'connecting' ? [1, 1.2, 1] : 1 }}
        transition={{ repeat: status === 'connecting' ? Infinity : 0, duration: 1 }}
        className={`w-2 h-2 rounded-full ${config.color}`}
      />
      <span className="text-sm text-muted-foreground">
        {config.label}
        {language && status === 'connected' && ` • ${language}`}
      </span>
    </div>
  );
};
