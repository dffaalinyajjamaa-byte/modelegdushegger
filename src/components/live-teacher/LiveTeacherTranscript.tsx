import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface LiveTeacherTranscriptProps {
  sessionName: string;
  messages: Message[];
  createdAt: string;
  onBack: () => void;
}

export const LiveTeacherTranscript: React.FC<LiveTeacherTranscriptProps> = ({
  sessionName,
  messages,
  createdAt,
  onBack,
}) => {
  const { toast } = useToast();

  const handleCopy = () => {
    const transcript = messages
      .map((msg) => `[${format(new Date(msg.timestamp), 'HH:mm:ss')}] ${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(transcript);
    toast({ title: 'Copied to clipboard' });
  };

  const handleExport = () => {
    const transcript = messages
      .map((msg) => `[${format(new Date(msg.timestamp), 'HH:mm:ss')}] ${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionName || 'transcript'}-${format(new Date(createdAt), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Transcript exported' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 no-print">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{sessionName || 'Untitled Session'}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(createdAt), 'PPP')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold">
                  {message.role === 'user' ? 'You' : 'AI Teacher'}
                </span>
                <span>•</span>
                <span>{format(new Date(message.timestamp), 'HH:mm:ss')}</span>
              </div>
              <div className={`p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
