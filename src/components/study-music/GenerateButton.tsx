import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, FileSearch, PenLine, Music, Lightbulb, Loader2 } from 'lucide-react';

interface GenerateButtonProps {
  isGenerating: boolean;
  generationStep: 'idle' | 'extracting' | 'lyrics' | 'music' | 'suggestions';
  disabled: boolean;
  onGenerate: () => void;
}

const steps = [
  { id: 'extracting', label: 'Extracting Text', icon: FileSearch },
  { id: 'lyrics', label: 'Creating Lyrics', icon: PenLine },
  { id: 'music', label: 'Generating Music', icon: Music },
  { id: 'suggestions', label: 'Getting Tips', icon: Lightbulb },
];

export default function GenerateButton({
  isGenerating,
  generationStep,
  disabled,
  onGenerate
}: GenerateButtonProps) {
  const currentStepIndex = steps.findIndex(s => s.id === generationStep);

  if (isGenerating) {
    return (
      <div className="space-y-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === generationStep;
            const isComplete = currentStepIndex > index;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isActive || isComplete ? 1 : 0.4
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isComplete ? (
                    <span className="text-sm">✓</span>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </motion.div>
                <span className={`text-xs text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-500"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Status Message */}
        <p className="text-center text-sm text-muted-foreground">
          {generationStep === 'extracting' && 'Reading your study material...'}
          {generationStep === 'lyrics' && 'Turning content into song lyrics...'}
          {generationStep === 'music' && 'Creating your unique study music (1-3 min)...'}
          {generationStep === 'suggestions' && 'Generating study tips...'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Button
        size="lg"
        className="w-full h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
        disabled={disabled}
        onClick={onGenerate}
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Generate Study Music
      </Button>
      {disabled && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Upload a PDF to get started
        </p>
      )}
    </motion.div>
  );
}