import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface Chat {
  id: string;
  chat_id: string;
  is_group: boolean;
  group_name: string | null;
  members: string[];
  created_at: string;
}

export default function AdminChats() {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setChats(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chats.map((chat) => (
            <Card key={chat.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {chat.is_group ? chat.group_name || 'Unnamed Group' : 'Direct Chat'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {chat.members.length} members
                  </div>
                </div>
                <Badge variant={chat.is_group ? 'default' : 'secondary'}>
                  {chat.is_group ? 'Group' : '1:1'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
