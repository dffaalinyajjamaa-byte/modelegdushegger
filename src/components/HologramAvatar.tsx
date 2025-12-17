import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HologramAvatarProps {
  state: 'idle' | 'listening' | 'speaking' | 'thinking';
  className?: string;
  audioLevelRef?: React.MutableRefObject<number>;
}

const HologramAvatar: React.FC<HologramAvatarProps> = ({ 
  state, 
  className,
  audioLevelRef 
}) => {
  const getStateColor = () => {
    switch (state) {
      case 'speaking': return 'from-green-500 to-emerald-400';
      case 'listening': return 'from-blue-500 to-cyan-400';
      case 'thinking': return 'from-yellow-500 to-amber-400';
      default: return 'from-gray-500 to-slate-400';
    }
  };

  const getStateGlow = () => {
    switch (state) {
      case 'speaking': return 'shadow-[0_0_60px_rgba(34,197,94,0.5)]';
      case 'listening': return 'shadow-[0_0_60px_rgba(59,130,246,0.5)]';
      case 'thinking': return 'shadow-[0_0_60px_rgba(234,179,8,0.5)]';
      default: return 'shadow-[0_0_30px_rgba(100,100,100,0.3)]';
    }
  };

  const audioLevel = audioLevelRef?.current || 0;
  const scale = 1 + (audioLevel * 0.3);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer glow ring */}
      <motion.div
        className={cn(
          'absolute rounded-full bg-gradient-to-br opacity-30',
          getStateColor()
        )}
        animate={{
          scale: state === 'speaking' ? [1, 1.2, 1] : state === 'listening' ? [1, 1.1, 1] : 1,
          opacity: state === 'idle' ? 0.2 : [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: state === 'speaking' ? 0.5 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: '120%',
          height: '120%',
        }}
      />

      {/* Middle ring */}
      <motion.div
        className={cn(
          'absolute rounded-full bg-gradient-to-br',
          getStateColor(),
          getStateGlow()
        )}
        animate={{
          scale: state !== 'idle' ? scale : 1,
        }}
        transition={{ duration: 0.1 }}
        style={{
          width: '90%',
          height: '90%',
          opacity: 0.6,
        }}
      />

      {/* Inner core */}
      <motion.div
        className={cn(
          'relative rounded-full bg-gradient-to-br flex items-center justify-center',
          getStateColor(),
          getStateGlow()
        )}
        animate={{
          scale: state === 'thinking' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: state === 'thinking' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          width: '70%',
          height: '70%',
        }}
      >
        {/* State indicator */}
        <div className="text-white text-4xl">
          {state === 'speaking' && '🗣️'}
          {state === 'listening' && '👂'}
          {state === 'thinking' && '🤔'}
          {state === 'idle' && '😊'}
        </div>
      </motion.div>

      {/* Scanning lines effect */}
      {state !== 'idle' && (
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
              animate={{
                top: ['0%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'linear',
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Pulse rings for speaking */}
      {state === 'speaking' && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-green-400"
              initial={{ scale: 0.7, opacity: 0.8 }}
              animate={{
                scale: [0.7, 1.5],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default HologramAvatar;
