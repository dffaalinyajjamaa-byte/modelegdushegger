import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, Flower2, UtensilsCrossed, Shirt, Music2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { getYouTubeThumbnail, getYouTubeVideoId } from '@/lib/youtube-utils';

interface AadaaProps {
  user: User;
  onBack: () => void;
}

interface Video {
  id: string;
  category: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string | null;
  duration: string | null;
  display_order: number;
}

type Category = 'irreecha' | 'nyaata' | 'uffannaa' | 'shubbisa' | null;

const categories = [
  { 
    id: 'irreecha' as Category, 
    name: 'Irreecha', 
    nameEn: 'Thanksgiving Festival',
    icon: Flower2,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500'
  },
  { 
    id: 'nyaata' as Category, 
    name: 'Nyaata', 
    nameEn: 'Traditional Food',
    icon: UtensilsCrossed,
    color: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500'
  },
  { 
    id: 'uffannaa' as Category, 
    name: 'Uffannaa', 
    nameEn: 'Traditional Clothing',
    icon: Shirt,
    color: 'from-pink-500/20 to-rose-500/20',
    borderColor: 'border-pink-500/30 hover:border-pink-500/60',
    iconColor: 'text-pink-500'
  },
  { 
    id: 'shubbisa' as Category, 
    name: 'Shubbisa', 
    nameEn: 'Traditional Dance & Music',
    icon: Music2,
    color: 'from-purple-500/20 to-violet-500/20',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-500'
  },
];

export default function Aadaa({ user, onBack }: AadaaProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory) {
      fetchVideos();
    }
  }, [selectedCategory]);

  const fetchVideos = async () => {
    if (!selectedCategory) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aadaa_videos')
        .select('*')
        .eq('category', selectedCategory)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos((data as Video[]) || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedVideo) {
      setSelectedVideo(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setVideos([]);
    } else {
      onBack();
    }
  };

  const getTitle = () => {
    if (selectedVideo) return selectedVideo.title;
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      return cat?.name || 'Videos';
    }
    return 'AADAA';
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Flower2 className="h-6 w-6 text-green-500" />
              <h1 className="text-xl font-bold">{getTitle()}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <AnimatePresence mode="wait">
          {/* Category Selection */}
          {!selectedCategory && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Sparkles className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Aadaa Oromoo</h2>
                <p className="text-muted-foreground">Oromo Cultural Practices & Traditions</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {categories.map((cat, index) => {
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`group bg-gradient-to-br ${cat.color} border-2 ${cat.borderColor} p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow`}
                    >
                      <Icon className={`h-10 w-10 mx-auto mb-3 ${cat.iconColor}`} />
                      <h3 className="font-semibold text-sm">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">{cat.nameEn}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Video List */}
          {selectedCategory && !selectedVideo && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>Loading videos...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-muted-foreground">Videos will be added soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <div className="relative w-full h-40 bg-muted overflow-hidden">
                          <img 
                            src={video.thumbnail_url || getYouTubeThumbnail(video.youtube_url, 'hq')} 
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                              <Play className="h-7 w-7 text-primary-foreground fill-current" />
                            </div>
                          </div>
                          {video.duration && (
                            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {video.duration}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold line-clamp-2">{video.title}</h4>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Video Player */}
          {selectedVideo && (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                {getYouTubeVideoId(selectedVideo.youtube_url) ? (
                  <YouTube
                    videoId={getYouTubeVideoId(selectedVideo.youtube_url)!}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        rel: 0,
                      },
                    }}
                    className="w-full h-full"
                    iframeClassName="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <p>Invalid video URL</p>
                  </div>
                )}
              </div>
              <Card className="p-4">
                <h3 className="text-lg font-bold mb-2">{selectedVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Explore Oromo cultural practices and traditions!
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
