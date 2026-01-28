import { Flame, Snowflake, ThermometerSun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RelationshipWarmthBadgeProps {
  warmthScore: number | null;
  showScore?: boolean;
}

export function RelationshipWarmthBadge({ warmthScore, showScore = true }: RelationshipWarmthBadgeProps) {
  const score = warmthScore ?? 5;
  
  const getWarmthLevel = (score: number) => {
    if (score >= 7) return { label: 'HOT', color: 'bg-accent text-accent-foreground', icon: Flame, iconColor: 'text-accent-foreground' };
    if (score >= 4) return { label: 'WARM', color: 'bg-warning/20 text-warning border-warning/30', icon: ThermometerSun, iconColor: 'text-warning' };
    return { label: 'COLD', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: Snowflake, iconColor: 'text-destructive' };
  };

  const level = getWarmthLevel(score);
  const Icon = level.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${level.color} gap-1 cursor-help`} variant="outline">
            <Icon className={`h-3 w-3 ${level.iconColor}`} />
            {showScore && <span>{score.toFixed(1)}</span>}
            <span className="text-xs">{level.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">Relationship Warmth: {score.toFixed(1)}/10</p>
            <p className="text-xs text-muted-foreground">
              Based on: Recency (40%), Frequency (30%), Quality (30%)
            </p>
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full ${score >= 7 ? 'bg-accent' : score >= 4 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${score * 10}%` }}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
