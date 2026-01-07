import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExitScenarioModal } from '@/components/ExitScenarioModal';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface Position {
  id: string;
  company_name: string;
  sector: string | null;
  entry_valuation_usd: number | null;
  current_valuation_usd: number | null;
  equity_percent: number | null;
  status: string;
  is_top_position: boolean;
}

export default function Portfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', sector: '', entry_valuation_usd: '', equity_percent: '' });

  const fetchPositions = async () => {
    if (!user) return;
    const { data } = await supabase.from('portfolio').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPositions((data as Position[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPositions(); }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.company_name) return;
    const { data, error } = await supabase.from('portfolio').insert({
      user_id: user.id,
      company_name: formData.company_name,
      sector: formData.sector || null,
      entry_valuation_usd: formData.entry_valuation_usd ? parseInt(formData.entry_valuation_usd) : null,
      equity_percent: formData.equity_percent ? parseFloat(formData.equity_percent) : null,
      entry_date: new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) { 
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
    } else { 
      toast({ title: 'Position added' }); 
      logActivity({ type: 'portfolio_added', title: `Added ${formData.company_name} position`, entityType: 'portfolio', entityId: data?.id });
      setDialogOpen(false); 
      setFormData({ company_name: '', sector: '', entry_valuation_usd: '', equity_percent: '' }); 
      fetchPositions(); 
    }
  };

  const totalPaperValue = positions.reduce((sum, p) => {
    if (p.current_valuation_usd && p.equity_percent) return sum + (p.current_valuation_usd * p.equity_percent / 100);
    if (p.entry_valuation_usd && p.equity_percent) return sum + (p.entry_valuation_usd * p.equity_percent / 100);
    return sum;
  }, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Track equity positions and projected returns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Position</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Portfolio Position</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Company Name *</Label><Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
              <div><Label>Sector</Label><Input value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} /></div>
              <div><Label>Entry Valuation (USD)</Label><Input type="number" value={formData.entry_valuation_usd} onChange={e => setFormData({...formData, entry_valuation_usd: e.target.value})} /></div>
              <div><Label>Your Equity %</Label><Input type="number" step="0.1" value={formData.equity_percent} onChange={e => setFormData({...formData, equity_percent: e.target.value})} /></div>
              <Button onClick={handleCreate} className="w-full">Add Position</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Positions</p>
            <p className="text-3xl font-bold mt-1">{positions.length}</p>
            <p className="text-xs text-muted-foreground/70">Target: 5-10 by EOY 2026</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Paper Value</p>
            <p className="text-3xl font-bold mt-1 text-accent">${(totalPaperValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active Positions</p>
            <p className="text-3xl font-bold mt-1">{positions.filter(p => p.status === 'active').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map(position => (
          <Card key={position.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{position.company_name}</p>
                  {position.sector && <p className="text-sm text-muted-foreground">{position.sector}</p>}
                </div>
                {position.is_top_position && <Badge className="bg-accent text-accent-foreground">Top Position</Badge>}
              </div>
              <div className="mt-4 space-y-2">
                {position.equity_percent && <p className="text-sm"><span className="text-muted-foreground">Equity:</span> {position.equity_percent}%</p>}
                {position.entry_valuation_usd && <p className="text-sm"><span className="text-muted-foreground">Entry:</span> ${(position.entry_valuation_usd / 1000000).toFixed(1)}M</p>}
              </div>
              <div className="mt-4">
                <ExitScenarioModal 
                  companyName={position.company_name}
                  entryValuation={position.entry_valuation_usd}
                  currentValuation={position.current_valuation_usd}
                  equityPercent={position.equity_percent}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {positions.length === 0 && !loading && (
          <Card className="col-span-full bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No positions yet. Add your first equity position.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
