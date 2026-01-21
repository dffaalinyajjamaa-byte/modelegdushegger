import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, Globe, Music, Sparkles, BookOpen, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { getYouTubeThumbnail, getYouTubeVideoId } from '@/lib/youtube-utils';

interface RelaxTimeProps {
  user: User;
  onBack: () => void;
}

interface Video {
  id: string;
  language?: string;
  category: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string | null;
  duration: string | null;
}

type Language = 'afaan_oromoo' | 'english' | 'amharic' | null;
type Category = string | null;
type SubCategory = string | null;

const languages = [
  { 
    id: 'afaan_oromoo', 
    name: 'Afaan Oromoo', 
    flag: '🇪🇹',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30 hover:border-green-500/60'
  },
  { 
    id: 'english', 
    name: 'English', 
    flag: '🇬🇧',
    color: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60'
  },
  { 
    id: 'amharic', 
    name: 'Amharic', 
    flag: '🇪🇹',
    color: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/30 hover:border-yellow-500/60'
  },
];

const categories: Record<string, { id: string; name: string; nameLocal?: string; icon: string; hasSubcategories?: boolean }[]> = {
  afaan_oromoo: [
    { id: 'history_country', name: 'History of Country', nameLocal: 'Seenaa Biyyaa', icon: '🏛️' },
    { id: 'history_heroes', name: 'History of Heroes', nameLocal: 'Seenaa Gootota', icon: '⚔️' },
    { id: 'history_gada', name: 'History of Gada System', nameLocal: 'Seenaa Sirna Gadaa', icon: '👑' },
    { id: 'afoola', name: 'Afoola', nameLocal: 'Afoola', icon: '📜', hasSubcategories: true },
    { id: 'aadaa', name: 'Aadaa', nameLocal: 'Aadaa', icon: '🎭', hasSubcategories: true },
  ],
  english: [
    { id: 'history_country', name: 'History of Country', icon: '🏛️' },
    { id: 'history_heroes', name: 'History of Heroes', icon: '⚔️' },
    { id: 'life_teaching', name: 'Life Teaching Short Movies', icon: '🎬' },
    { id: 'fairy_tales', name: 'Fairy Tales', icon: '📖' },
  ],
  amharic: [
    { id: 'history_country', name: 'History of Country', nameLocal: 'የአገር ታሪክ', icon: '🏛️' },
    { id: 'history_heroes', name: 'History of Heroes', nameLocal: 'የጀግኖች ታሪክ', icon: '⚔️' },
    { id: 'fairy_tales', name: 'Fairy Tales', nameLocal: 'ተረቶች', icon: '📖' },
  ],
};

// Subcategories for Afoola and Aadaa
const subcategories: Record<string, { id: string; name: string; nameLocal: string; icon: string }[]> = {
  afoola: [
    { id: 'walaloo', name: 'Poetry', nameLocal: 'Walaloo', icon: '📜' },
    { id: 'mammaaksa', name: 'Proverbs', nameLocal: 'Mammaaksa', icon: '💬' },
    { id: 'geerarsa', name: 'Oral Songs', nameLocal: 'Geerarsa', icon: '🎵' },
    { id: 'hibboo', name: 'Riddles', nameLocal: 'Hibboo', icon: '❓' },
    { id: 'oduu_durii', name: 'Folk Tales', nameLocal: 'Oduu Durii', icon: '📖' },
  ],
  aadaa: [
    { id: 'irreecha', name: 'Thanksgiving Festival', nameLocal: 'Irreecha', icon: '🌸' },
    { id: 'nyaata', name: 'Traditional Food', nameLocal: 'Nyaata', icon: '🍲' },
    { id: 'uffannaa', name: 'Traditional Clothing', nameLocal: 'Uffannaa', icon: '👗' },
    { id: 'shubbisa', name: 'Traditional Dance', nameLocal: 'Shubbisa', icon: '💃' },
  ],
};

export default function RelaxTime({ user, onBack }: RelaxTimeProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedLanguage && selectedCategory) {
      // Check if category has subcategories
      const cat = categories[selectedLanguage]?.find(c => c.id === selectedCategory);
      if (cat?.hasSubcategories && selectedSubCategory) {
        fetchSubCategoryVideos();
      } else if (!cat?.hasSubcategories) {
        fetchVideos();
      }
    }
  }, [selectedLanguage, selectedCategory, selectedSubCategory]);

  const fetchVideos = async () => {
    if (!selectedLanguage || !selectedCategory) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relax_time_videos')
        .select('*')
        .eq('language', selectedLanguage)
        .eq('category', selectedCategory)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategoryVideos = async () => {
    if (!selectedCategory || !selectedSubCategory) return;
    
    setLoading(true);
    try {
      // Determine which table to query based on category
      const tableName = selectedCategory === 'afoola' ? 'afoola_videos' : 'aadaa_videos';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('category', selectedSubCategory)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching subcategory videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedVideo) {
      setSelectedVideo(null);
    } else if (selectedSubCategory) {
      setSelectedSubCategory(null);
      setVideos([]);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setVideos([]);
    } else if (selectedLanguage) {
      setSelectedLanguage(null);
    } else {
      onBack();
    }
  };

  const getTitle = () => {
    if (selectedVideo) return selectedVideo.title;
    if (selectedSubCategory) {
      const subCats = subcategories[selectedCategory!];
      const subCat = subCats?.find(s => s.id === selectedSubCategory);
      return subCat?.nameLocal || subCat?.name || 'Videos';
    }
    if (selectedCategory) {
      const cat = categories[selectedLanguage!]?.find(c => c.id === selectedCategory);
      return cat?.nameLocal || cat?.name || 'Videos';
    }
    if (selectedLanguage) {
      const lang = languages.find(l => l.id === selectedLanguage);
      return lang?.name || 'Select Category';
    }
    return 'RELAX TIME';
  };

  const currentCategory = selectedLanguage ? categories[selectedLanguage]?.find(c => c.id === selectedCategory) : null;
  const showSubcategories = currentCategory?.hasSubcategories && !selectedSubCategory;

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
              <Sparkles className="h-6 w-6 text-purple-500" />
              <h1 className="text-xl font-bold">{getTitle()}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <AnimatePresence mode="wait">
          {/* Language Selection */}
          {!selectedLanguage && (
            <motion.div
              key="languages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Music className="h-16 w-16 mx-auto text-purple-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Take a Break & Learn</h2>
                <p className="text-muted-foreground">Choose your preferred language</p>
              </div>

              <div className="grid gap-4">
                {languages.map((lang, index) => (
                  <motion.button
                    key={lang.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedLanguage(lang.id as Language)}
                    className={`group relative bg-gradient-to-br ${lang.color} border-2 ${lang.borderColor} p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow overflow-hidden text-left`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{lang.flag}</span>
                      <div>
                        <h3 className="text-xl font-bold">{lang.name}</h3>
                        <p className="text-sm text-muted-foreground">Tap to explore content</p>
                      </div>
                      <Globe className="ml-auto h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Category Selection */}
          {selectedLanguage && !selectedCategory && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <p className="text-muted-foreground">Select a category</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {categories[selectedLanguage]?.map((cat, index) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`group p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow ${
                      cat.hasSubcategories 
                        ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-2 border-violet-500/30 hover:border-violet-500/60'
                        : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 hover:border-purple-500/60'
                    }`}
                  >
                    <span className="text-4xl block mb-3">{cat.icon}</span>
                    <h3 className="font-semibold text-sm">{cat.nameLocal || cat.name}</h3>
                    {cat.hasSubcategories && (
                      <p className="text-xs text-muted-foreground mt-1">Tap to explore</p>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Subcategory Selection (for Afoola and Aadaa) */}
          {showSubcategories && (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {selectedCategory === 'afoola' ? (
                    <BookOpen className="h-8 w-8 text-violet-500" />
                  ) : (
                    <Users className="h-8 w-8 text-emerald-500" />
                  )}
                  <h2 className="text-2xl font-bold">
                    {selectedCategory === 'afoola' ? 'Afoola' : 'Aadaa'}
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  {selectedCategory === 'afoola' 
                    ? 'Explore Oromo Oral Literature' 
                    : 'Discover Oromo Cultural Practices'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {subcategories[selectedCategory!]?.map((subCat, index) => (
                  <motion.button
                    key={subCat.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedSubCategory(subCat.id)}
                    className={`group p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow ${
                      selectedCategory === 'afoola'
                        ? 'bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/30 hover:border-violet-500/60'
                        : 'bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 hover:border-emerald-500/60'
                    }`}
                  >
                    <span className="text-4xl block mb-3">{subCat.icon}</span>
                    <h3 className="font-semibold text-sm">{subCat.nameLocal}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{subCat.name}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Video List */}
          {((selectedLanguage && selectedCategory && !currentCategory?.hasSubcategories) || 
            (currentCategory?.hasSubcategories && selectedSubCategory)) && !selectedVideo && (
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
                  Enjoy this educational content while relaxing!
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
