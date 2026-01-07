import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Users, Target, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'contact_decay' | 'stale_deal';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
}

export function AlertsPanel() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const newAlerts: Alert[] = [];

      // Check for contacts needing attention (no touchpoint in 30+ days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: staleContacts } = await supabase
        .from('contacts')
        .select('id, name, last_touchpoint')
        .eq('user_id', user.id)
        .eq('is_key_ten', true)
        .or(`last_touchpoint.is.null,last_touchpoint.lt.${thirtyDaysAgo.toISOString()}`);

      staleContacts?.forEach(contact => {
        const days = contact.last_touchpoint 
          ? Math.floor((Date.now() - new Date(contact.last_touchpoint).getTime()) / (1000 * 60 * 60 * 24))
          : -1;
        
        newAlerts.push({
          id: `contact-${contact.id}`,
          type: 'contact_decay',
          title: `Reconnect with ${contact.name}`,
          description: days === -1 ? 'Never contacted' : `${days} days since last touchpoint`,
          severity: days > 60 || days === -1 ? 'critical' : 'warning',
        });
      });

      // Check for stale deals (in review/evaluating for 14+ days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: staleDeals } = await supabase
        .from('deals')
        .select('id, company_name, stage, updated_at')
        .eq('user_id', user.id)
        .in('stage', ['review', 'evaluating'])
        .lt('updated_at', fourteenDaysAgo.toISOString());

      staleDeals?.forEach(deal => {
        const days = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        newAlerts.push({
          id: `deal-${deal.id}`,
          type: 'stale_deal',
          title: `${deal.company_name} stuck in ${deal.stage}`,
          description: `${days} days without progress`,
          severity: days > 21 ? 'critical' : 'warning',
        });
      });

      setAlerts(newAlerts);
      setLoading(false);
    };

    fetchAlerts();
  }, [user]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const totalCount = alerts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                criticalCount > 0 ? 'bg-destructive' : 'bg-warning'
              }`}
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold">Alerts</h4>
          <p className="text-xs text-muted-foreground">
            {totalCount === 0 ? 'All clear!' : `${totalCount} items need attention`}
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No alerts at this time
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map(alert => (
                <div key={alert.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1 rounded ${alert.severity === 'critical' ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                      {alert.type === 'contact_decay' ? (
                        <Users className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                      ) : (
                        <Target className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                    {alert.severity === 'critical' && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
