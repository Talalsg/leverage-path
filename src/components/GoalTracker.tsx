import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, Check, Edit2, Trash2 } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  quarter: number | null;
  year: number;
  is_completed: boolean;
}

export function GoalTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_value: '',
    quarter: currentQuarter.toString(),
    year: currentYear.toString(),
  });

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false });
    
    setGoals((data as Goal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.title) return;
    
    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description || null,
      target_value: formData.target_value ? parseInt(formData.target_value) : null,
      current_value: 0,
      quarter: parseInt(formData.quarter),
      year: parseInt(formData.year),
    });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Goal created' });
      setDialogOpen(false);
      setFormData({ title: '', description: '', target_value: '', quarter: currentQuarter.toString(), year: currentYear.toString() });
      fetchGoals();
    }
  };

  const updateProgress = async (goalId: string, currentValue: number) => {
    await supabase.from('goals').update({ current_value: currentValue }).eq('id', goalId);
    fetchGoals();
  };

  const toggleComplete = async (goal: Goal) => {
    await supabase.from('goals').update({ is_completed: !goal.is_completed }).eq('id', goal.id);
    fetchGoals();
    toast({ title: goal.is_completed ? 'Goal reopened' : 'Goal completed!' });
  };

  const deleteGoal = async (goalId: string) => {
    await supabase.from('goals').delete().eq('id', goalId);
    toast({ title: 'Goal deleted' });
    fetchGoals();
  };

  const getProgress = (goal: Goal) => {
    if (!goal.target_value) return 0;
    return Math.min(100, ((goal.current_value || 0) / goal.target_value) * 100);
  };

  const currentQuarterGoals = goals.filter(g => g.year === currentYear && g.quarter === currentQuarter);
  const otherGoals = goals.filter(g => !(g.year === currentYear && g.quarter === currentQuarter));

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Quarterly Goals
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Goal Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Evaluate 10 deals"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div>
                    <Label>Quarter</Label>
                    <Select value={formData.quarter} onValueChange={(v) => setFormData({ ...formData, quarter: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Goal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Quarter Goals */}
        <div className="space-y-3">
          {currentQuarterGoals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No goals for Q{currentQuarter} {currentYear}. Add one to track progress.
            </p>
          )}
          
          {currentQuarterGoals.map((goal) => (
            <div
              key={goal.id}
              className={`p-3 rounded-lg border ${goal.is_completed ? 'bg-accent/10 border-accent/30' : 'bg-muted/30 border-border/50'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${goal.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {goal.title}
                    </p>
                    {goal.is_completed && <Check className="h-4 w-4 text-accent" />}
                  </div>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleComplete(goal)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGoal(goal.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {goal.target_value && !goal.is_completed && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goal.current_value || 0} / {goal.target_value}</span>
                  </div>
                  <Progress value={getProgress(goal)} className="h-2" />
                  <div className="flex gap-1 mt-2">
                    {[1, 5, 10].map((inc) => (
                      <Button
                        key={inc}
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2"
                        onClick={() => updateProgress(goal.id, (goal.current_value || 0) + inc)}
                      >
                        +{inc}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Other Goals */}
        {otherGoals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Past/Future Goals</p>
            <div className="space-y-2">
              {otherGoals.slice(0, 5).map((goal) => (
                <div key={goal.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                  <span className={goal.is_completed ? 'line-through text-muted-foreground' : ''}>
                    {goal.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Q{goal.quarter} {goal.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
