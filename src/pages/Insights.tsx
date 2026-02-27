import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Lightbulb, Sparkles, Loader2, Trash2, Pencil, Heart, MessageSquare, Share2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { SearchFilter } from '@/components/SearchFilter';
import { EditInsightModal } from '@/components/EditInsightModal';

type Status = 'idea' | 'draft' | 'published';

interface Insight {
  id: string;
  title: string;
  content: string | null;
  status: Status;
  platform: string | null;
  publish_date: string | null;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  inbound_inquiries: number;
}

const statusOptions = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

const platformOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'medium', label: 'Medium' },
  { value: 'substack', label: 'Substack' },
  { value: 'blog', label: 'Personal Blog' },
];

export default function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [insightToEdit, setInsightToEdit] = useState<Insight | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insightToDelete, setInsightToDelete] = useState<Insight | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInsights = async () => {
    if (!user) return;
    const { data } = await supabase.from('insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setInsights((data as Insight[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchInsights(); }, [user]);

  // Filter insights based on search and filters
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          insight.title.toLowerCase().includes(query) ||
          (insight.content?.toLowerCase() || '').includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterValues.status && filterValues.status !== 'all') {
        if (insight.status !== filterValues.status) return false;
      }

      // Platform filter
      if (filterValues.platform && filterValues.platform !== 'all') {
        if (insight.platform !== filterValues.platform) return false;
      }

      return true;
    });
  }, [insights, searchQuery, filterValues]);

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

  const openEditModal = (insight: Insight) => {
    setInsightToEdit(insight);
    setEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!insightToDelete) return;
    setDeleting(true);
    
    try {
      const { error } = await supabase.from('insights').delete().eq('id', insightToDelete.id);
      if (error) throw error;
      
      toast({ title: 'Insight deleted', description: `"${insightToDelete.title}" has been removed.` });
      setDeleteDialogOpen(false);
      setInsightToDelete(null);
      fetchInsights();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (insight: Insight) => {
    setInsightToDelete(insight);
    setDeleteDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

  const published = filteredInsights.filter(i => i.status === 'published').length;
  const totalEngagement = filteredInsights.reduce((sum, i) => sum + i.engagement_likes + i.engagement_comments + i.engagement_shares, 0);

  const filterOptions = [
    { key: 'status', label: 'Status', options: statusOptions },
    { key: 'platform', label: 'Platform', options: platformOptions },
  ];

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

      {/* Search and Filter */}
      <SearchFilter
        placeholder="Search insights by title or content..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filterOptions}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
        onClearAll={clearAllFilters}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Published This Quarter</p>
              <p className="text-3xl font-bold text-warning">{published}</p>
              <p className="text-xs text-muted-foreground/70">Target: 4-6</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Engagement</p>
              <p className="text-3xl font-bold text-accent">{totalEngagement}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Inbound Inquiries</p>
              <p className="text-3xl font-bold text-primary">{filteredInsights.reduce((sum, i) => sum + i.inbound_inquiries, 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map(insight => (
            <Card key={insight.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={insight.status === 'published' ? 'default' : insight.status === 'draft' ? 'secondary' : 'outline'}>
                      {insight.status}
                    </Badge>
                    {insight.platform && (
                      <Badge variant="outline" className="text-xs">{insight.platform}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModal(insight)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(insight)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="font-semibold">{insight.title}</p>
                {insight.content && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{insight.content}</p>}
                
                {insight.status === 'published' && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{insight.engagement_likes}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{insight.engagement_comments}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{insight.engagement_shares}</span>
                    {insight.inbound_inquiries > 0 && (
                      <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3 w-3" />{insight.inbound_inquiries} inbound</span>
                    )}
                  </div>
                )}

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
          {filteredInsights.length === 0 && !loading && (
            <Card className="col-span-full bg-muted/30 border-dashed">
              <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground/50" />
                {searchQuery || Object.keys(filterValues).length > 0 ? (
                  <>
                    <h3 className="font-semibold text-lg">No results match your filters</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg">No insights yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">Write your first piece. Capture ideas, draft content, and track engagement.</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <EditInsightModal insight={insightToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSaved={fetchInsights} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Insight" itemName={insightToDelete?.title} loading={deleting} />
    </div>
  );
}
