import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Position {
  id: string;
  company_name: string;
  sector: string | null;
  entry_valuation_usd: number | null;
  current_valuation_usd: number | null;
  equity_percent: number | null;
  status: string;
  is_top_position: boolean;
  notes: string | null;
  monthly_revenue: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  health_status: string | null;
}

interface EditPortfolioModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const statuses = [
  { key: 'active', label: 'Active' },
  { key: 'exited', label: 'Exited' },
  { key: 'written_off', label: 'Written Off' },
];

const healthStatuses = [
  { key: 'healthy', label: 'Healthy' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' },
];

export function EditPortfolioModal({ position, open, onOpenChange, onSaved }: EditPortfolioModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    sector: '',
    entry_valuation_usd: '',
    current_valuation_usd: '',
    equity_percent: '',
    status: 'active',
    is_top_position: false,
    notes: '',
    monthly_revenue: '',
    burn_rate: '',
    runway_months: '',
    health_status: 'healthy',
  });

  useEffect(() => {
    if (position) {
      setFormData({
        company_name: position.company_name || '',
        sector: position.sector || '',
        entry_valuation_usd: position.entry_valuation_usd?.toString() || '',
        current_valuation_usd: position.current_valuation_usd?.toString() || '',
        equity_percent: position.equity_percent?.toString() || '',
        status: position.status || 'active',
        is_top_position: position.is_top_position || false,
        notes: position.notes || '',
        monthly_revenue: position.monthly_revenue?.toString() || '',
        burn_rate: position.burn_rate?.toString() || '',
        runway_months: position.runway_months?.toString() || '',
        health_status: position.health_status || 'healthy',
      });
    }
  }, [position]);

  const handleSave = async () => {
    if (!position || !formData.company_name) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('portfolio')
        .update({
          company_name: formData.company_name,
          sector: formData.sector || null,
          entry_valuation_usd: formData.entry_valuation_usd ? parseInt(formData.entry_valuation_usd) : null,
          current_valuation_usd: formData.current_valuation_usd ? parseInt(formData.current_valuation_usd) : null,
          equity_percent: formData.equity_percent ? parseFloat(formData.equity_percent) : null,
          status: formData.status,
          is_top_position: formData.is_top_position,
          notes: formData.notes || null,
          monthly_revenue: formData.monthly_revenue ? parseFloat(formData.monthly_revenue) : null,
          burn_rate: formData.burn_rate ? parseFloat(formData.burn_rate) : null,
          runway_months: formData.runway_months ? parseInt(formData.runway_months) : null,
          health_status: formData.health_status,
          last_metrics_update: new Date().toISOString(),
        })
        .eq('id', position.id);

      if (error) throw error;

      toast({ title: 'Position updated', description: `${formData.company_name} has been updated.` });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Portfolio Position</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Sector</Label>
              <Input
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entry Valuation (USD)</Label>
              <Input
                type="number"
                value={formData.entry_valuation_usd}
                onChange={(e) => setFormData({ ...formData, entry_valuation_usd: e.target.value })}
              />
            </div>
            <div>
              <Label>Current Valuation (USD)</Label>
              <Input
                type="number"
                value={formData.current_valuation_usd}
                onChange={(e) => setFormData({ ...formData, current_valuation_usd: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Equity %</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.equity_percent}
                onChange={(e) => setFormData({ ...formData, equity_percent: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Health Metrics</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Monthly Revenue</Label>
                <Input
                  type="number"
                  value={formData.monthly_revenue}
                  onChange={(e) => setFormData({ ...formData, monthly_revenue: e.target.value })}
                  placeholder="USD"
                />
              </div>
              <div>
                <Label>Burn Rate</Label>
                <Input
                  type="number"
                  value={formData.burn_rate}
                  onChange={(e) => setFormData({ ...formData, burn_rate: e.target.value })}
                  placeholder="USD/month"
                />
              </div>
              <div>
                <Label>Runway (months)</Label>
                <Input
                  type="number"
                  value={formData.runway_months}
                  onChange={(e) => setFormData({ ...formData, runway_months: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>Health Status</Label>
              <Select
                value={formData.health_status}
                onValueChange={(v) => setFormData({ ...formData, health_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {healthStatuses.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_top_position"
              checked={formData.is_top_position}
              onCheckedChange={(checked) => setFormData({ ...formData, is_top_position: !!checked })}
            />
            <Label htmlFor="is_top_position" className="cursor-pointer">Mark as Top Position</Label>
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
