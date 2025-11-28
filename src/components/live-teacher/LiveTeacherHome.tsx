import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiriOrb } from '@/components/ui/siri-orb';
import { Mic, MessageSquare, History, Settings } from 'lucide-react';

interface LiveTeacherHomeProps {
  onStartChat: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
  totalSessions: number;
  totalMinutes: number;
}

export const LiveTeacherHome: React.FC<LiveTeacherHomeProps> = ({
  onStartChat,
  onViewHistory,
  onOpenSettings,
  totalSessions,
  totalMinutes,
}) => {
  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <SiriOrb size="120px" isActive={false} />
          </motion.div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            AI Live Teacher
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Your personal AI tutor in Oromo language
          </p>
        </div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onStartChat}
            size="lg"
            className="w-full h-16 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Mic className="mr-2 h-6 w-6" />
            Start Conversation
          </Button>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="p-6 cursor-pointer hover:bg-accent transition-colors"
            onClick={onViewHistory}
          >
            <History className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">History</h3>
            <p className="text-sm text-muted-foreground">{totalSessions} sessions</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:bg-accent transition-colors"
            onClick={onOpenSettings}
          >
            <Settings className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Settings</h3>
            <p className="text-sm text-muted-foreground">Customize voice</p>
          </Card>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-2"
        >
          <p className="text-sm text-muted-foreground">
            Total learning time: <span className="font-semibold text-foreground">{totalMinutes} minutes</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
