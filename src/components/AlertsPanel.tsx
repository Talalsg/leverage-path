import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Users, Target, AlertTriangle, TrendingUp, CheckCircle, Calendar } from 'lucide-react';

type AlertSeverity = 'green' | 'yellow' | 'red';
type AlertType = 'contact_decay' | 'stale_deal' | 'low_ai_score' | 'portfolio_warning' | 'follow_up_due';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  actionLabel?: string;
  actionPath?: string;
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
        .select('id, name, last_touchpoint, warmth_score')
        .eq('user_id', user.id)
        .eq('is_key_ten', true)
        .or(`last_touchpoint.is.null,last_touchpoint.lt.${thirtyDaysAgo.toISOString()}`);

      staleContacts?.forEach(contact => {
        const days = contact.last_touchpoint 
          ? Math.floor((Date.now() - new Date(contact.last_touchpoint).getTime()) / (1000 * 60 * 60 * 24))
          : -1;
        
        const warmth = (contact as any).warmth_score ?? 5;
        const severity: AlertSeverity = (days > 60 || days === -1) && warmth < 4 ? 'red' : days > 30 ? 'yellow' : 'green';
        
        if (severity !== 'green') {
          newAlerts.push({
            id: `contact-${contact.id}`,
            type: 'contact_decay',
            title: `Reconnect with ${contact.name}`,
            description: days === -1 ? 'Never contacted — relationship at risk' : `${days} days since last touchpoint`,
            severity,
            actionLabel: 'Log Touchpoint',
            actionPath: '/ecosystem',
          });
        }
      });

      // Check for stale deals (in review/evaluating for 14+ days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: staleDeals } = await supabase
        .from('deals')
        .select('id, company_name, stage, updated_at, ai_score')
        .eq('user_id', user.id)
        .in('stage', ['review', 'evaluating'])
        .lt('updated_at', fourteenDaysAgo.toISOString());

      staleDeals?.forEach(deal => {
        const days = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        const severity: AlertSeverity = days > 21 ? 'red' : 'yellow';
        
        newAlerts.push({
          id: `deal-${deal.id}`,
          type: 'stale_deal',
          title: `${deal.company_name} stuck in ${deal.stage}`,
          description: `${days} days without progress — decide or pass`,
          severity,
          actionLabel: 'Review Deal',
          actionPath: '/deals',
        });
      });

      // Check for low AI score deals that are still being considered
      const { data: lowScoreDeals } = await supabase
        .from('deals')
        .select('id, company_name, ai_score, stage')
        .eq('user_id', user.id)
        .in('stage', ['evaluating', 'term_sheet'])
        .lt('ai_score', 50);

      lowScoreDeals?.forEach(deal => {
        if (deal.ai_score !== null) {
          newAlerts.push({
            id: `low-score-${deal.id}`,
            type: 'low_ai_score',
            title: `${deal.company_name} has low AI score`,
            description: `Score: ${deal.ai_score}/100 — reconsider or document rationale`,
            severity: deal.ai_score < 30 ? 'red' : 'yellow',
            actionLabel: 'Re-evaluate',
            actionPath: '/deals',
          });
        }
      });

      // Check for portfolio companies with warning/critical status
      const { data: unhealthyPortfolio } = await supabase
        .from('portfolio')
        .select('id, company_name, health_status, runway_months')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('health_status', ['warning', 'critical']);

      unhealthyPortfolio?.forEach(position => {
        const isCritical = position.health_status === 'critical' || (position.runway_months && position.runway_months <= 3);
        newAlerts.push({
          id: `portfolio-${position.id}`,
          type: 'portfolio_warning',
          title: `${position.company_name} needs attention`,
          description: position.runway_months && position.runway_months <= 6 
            ? `Runway: ${position.runway_months} months — fundraising needed`
            : `Health status: ${position.health_status}`,
          severity: isCritical ? 'red' : 'yellow',
          actionLabel: 'Check Health',
          actionPath: '/portfolio',
        });
      });

      // Check for due follow-ups from decision journal
      const today = new Date().toISOString().split('T')[0];
      const { data: dueFollowUps } = await supabase
        .from('decision_journal')
        .select('id, deal_id, follow_up_date, deals(company_name)')
        .eq('user_id', user.id)
        .lte('follow_up_date', today)
        .is('follow_up_outcome', null);

      dueFollowUps?.forEach((entry: any) => {
        if (entry.deals?.company_name) {
          newAlerts.push({
            id: `followup-${entry.id}`,
            type: 'follow_up_due',
            title: `Follow-up due: ${entry.deals.company_name}`,
            description: `Scheduled for ${entry.follow_up_date}`,
            severity: 'yellow',
            actionLabel: 'Review',
            actionPath: '/deals',
          });
        }
      });

      // Sort alerts by severity (red first, then yellow, then green)
      const severityOrder: Record<AlertSeverity, number> = { red: 0, yellow: 1, green: 2 };
      newAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(newAlerts);
      setLoading(false);
    };

    fetchAlerts();
  }, [user]);

  const redCount = alerts.filter(a => a.severity === 'red').length;
  const yellowCount = alerts.filter(a => a.severity === 'yellow').length;
  const totalCount = alerts.length;

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'red':
        return { bg: 'bg-destructive/20', border: 'border-destructive/30', text: 'text-destructive' };
      case 'yellow':
        return { bg: 'bg-warning/20', border: 'border-warning/30', text: 'text-warning' };
      case 'green':
        return { bg: 'bg-accent/20', border: 'border-accent/30', text: 'text-accent' };
    }
  };

  const getIcon = (type: AlertType, severity: AlertSeverity) => {
    const styles = getSeverityStyles(severity);
    switch (type) {
      case 'contact_decay':
        return <Users className={`h-4 w-4 ${styles.text}`} />;
      case 'stale_deal':
        return <Target className={`h-4 w-4 ${styles.text}`} />;
      case 'low_ai_score':
        return <TrendingUp className={`h-4 w-4 ${styles.text}`} />;
      case 'portfolio_warning':
        return <AlertTriangle className={`h-4 w-4 ${styles.text}`} />;
      case 'follow_up_due':
        return <Calendar className={`h-4 w-4 ${styles.text}`} />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                redCount > 0 ? 'bg-destructive' : yellowCount > 0 ? 'bg-warning' : 'bg-accent'
              }`}
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Governance Alerts</h4>
            <div className="flex gap-1">
              {redCount > 0 && <Badge className="bg-destructive text-xs">{redCount} Critical</Badge>}
              {yellowCount > 0 && <Badge className="bg-warning text-xs">{yellowCount} Warning</Badge>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCount === 0 ? 'All systems healthy' : `${totalCount} items need attention`}
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All Clear</p>
              <p className="text-xs text-muted-foreground">No alerts at this time</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map(alert => {
                const styles = getSeverityStyles(alert.severity);
                return (
                  <div key={alert.id} className={`p-3 hover:bg-muted/50 transition-colors ${styles.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded ${styles.bg} ${styles.border} border`}>
                        {getIcon(alert.type, alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <Badge variant="outline" className={`text-xs ${styles.text} ${styles.border} flex-shrink-0`}>
                            {alert.severity === 'red' ? 'RED' : alert.severity === 'yellow' ? 'YELLOW' : 'GREEN'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {totalCount > 0 && (
          <div className="p-2 border-t border-border">
            <p className="text-xs text-center text-muted-foreground italic">
              "What you don't track, you can't improve."
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
