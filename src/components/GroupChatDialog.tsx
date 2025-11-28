import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessagingUser {
  user_id: string;
  name: string;
  profile_pic: string | null;
}

interface GroupChatDialogProps {
  user: User;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onGroupCreated: () => void;
}

export default function GroupChatDialog({ user, open: externalOpen, onOpenChange, onGroupCreated }: GroupChatDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('messaging_users')
        .select('user_id, name, profile_pic')
        .neq('user_id', user.id);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: 'Group name is required', variant: 'destructive' });
      return;
    }

    if (selectedUsers.size < 1) {
      toast({ title: 'Select at least one user', variant: 'destructive' });
      return;
    }

    try {
      const members = [user.id, ...Array.from(selectedUsers)];
      const chatId = `group_${Date.now()}`;

      const { error } = await supabase.from('chats').insert({
        chat_id: chatId,
        is_group: true,
        group_name: groupName,
        members: members.map(id => id.toString()),
        created_by: user.id,
        admins: [user.id],
      });

      if (error) throw error;

      toast({ title: 'Group created successfully!' });
      setOpen(false);
      setGroupName('');
      setSelectedUsers(new Set());
      onGroupCreated();
    } catch (error: any) {
      toast({ title: 'Failed to create group', description: error.message, variant: 'destructive' });
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="rounded-full">
          <Users className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Select members:</p>
            {users.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  checked={selectedUsers.has(u.user_id)}
                  onCheckedChange={() => toggleUser(u.user_id)}
                />
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    {u.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{u.name}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleCreateGroup} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Group ({selectedUsers.size} members)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
