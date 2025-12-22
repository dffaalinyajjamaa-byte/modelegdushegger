import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy, Play, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompetitionProps {
  user: User;
  onBack: () => void;
}

interface Video {
  id: string;
  title: string;
  youtubeId: string;
}

const competitionVideos: Video[] = [
  { id: '1', title: 'Dorgaadorgee Part 1', youtubeId: 'C0bTnVX6oP8' },
  { id: '2', title: 'Dorgaadorgee Part 2', youtubeId: 'FuydUFAchIc' },
  { id: '3', title: 'Dorgaadorgee Part 3', youtubeId: 'EK91m7BGMuw' },
  { id: '4', title: 'Dorgaadorgee Part 4', youtubeId: 'OJ8ELuAl0ss' },
  { id: '5', title: 'Dorgaadorgee Part 5', youtubeId: 'eFv4mM3H_j4' },
  { id: '6', title: 'Dorgaadorgee Part 6', youtubeId: 'fI7dlkhbAjI' },
  { id: '7', title: 'Dorgaadorgee Part 7', youtubeId: 'n7T7URx5xDo' },
  { id: '8', title: 'Dorgaadorgee Part 8', youtubeId: 'tE5v38-yk_U' },
  { id: '9', title: 'Dorgaadorgee Part 9', youtubeId: 'nuoR_LpAW_M' },
  { id: '10', title: 'Dorgaadorgee Part 10', youtubeId: 'GzdPVbKNjYI' },
  { id: '11', title: 'Dorgaadorgee Part 11', youtubeId: 'sMDf0kenwJI' },
];

export default function Competition({ user, onBack }: CompetitionProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  if (selectedVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button variant="ghost" size="sm" onClick={() => setSelectedVideo(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-lg font-semibold truncate flex-1 mx-4">{selectedVideo.title}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSelectedVideo(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center">
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
              title={selectedVideo.title}
              className="w-full h-full max-h-[80vh]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dorgaadorgee</h1>
              <p className="text-sm text-muted-foreground">Competition Videos</p>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitionVideos.map((video) => (
              <Card
                key={video.id}
                className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative aspect-video">
                  <img
                    src={getYouTubeThumbnail(video.youtubeId)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Trophy className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
