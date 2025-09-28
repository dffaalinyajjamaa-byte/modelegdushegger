import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User } from '@supabase/supabase-js';
import { Plus, CheckCircle, Clock, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaskManagerProps {
  user: User;
  onLogActivity: (type: string, description: string, metadata?: any) => void;
}

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export default function TaskManager({ user, onLogActivity }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.due_date || null
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      setNewTask({ title: '', description: '', due_date: '' });
      setIsDialogOpen(false);

      toast({
        title: "Task Created",
        description: `"${newTask.title}" has been added to your tasks.`,
      });

      onLogActivity('task_created', `Created task: ${newTask.title}`, {
        task_id: data.id,
        has_due_date: !!newTask.due_date
      });

    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const completed = !task.completed;
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      setTasks(prev => 
        prev.map(t => 
          t.id === task.id 
            ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
            : t
        )
      );

      toast({
        title: completed ? "Task Completed!" : "Task Reopened",
        description: completed 
          ? "Great job! Keep up the excellent work!" 
          : `"${task.title}" has been reopened.`,
      });

      onLogActivity(
        completed ? 'task_completed' : 'task_reopened', 
        `${completed ? 'Completed' : 'Reopened'} task: ${task.title}`,
        { task_id: task.id }
      );

    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== task.id));

      toast({
        title: "Task Deleted",
        description: `"${task.title}" has been removed.`,
      });

      onLogActivity('task_deleted', `Deleted task: ${task.title}`, {
        task_id: task.id
      });

    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date() && dateString;
  };

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Task Manager
              </CardTitle>
              <p className="text-muted-foreground">Track your study progress and assignments</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="primary" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Study Herrega Unit 2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add more details about this task..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date (Optional)</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createTask} disabled={loading || !newTask.title.trim()}>
                      {loading ? 'Creating...' : 'Create Task'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first task to start tracking your study progress!
              </p>
              <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{tasks.length}</div>
                      <div className="text-sm text-muted-foreground">Total Tasks</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{completedTasks.length}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{pendingTasks.length}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-accent" />
                    Pending Tasks ({pendingTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <Card key={task.id} className="hover:shadow-md transition-smooth">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask(task)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {task.due_date && (
                                  <Badge 
                                    variant={isOverdue(task.due_date) ? "destructive" : "outline"}
                                    className="text-xs"
                                  >
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {formatDate(task.due_date)}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  Created {formatDate(task.created_at)}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Completed Tasks ({completedTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <Card key={task.id} className="opacity-75 hover:opacity-100 transition-smooth">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask(task)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium line-through">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed {formatDate(task.completed_at!)}
                                </Badge>
                                {task.due_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Due: {formatDate(task.due_date)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}