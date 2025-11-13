import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Send, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  subscribers: string[];
  is_public: boolean;
}

interface ChannelPost {
  id: string;
  content: string | null;
  media_url: string | null;
  views: number;
  created_at: string;
  author: {
    name: string;
    avatar: string | null;
  };
}

interface ChannelsProps {
  user: User;
  onBack: () => void;
}

export default function Channels({ user, onBack }: ChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchPosts(selectedChannel.id);
    }
  }, [selectedChannel]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const fetchPosts = async (channelId: string) => {
    try {
      const { data: postsData, error } = await supabase
        .from('channel_posts')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author info separately
      const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
      const { data: authorsData } = await supabase
        .from('messaging_users')
        .select('user_id, name, profile_pic')
        .in('user_id', authorIds);

      const authorsMap = new Map(authorsData?.map(a => [a.user_id, a]) || []);

      const formattedPosts = postsData?.map(post => {
        const author = authorsMap.get(post.author_id);
        return {
          ...post,
          author: {
            name: author?.name || 'User',
            avatar: author?.profile_pic || null,
          },
        };
      }) || [];

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.name.trim()) {
      toast({ title: 'Channel name is required', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('channels').insert({
        name: newChannel.name,
        description: newChannel.description,
        created_by: user.id,
        admins: [user.id],
        subscribers: [user.id],
      });

      if (error) throw error;

      toast({ title: 'Channel created successfully!' });
      setShowCreate(false);
      setNewChannel({ name: '', description: '' });
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Failed to create channel', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubscribe = async (channelId: string) => {
    try {
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return;

      const isSubscribed = channel.subscribers.includes(user.id);
      const newSubscribers = isSubscribed
        ? channel.subscribers.filter(id => id !== user.id)
        : [...channel.subscribers, user.id];

      const { error } = await supabase
        .from('channels')
        .update({ subscribers: newSubscribers })
        .eq('id', channelId);

      if (error) throw error;

      toast({ title: isSubscribed ? 'Unsubscribed' : 'Subscribed successfully!' });
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreatePost = async () => {
    if (!selectedChannel || !newPost.trim()) return;

    try {
      const { error } = await supabase.from('channel_posts').insert({
        channel_id: selectedChannel.id,
        author_id: user.id,
        content: newPost,
      });

      if (error) throw error;

      setNewPost('');
      fetchPosts(selectedChannel.id);
    } catch (error: any) {
      toast({ title: 'Failed to post', description: error.message, variant: 'destructive' });
    }
  };

  if (selectedChannel) {
    return (
      <div className="flex flex-col h-full">
        <div className="glass-card border-b border-border/40 p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChannel(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="gradient-primary text-white">
              {selectedChannel.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedChannel.name}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedChannel.subscribers.length} subscribers
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {post.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {post.content && <p className="text-sm mb-2">{post.content}</p>}
                {post.media_url && (
                  <img src={post.media_url} alt="Post media" className="rounded-lg w-full" />
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{post.views} views</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="glass-card border-t border-border/40 p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Write a post..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <Button onClick={handleCreatePost} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Channels</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Channel name"
                value={newChannel.name}
                onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={newChannel.description}
                onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
              />
              <Button onClick={handleCreateChannel} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {channels.map(channel => (
          <Card
            key={channel.id}
            className="glass-card hover-scale cursor-pointer"
            onClick={() => setSelectedChannel(channel)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="gradient-secondary text-white">
                    {channel.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{channel.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                </div>
                <Button
                  variant={channel.subscribers.includes(user.id) ? "secondary" : "default"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(channel.id);
                  }}
                >
                  <Users className="w-4 h-4 mr-1" />
                  {channel.subscribers.length}
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
