import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, FlaskConical, Atom, Dna, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { getYouTubeThumbnail, getYouTubeVideoId } from '@/lib/youtube-utils';

interface ScienceExperimentsProps {
  user: User;
  onBack: () => void;
}

interface Video {
  id: string;
  title: string;
  youtube_url: string;
}

type Category = 'chemistry' | 'physics' | 'biology' | null;

const categories = [
  { 
    id: 'chemistry' as Category, 
    name: 'Chemistry', 
    nameLocal: 'Keemistirii',
    icon: Beaker,
    color: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500'
  },
  { 
    id: 'physics' as Category, 
    name: 'Physics', 
    nameLocal: 'Fiiziiksii',
    icon: Atom,
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500'
  },
  { 
    id: 'biology' as Category, 
    name: 'Biology', 
    nameLocal: 'Baayolojii',
    icon: Dna,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500'
  },
];

// Chemistry Experiments (21 videos)
const chemistryVideos: Video[] = [
  { id: 'chem-1', title: 'Chemistry Experiment Part 1', youtube_url: 'https://youtu.be/trgDHBPLJEE' },
  { id: 'chem-2', title: 'Chemistry Experiment Part 2', youtube_url: 'https://youtu.be/AHV02JrQyds' },
  { id: 'chem-3', title: 'Chemistry Experiment Part 3', youtube_url: 'https://youtu.be/M9C-MsKYXko' },
  { id: 'chem-4', title: 'Chemistry Experiment Part 4', youtube_url: 'https://youtu.be/aDW7sLXEDCE' },
  { id: 'chem-5', title: 'Chemistry Experiment Part 5', youtube_url: 'https://youtu.be/bOuEJf8Dr_4' },
  { id: 'chem-6', title: 'Chemistry Experiment Part 6', youtube_url: 'https://youtu.be/vTq4sgGd2QU' },
  { id: 'chem-7', title: 'Chemistry Experiment Part 7', youtube_url: 'https://youtu.be/zmdxMlb88Fs' },
  { id: 'chem-8', title: 'Chemistry Experiment Part 8', youtube_url: 'https://youtu.be/1aLUfl7qwKA' },
  { id: 'chem-9', title: 'Chemistry Experiment Part 9', youtube_url: 'https://youtu.be/MKMjspE07oI' },
  { id: 'chem-10', title: 'Chemistry Experiment Part 10', youtube_url: 'https://youtu.be/7iSNKGNWTow' },
  { id: 'chem-11', title: 'Chemistry Experiment Part 11', youtube_url: 'https://youtu.be/h6dJ4OzvpDA' },
  { id: 'chem-12', title: 'Chemistry Experiment Part 12', youtube_url: 'https://youtu.be/AHV02JrQyds' },
  { id: 'chem-13', title: 'Chemistry Experiment Part 13', youtube_url: 'https://youtu.be/1iiJzbybyo8' },
  { id: 'chem-14', title: 'Chemistry Experiment Part 14', youtube_url: 'https://youtu.be/TYEYEIuTmGQ' },
  { id: 'chem-15', title: 'Chemistry Experiment Part 15', youtube_url: 'https://youtu.be/TYEYEIuTmGQ' },
  { id: 'chem-16', title: 'Chemistry Experiment Part 16', youtube_url: 'https://youtu.be/dQ74yC3MPsM' },
  { id: 'chem-17', title: 'Chemistry Experiment Part 17', youtube_url: 'https://youtu.be/5iowJs6MryI' },
  { id: 'chem-18', title: 'Chemistry Experiment Part 18', youtube_url: 'https://youtu.be/0g8lANs6zpQ' },
  { id: 'chem-19', title: 'Chemistry Experiment Part 19', youtube_url: 'https://youtu.be/5iowJs6MryI' },
  { id: 'chem-20', title: 'Chemistry Experiment Part 20', youtube_url: 'https://youtu.be/HRBVfqhPQQ8' },
  { id: 'chem-21', title: 'Chemistry Experiment Part 21', youtube_url: 'https://youtu.be/x49BtB5dOwg' },
];

// Physics Experiments (25 videos)
const physicsVideos: Video[] = [
  { id: 'phys-1', title: 'Physics Experiment Part 1', youtube_url: 'https://youtu.be/yvBGNqYldy8' },
  { id: 'phys-2', title: 'Physics Experiment Part 2', youtube_url: 'https://youtu.be/02k8vRi5f_I' },
  { id: 'phys-3', title: 'Physics Experiment Part 3', youtube_url: 'https://youtu.be/CVHo7y9oh9g' },
  { id: 'phys-4', title: 'Physics Experiment Part 4', youtube_url: 'https://youtu.be/ekUbBot8tDA' },
  { id: 'phys-5', title: 'Physics Experiment Part 5', youtube_url: 'https://youtu.be/MeVOSo7Jv1M' },
  { id: 'phys-6', title: 'Physics Experiment Part 6', youtube_url: 'https://youtu.be/s9ALylTC9YQ' },
  { id: 'phys-7', title: 'Physics Experiment Part 7', youtube_url: 'https://youtu.be/IzQsYnLz2Gc' },
  { id: 'phys-8', title: 'Physics Experiment Part 8', youtube_url: 'https://youtu.be/AHV02JrQyds' },
  { id: 'phys-9', title: 'Physics Experiment Part 9', youtube_url: 'https://youtu.be/1Xp_imnO6WE' },
  { id: 'phys-10', title: 'Physics Experiment Part 10', youtube_url: 'https://youtu.be/pVDqiYIxvdA' },
  { id: 'phys-11', title: 'Physics Experiment Part 11', youtube_url: 'https://youtu.be/s87FhnwMcD0' },
  { id: 'phys-12', title: 'Physics Experiment Part 12', youtube_url: 'https://youtu.be/lBod1o1J5rw' },
  { id: 'phys-13', title: 'Physics Experiment Part 13', youtube_url: 'https://youtu.be/77ZF50ve6rs' },
  { id: 'phys-14', title: 'Physics Experiment Part 14', youtube_url: 'https://youtube.com/shorts/O9FpMgNowYw' },
  { id: 'phys-15', title: 'Physics Experiment Part 15', youtube_url: 'https://youtube.com/shorts/R_uA3eBY4Uw' },
  { id: 'phys-16', title: 'Physics Experiment Part 16', youtube_url: 'https://youtube.com/shorts/ldEw-ot0ra4' },
  { id: 'phys-17', title: 'Physics Experiment Part 17', youtube_url: 'https://youtube.com/shorts/s3QOn3Z1E5o' },
  { id: 'phys-18', title: 'Physics Experiment Part 18', youtube_url: 'https://youtube.com/shorts/-OTqZWLJO9s' },
  { id: 'phys-19', title: 'Physics Experiment Part 19', youtube_url: 'https://youtube.com/shorts/sVXreX874Pw' },
  { id: 'phys-20', title: 'Physics Experiment Part 20', youtube_url: 'https://youtube.com/shorts/5uIbdQ2rYiE' },
  { id: 'phys-21', title: 'Physics Experiment Part 21', youtube_url: 'https://youtube.com/shorts/f-TX-vlkCeo' },
  { id: 'phys-22', title: 'Physics Experiment Part 22', youtube_url: 'https://youtube.com/shorts/o0EaT-B9G4U' },
  { id: 'phys-23', title: 'Physics Experiment Part 23', youtube_url: 'https://youtube.com/shorts/RTu8EOeGoD4' },
  { id: 'phys-24', title: 'Physics Experiment Part 24', youtube_url: 'https://youtube.com/shorts/qDjdQAazXm8' },
  { id: 'phys-25', title: 'Physics Experiment Part 25', youtube_url: 'https://youtube.com/shorts/5OQl0FH2xVM' },
];

// Biology Experiments (25 videos)
const biologyVideos: Video[] = [
  { id: 'bio-1', title: 'Biology Experiment Part 1', youtube_url: 'https://youtu.be/zLW45KLaoSA' },
  { id: 'bio-2', title: 'Biology Experiment Part 2', youtube_url: 'https://youtu.be/YxSeqHa1-aA' },
  { id: 'bio-3', title: 'Biology Experiment Part 3', youtube_url: 'https://youtu.be/Zv5nvY9kuD4' },
  { id: 'bio-4', title: 'Biology Experiment Part 4', youtube_url: 'https://youtu.be/HRSheC1IgRU' },
  { id: 'bio-5', title: 'Biology Experiment Part 5', youtube_url: 'https://youtu.be/B0zLgvEAbQQ' },
  { id: 'bio-6', title: 'Biology Experiment Part 6', youtube_url: 'https://youtu.be/m9ZjjE33bmA' },
  { id: 'bio-7', title: 'Biology Experiment Part 7', youtube_url: 'https://youtu.be/xHq4KQPhZIA' },
  { id: 'bio-8', title: 'Biology Experiment Part 8', youtube_url: 'https://youtu.be/EgxgzPu4uEY' },
  { id: 'bio-9', title: 'Biology Experiment Part 9', youtube_url: 'https://youtu.be/5VVx1Z1mh1M' },
  { id: 'bio-10', title: 'Biology Experiment Part 10', youtube_url: 'https://youtu.be/lHTK0et4nzA' },
  { id: 'bio-11', title: 'Biology Experiment Part 11', youtube_url: 'https://youtu.be/TMY81nqmvoE' },
  { id: 'bio-12', title: 'Biology Experiment Part 12', youtube_url: 'https://youtu.be/3mcyCPTPDBw' },
  { id: 'bio-13', title: 'Biology Experiment Part 13', youtube_url: 'https://youtube.com/shorts/Ad3tqXocaww' },
  { id: 'bio-14', title: 'Biology Experiment Part 14', youtube_url: 'https://youtube.com/shorts/qbUginBRopY' },
  { id: 'bio-15', title: 'Biology Experiment Part 15', youtube_url: 'https://youtu.be/0hMzBSBaMuk' },
  { id: 'bio-16', title: 'Biology Experiment Part 16', youtube_url: 'https://youtu.be/dKwK6SkrzzM' },
  { id: 'bio-17', title: 'Biology Experiment Part 17', youtube_url: 'https://youtu.be/-yg7LA29T2o' },
  { id: 'bio-18', title: 'Biology Experiment Part 18', youtube_url: 'https://youtu.be/DxS-Ioxq6zg' },
  { id: 'bio-19', title: 'Biology Experiment Part 19', youtube_url: 'https://youtu.be/9zOF8rehTC0' },
  { id: 'bio-20', title: 'Biology Experiment Part 20', youtube_url: 'https://youtu.be/NSse6ZEYs18' },
  { id: 'bio-21', title: 'Biology Experiment Part 21', youtube_url: 'https://youtu.be/-x7o5l2UBGI' },
  { id: 'bio-22', title: 'Biology Experiment Part 22', youtube_url: 'https://youtu.be/t1iQHHJ0YyE' },
  { id: 'bio-23', title: 'Biology Experiment Part 23', youtube_url: 'https://youtu.be/p4hnFf_jmvU' },
  { id: 'bio-24', title: 'Biology Experiment Part 24', youtube_url: 'https://youtube.com/shorts/5biSFXNb4hM' },
  { id: 'bio-25', title: 'Biology Experiment Part 25', youtube_url: 'https://youtu.be/63YdIH2S2ls' },
];

const videosByCategory: Record<string, Video[]> = {
  chemistry: chemistryVideos,
  physics: physicsVideos,
  biology: biologyVideos,
};

export default function ScienceExperiments({ user, onBack }: ScienceExperimentsProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const handleBack = () => {
    if (selectedVideo) {
      setSelectedVideo(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onBack();
    }
  };

  const getTitle = () => {
    if (selectedVideo) return selectedVideo.title;
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      return `${cat?.name} Experiments`;
    }
    return 'Science Experiments';
  };

  const currentVideos = selectedCategory ? videosByCategory[selectedCategory] || [] : [];

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
              <FlaskConical className="h-6 w-6 text-primary" />
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
                <FlaskConical className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">Science Experiments</h2>
                <p className="text-muted-foreground">Learn science through hands-on experiments</p>
              </div>

              <div className="grid gap-4">
                {categories.map((cat, index) => {
                  const Icon = cat.icon;
                  const videoCount = videosByCategory[cat.id || '']?.length || 0;
                  
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`group relative bg-gradient-to-br ${cat.color} border-2 ${cat.borderColor} p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-glow overflow-hidden text-left`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-background/50 ${cat.iconColor}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{cat.name}</h3>
                          <p className="text-sm text-muted-foreground">{cat.nameLocal}</p>
                          <p className="text-xs text-muted-foreground mt-1">{videoCount} experiments</p>
                        </div>
                        <Play className="h-6 w-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="relative w-full h-40 bg-muted overflow-hidden">
                        <img 
                          src={getYouTubeThumbnail(video.youtube_url, 'hq')} 
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                            <Play className="h-7 w-7 text-primary-foreground fill-current" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold line-clamp-2">{video.title}</h4>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
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
                  Watch and learn from this science experiment!
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
