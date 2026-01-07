import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';

type Status = 'idea' | 'draft' | 'published';

interface Insight {
  id: string;
  title: string;
  content: string | null;
  status: Status;
  platform: string | null;
  publish_date: string | null;
  engagement_likes: number;
}

export default function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [generatingAI, setGeneratingAI] = useState(false);

  const fetchInsights = async () => {
    if (!user) return;
    const { data } = await supabase.from('insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setInsights((data as Insight[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchInsights(); }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.title) return;
    const { data, error } = await supabase.from('insights').insert({ user_id: user.id, title: formData.title, content: formData.content || null }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { 
      toast({ title: 'Insight added' }); 
      setDialogOpen(false); 
      setFormData({ title: '', content: '' }); 
      logActivity({ type: 'insight_created' as any, title: `Created insight: ${formData.title}`, entityType: 'insight', entityId: data?.id });
      fetchInsights(); 
    }
  };

  const updateStatus = async (id: string, status: Status, title: string) => {
    const updates: any = { status };
    if (status === 'published') {
      updates.publish_date = new Date().toISOString().split('T')[0];
      logActivity({ type: 'insight_published', title: `Published insight: ${title}`, entityType: 'insight', entityId: id });
    }
    await supabase.from('insights').update(updates).eq('id', id);
    fetchInsights();
  };

  const generateAIDraft = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: { action: 'insight', deal: {} }
      });
      
      if (error) throw error;
      
      const result = data.result || data.raw;
      setFormData({ 
        title: 'AI Generated Draft', 
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
      });
      setDialogOpen(true);
      toast({ title: 'AI draft generated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to generate AI draft', variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

  const published = insights.filter(i => i.status === 'published').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Insights Hub</h1>
          <p className="text-muted-foreground">Signal over visibility — build authority through content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateAIDraft} disabled={generatingAI}>
            {generatingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Draft
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Insight</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Insight</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Evaluating Pre-Seed Startups in Saudi" /></div>
                <div><Label>Content</Label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={5} /></div>
                <Button onClick={handleCreate} className="w-full">Save Insight</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border/50"><CardContent className="p-5 flex items-center justify-between">
        <div><p className="text-sm text-muted-foreground">Published This Quarter</p><p className="text-3xl font-bold text-warning">{published}</p></div>
        <div className="text-right"><p className="text-sm text-muted-foreground">Target</p><p className="text-xl font-semibold">4-6</p></div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map(insight => (
          <Card key={insight.id} className="bg-card border-border/50">
            <CardContent className="p-5">
              <Badge variant={insight.status === 'published' ? 'default' : insight.status === 'draft' ? 'secondary' : 'outline'} className="mb-2">
                {insight.status}
              </Badge>
              <p className="font-semibold">{insight.title}</p>
              {insight.content && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{insight.content}</p>}
              <div className="mt-4">
                <Select value={insight.status} onValueChange={v => updateStatus(insight.id, v as Status, insight.title)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {insights.length === 0 && !loading && (
          <Card className="col-span-full bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No insights yet. Capture your first idea.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
