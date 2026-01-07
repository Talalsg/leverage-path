import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingUp, AlertTriangle, Building2, User, DollarSign } from 'lucide-react';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: string;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  overall_score: number | null;
  ai_score: number | null;
  outcome: string | null;
  notes: string | null;
  vision_2030_alignment?: number | null;
  founder_execution_score?: number | null;
  founder_sales_ability?: number | null;
  iteration_speed?: number | null;
  failure_modes?: string | null;
  exit_potential?: string | null;
}

interface DealComparisonProps {
  deals: Deal[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealComparison({ deals, open, onOpenChange }: DealComparisonProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 70) return 'text-accent';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getBestValue = (values: (number | null)[], higherIsBetter = true) => {
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return null;
    return higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
  };

  const aiScores = deals.map(d => d.ai_score);
  const bestAiScore = getBestValue(aiScores);

  const metrics = [
    { key: 'vision_2030_alignment', label: 'Vision 2030 Alignment', max: 5 },
    { key: 'founder_execution_score', label: 'Founder Execution', max: 5 },
    { key: 'founder_sales_ability', label: 'Sales Ability', max: 5 },
    { key: 'iteration_speed', label: 'Iteration Speed', max: 5 },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Deal Comparison ({deals.length} deals)
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Metric</th>
                  {deals.map((deal) => (
                    <th key={deal.id} className="text-left p-3 min-w-[180px]">
                      <div className="font-semibold">{deal.company_name}</div>
                      {deal.sector && (
                        <div className="text-xs text-muted-foreground">{deal.sector}</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* AI Score */}
                <tr className="border-b border-border/50 bg-muted/20">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI Score
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      <div className={`text-2xl font-bold ${getScoreColor(deal.ai_score)}`}>
                        {deal.ai_score ?? '—'}
                        {deal.ai_score === bestAiScore && deal.ai_score !== null && (
                          <Badge className="ml-2 bg-accent text-accent-foreground text-xs">Best</Badge>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Valuation */}
                <tr className="border-b border-border/50">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-accent" />
                    Valuation
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      <div className="text-lg font-semibold">
                        {formatCurrency(deal.valuation_usd)}
                      </div>
                      {deal.equity_offered && (
                        <div className="text-xs text-muted-foreground">
                          {deal.equity_offered}% equity
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Founder */}
                <tr className="border-b border-border/50">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-info" />
                    Founder
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      <div className="text-sm">{deal.founder_name || '—'}</div>
                    </td>
                  ))}
                </tr>

                {/* Stage */}
                <tr className="border-b border-border/50">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Stage
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      <Badge variant="outline">{deal.stage}</Badge>
                    </td>
                  ))}
                </tr>

                {/* Individual Metrics */}
                {metrics.map((metric) => {
                  const values = deals.map(d => (d as any)[metric.key] as number | null);
                  const bestValue = getBestValue(values);
                  
                  return (
                    <tr key={metric.key} className="border-b border-border/50">
                      <td className="p-3 text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        {metric.label}
                      </td>
                      {deals.map((deal) => {
                        const value = (deal as any)[metric.key] as number | null;
                        const isBest = value === bestValue && value !== null;
                        
                        return (
                          <td key={deal.id} className="p-3">
                            {value !== null ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{value}/{metric.max}</span>
                                  {isBest && (
                                    <Badge className="bg-accent/20 text-accent text-xs">Best</Badge>
                                  )}
                                </div>
                                <Progress value={(value / metric.max) * 100} className="h-1.5" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Exit Potential */}
                <tr className="border-b border-border/50">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Exit Potential
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {deal.exit_potential || '—'}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Failure Modes */}
                <tr className="border-b border-border/50">
                  <td className="p-3 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Failure Modes
                  </td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="p-3">
                      {deal.failure_modes ? (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {deal.failure_modes.split('\n').slice(0, 3).map((mode, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-destructive">•</span>
                              {mode}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
