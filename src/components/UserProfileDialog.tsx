import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Image as ImageIcon, File, FileText, Mic } from 'lucide-react';

interface UserProfileDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ userId, open, onOpenChange }: UserProfileDialogProps) {
  const [profile, setProfile] = useState<any>(null);
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      fetchSharedMedia();
    }
  }, [open, userId]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedMedia = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .in('type', ['image', 'pdf', 'audio'])
        .order('timestamp', { ascending: false })
        .limit(50);

      if (data) setSharedMedia(data);
    } catch (error) {
      console.error('Error fetching shared media:', error);
    }
  };

  const getLastSeenText = (lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return lastSeenDate.toLocaleDateString();
  };

  if (loading) return null;

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pr-4">
            {/* Profile Header */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24 border-4 border-primary/30">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">{profile?.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {profile?.last_seen ? getLastSeenText(profile.last_seen) : 'Unknown'}
                  </p>
                </div>

                {profile?.grade && (
                  <Badge variant="secondary" className="mt-2">{profile.grade}</Badge>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Tabs for Shared Media */}
            <Tabs defaultValue="media" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="media">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="files">
                  <File className="w-4 h-4 mr-2" />
                  Files
                </TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="mt-4">
                {sharedMedia.filter(m => m.type === 'image').length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {sharedMedia
                      .filter(m => m.type === 'image')
                      .map(media => (
                        <div
                          key={media.id}
                          className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(media.file_url, '_blank')}
                        >
                          <img
                            src={media.file_url}
                            alt={media.file_name || 'Image'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No media shared yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                {sharedMedia.filter(m => m.type === 'pdf' || m.type === 'audio').length > 0 ? (
                  <div className="space-y-2">
                    {sharedMedia
                      .filter(m => m.type === 'pdf' || m.type === 'audio')
                      .map(media => (
                        <a
                          key={media.id}
                          href={media.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          {media.type === 'pdf' ? (
                            <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                          ) : (
                            <Mic className="w-8 h-8 text-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {media.file_name || 'File'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(media.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </a>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No files shared yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
