import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

interface MusicStyleSelectorProps {
  selectedStyle: 'calm' | 'lofi' | 'hiphop' | 'traditional' | 'instrumental';
  onStyleChange: (style: 'calm' | 'lofi' | 'hiphop' | 'traditional' | 'instrumental') => void;
  disabled?: boolean;
}

const styles = [
  { 
    id: 'calm' as const, 
    name: 'Calm', 
    icon: '🎹', 
    description: 'Soft piano & strings',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500'
  },
  { 
    id: 'lofi' as const, 
    name: 'LoFi', 
    icon: '🎧', 
    description: 'Chill beats',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500'
  },
  { 
    id: 'hiphop' as const, 
    name: 'HipHop', 
    icon: '🎤', 
    description: 'Rhythmic & catchy',
    color: 'from-orange-500/20 to-red-500/20 border-orange-500'
  },
  { 
    id: 'traditional' as const, 
    name: 'Traditional', 
    icon: '🪘', 
    description: 'Ethiopian vibes',
    color: 'from-green-500/20 to-yellow-500/20 border-green-500'
  },
  { 
    id: 'instrumental' as const, 
    name: 'Instrumental', 
    icon: '🎼', 
    description: 'No vocals',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500'
  },
];

export default function MusicStyleSelector({
  selectedStyle,
  onStyleChange,
  disabled
}: MusicStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Choose Music Style</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {styles.slice(0, 3).map((style, index) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onStyleChange(style.id)}
            disabled={disabled}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
              selectedStyle === style.id
                ? `bg-gradient-to-br ${style.color} border-opacity-100 scale-105 shadow-lg`
                : 'bg-muted/30 border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-3xl block mb-2">{style.icon}</span>
            <span className="text-sm font-medium block">{style.name}</span>
            <span className="text-[10px] text-muted-foreground">{style.description}</span>
            {selectedStyle === style.id && (
              <motion.div
                layoutId="style-indicator"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {styles.slice(3).map((style, index) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (index + 3) * 0.1 }}
            onClick={() => onStyleChange(style.id)}
            disabled={disabled}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
              selectedStyle === style.id
                ? `bg-gradient-to-br ${style.color} border-opacity-100 scale-105 shadow-lg`
                : 'bg-muted/30 border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-3xl block mb-2">{style.icon}</span>
            <span className="text-sm font-medium block">{style.name}</span>
            <span className="text-[10px] text-muted-foreground">{style.description}</span>
            {selectedStyle === style.id && (
              <motion.div
                layoutId="style-indicator-2"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}