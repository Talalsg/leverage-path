import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: string;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  notes: string | null;
  deck_url?: string | null;
}

interface EditDealModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const stages = [
  { key: 'review', label: 'Review' },
  { key: 'evaluating', label: 'Evaluating' },
  { key: 'passed', label: 'Passed' },
  { key: 'term_sheet', label: 'Term Sheet' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
];

export function EditDealModal({ deal, open, onOpenChange, onSaved }: EditDealModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    sector: '',
    stage: 'review',
    valuation_usd: '',
    equity_offered: '',
    founder_name: '',
    notes: '',
    deck_url: '',
  });

  useEffect(() => {
    if (deal) {
      setFormData({
        company_name: deal.company_name || '',
        sector: deal.sector || '',
        stage: deal.stage || 'review',
        valuation_usd: deal.valuation_usd?.toString() || '',
        equity_offered: deal.equity_offered?.toString() || '',
        founder_name: deal.founder_name || '',
        notes: deal.notes || '',
        deck_url: deal.deck_url || '',
      });
    }
  }, [deal]);

  const handleSave = async () => {
    if (!deal || !formData.company_name) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          company_name: formData.company_name,
          sector: formData.sector || null,
          stage: formData.stage,
          valuation_usd: formData.valuation_usd ? parseInt(formData.valuation_usd) : null,
          equity_offered: formData.equity_offered ? parseFloat(formData.equity_offered) : null,
          founder_name: formData.founder_name || null,
          notes: formData.notes || null,
          deck_url: formData.deck_url || null,
        })
        .eq('id', deal.id);

      if (error) throw error;

      toast({ title: 'Deal updated', description: `${formData.company_name} has been updated.` });
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>Update the details of this deal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sector</Label>
              <Input
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                placeholder="e.g., Fintech"
              />
            </div>
            <div>
              <Label>Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(v) => setFormData({ ...formData, stage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valuation (USD)</Label>
              <Input
                type="number"
                value={formData.valuation_usd}
                onChange={(e) => setFormData({ ...formData, valuation_usd: e.target.value })}
              />
            </div>
            <div>
              <Label>Equity Offered (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.equity_offered}
                onChange={(e) => setFormData({ ...formData, equity_offered: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Founder Name</Label>
            <Input
              value={formData.founder_name}
              onChange={(e) => setFormData({ ...formData, founder_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Deck URL</Label>
            <Input
              value={formData.deck_url}
              onChange={(e) => setFormData({ ...formData, deck_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
