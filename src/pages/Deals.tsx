import { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, Brain, Sparkles, GitCompare, BookOpen, BarChart3, Trash2, Pencil, TableIcon, Download } from 'lucide-react';
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
import { DealDetailsModal } from '@/components/DealDetailsModal';
import { DealsTable, SortColumn } from '@/components/DealsTable';
import { DealsQuickStats } from '@/components/DealsQuickStats';
import { downloadCSV } from '@/lib/csvExport';

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
  founder_linkedin: string | null;
  overall_score: number | null;
  ai_score: number | null;
  ai_analysis: string | null;
  ai_memo: string | null;
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

const KANBAN_CAP = 20;
const TABLE_PAGE_SIZE = 50;

export default function Deals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
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

  // Details view state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [dealToView, setDealToView] = useState<Deal | null>(null);

  // Comparison state
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  
  // Portfolio conversion state
  const [portfolioConversionOpen, setPortfolioConversionOpen] = useState(false);
  const [dealToConvert, setDealToConvert] = useState<Deal | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // === Server-side pagination & sort state (Table view) ===
  const [tableDeals, setTableDeals] = useState<Deal[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableTotalCount, setTableTotalCount] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // === Quick stats state ===
  const [quickStats, setQuickStats] = useState({
    totalDeals: 0,
    stageCounts: {} as Record<string, number>,
    avgAiScore: null as number | null,
    newThisMonth: 0,
  });

  // === Kanban state (capped) ===
  const [kanbanDeals, setKanbanDeals] = useState<Deal[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(true);

  // Build server-side query with filters
  const buildFilteredQuery = useCallback((baseQuery: any) => {
    let q = baseQuery;
    if (searchQuery) {
      q = q.or(`company_name.ilike.%${searchQuery}%,sector.ilike.%${searchQuery}%,founder_name.ilike.%${searchQuery}%`);
    }
    if (filterValues.stage && filterValues.stage !== 'all') {
      q = q.eq('stage', filterValues.stage);
    }
    if (filterValues.sector && filterValues.sector !== 'all') {
      q = q.ilike('sector', `%${filterValues.sector}%`);
    }
    if (filterValues.outcome && filterValues.outcome !== 'all') {
      if (filterValues.outcome === 'pending') {
        q = q.or('outcome.is.null,outcome.eq.pending');
      } else {
        q = q.eq('outcome', filterValues.outcome);
      }
    }
    return q;
  }, [searchQuery, filterValues]);

  // Fetch table deals (paginated, sorted, filtered)
  const fetchTableDeals = useCallback(async () => {
    if (!user) return;
    setTableLoading(true);

    const from = (tablePage - 1) * TABLE_PAGE_SIZE;
    const to = from + TABLE_PAGE_SIZE - 1;

    let query = supabase
      .from('deals')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order(sortColumn, { ascending: sortDirection === 'asc' })
      .range(from, to);

    query = buildFilteredQuery(query);

    const { data, count } = await query;
    setTableDeals((data as Deal[]) || []);
    setTableTotalCount(count || 0);
    setTableLoading(false);
  }, [user, tablePage, sortColumn, sortDirection, buildFilteredQuery]);

  // Fetch quick stats (always unfiltered for total context)
  const fetchQuickStats = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('deals')
      .select('stage, ai_score, created_at')
      .eq('user_id', user.id);

    if (!data) return;

    const stageCounts: Record<string, number> = {};
    let aiScoreSum = 0;
    let aiScoreCount = 0;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let newThisMonth = 0;

    for (const d of data) {
      const stage = d.stage || 'review';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      if (d.ai_score) {
        aiScoreSum += d.ai_score;
        aiScoreCount++;
      }
      if (new Date(d.created_at) >= monthStart) {
        newThisMonth++;
      }
    }

    setQuickStats({
      totalDeals: data.length,
      stageCounts,
      avgAiScore: aiScoreCount > 0 ? Math.round(aiScoreSum / aiScoreCount) : null,
      newThisMonth,
    });
  }, [user]);

  // Fetch kanban deals (capped per stage, most recent first)
  const fetchKanbanDeals = useCallback(async () => {
    if (!user) return;
    setKanbanLoading(true);

    let query = supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    query = buildFilteredQuery(query);

    const { data } = await query;
    setKanbanDeals((data as Deal[]) || []);
    setKanbanLoading(false);
  }, [user, buildFilteredQuery]);

  // Reset page on filter/search change
  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, filterValues]);

  // Fetch data based on active tab
  useEffect(() => {
    fetchQuickStats();
    if (activeTab === 'table') {
      fetchTableDeals();
    } else if (activeTab === 'pipeline') {
      fetchKanbanDeals();
    }
  }, [activeTab, fetchTableDeals, fetchKanbanDeals, fetchQuickStats]);

  const refreshAll = () => {
    fetchQuickStats();
    if (activeTab === 'table') fetchTableDeals();
    else if (activeTab === 'pipeline') fetchKanbanDeals();
  };

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
      refreshAll();
    }
  };

  const updateStage = async (id: string, stage: DealStage) => {
    const allDeals = activeTab === 'table' ? tableDeals : kanbanDeals;
    const deal = allDeals.find(d => d.id === id);
    const previousStage = deal?.stage;
    
    try {
      const { error } = await supabase.from('deals').update({ stage }).eq('id', id);
      if (error) throw error;
      
      // Auto-create portfolio position when deal is closed
      if (stage === 'closed' && previousStage !== 'closed' && deal && user) {
        const { data: existing } = await supabase
          .from('portfolio')
          .select('id')
          .eq('deal_id', deal.id)
          .maybeSingle();

        if (!existing) {
          const { error: pErr } = await supabase.from('portfolio').insert({
            user_id: user.id,
            deal_id: deal.id,
            company_name: deal.company_name,
            sector: deal.sector,
            entry_valuation_usd: deal.valuation_usd,
            equity_percent: deal.equity_offered,
            entry_date: new Date().toISOString().split('T')[0],
            status: 'active',
            health_status: 'healthy',
          });
          if (pErr) {
            toast({ title: 'Portfolio error', description: pErr.message, variant: 'destructive' });
          } else {
            logActivity({ type: 'portfolio_added', title: `Auto-added ${deal.company_name} to portfolio`, entityType: 'portfolio' });
            toast({ title: 'Portfolio updated', description: `${deal.company_name} was automatically added to your portfolio.` });
          }
        }
      }
      
      refreshAll();
    } catch (error: any) {
      toast({ title: 'Error updating stage', description: error.message, variant: 'destructive' });
    }
  };

  const updateOutcome = async (id: string, outcome: DealOutcome) => {
    try {
      const { error } = await supabase.from('deals').update({ outcome }).eq('id', id);
      if (error) throw error;
      refreshAll();
    } catch (error: any) {
      toast({ title: 'Error updating outcome', description: error.message, variant: 'destructive' });
    }
  };

  const openEvaluator = (deal: Deal) => {
    setSelectedDeal(deal);
    setEvaluatorOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setDealToEdit(deal);
    setEditModalOpen(true);
  };

  const openDetailsModal = (deal: Deal) => {
    setDealToView(deal);
    setDetailsModalOpen(true);
  };

  const toggleDealSelection = (dealId: string) => {
    setSelectedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  };

  const getSelectedDealsArray = () => {
    const allDeals = activeTab === 'table' ? tableDeals : kanbanDeals;
    return allDeals.filter(d => selectedDeals.has(d.id));
  };

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
      setSelectedDeals(prev => {
        const next = new Set(prev);
        next.delete(dealToDelete.id);
        return next;
      });
      refreshAll();
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Kanban: cap deals per stage
  const kanbanDealsByStage = useMemo(() => {
    return stages.map(s => {
      const stageDeals = kanbanDeals.filter(d => d.stage === s.key);
      return {
        ...s,
        deals: stageDeals.slice(0, KANBAN_CAP),
        totalCount: stageDeals.length,
      };
    });
  }, [kanbanDeals]);

  const filterOptions = [
    { key: 'stage', label: 'Stage', options: stages.map(s => ({ value: s.key, label: s.label })) },
    { key: 'sector', label: 'Sector', options: sectorOptions },
    { key: 'outcome', label: 'Outcome', options: outcomes.map(o => ({ value: o.key, label: o.label })) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-foreground">
            Deal Flow
            <Badge className="bg-primary/10 text-primary text-xs">
              <Sparkles className="h-3 w-3 mr-1" />AI-Powered
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The Rejection Engine — Evaluate and filter opportunities
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={async () => {
            if (!user) return;
            const { data } = await supabase.from('deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) downloadCSV(data, [
              { key: 'company_name', label: 'Company' },
              { key: 'founder_name', label: 'Founder' },
              { key: 'sector', label: 'Sector' },
              { key: 'stage', label: 'Stage' },
              { key: 'ai_score', label: 'AI Score' },
              { key: 'valuation_usd', label: 'Valuation (USD)' },
              { key: 'outcome', label: 'Outcome' },
              { key: 'created_at', label: 'Date', format: (v: string) => v ? new Date(v).toLocaleDateString() : '' },
            ], 'deals-export');
          }}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <CSVImport onImportComplete={refreshAll} />
          
          {selectedDeals.size >= 2 && (
            <Button variant="outline" size="sm" onClick={() => setComparisonOpen(true)}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare ({selectedDeals.size})
            </Button>
          )}
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />Add Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Deal</DialogTitle>
                <DialogDescription>
                  Enter the details of the new deal to add to your pipeline.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input 
                    value={formData.company_name} 
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })} 
                    placeholder="Enter company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Input 
                      value={formData.sector} 
                      onChange={e => setFormData({ ...formData, sector: e.target.value })} 
                      placeholder="e.g., Fintech" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valuation (USD)</Label>
                    <Input 
                      type="number" 
                      value={formData.valuation_usd} 
                      onChange={e => setFormData({ ...formData, valuation_usd: e.target.value })} 
                      placeholder="5000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Founder Name</Label>
                  <Input 
                    value={formData.founder_name} 
                    onChange={e => setFormData({ ...formData, founder_name: e.target.value })} 
                    placeholder="Enter founder name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                    placeholder="Initial thoughts..."
                    rows={3}
                  />
                </div>
                {formData.company_name.length > 2 && <PastPassAlert companyName={formData.company_name} />}
                <Button onClick={handleCreate} className="w-full">Add Deal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <DealsQuickStats
        totalDeals={quickStats.totalDeals}
        stageCounts={quickStats.stageCounts}
        avgAiScore={quickStats.avgAiScore}
        newThisMonth={quickStats.newThisMonth}
      />

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="table" className="data-[state=active]:bg-background">
            <TableIcon className="h-4 w-4 mr-1.5" />Table
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-background">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4 mr-1.5" />Metrics
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-background">
            Patterns
          </TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table" className="mt-0">
          <DealsTable
            deals={tableDeals}
            loading={tableLoading}
            selectedDeals={selectedDeals}
            onToggleSelect={toggleDealSelection}
            onViewDetails={openDetailsModal}
            onEvaluate={openEvaluator}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
            onUpdateStage={updateStage}
            onUpdateOutcome={updateOutcome}
            onRefresh={refreshAll}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            page={tablePage}
            pageSize={TABLE_PAGE_SIZE}
            totalCount={tableTotalCount}
            onPageChange={setTablePage}
          />
        </TabsContent>

        {/* Pipeline / Kanban View */}
        <TabsContent value="pipeline" className="mt-0">
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {kanbanLoading ? (
                    stages.map(stage => (
                      <div key={stage.key} className="w-[220px] flex-shrink-0">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-5 w-6 ml-auto" />
                        </div>
                        <div className="space-y-3">
                          {[1, 2].map(i => (
                            <Card key={i} className="bg-card border-border/50">
                              <CardContent className="p-3 space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                                <Skeleton className="h-8 w-full" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    kanbanDealsByStage.map(stage => (
                      <div key={stage.key} className="w-[220px] flex-shrink-0">
                        {/* Stage Header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                          <span className="font-semibold text-sm text-foreground">{stage.label}</span>
                          <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5 text-secondary-foreground">
                            {stage.totalCount}
                          </Badge>
                        </div>

                        {/* Deal Cards */}
                        <div className="space-y-3">
                          {stage.deals.length === 0 && (
                            <div className="border border-dashed border-border/50 rounded-lg p-4 text-center">
                              <p className="text-xs text-muted-foreground">No deals</p>
                            </div>
                          )}
                          {stage.deals.map(deal => (
                            <Card 
                              key={deal.id} 
                              className={`bg-card border-border/50 hover:border-primary/40 transition-all duration-200 ${
                                selectedDeals.has(deal.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                              }`}
                            >
                              <CardContent className="p-3 space-y-3">
                                <div className="flex items-start gap-2">
                                  <Checkbox 
                                    checked={selectedDeals.has(deal.id)} 
                                    onCheckedChange={() => toggleDealSelection(deal.id)} 
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <button 
                                      onClick={() => openDetailsModal(deal)} 
                                      className="font-medium text-sm text-left text-card-foreground hover:text-primary transition-colors line-clamp-2 w-full"
                                    >
                                      {deal.company_name}
                                    </button>
                                    <div className="flex items-center gap-2 mt-1">
                                      {deal.sector && (
                                        <span className="text-xs text-muted-foreground truncate">
                                          {deal.sector}
                                        </span>
                                      )}
                                      {deal.ai_score && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto flex-shrink-0">
                                          <Brain className="h-2.5 w-2.5 mr-0.5" />
                                          {deal.ai_score}
                                        </Badge>
                                      )}
                                    </div>
                                    {deal.valuation_usd && (
                                      <p className="text-xs font-medium text-accent mt-1">
                                        ${(deal.valuation_usd / 1000000).toFixed(1)}M
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                  <Select value={deal.stage} onValueChange={v => updateStage(deal.id, v as DealStage)}>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {stages.map(s => (
                                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={deal.outcome || 'pending'} onValueChange={v => updateOutcome(deal.id, v as DealOutcome)}>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="Tag outcome..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {outcomes.map(o => (
                                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center gap-1 pt-1 border-t border-border/30">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="flex-1 h-7 text-xs text-card-foreground hover:bg-primary/10 hover:text-primary" 
                                    onClick={() => openEvaluator(deal)}
                                  >
                                    <Brain className="h-3 w-3 mr-1" />Evaluate
                                  </Button>
                                  <DecisionJournalModal dealId={deal.id} dealName={deal.company_name} onSaved={refreshAll} />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    onClick={() => openEditModal(deal)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                    onClick={() => openDeleteDialog(deal)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {stage.totalCount > KANBAN_CAP && (
                            <button
                              onClick={() => {
                                setFilterValues(prev => ({ ...prev, stage: stage.key }));
                                setActiveTab('table');
                              }}
                              className="w-full text-xs text-primary hover:text-primary/80 py-2 text-center transition-colors"
                            >
                              View all {stage.totalCount} deals →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="w-full xl:w-80 flex-shrink-0 space-y-4">
              <DealVelocityChart deals={kanbanDeals} />
              <AIAdvisor />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="mt-0">
          <DealFlowMetrics deals={kanbanDeals.length > 0 ? kanbanDeals : tableDeals} />
        </TabsContent>

        <TabsContent value="patterns" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PatternEditor />
            <AIAdvisor />
          </div>
        </TabsContent>
      </Tabs>

      <DealEvaluatorModal deal={selectedDeal} open={evaluatorOpen} onOpenChange={setEvaluatorOpen} onComplete={refreshAll} />
      <DealComparison deals={getSelectedDealsArray()} open={comparisonOpen} onOpenChange={setComparisonOpen} />
      <CreatePortfolioFromDealModal deal={dealToConvert} open={portfolioConversionOpen} onOpenChange={setPortfolioConversionOpen} onComplete={refreshAll} />
      <EditDealModal deal={dealToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSaved={refreshAll} />
      <DealDetailsModal deal={dealToView} open={detailsModalOpen} onOpenChange={setDetailsModalOpen} onSaved={refreshAll} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Deal" itemName={dealToDelete?.company_name} loading={deleting} />
    </div>
  );
}
