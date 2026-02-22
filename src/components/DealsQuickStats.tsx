import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, BarChart3, Calendar, Layers } from 'lucide-react';

interface StageCounts {
  [key: string]: number;
}

interface DealsQuickStatsProps {
  totalDeals: number;
  stageCounts: StageCounts;
  avgAiScore: number | null;
  newThisMonth: number;
}

const stageLabels: Record<string, string> = {
  review: 'Review',
  evaluating: 'Evaluating',
  passed: 'Passed',
  term_sheet: 'Term Sheet',
  closed: 'Closed',
  rejected: 'Rejected',
};

const stageColors: Record<string, string> = {
  review: 'bg-stage-review',
  evaluating: 'bg-stage-evaluating',
  passed: 'bg-stage-passed',
  term_sheet: 'bg-stage-term-sheet',
  closed: 'bg-stage-closed',
  rejected: 'bg-stage-rejected',
};

export function DealsQuickStats({ totalDeals, stageCounts, avgAiScore, newThisMonth }: DealsQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Deals</p>
          <p className="text-lg font-bold text-foreground">{totalDeals.toLocaleString()}</p>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">New This Month</p>
          <p className="text-lg font-bold text-foreground">{newThisMonth}</p>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg AI Score</p>
          <p className="text-lg font-bold text-foreground">{avgAiScore !== null ? avgAiScore : '—'}</p>
        </div>
      </Card>

      <Card className="p-3 overflow-hidden">
        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <BarChart3 className="h-3 w-3" /> By Stage
        </p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(stageCounts).filter(([, count]) => count > 0).map(([stage, count]) => (
            <Badge key={stage} variant="secondary" className="text-[10px] px-1.5 h-5">
              <span className={`h-1.5 w-1.5 rounded-full ${stageColors[stage] || 'bg-muted'} mr-1`} />
              {stageLabels[stage] || stage}: {count}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
