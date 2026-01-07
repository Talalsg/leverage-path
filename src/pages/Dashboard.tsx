import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardCharts } from '@/components/DashboardCharts';
import { 
  Target, 
  Briefcase, 
  Users, 
  Lightbulb, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface Deal {
  id: string;
  stage: string | null;
  outcome: string | null;
  ai_score: number | null;
  sector: string | null;
  created_at: string;
}

interface DashboardStats {
  dealsInPipeline: number;
  portfolioPositions: number;
  keyRelationships: number;
  insightsPublished: number;
  deals: Deal[];
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    created_at: string;
  }>;
}

const currentYear = 2026;
const dayOfYear = Math.floor((new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;
const yearProgress = Math.min((dayOfYear / 365) * 100, 100);

const quarterlyFocus = [
  { quarter: 'Q1', title: 'Positioning & Signal', tasks: ['Map key players', 'Publish 4-6 insights', 'Build 5-10 relationships'] },
  { quarter: 'Q2', title: 'Deal Flow & Insertion', tasks: ['Receive inbound decks', 'Evaluate 5-10 startups/month', 'Gain first carry positions'] },
  { quarter: 'Q3', title: 'Leverage & Platform', tasks: ['Formalize deal flow filter', 'Build syndicate/advisory circle', 'Reduce 1:1 time drain'] },
  { quarter: 'Q4', title: 'Consolidation', tasks: ['Cut dead-end relationships', 'Audit ownership positions', 'Update 2027 roadmap'] },
];

const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    dealsInPipeline: 0,
    portfolioPositions: 0,
    keyRelationships: 0,
    insightsPublished: 0,
    deals: [],
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      const [dealsResult, dealsDataResult, portfolioResult, contactsResult, insightsResult, activitiesResult] = await Promise.all([
        supabase.from('deals').select('id', { count: 'exact' }).eq('user_id', user.id).not('stage', 'in', '("closed","rejected")'),
        supabase.from('deals').select('id, stage, outcome, ai_score, sector, created_at').eq('user_id', user.id),
        supabase.from('portfolio').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_key_ten', true),
        supabase.from('insights').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'published'),
        supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        dealsInPipeline: dealsResult.count || 0,
        portfolioPositions: portfolioResult.count || 0,
        keyRelationships: contactsResult.count || 0,
        insightsPublished: insightsResult.count || 0,
        deals: (dealsDataResult.data as Deal[]) || [],
        recentActivities: activitiesResult.data || [],
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Deals in Pipeline', value: stats.dealsInPipeline, icon: Target, color: 'text-primary', target: '10-20/month' },
    { label: 'Portfolio Positions', value: stats.portfolioPositions, icon: Briefcase, color: 'text-accent', target: '5-10 by EOY' },
    { label: 'Key Relationships', value: stats.keyRelationships, icon: Users, color: 'text-tier-gatekeeper', target: '5-10 trusted' },
    { label: 'Insights Published', value: stats.insightsPublished, icon: Lightbulb, color: 'text-warning', target: '4-6 quarterly' },
  ];

  const currentFocus = quarterlyFocus[currentQuarter - 1];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} — <span className="text-primary">Positioning Year</span>
          </p>
        </div>
        
        {/* Year Progress */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${yearProgress * 1.76} 176`}
                    className="text-primary"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {Math.round(yearProgress)}%
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">2026 Progress</p>
                <p className="text-xs text-muted-foreground">Day {dayOfYear} of 365</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failure Condition Alert */}
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">2026 Failure Condition Check</p>
            <p className="text-sm text-muted-foreground">
              "If I'm busy but no one comes to me for access, deals, or advice — I've failed."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="stat-card bg-card border-border/50 hover:border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{loading ? '—' : stat.value}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Target: {stat.target}</p>
                </div>
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      {stats.deals.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Deal Analytics
              </CardTitle>
              <Badge 
                variant="outline" 
                className="cursor-pointer"
                onClick={() => setShowCharts(!showCharts)}
              >
                {showCharts ? 'Hide' : 'Show'}
              </Badge>
            </div>
          </CardHeader>
          {showCharts && (
            <CardContent>
              <DashboardCharts deals={stats.deals} />
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quarterly Focus */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {currentFocus.quarter}: {currentFocus.title}
              </CardTitle>
              <Badge variant="outline" className="text-primary border-primary/30">Current Quarter</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentFocus.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-foreground">{task}</span>
                </div>
              ))}
            </div>
            
            {/* All Quarters Overview */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">2026 Battle Plan</p>
              <div className="grid grid-cols-4 gap-2">
                {quarterlyFocus.map((q, i) => (
                  <div 
                    key={q.quarter} 
                    className={`p-2 rounded text-center text-xs ${
                      i + 1 === currentQuarter 
                        ? 'bg-primary text-primary-foreground' 
                        : i + 1 < currentQuarter 
                          ? 'bg-accent/20 text-accent' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {q.quarter}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No recent activity</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start by adding deals, contacts, or insights</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategic Filter Reminder */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Daily Filter</p>
              <p className="text-sm text-muted-foreground">
                "If it doesn't increase access, credibility, ownership, or deal flow — I don't do it."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
