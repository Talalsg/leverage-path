import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DealStage = 'review' | 'evaluating' | 'passed' | 'term_sheet' | 'closed' | 'rejected';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: DealStage;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  overall_score: number | null;
  created_at: string;
}

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: 'review', label: 'Review', color: 'bg-stage-review' },
  { key: 'evaluating', label: 'Evaluating', color: 'bg-stage-evaluating' },
  { key: 'passed', label: 'Passed', color: 'bg-stage-passed' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-stage-term-sheet' },
  { key: 'closed', label: 'Closed', color: 'bg-stage-closed' },
  { key: 'rejected', label: 'Rejected', color: 'bg-stage-rejected' },
];

export default function Deals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', sector: '', valuation_usd: '', founder_name: '' });

  const fetchDeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.company_name) return;
    const { error } = await supabase.from('deals').insert({
      user_id: user.id,
      company_name: formData.company_name,
      sector: formData.sector || null,
      valuation_usd: formData.valuation_usd ? parseInt(formData.valuation_usd) : null,
      founder_name: formData.founder_name || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Deal added' }); setDialogOpen(false); setFormData({ company_name: '', sector: '', valuation_usd: '', founder_name: '' }); fetchDeals(); }
  };

  const updateStage = async (id: string, stage: DealStage) => {
    await supabase.from('deals').update({ stage }).eq('id', id);
    fetchDeals();
  };

  const dealsByStage = stages.map(s => ({ ...s, deals: deals.filter(d => d.stage === s.key) }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deal Flow</h1>
          <p className="text-muted-foreground">The Rejection Engine — Evaluate and filter opportunities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Company Name *</Label><Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
              <div><Label>Sector</Label><Input value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} placeholder="e.g., Fintech, Health" /></div>
              <div><Label>Valuation (USD)</Label><Input type="number" value={formData.valuation_usd} onChange={e => setFormData({...formData, valuation_usd: e.target.value})} /></div>
              <div><Label>Founder Name</Label><Input value={formData.founder_name} onChange={e => setFormData({...formData, founder_name: e.target.value})} /></div>
              <Button onClick={handleCreate} className="w-full">Add Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
        {dealsByStage.map(stage => (
          <div key={stage.key} className="min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-3 w-3 rounded-full ${stage.color}`} />
              <span className="font-semibold text-sm">{stage.label}</span>
              <Badge variant="secondary" className="ml-auto">{stage.deals.length}</Badge>
            </div>
            <div className="space-y-2">
              {stage.deals.map(deal => (
                <Card key={deal.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{deal.company_name}</p>
                    {deal.sector && <p className="text-xs text-muted-foreground">{deal.sector}</p>}
                    {deal.valuation_usd && <p className="text-xs text-accent mt-1">${(deal.valuation_usd / 1000000).toFixed(1)}M</p>}
                    <Select value={deal.stage} onValueChange={(v) => updateStage(deal.id, v as DealStage)}>
                      <SelectTrigger className="h-7 mt-2 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
