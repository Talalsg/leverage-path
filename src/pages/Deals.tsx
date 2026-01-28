import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, Brain, Sparkles, GitCompare, BookOpen, BarChart3, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AIAdvisor } from '@/components/AIAdvisor';
import { DealEvaluatorModal } from '@/components/DealEvaluatorModal';
import { DealComparison } from '@/components/DealComparison';
import { PatternEditor } from '@/components/PatternEditor';
import { CSVImport } from '@/components/CSVImport';
import { PastPassAlert } from '@/components/PastPassAlert';
import { DecisionJournalModal } from '@/components/DecisionJournalModal';
import { DealVelocityChart } from '@/components/DealVelocityChart';
import { DealFlowMetrics } from '@/components/DealFlowMetrics';
import { CreatePortfolioFromDealModal } from '@/components/CreatePortfolioFromDealModal';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { SearchFilter } from '@/components/SearchFilter';
import { EditDealModal } from '@/components/EditDealModal';

type DealStage = 'review' | 'evaluating' | 'passed' | 'term_sheet' | 'closed' | 'rejected';
type DealOutcome = 'win' | 'miss' | 'regret' | 'noise' | 'pending';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: DealStage;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  overall_score: number | null;
  ai_score: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  deck_url?: string | null;
  vision_2030_alignment?: number | null;
  founder_execution_score?: number | null;
  founder_sales_ability?: number | null;
  iteration_speed?: number | null;
  failure_modes?: string | null;
  exit_potential?: string | null;
}

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: 'review', label: 'Review', color: 'bg-stage-review' },
  { key: 'evaluating', label: 'Evaluating', color: 'bg-stage-evaluating' },
  { key: 'passed', label: 'Passed', color: 'bg-stage-passed' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-stage-term-sheet' },
  { key: 'closed', label: 'Closed', color: 'bg-stage-closed' },
  { key: 'rejected', label: 'Rejected', color: 'bg-stage-rejected' },
];

const outcomes: { key: DealOutcome; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'bg-muted' },
  { key: 'win', label: 'Win', color: 'bg-accent' },
  { key: 'miss', label: 'Miss', color: 'bg-destructive' },
  { key: 'regret', label: 'Regret', color: 'bg-warning' },
  { key: 'noise', label: 'Noise', color: 'bg-muted-foreground' },
];

const sectorOptions = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'proptech', label: 'Proptech' },
  { value: 'saas', label: 'SaaS' },
  { value: 'other', label: 'Other' },
];

export default function Deals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [evaluatorOpen, setEvaluatorOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    sector: '',
    valuation_usd: '',
    founder_name: '',
    notes: ''
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null);

  // Comparison state
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Portfolio conversion state
  const [portfolioConversionOpen, setPortfolioConversionOpen] = useState(false);
  const [dealToConvert, setDealToConvert] = useState<Deal | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setDeals(data as Deal[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [user]);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deal.company_name.toLowerCase().includes(query) ||
          (deal.sector?.toLowerCase() || '').includes(query) ||
          (deal.founder_name?.toLowerCase() || '').includes(query);
        if (!matchesSearch) return false;
      }

      // Stage filter
      if (filterValues.stage && filterValues.stage !== 'all') {
        if (deal.stage !== filterValues.stage) return false;
      }

      // Sector filter
      if (filterValues.sector && filterValues.sector !== 'all') {
        if (!deal.sector?.toLowerCase().includes(filterValues.sector)) return false;
      }

      // Outcome filter
      if (filterValues.outcome && filterValues.outcome !== 'all') {
        if ((deal.outcome || 'pending') !== filterValues.outcome) return false;
      }

      return true;
    });
  }, [deals, searchQuery, filterValues]);

  const handleCreate = async () => {
    if (!user || !formData.company_name) return;
    const { error } = await supabase.from('deals').insert({
      user_id: user.id,
      company_name: formData.company_name,
      sector: formData.sector || null,
      valuation_usd: formData.valuation_usd ? parseInt(formData.valuation_usd) : null,
      founder_name: formData.founder_name || null,
      notes: formData.notes || null
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deal added' });
      logActivity({ type: 'deal_created', title: `Created deal: ${formData.company_name}`, entityType: 'deal' });
      setDialogOpen(false);
      setFormData({ company_name: '', sector: '', valuation_usd: '', founder_name: '', notes: '' });
      fetchDeals();
    }
  };

  const updateStage = async (id: string, stage: DealStage) => {
    const deal = deals.find(d => d.id === id);
    const previousStage = deal?.stage;
    
    await supabase.from('deals').update({ stage }).eq('id', id);
    
    if (stage === 'closed' && previousStage !== 'closed' && deal) {
      setDealToConvert(deal);
      setPortfolioConversionOpen(true);
    }
    
    fetchDeals();
  };

  const updateOutcome = async (id: string, outcome: DealOutcome) => {
    await supabase.from('deals').update({ outcome }).eq('id', id);
    fetchDeals();
  };

  const openEvaluator = (deal: Deal) => {
    setSelectedDeal(deal);
    setEvaluatorOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setDealToEdit(deal);
    setEditModalOpen(true);
  };

  const toggleDealSelection = (dealId: string) => {
    setSelectedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  };

  const getSelectedDealsArray = () => deals.filter(d => selectedDeals.has(d.id));

  const handleDelete = async () => {
    if (!dealToDelete) return;
    setDeleting(true);
    
    try {
      await supabase.from('ai_evaluations').delete().eq('deal_id', dealToDelete.id);
      await supabase.from('decision_journal').delete().eq('deal_id', dealToDelete.id);
      const { error } = await supabase.from('deals').delete().eq('id', dealToDelete.id);
      if (error) throw error;
      
      toast({ title: 'Deal deleted', description: `${dealToDelete.company_name} has been removed.` });
      setDeleteDialogOpen(false);
      setDealToDelete(null);
      selectedDeals.delete(dealToDelete.id);
      fetchDeals();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (deal: Deal) => {
    setDealToDelete(deal);
    setDeleteDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

  const dealsByStage = stages.map(s => ({
    ...s,
    deals: filteredDeals.filter(d => d.stage === s.key)
  }));

  const filterOptions = [
    { key: 'stage', label: 'Stage', options: stages.map(s => ({ value: s.key, label: s.label })) },
    { key: 'sector', label: 'Sector', options: sectorOptions },
    { key: 'outcome', label: 'Outcome', options: outcomes.map(o => ({ value: o.key, label: o.label })) },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
            Deal Flow
            <Badge className="bg-primary/10 text-primary"><Sparkles className="h-3 w-3 mr-1" />AI-Powered</Badge>
          </h1>
          <p className="text-muted-foreground">The Rejection Engine — Evaluate and filter opportunities with AI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CSVImport onImportComplete={fetchDeals} />
          
          {selectedDeals.size >= 2 && (
            <Button variant="outline" onClick={() => setComparisonOpen(true)}>
              <GitCompare className="h-4 w-4 mr-2" />Compare ({selectedDeals.size})
            </Button>
          )}
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Deal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Company Name *</Label><Input value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} /></div>
                <div><Label>Sector</Label><Input value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} placeholder="e.g., Fintech, Health" /></div>
                <div><Label>Valuation (USD)</Label><Input type="number" value={formData.valuation_usd} onChange={e => setFormData({ ...formData, valuation_usd: e.target.value })} /></div>
                <div><Label>Founder Name</Label><Input value={formData.founder_name} onChange={e => setFormData({ ...formData, founder_name: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Initial thoughts..." /></div>
                {formData.company_name.length > 2 && <PastPassAlert companyName={formData.company_name} />}
                <Button onClick={handleCreate} className="w-full">Add Deal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        placeholder="Search deals by company, sector, or founder..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filterOptions}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
        onClearAll={clearAllFilters}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline ({filteredDeals.length})</TabsTrigger>
          <TabsTrigger value="metrics"><BarChart3 className="h-4 w-4 mr-1" />Monthly Metrics</TabsTrigger>
          <TabsTrigger value="patterns">Investment Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
                {dealsByStage.map(stage => (
                  <div key={stage.key} className="min-w-[180px]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                      <span className="font-semibold text-sm text-white">{stage.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{stage.deals.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {stage.deals.map(deal => (
                        <Card key={deal.id} className={`bg-card border-border/50 hover:border-primary/30 transition-colors ${selectedDeals.has(deal.id) ? 'ring-2 ring-primary' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2 mb-1">
                              <Checkbox checked={selectedDeals.has(deal.id)} onCheckedChange={() => toggleDealSelection(deal.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium text-sm truncate flex-1">{deal.company_name}</p>
                                  {deal.ai_score && <Badge variant="outline" className="text-xs ml-1"><Brain className="h-3 w-3 mr-1 text-primary-foreground" />{deal.ai_score}</Badge>}
                                </div>
                                {deal.sector && <p className="text-xs text-muted-foreground">{deal.sector}</p>}
                                {deal.valuation_usd && <p className="text-xs text-accent mt-1">${(deal.valuation_usd / 1000000).toFixed(1)}M</p>}
                              </div>
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              <Select value={deal.stage} onValueChange={v => updateStage(deal.id, v as DealStage)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={deal.outcome || 'pending'} onValueChange={v => updateOutcome(deal.id, v as DealOutcome)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tag outcome..." /></SelectTrigger>
                                <SelectContent>{outcomes.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-1 mt-2">
                              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEvaluator(deal)}>
                                <Brain className="h-3 w-3 mr-1" />Evaluate
                              </Button>
                              <DecisionJournalModal dealId={deal.id} dealName={deal.company_name} onSaved={fetchDeals} />
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditModal(deal)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(deal)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <DealVelocityChart deals={filteredDeals} />
              <AIAdvisor />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <DealFlowMetrics deals={deals} />
        </TabsContent>

        <TabsContent value="patterns" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PatternEditor />
            <AIAdvisor />
          </div>
        </TabsContent>
      </Tabs>

      <DealEvaluatorModal deal={selectedDeal} open={evaluatorOpen} onOpenChange={setEvaluatorOpen} onComplete={fetchDeals} />
      <DealComparison deals={getSelectedDealsArray()} open={comparisonOpen} onOpenChange={setComparisonOpen} />
      <CreatePortfolioFromDealModal deal={dealToConvert} open={portfolioConversionOpen} onOpenChange={setPortfolioConversionOpen} onComplete={fetchDeals} />
      <EditDealModal deal={dealToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSaved={fetchDeals} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Deal" itemName={dealToDelete?.company_name} loading={deleting} />
    </div>
  );
}
