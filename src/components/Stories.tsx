import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Story {
  id: string;
  user_id: string;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
  viewed: boolean;
}

interface StoriesProps {
  user: User;
}

export default function Stories({ user }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStories = async () => {
    try {
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user info separately
      const userIds = [...new Set(storiesData?.map(s => s.user_id) || [])];
      const { data: usersData } = await supabase
        .from('messaging_users')
        .select('user_id, name, profile_pic')
        .in('user_id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || []);

      const { data: viewedStories } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);

      const viewedIds = new Set(viewedStories?.map(v => v.story_id) || []);

      const formattedStories = storiesData?.map(story => {
        const storyUser = usersMap.get(story.user_id);
        return {
          ...story,
          user: {
            name: storyUser?.name || 'User',
            avatar_url: storyUser?.profile_pic || null,
          },
          viewed: viewedIds.has(story.id),
        };
      }) || [];

      setStories(formattedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleStoryClick = async (story: Story) => {
    setSelectedStory(story);
    setShowViewer(true);

    if (!story.viewed && story.user_id !== user.id) {
      await supabase.from('story_views').insert({
        story_id: story.id,
        viewer_id: user.id,
      });
      fetchStories();
    }
  };

  const handleCreateStory = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`stories/${fileName}`, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`stories/${fileName}`);

        const { error: insertError } = await supabase.from('stories').insert({
          user_id: user.id,
          content_type: 'image',
          content_url: publicUrl,
        });

        if (insertError) throw insertError;

        toast({ title: 'Story created successfully!' });
        fetchStories();
      } catch (error: any) {
        toast({ title: 'Failed to create story', description: error.message, variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide">
        <button
          onClick={handleCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-2 group"
        >
          <div className="relative">
            <Avatar className="w-16 h-16 ring-2 ring-border">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="gradient-primary text-white">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center ring-2 ring-background">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Your Story</span>
        </button>

        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => handleStoryClick(story)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <Avatar className={`w-16 h-16 ring-4 ${story.viewed ? 'ring-border' : 'ring-primary'}`}>
              <AvatarImage src={story.user.avatar_url || undefined} />
              <AvatarFallback className="gradient-accent text-white">
                {story.user.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground max-w-[64px] truncate">
              {story.user.name}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-md h-[80vh] p-0 bg-black">
          {selectedStory && (
            <div className="relative w-full h-full flex flex-col">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedStory.user.avatar_url || undefined} />
                    <AvatarFallback>{selectedStory.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-white font-medium">{selectedStory.user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowViewer(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                {selectedStory.content_type === 'image' && selectedStory.content_url && (
                  <img
                    src={selectedStory.content_url}
                    alt="Story"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                {selectedStory.content_type === 'text' && (
                  <div
                    className="w-full h-full flex items-center justify-center p-8"
                    style={{ backgroundColor: selectedStory.background_color || '#000' }}
                  >
                    <p className="text-white text-2xl text-center">{selectedStory.text_content}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
