import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, Calculator } from 'lucide-react';

interface ExitScenarioModalProps {
  companyName: string;
  entryValuation: number | null;
  currentValuation: number | null;
  equityPercent: number | null;
}

export function ExitScenarioModal({ companyName, entryValuation, currentValuation, equityPercent }: ExitScenarioModalProps) {
  const [open, setOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState('50000');
  const [multipliers, setMultipliers] = useState({ x10: 10, x50: 50, x100: 100 });

  const baseValuation = currentValuation || entryValuation || 0;
  const equity = equityPercent || 0;
  const investment = parseFloat(investmentAmount) || 0;

  const scenarios = [
    { label: 'Conservative (10x)', multiplier: multipliers.x10, color: 'bg-muted' },
    { label: 'Target (50x)', multiplier: multipliers.x50, color: 'bg-warning/20' },
    { label: 'Moonshot (100x)', multiplier: multipliers.x100, color: 'bg-accent/20' },
  ];

  const calculateReturn = (multiplier: number) => {
    const exitValuation = baseValuation * multiplier;
    const yourShare = (exitValuation * equity) / 100;
    const roi = investment > 0 ? ((yourShare - investment) / investment) * 100 : 0;
    return { exitValuation, yourShare, roi };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Calculator className="h-4 w-4 mr-2" />
          Exit Scenarios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Exit Scenario Modeling — {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Investment ($)</Label>
              <Input 
                type="number" 
                value={investmentAmount} 
                onChange={e => setInvestmentAmount(e.target.value)} 
              />
            </div>
            <div>
              <Label>Current/Entry Valuation</Label>
              <Input value={`$${(baseValuation / 1000000).toFixed(1)}M`} disabled />
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Your Equity: {equity}%</span>
              <span>Entry Value: ${(baseValuation * equity / 100 / 1000000).toFixed(2)}M</span>
            </div>
          </div>

          {/* Scenario Cards */}
          <div className="grid grid-cols-3 gap-4">
            {scenarios.map(scenario => {
              const result = calculateReturn(scenario.multiplier);
              return (
                <Card key={scenario.label} className={`${scenario.color} border-border/50`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{scenario.label}</p>
                      <p className="text-2xl font-bold">{scenario.multiplier}x</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exit Val</span>
                        <span className="font-medium">${(result.exitValuation / 1000000000).toFixed(1)}B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Your Share</span>
                        <span className="font-medium text-accent">${(result.yourShare / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ROI</span>
                        <span className={`font-bold ${result.roi > 0 ? 'text-accent' : 'text-destructive'}`}>
                          {result.roi > 0 ? '+' : ''}{result.roi.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Multiplier Sliders */}
          <div className="space-y-4">
            <Label>Adjust Multipliers</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">Conservative</span>
                <Slider 
                  value={[multipliers.x10]} 
                  onValueChange={([v]) => setMultipliers({ ...multipliers, x10: v })} 
                  min={1} 
                  max={25} 
                  step={1} 
                  className="flex-1"
                />
                <span className="w-12 text-sm font-medium">{multipliers.x10}x</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">Target</span>
                <Slider 
                  value={[multipliers.x50]} 
                  onValueChange={([v]) => setMultipliers({ ...multipliers, x50: v })} 
                  min={10} 
                  max={100} 
                  step={5} 
                  className="flex-1"
                />
                <span className="w-12 text-sm font-medium">{multipliers.x50}x</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">Moonshot</span>
                <Slider 
                  value={[multipliers.x100]} 
                  onValueChange={([v]) => setMultipliers({ ...multipliers, x100: v })} 
                  min={50} 
                  max={500} 
                  step={10} 
                  className="flex-1"
                />
                <span className="w-12 text-sm font-medium">{multipliers.x100}x</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
