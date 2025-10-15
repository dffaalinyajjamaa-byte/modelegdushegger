import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Eye, FileText, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Content {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  subject: string;
  grade_level: string;
  created_at: string;
}

export default function AdminContent() {
  const { toast } = useToast();
  const [content, setContent] = useState<Content[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    type: 'pdf',
    url: '',
    subject: '',
    grade_level: '',
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContent(data);
    }
  };

  const handleAddContent = async () => {
    try {
      const { error } = await supabase
        .from('content')
        .insert([newContent]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Content added successfully' });
      setIsAddOpen(false);
      setNewContent({
        title: '',
        description: '',
        type: 'pdf',
        url: '',
        subject: '',
        grade_level: '',
      });
      fetchContent();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Content deleted' });
      fetchContent();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Content Management</CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Content</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    placeholder="Enter content title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newContent.description}
                    onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={newContent.type}
                      onChange={(e) => setNewContent({ ...newContent, type: e.target.value })}
                    >
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Grade Level</label>
                    <Input
                      value={newContent.grade_level}
                      onChange={(e) => setNewContent({ ...newContent, grade_level: e.target.value })}
                      placeholder="e.g., Grade 8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={newContent.subject}
                    onChange={(e) => setNewContent({ ...newContent, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={newContent.url}
                    onChange={(e) => setNewContent({ ...newContent, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleAddContent} className="w-full">
                  Add Content
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {content.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'video' ? (
                      <Video className="w-4 h-4 text-purple-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-orange-500" />
                    )}
                    <h3 className="font-medium">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{item.subject}</Badge>
                    <Badge variant="outline">{item.grade_level}</Badge>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
