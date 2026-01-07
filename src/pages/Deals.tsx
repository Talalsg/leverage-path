import { useEffect, useState } from 'react';
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
import { Plus, Target, Brain, Sparkles, GitCompare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AIAdvisor } from '@/components/AIAdvisor';
import { DealEvaluatorModal } from '@/components/DealEvaluatorModal';
import { DealComparison } from '@/components/DealComparison';
import { PatternEditor } from '@/components/PatternEditor';
import { CSVImport } from '@/components/CSVImport';
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
  vision_2030_alignment?: number | null;
  founder_execution_score?: number | null;
  founder_sales_ability?: number | null;
  iteration_speed?: number | null;
  failure_modes?: string | null;
  exit_potential?: string | null;
}
const stages: {
  key: DealStage;
  label: string;
  color: string;
}[] = [{
  key: 'review',
  label: 'Review',
  color: 'bg-stage-review'
}, {
  key: 'evaluating',
  label: 'Evaluating',
  color: 'bg-stage-evaluating'
}, {
  key: 'passed',
  label: 'Passed',
  color: 'bg-stage-passed'
}, {
  key: 'term_sheet',
  label: 'Term Sheet',
  color: 'bg-stage-term-sheet'
}, {
  key: 'closed',
  label: 'Closed',
  color: 'bg-stage-closed'
}, {
  key: 'rejected',
  label: 'Rejected',
  color: 'bg-stage-rejected'
}];
const outcomes: {
  key: DealOutcome;
  label: string;
  color: string;
}[] = [{
  key: 'pending',
  label: 'Pending',
  color: 'bg-muted'
}, {
  key: 'win',
  label: 'Win',
  color: 'bg-accent'
}, {
  key: 'miss',
  label: 'Miss',
  color: 'bg-destructive'
}, {
  key: 'regret',
  label: 'Regret',
  color: 'bg-warning'
}, {
  key: 'noise',
  label: 'Noise',
  color: 'bg-muted-foreground'
}];
export default function Deals() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
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

  // Comparison state
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  const fetchDeals = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('deals').select('*').eq('user_id', user.id).order('created_at', {
      ascending: false
    });
    setDeals(data as Deal[] || []);
    setLoading(false);
  };
  useEffect(() => {
    fetchDeals();
  }, [user]);
  const handleCreate = async () => {
    if (!user || !formData.company_name) return;
    const {
      error
    } = await supabase.from('deals').insert({
      user_id: user.id,
      company_name: formData.company_name,
      sector: formData.sector || null,
      valuation_usd: formData.valuation_usd ? parseInt(formData.valuation_usd) : null,
      founder_name: formData.founder_name || null,
      notes: formData.notes || null
    });
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Deal added'
      });
      setDialogOpen(false);
      setFormData({
        company_name: '',
        sector: '',
        valuation_usd: '',
        founder_name: '',
        notes: ''
      });
      fetchDeals();
    }
  };
  const updateStage = async (id: string, stage: DealStage) => {
    await supabase.from('deals').update({
      stage
    }).eq('id', id);
    fetchDeals();
  };
  const updateOutcome = async (id: string, outcome: DealOutcome) => {
    await supabase.from('deals').update({
      outcome
    }).eq('id', id);
    fetchDeals();
  };
  const openEvaluator = (deal: Deal) => {
    setSelectedDeal(deal);
    setEvaluatorOpen(true);
  };
  const toggleDealSelection = (dealId: string) => {
    setSelectedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };
  const getSelectedDealsArray = () => {
    return deals.filter(d => selectedDeals.has(d.id));
  };
  const dealsByStage = stages.map(s => ({
    ...s,
    deals: deals.filter(d => d.stage === s.key)
  }));
  return <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Deal Flow
            <Badge className="bg-primary/10 text-primary"><Sparkles className="h-3 w-3 mr-1" />AI-Powered</Badge>
          </h1>
          <p className="text-muted-foreground">The Rejection Engine — Evaluate and filter opportunities with AI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CSVImport onImportComplete={fetchDeals} />
          
          {selectedDeals.size >= 2 && <Button variant="outline" onClick={() => setComparisonOpen(true)}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare ({selectedDeals.size})
            </Button>}
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Deal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Company Name *</Label><Input value={formData.company_name} onChange={e => setFormData({
                  ...formData,
                  company_name: e.target.value
                })} /></div>
                <div><Label>Sector</Label><Input value={formData.sector} onChange={e => setFormData({
                  ...formData,
                  sector: e.target.value
                })} placeholder="e.g., Fintech, Health" /></div>
                <div><Label>Valuation (USD)</Label><Input type="number" value={formData.valuation_usd} onChange={e => setFormData({
                  ...formData,
                  valuation_usd: e.target.value
                })} /></div>
                <div><Label>Founder Name</Label><Input value={formData.founder_name} onChange={e => setFormData({
                  ...formData,
                  founder_name: e.target.value
                })} /></div>
                <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({
                  ...formData,
                  notes: e.target.value
                })} placeholder="Initial thoughts..." /></div>
                <Button onClick={handleCreate} className="w-full">Add Deal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="patterns">Investment Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipeline */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
                {dealsByStage.map(stage => <div key={stage.key} className="min-w-[180px]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                      <span className="font-semibold text-sm">{stage.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{stage.deals.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {stage.deals.map(deal => <Card key={deal.id} className={`bg-card border-border/50 hover:border-primary/30 transition-colors ${selectedDeals.has(deal.id) ? 'ring-2 ring-primary' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2 mb-1">
                              <Checkbox checked={selectedDeals.has(deal.id)} onCheckedChange={() => toggleDealSelection(deal.id)} className="mt-0.5 text-primary-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium text-sm truncate flex-1">{deal.company_name}</p>
                                  {deal.ai_score && <Badge variant="outline" className="text-xs ml-1">
                                      <Brain className="h-3 w-3 mr-1" />{deal.ai_score}
                                    </Badge>}
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

                            <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => openEvaluator(deal)}>
                              <Brain className="h-3 w-3 mr-1" />AI Evaluate
                            </Button>
                          </CardContent>
                        </Card>)}
                    </div>
                  </div>)}
              </div>
            </div>

            {/* AI Advisor */}
            <div>
              <AIAdvisor />
            </div>
          </div>
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
    </div>;
}