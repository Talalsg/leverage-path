import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface StageHistoryEntry {
  stage: string;
  entered_at: string;
  previous_stage?: string;
}

interface Deal {
  id: string;
  company_name: string;
  stage: string;
  created_at: string;
  stage_history?: StageHistoryEntry[] | null;
  ai_score?: number | null;
}

interface DealVelocityChartProps {
  deals: Deal[];
}

export function DealVelocityChart({ deals }: DealVelocityChartProps) {
  const velocityAnalysis = useMemo(() => {
    // Calculate average time per stage across all deals
    const stageDurations: Record<string, number[]> = {};
    
    deals.forEach(deal => {
      const history = (deal.stage_history as StageHistoryEntry[]) || [];
      
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const prevEntry = i > 0 ? history[i - 1] : null;
        
        if (prevEntry) {
          const days = differenceInDays(parseISO(entry.entered_at), parseISO(prevEntry.entered_at));
          const stage = prevEntry.stage || 'review';
          
          if (!stageDurations[stage]) stageDurations[stage] = [];
          stageDurations[stage].push(days);
        }
      }
      
      // Calculate time in current stage
      const lastEntry = history.length > 0 ? history[history.length - 1] : null;
      const currentStageDays = lastEntry 
        ? differenceInDays(new Date(), parseISO(lastEntry.entered_at))
        : differenceInDays(new Date(), parseISO(deal.created_at));
      
      if (!stageDurations[deal.stage]) stageDurations[deal.stage] = [];
      stageDurations[deal.stage].push(currentStageDays);
    });

    // Calculate averages
    const averages: Record<string, number> = {};
    Object.entries(stageDurations).forEach(([stage, durations]) => {
      averages[stage] = durations.reduce((a, b) => a + b, 0) / durations.length;
    });

    // Identify fast and stale deals
    const activeDeals = deals.filter(d => !['closed', 'rejected', 'passed'].includes(d.stage));
    
    const dealVelocities = activeDeals.map(deal => {
      const history = (deal.stage_history as StageHistoryEntry[]) || [];
      const lastEntry = history.length > 0 ? history[history.length - 1] : null;
      const daysInCurrentStage = lastEntry 
        ? differenceInDays(new Date(), parseISO(lastEntry.entered_at))
        : differenceInDays(new Date(), parseISO(deal.created_at));
      
      const avgForStage = averages[deal.stage] || 7;
      const velocityRatio = daysInCurrentStage / avgForStage;
      
      return {
        ...deal,
        daysInCurrentStage,
        avgForStage,
        velocityRatio,
        status: velocityRatio < 0.5 ? 'fast' : velocityRatio > 2 ? 'stale' : 'normal',
      };
    });

    return {
      averages,
      dealVelocities: dealVelocities.sort((a, b) => b.velocityRatio - a.velocityRatio),
      fastDeals: dealVelocities.filter(d => d.status === 'fast'),
      staleDeals: dealVelocities.filter(d => d.status === 'stale'),
    };
  }, [deals]);

  if (deals.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          No deals to analyze velocity
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Deal Velocity Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average times */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Average Days per Stage</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(velocityAnalysis.averages).map(([stage, days]) => (
              <Badge key={stage} variant="outline" className="text-xs">
                {stage}: {Math.round(days)}d
              </Badge>
            ))}
          </div>
        </div>

        {/* Fast-moving deals */}
        {velocityAnalysis.fastDeals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <Zap className="h-4 w-4" />
              Fast-Moving ({velocityAnalysis.fastDeals.length})
            </div>
            <div className="space-y-1">
              {velocityAnalysis.fastDeals.slice(0, 3).map(deal => (
                <div key={deal.id} className="flex items-center justify-between text-sm p-2 bg-accent/10 rounded">
                  <span>{deal.company_name}</span>
                  <Badge className="bg-accent/20 text-accent text-xs">
                    {deal.daysInCurrentStage}d in {deal.stage}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stale deals */}
        {velocityAnalysis.staleDeals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" />
              Stale Deals ({velocityAnalysis.staleDeals.length})
            </div>
            <div className="space-y-1">
              {velocityAnalysis.staleDeals.slice(0, 3).map(deal => (
                <div key={deal.id} className="flex items-center justify-between text-sm p-2 bg-warning/10 rounded">
                  <span>{deal.company_name}</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-warning" />
                    <Badge className="bg-warning/20 text-warning text-xs">
                      {deal.daysInCurrentStage}d (avg: {Math.round(deal.avgForStage)}d)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {velocityAnalysis.fastDeals.length === 0 && velocityAnalysis.staleDeals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            All deals moving at normal pace
          </p>
        )}
      </CardContent>
    </Card>
  );
}
