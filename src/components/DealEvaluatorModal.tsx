import { useState } from 'react';
import { useAIEvaluator } from '@/hooks/useAIEvaluator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Brain, FileText, TrendingUp, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BacktestResults } from '@/components/BacktestResults';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  stage: string;
  notes: string | null;
  ai_score: number | null;
  outcome: string | null;
  created_at: string;
}

interface DealEvaluatorModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ScoreResult {
  overall_score: number;
  vision_2030_alignment: number;
  founder_execution_score: number;
  founder_sales_ability: number;
  iteration_speed: number;
  failure_modes: string[];
  exit_potential: string;
  pattern_matches?: string[];
  recommendation: string;
  reasoning: string;
}

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

export function DealEvaluatorModal({ deal, open, onOpenChange, onComplete }: DealEvaluatorModalProps) {
  const { scoreDeal, generateMemo, runBacktest, isLoading } = useAIEvaluator();
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [memo, setMemo] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'score' | 'memo' | 'backtest'>('score');

  const handleScore = async () => {
    if (!deal) return;
    const result = await scoreDeal(deal);
    if (result) {
      setScoreResult(result);
      onComplete();
    }
  };

  const handleMemo = async () => {
    if (!deal) return;
    const result = await generateMemo(deal);
    if (result) {
      setMemo(result);
      onComplete();
    }
  };

  const handleBacktest = async () => {
    if (!deal) return;
    const result = await runBacktest(deal);
    if (result) {
      setBacktestResult(result);
      onComplete();
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec === 'STRONG INTEREST') return 'bg-accent text-accent-foreground';
    if (rec === 'EVALUATE FURTHER') return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const ScoreBar = ({ label, value, max = 5 }: { label: string; value: number; max?: number }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <Progress value={(value / max) * 100} className="h-2" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Deal Evaluator — {deal?.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button 
            variant={activeTab === 'score' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveTab('score')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Score
          </Button>
          <Button 
            variant={activeTab === 'memo' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveTab('memo')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Memo
          </Button>
          <Button 
            variant={activeTab === 'backtest' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveTab('backtest')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Backtest
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {activeTab === 'score' && (
            <div className="space-y-4">
              {!scoreResult ? (
                <div className="text-center py-8">
                  <Brain className="h-16 w-16 mx-auto text-primary/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    AI will evaluate this deal based on your historical patterns and investment philosophy
                  </p>
                  <Button onClick={handleScore} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                    Generate AI Score
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overall Score */}
                  <div className="text-center p-6 bg-muted/30 rounded-lg">
                    <div className="text-5xl font-bold text-primary mb-2">{scoreResult.overall_score}</div>
                    <div className="text-sm text-muted-foreground mb-3">Overall Score</div>
                    <Badge className={getRecommendationColor(scoreResult.recommendation)}>
                      {scoreResult.recommendation}
                    </Badge>
                  </div>

                  {/* Pattern Matches */}
                  {scoreResult.pattern_matches && scoreResult.pattern_matches.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Pattern Matches
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {scoreResult.pattern_matches.map((pattern, i) => (
                          <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Scores */}
                  <div className="space-y-3">
                    <ScoreBar label="Vision 2030 Alignment" value={scoreResult.vision_2030_alignment} />
                    <ScoreBar label="Founder Execution" value={scoreResult.founder_execution_score} />
                    <ScoreBar label="Sales Ability" value={scoreResult.founder_sales_ability} />
                    <ScoreBar label="Iteration Speed" value={scoreResult.iteration_speed} />
                  </div>

                  {/* Failure Modes */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Failure Modes
                    </h4>
                    <ul className="space-y-1">
                      {scoreResult.failure_modes.map((mode, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          {mode}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exit Potential */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      Exit Potential
                    </h4>
                    <p className="text-sm text-muted-foreground">{scoreResult.exit_potential}</p>
                  </div>

                  {/* Reasoning */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm">{scoreResult.reasoning}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'memo' && (
            <div className="space-y-4">
              {!memo ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-primary/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Generate a professional 1-page investment memo for this deal
                  </p>
                  <Button onClick={handleMemo} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Memo
                  </Button>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/30 p-4 rounded-lg">{memo}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="space-y-4">
              {!backtestResult ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-16 w-16 mx-auto text-primary/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Simulate what would have happened with this deal at different outcomes
                  </p>
                  <Button onClick={handleBacktest} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                    Run Backtest
                  </Button>
                </div>
              ) : (
                <BacktestResults result={backtestResult} />
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
