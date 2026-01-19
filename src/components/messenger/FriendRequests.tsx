import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatBubbleAvatar } from '@/components/ui/chat-bubble';
import { UserPlus, Check, X, Users, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FriendRequestsProps {
  user: User;
  onRequestAccepted: (friendUserId: string) => void;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_name?: string;
  sender_pic?: string;
  receiver_name?: string;
  receiver_pic?: string;
}

export default function FriendRequests({ user, onRequestAccepted }: FriendRequestsProps) {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('friend_requests_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        fetchRequests();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `sender_id=eq.${user.id}`,
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchRequests = async () => {
    try {
      // Fetch received requests
      const { data: received } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch sent requests
      const { data: sent } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Get user details for received requests
      if (received && received.length > 0) {
        const senderIds = received.map(r => r.sender_id);
        const { data: senders } = await supabase
          .from('messaging_users')
          .select('user_id, name, profile_pic')
          .in('user_id', senderIds);

        const enrichedReceived = received.map(r => ({
          ...r,
          sender_name: senders?.find(s => s.user_id === r.sender_id)?.name || 'Unknown',
          sender_pic: senders?.find(s => s.user_id === r.sender_id)?.profile_pic,
        }));
        setReceivedRequests(enrichedReceived);
      } else {
        setReceivedRequests([]);
      }

      // Get user details for sent requests
      if (sent && sent.length > 0) {
        const receiverIds = sent.map(r => r.receiver_id);
        const { data: receivers } = await supabase
          .from('messaging_users')
          .select('user_id, name, profile_pic')
          .in('user_id', receiverIds);

        const enrichedSent = sent.map(r => ({
          ...r,
          receiver_name: receivers?.find(s => s.user_id === r.receiver_id)?.name || 'Unknown',
          receiver_pic: receivers?.find(s => s.user_id === r.receiver_id)?.profile_pic,
        }));
        setSentRequests(enrichedSent);
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Friend request accepted!",
        description: `You are now friends with ${request.sender_name}`,
      });

      onRequestAccepted(request.sender_id);
      fetchRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request declined",
      });
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
      });
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const totalRequests = receivedRequests.length + sentRequests.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-4 h-4" />
              Friend Requests
              <Badge className="ml-auto">{receivedRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {receivedRequests.map(request => (
                  <div key={request.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <ChatBubbleAvatar 
                      src={request.sender_pic || ''} 
                      fallback={request.sender_name?.charAt(0) || 'U'} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.sender_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Wants to be friends
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={() => handleAccept(request)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleReject(request.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4" />
              Pending Requests
              <Badge variant="secondary" className="ml-auto">{sentRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {sentRequests.map(request => (
                  <div key={request.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <ChatBubbleAvatar 
                      src={request.receiver_pic || ''} 
                      fallback={request.receiver_name?.charAt(0) || 'U'} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.receiver_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Waiting for response
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCancel(request.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalRequests === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No pending friend requests</p>
          <p className="text-sm mt-1">Search for friends to connect!</p>
        </div>
      )}
    </div>
  );
}
