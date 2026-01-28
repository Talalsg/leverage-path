import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, AlertTriangle, TrendingUp, DollarSign, Clock, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PortfolioPosition {
  id: string;
  company_name: string;
  sector: string | null;
  status: string | null;
  monthly_revenue: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  health_status: string | null;
  last_metrics_update: string | null;
  current_valuation_usd: number | null;
}

interface HealthUpdateModalProps {
  position: PortfolioPosition;
  onUpdated: () => void;
}

function HealthUpdateModal({ position, onUpdated }: HealthUpdateModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    monthly_revenue: position.monthly_revenue?.toString() || '',
    burn_rate: position.burn_rate?.toString() || '',
    runway_months: position.runway_months?.toString() || '',
    health_status: position.health_status || 'healthy',
    current_valuation_usd: position.current_valuation_usd?.toString() || '',
  });

  const handleSave = async () => {
    const { error } = await supabase.from('portfolio').update({
      monthly_revenue: formData.monthly_revenue ? parseFloat(formData.monthly_revenue) : null,
      burn_rate: formData.burn_rate ? parseFloat(formData.burn_rate) : null,
      runway_months: formData.runway_months ? parseInt(formData.runway_months) : null,
      health_status: formData.health_status,
      current_valuation_usd: formData.current_valuation_usd ? parseInt(formData.current_valuation_usd) : null,
      last_metrics_update: new Date().toISOString(),
    }).eq('id', position.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Metrics updated' });
      setOpen(false);
      onUpdated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Health Metrics — {position.company_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Monthly Revenue (USD)</Label>
            <Input
              type="number"
              value={formData.monthly_revenue}
              onChange={e => setFormData({ ...formData, monthly_revenue: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Monthly Burn Rate (USD)</Label>
            <Input
              type="number"
              value={formData.burn_rate}
              onChange={e => setFormData({ ...formData, burn_rate: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Runway (Months)</Label>
            <Input
              type="number"
              value={formData.runway_months}
              onChange={e => setFormData({ ...formData, runway_months: e.target.value })}
              placeholder="12"
            />
          </div>
          <div>
            <Label>Current Valuation (USD)</Label>
            <Input
              type="number"
              value={formData.current_valuation_usd}
              onChange={e => setFormData({ ...formData, current_valuation_usd: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Health Status</Label>
            <Select value={formData.health_status} onValueChange={v => setFormData({ ...formData, health_status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="healthy">🟢 Healthy</SelectItem>
                <SelectItem value="warning">🟡 Warning</SelectItem>
                <SelectItem value="critical">🔴 Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full">Update Metrics</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PortfolioHealthDashboard() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('portfolio')
      .select('id, company_name, sector, status, monthly_revenue, burn_rate, runway_months, health_status, last_metrics_update, current_valuation_usd')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('health_status', { ascending: false });
    
    setPositions((data as PortfolioPosition[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPositions(); }, [user]);

  const criticalCount = positions.filter(p => p.health_status === 'critical').length;
  const warningCount = positions.filter(p => p.health_status === 'warning').length;

  const getHealthBadge = (status: string | null) => {
    switch (status) {
      case 'critical':
        return <Badge className="bg-destructive text-destructive-foreground">🔴 Critical</Badge>;
      case 'warning':
        return <Badge className="bg-warning/20 text-warning border-warning/30">🟡 Warning</Badge>;
      default:
        return <Badge className="bg-accent/20 text-accent">🟢 Healthy</Badge>;
    }
  };

  if (positions.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Portfolio Health Control Tower
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning/20 text-warning">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {positions.map(position => (
              <div key={position.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getHealthBadge(position.health_status)}
                  <div>
                    <p className="font-medium">{position.company_name}</p>
                    {position.sector && <p className="text-xs text-muted-foreground">{position.sector}</p>}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {position.monthly_revenue !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Revenue
                      </p>
                      <p className="text-sm font-medium text-accent">
                        ${(position.monthly_revenue / 1000).toFixed(0)}K/mo
                      </p>
                    </div>
                  )}
                  
                  {position.runway_months !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Runway
                      </p>
                      <p className={`text-sm font-medium ${position.runway_months <= 3 ? 'text-destructive' : position.runway_months <= 6 ? 'text-warning' : 'text-foreground'}`}>
                        {position.runway_months}mo
                      </p>
                    </div>
                  )}

                  {position.burn_rate !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Burn
                      </p>
                      <p className="text-sm font-medium text-destructive">
                        ${(position.burn_rate / 1000).toFixed(0)}K/mo
                      </p>
                    </div>
                  )}

                  <HealthUpdateModal position={position} onUpdated={fetchPositions} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
