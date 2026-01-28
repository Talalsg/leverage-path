import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Briefcase, ArrowRight, Sparkles } from 'lucide-react';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
}

interface CreatePortfolioFromDealModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CreatePortfolioFromDealModal({ deal, open, onOpenChange, onComplete }: CreatePortfolioFromDealModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equity_percent: '',
    entry_valuation_usd: '',
  });

  // Pre-fill when deal changes
  useState(() => {
    if (deal) {
      setFormData({
        equity_percent: deal.equity_offered?.toString() || '',
        entry_valuation_usd: deal.valuation_usd?.toString() || '',
      });
    }
  });

  const handleCreate = async () => {
    if (!user || !deal) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.from('portfolio').insert({
        user_id: user.id,
        deal_id: deal.id,
        company_name: deal.company_name,
        sector: deal.sector,
        entry_valuation_usd: formData.entry_valuation_usd ? parseInt(formData.entry_valuation_usd) : deal.valuation_usd,
        equity_percent: formData.equity_percent ? parseFloat(formData.equity_percent) : deal.equity_offered,
        entry_date: new Date().toISOString().split('T')[0],
        status: 'active',
        health_status: 'healthy',
      }).select().single();

      if (error) throw error;

      await logActivity({
        type: 'portfolio_added',
        title: `Added ${deal.company_name} to portfolio from closed deal`,
        entityType: 'portfolio',
        entityId: data?.id,
      });

      toast({
        title: 'Portfolio position created',
        description: `${deal.company_name} has been added to your portfolio.`,
      });

      onOpenChange(false);
      onComplete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete();
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent" />
            Add to Portfolio
          </DialogTitle>
          <DialogDescription>
            Deal marked as closed. Create a portfolio position to track your investment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deal Summary */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">{deal.company_name}</span>
              <Badge className="bg-stage-closed text-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                Closed
              </Badge>
            </div>
            {deal.sector && <p className="text-sm text-muted-foreground">{deal.sector}</p>}
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>Deal</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-accent">Portfolio Position</span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
            <div>
              <Label>Entry Valuation (USD)</Label>
              <Input
                type="number"
                value={formData.entry_valuation_usd}
                onChange={(e) => setFormData({ ...formData, entry_valuation_usd: e.target.value })}
                placeholder={deal.valuation_usd?.toString() || 'Enter valuation'}
              />
              {deal.valuation_usd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-filled from deal: ${(deal.valuation_usd / 1000000).toFixed(1)}M
                </p>
              )}
            </div>

            <div>
              <Label>Your Equity %</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.equity_percent}
                onChange={(e) => setFormData({ ...formData, equity_percent: e.target.value })}
                placeholder={deal.equity_offered?.toString() || 'Enter equity %'}
              />
              {deal.equity_offered && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-filled from deal: {deal.equity_offered}%
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip for Now
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Add to Portfolio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
