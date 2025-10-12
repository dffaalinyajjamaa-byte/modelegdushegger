import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Network, Plus, Users, Share2, Trash2, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MindMapBuilderProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface MindMapEdge {
  from: string;
  to: string;
}

interface MindMap {
  id: string;
  title: string;
  subject: string;
  is_collaborative: boolean;
  collaborators: string[];
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  created_at: string;
  updated_at: string;
}

export default function MindMapBuilder({ user, onLogActivity }: MindMapBuilderProps) {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapSubject, setNewMapSubject] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMindMaps();
  }, [user]);

  useEffect(() => {
    if (selectedMap) {
      const channel = supabase
        .channel(`mindmap_${selectedMap.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'mind_maps',
          filter: `id=eq.${selectedMap.id}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSelectedMap(payload.new as MindMap);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedMap]);

  const fetchMindMaps = async () => {
    const { data } = await supabase
      .from('mind_maps')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) {
      const mappedData = data.map(item => ({
        ...item,
        nodes: (item.nodes as any) || [],
        edges: (item.edges as any) || []
      })) as MindMap[];
      setMindMaps(mappedData);
    }
  };

  const createMindMap = async () => {
    if (!newMapTitle.trim() || !newMapSubject.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both title and subject.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const centerNode: MindMapNode = {
        id: 'center',
        label: newMapTitle,
        x: 50,
        y: 50,
        color: '#FF7A00'
      };

      const { data, error } = await supabase
        .from('mind_maps')
        .insert({
          user_id: user.id,
          title: newMapTitle,
          subject: newMapSubject,
          nodes: centerNode as any,
          edges: [] as any
        })
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        ...data,
        nodes: (data.nodes as any) || [],
        edges: (data.edges as any) || []
      } as MindMap;

      setMindMaps([mappedData, ...mindMaps]);
      setNewMapTitle('');
      setNewMapSubject('');
      setDialogOpen(false);
      setSelectedMap(mappedData);

      toast({
        title: 'Mind Map Created!',
        description: 'Start adding nodes to organize your thoughts.',
      });

      onLogActivity('mind_map_created', `Created mind map: ${newMapTitle}`);
    } catch (error) {
      console.error('Error creating mind map:', error);
    }
  };

  const addNode = async () => {
    if (!selectedMap || !newNodeLabel.trim()) return;

    const newNode: MindMapNode = {
      id: `node_${Date.now()}`,
      label: newNodeLabel,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };

    const updatedNodes = [...selectedMap.nodes, newNode];

    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({ nodes: updatedNodes as any })
        .eq('id', selectedMap.id);

      if (error) throw error;

      setSelectedMap({ ...selectedMap, nodes: updatedNodes });
      setNewNodeLabel('');

      toast({
        title: 'Node Added!',
        description: 'Your mind map is growing.',
      });
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const connectNodes = async (fromId: string, toId: string) => {
    if (!selectedMap) return;

    const newEdge: MindMapEdge = { from: fromId, to: toId };
    const updatedEdges = [...selectedMap.edges, newEdge];

    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({ edges: updatedEdges as any })
        .eq('id', selectedMap.id);

      if (error) throw error;

      setSelectedMap({ ...selectedMap, edges: updatedEdges });
    } catch (error) {
      console.error('Error connecting nodes:', error);
    }
  };

  const deleteNode = async (nodeId: string) => {
    if (!selectedMap || nodeId === 'center') return;

    const updatedNodes = selectedMap.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = selectedMap.edges.filter(e => e.from !== nodeId && e.to !== nodeId);

    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({
          nodes: updatedNodes as any,
          edges: updatedEdges as any
        })
        .eq('id', selectedMap.id);

      if (error) throw error;

      setSelectedMap({ ...selectedMap, nodes: updatedNodes, edges: updatedEdges });
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const deleteMindMap = async (mapId: string) => {
    try {
      const { error } = await supabase
        .from('mind_maps')
        .delete()
        .eq('id', mapId);

      if (error) throw error;

      setMindMaps(mindMaps.filter(m => m.id !== mapId));
      if (selectedMap?.id === mapId) {
        setSelectedMap(null);
      }

      toast({
        title: 'Mind Map Deleted',
        description: 'Your mind map has been removed.',
      });
    } catch (error) {
      console.error('Error deleting mind map:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-4">
      {/* Header */}
      <Card className="shadow-glow animate-fade-in mobile-card">
        <CardHeader className="mobile-header">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="w-6 h-6 text-primary" />
              Interactive Mind Maps
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-white hover-scale">
                  <Plus className="w-4 h-4 mr-1" />
                  New Map
                </Button>
              </DialogTrigger>
              <DialogContent className="mobile-card">
                <DialogHeader>
                  <DialogTitle>Create Mind Map</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Mind Map Title"
                      value={newMapTitle}
                      onChange={(e) => setNewMapTitle(e.target.value)}
                      className="rounded-2xl"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Subject (e.g., Math, Science)"
                      value={newMapSubject}
                      onChange={(e) => setNewMapSubject(e.target.value)}
                      className="rounded-2xl"
                    />
                  </div>
                  <Button
                    onClick={createMindMap}
                    className="w-full gradient-primary text-white rounded-2xl hover-scale"
                  >
                    Create Mind Map
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mind Maps List */}
        <Card className="shadow-glow animate-fade-in mobile-card">
          <CardHeader className="mobile-header">
            <CardTitle className="text-lg">My Mind Maps</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {mindMaps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="w-12 h-12 mx-auto mb-2 text-primary animate-float" />
                    <p className="text-sm">Create your first mind map!</p>
                  </div>
                ) : (
                  mindMaps.map((map) => (
                    <div
                      key={map.id}
                      className={`p-3 rounded-xl cursor-pointer transition-smooth hover-scale ${
                        selectedMap?.id === map.id ? 'gradient-primary text-white' : 'bg-muted'
                      }`}
                      onClick={() => setSelectedMap(map)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{map.title}</p>
                          <p className={`text-xs mt-1 ${selectedMap?.id === map.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {map.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={selectedMap?.id === map.id ? 'secondary' : 'outline'} className="text-xs">
                              {map.nodes.length} nodes
                            </Badge>
                            {map.is_collaborative && (
                              <Users className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMindMap(map.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Mind Map Canvas */}
        <Card className="lg:col-span-2 shadow-glow animate-fade-in mobile-card">
          <CardHeader className="mobile-header">
            <CardTitle className="text-lg">
              {selectedMap ? selectedMap.title : 'Select a Mind Map'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedMap ? (
              <div className="space-y-4">
                {/* Add Node Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new node..."
                    value={newNodeLabel}
                    onChange={(e) => setNewNodeLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNode()}
                    className="rounded-2xl"
                  />
                  <Button
                    onClick={addNode}
                    disabled={!newNodeLabel.trim()}
                    className="gradient-primary text-white rounded-2xl hover-scale"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Visual Mind Map */}
                <div className="relative w-full h-96 bg-gradient-to-br from-background to-muted rounded-2xl overflow-hidden border-2 border-muted">
                  {/* Draw edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {selectedMap.edges.map((edge, idx) => {
                      const fromNode = selectedMap.nodes.find(n => n.id === edge.from);
                      const toNode = selectedMap.nodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      return (
                        <line
                          key={idx}
                          x1={`${fromNode.x}%`}
                          y1={`${fromNode.y}%`}
                          x2={`${toNode.x}%`}
                          y2={`${toNode.y}%`}
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-primary/30"
                        />
                      );
                    })}
                  </svg>

                  {/* Draw nodes */}
                  {selectedMap.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-fade-in"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <div
                        className="px-4 py-2 rounded-full shadow-glow text-white font-medium text-sm hover-scale cursor-pointer"
                        style={{ backgroundColor: node.color }}
                      >
                        {node.label}
                        {node.id !== 'center' && (
                          <button
                            onClick={() => deleteNode(node.id)}
                            className="ml-2 text-white/80 hover:text-white"
                          >
                            <X className="w-3 h-3 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Node List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Nodes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedMap.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-2 rounded-xl bg-muted text-sm truncate"
                        style={{ borderLeft: `4px solid ${node.color}` }}
                      >
                        {node.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center animate-fade-in">
                  <Network className="w-16 h-16 mx-auto mb-4 text-primary animate-float" />
                  <p>Select or create a mind map to get started</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}