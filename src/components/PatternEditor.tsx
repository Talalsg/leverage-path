import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Sparkles, Target, AlertTriangle, X, Edit2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Pattern {
  id: string;
  pattern_name: string;
  positive_signals: string[] | null;
  negative_signals: string[] | null;
  weight: number | null;
  created_at: string;
}

export function PatternEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  
  const [formData, setFormData] = useState({
    pattern_name: '',
    positive_signals: [''],
    negative_signals: [''],
    weight: 1.0,
  });

  const fetchPatterns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('deal_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPatterns((data as Pattern[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPatterns(); }, [user]);

  const resetForm = () => {
    setFormData({
      pattern_name: '',
      positive_signals: [''],
      negative_signals: [''],
      weight: 1.0,
    });
    setEditingPattern(null);
  };

  const openEditDialog = (pattern: Pattern) => {
    setEditingPattern(pattern);
    setFormData({
      pattern_name: pattern.pattern_name,
      positive_signals: pattern.positive_signals?.length ? pattern.positive_signals : [''],
      negative_signals: pattern.negative_signals?.length ? pattern.negative_signals : [''],
      weight: pattern.weight || 1.0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formData.pattern_name.trim()) {
      toast({ title: 'Error', description: 'Pattern name is required', variant: 'destructive' });
      return;
    }

    const positiveSignals = formData.positive_signals.filter(s => s.trim());
    const negativeSignals = formData.negative_signals.filter(s => s.trim());

    const patternData = {
      pattern_name: formData.pattern_name.trim(),
      positive_signals: positiveSignals.length ? positiveSignals : null,
      negative_signals: negativeSignals.length ? negativeSignals : null,
      weight: formData.weight,
    };

    if (editingPattern) {
      const { error } = await supabase
        .from('deal_patterns')
        .update(patternData)
        .eq('id', editingPattern.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Pattern Updated' });
        setDialogOpen(false);
        resetForm();
        fetchPatterns();
      }
    } else {
      const { error } = await supabase
        .from('deal_patterns')
        .insert({ ...patternData, user_id: user.id });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Pattern Created' });
        setDialogOpen(false);
        resetForm();
        fetchPatterns();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('deal_patterns').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pattern Deleted' });
      fetchPatterns();
    }
  };

  const addSignal = (type: 'positive_signals' | 'negative_signals') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ''],
    }));
  };

  const removeSignal = (type: 'positive_signals' | 'negative_signals', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const updateSignal = (type: 'positive_signals' | 'negative_signals', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((s, i) => i === index ? value : s),
    }));
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Investment Patterns
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Define signals that influence AI scoring
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Pattern
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingPattern ? 'Edit Pattern' : 'Create Investment Pattern'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  <div>
                    <Label>Pattern Name</Label>
                    <Input
                      value={formData.pattern_name}
                      onChange={(e) => setFormData({ ...formData, pattern_name: e.target.value })}
                      placeholder="e.g., Strong Fintech Signal"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-accent" />
                      Positive Signals
                    </Label>
                    <div className="space-y-2">
                      {formData.positive_signals.map((signal, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={signal}
                            onChange={(e) => updateSignal('positive_signals', i, e.target.value)}
                            placeholder="e.g., Repeat founder with exit"
                          />
                          {formData.positive_signals.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSignal('positive_signals', i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSignal('positive_signals')}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Positive Signal
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Negative Signals (Red Flags)
                    </Label>
                    <div className="space-y-2">
                      {formData.negative_signals.map((signal, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={signal}
                            onChange={(e) => updateSignal('negative_signals', i, e.target.value)}
                            placeholder="e.g., No technical co-founder"
                          />
                          {formData.negative_signals.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSignal('negative_signals', i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSignal('negative_signals')}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Red Flag
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Pattern Weight: {formData.weight.toFixed(1)}x
                    </Label>
                    <Slider
                      value={[formData.weight]}
                      onValueChange={([value]) => setFormData({ ...formData, weight: value })}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher weight = stronger influence on AI scoring
                    </p>
                  </div>

                  <Button onClick={handleSave} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {editingPattern ? 'Update Pattern' : 'Create Pattern'}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading patterns...</div>
        ) : patterns.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No patterns defined yet. Create patterns to personalize AI scoring.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pattern.pattern_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {pattern.weight?.toFixed(1) || '1.0'}x
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(pattern)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(pattern.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pattern.positive_signals?.map((signal, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">
                      +{signal}
                    </Badge>
                  ))}
                  {pattern.negative_signals?.map((signal, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                      −{signal}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
