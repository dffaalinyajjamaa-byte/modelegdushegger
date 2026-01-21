import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Volume2, VolumeX, X, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  track: {
    id: string;
    title: string;
    audioUrl: string | null;
    lyricsText: string;
    subject: string;
    grade: string;
    musicStyle: string;
    status: string;
  };
  onClose?: () => void;
}

const styleGradients: Record<string, string> = {
  calm: 'from-blue-600 via-cyan-500 to-teal-400',
  lofi: 'from-purple-600 via-pink-500 to-rose-400',
  hiphop: 'from-orange-600 via-red-500 to-pink-400',
  traditional: 'from-green-600 via-yellow-500 to-orange-400',
  instrumental: 'from-gray-600 via-slate-500 to-zinc-400',
};

export default function MusicPlayer({ track, onClose }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setRepeatCount(prev => prev + 1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [track.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const gradient = styleGradients[track.musicStyle] || styleGradients.calm;

  return (
    <Card className="overflow-hidden">
      {/* Gradient Header */}
      <div className={`relative bg-gradient-to-br ${gradient} p-6 text-white`}>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <Music className="h-8 w-8" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{track.title}</h3>
            <p className="text-white/80 text-sm">{track.subject} • {track.grade}</p>
            <p className="text-white/60 text-xs mt-1">Played {repeatCount} times</p>
          </div>
        </div>
      </div>

      {/* Audio Element */}
      {track.audioUrl && (
        <audio ref={audioRef} src={track.audioUrl} preload="metadata" />
      )}

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            disabled={!track.audioUrl}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestart}
            disabled={!track.audioUrl}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          <Button
            size="lg"
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient}`}
            onClick={togglePlay}
            disabled={!track.audioUrl}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-1" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              disabled={!track.audioUrl}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              disabled={!track.audioUrl}
              className="w-20"
            />
          </div>
        </div>

        {/* Lyrics Toggle */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowLyrics(!showLyrics)}
        >
          {showLyrics ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Lyrics
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Lyrics
            </>
          )}
        </Button>

        {/* Lyrics Display */}
        <AnimatePresence>
          {showLyrics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                {track.lyricsText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        {!track.audioUrl && track.status === 'processing' && (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Generating music...</p>
          </div>
        )}
      </div>
    </Card>
  );
}