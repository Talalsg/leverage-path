import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Lightbulb, Filter } from 'lucide-react';

interface BacktestResult {
  scenario_analysis: {
    bear_case: { exit_valuation: number; roi: number; probability: number };
    base_case: { exit_valuation: number; roi: number; probability: number };
    bull_case: { exit_valuation: number; roi: number; probability: number };
  };
  expected_value: number;
  lessons_learned: string[];
  filter_update: string;
}

interface BacktestResultsProps {
  result: BacktestResult;
  investmentAmount?: number;
}

export function BacktestResults({ result, investmentAmount = 100000 }: BacktestResultsProps) {
  const scenarios = [
    {
      name: 'Bear Case',
      icon: TrendingDown,
      data: result.scenario_analysis.bear_case,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
    },
    {
      name: 'Base Case',
      icon: Target,
      data: result.scenario_analysis.base_case,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    {
      name: 'Bull Case',
      icon: TrendingUp,
      data: result.scenario_analysis.bull_case,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/30',
    },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatROI = (roi: number) => {
    return `${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Expected Value Summary */}
      <div className="text-center p-6 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground mb-1">Expected Value</div>
        <div className="text-4xl font-bold text-primary">
          {formatCurrency(result.expected_value)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Probability-weighted outcome
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const returnValue = investmentAmount * (1 + scenario.data.roi / 100);
          
          return (
            <Card 
              key={scenario.name} 
              className={`${scenario.bgColor} border ${scenario.borderColor}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-4 w-4 ${scenario.color}`} />
                  <span className={`font-semibold text-sm ${scenario.color}`}>
                    {scenario.name}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {scenario.data.probability}%
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Exit Valuation</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(scenario.data.exit_valuation)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">ROI</div>
                    <div className={`text-lg font-bold ${
                      scenario.data.roi >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {formatROI(scenario.data.roi)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Return on $100K</div>
                    <div className="text-sm font-medium">
                      {formatCurrency(returnValue)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <Progress 
                    value={scenario.data.probability} 
                    className="h-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lessons Learned */}
      {result.lessons_learned && result.lessons_learned.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-warning" />
            Lessons Learned
          </h4>
          <ul className="space-y-1.5">
            {result.lessons_learned.map((lesson, i) => (
              <li 
                key={i} 
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-0.5">•</span>
                {lesson}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter Update */}
      {result.filter_update && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-2">
            <Filter className="h-4 w-4 text-primary" />
            Recommended Filter Update
          </h4>
          <p className="text-sm text-muted-foreground">{result.filter_update}</p>
        </div>
      )}
    </div>
  );
}
