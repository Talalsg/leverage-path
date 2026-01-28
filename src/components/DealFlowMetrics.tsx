import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  Clock, 
  Filter,
  Zap,
  Award
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';

interface Deal {
  id: string;
  company_name: string;
  stage: string | null;
  outcome: string | null;
  ai_score: number | null;
  sector: string | null;
  created_at: string;
  valuation_usd?: number | null;
}

interface DealFlowMetricsProps {
  deals: Deal[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export function DealFlowMetrics({ deals }: DealFlowMetricsProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    
    // Monthly deal flow data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthDeals = deals.filter(d => {
        const date = new Date(d.created_at);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });
      
      monthlyData.push({
        month: format(monthStart, 'MMM'),
        total: monthDeals.length,
        closed: monthDeals.filter(d => d.stage === 'closed').length,
        passed: monthDeals.filter(d => d.stage === 'passed' || d.stage === 'rejected').length,
        evaluating: monthDeals.filter(d => d.stage === 'evaluating' || d.stage === 'term_sheet').length,
      });
    }

    // Current month metrics
    const currentMonthStart = startOfMonth(now);
    const currentMonthDeals = deals.filter(d => new Date(d.created_at) >= currentMonthStart);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthDeals = deals.filter(d => {
      const date = new Date(d.created_at);
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });

    // Conversion metrics
    const totalDeals = deals.length;
    const closedDeals = deals.filter(d => d.stage === 'closed').length;
    const passedDeals = deals.filter(d => d.stage === 'passed' || d.stage === 'rejected').length;
    const conversionRate = totalDeals > 0 ? ((closedDeals / totalDeals) * 100) : 0;
    const passRate = totalDeals > 0 ? ((passedDeals / totalDeals) * 100) : 0;

    // Pipeline velocity
    const activeDeals = deals.filter(d => 
      d.stage && !['closed', 'rejected', 'passed'].includes(d.stage)
    );
    const avgDaysInPipeline = activeDeals.length > 0 
      ? activeDeals.reduce((sum, d) => sum + differenceInDays(now, new Date(d.created_at)), 0) / activeDeals.length
      : 0;

    // AI Score distribution
    const dealsWithScore = deals.filter(d => d.ai_score !== null);
    const avgAiScore = dealsWithScore.length > 0 
      ? dealsWithScore.reduce((sum, d) => sum + (d.ai_score || 0), 0) / dealsWithScore.length
      : 0;

    // Outcome distribution
    const outcomeData = [
      { name: 'Win', value: deals.filter(d => d.outcome === 'win').length },
      { name: 'Miss', value: deals.filter(d => d.outcome === 'miss').length },
      { name: 'Regret', value: deals.filter(d => d.outcome === 'regret').length },
      { name: 'Noise', value: deals.filter(d => d.outcome === 'noise').length },
      { name: 'Pending', value: deals.filter(d => !d.outcome || d.outcome === 'pending').length },
    ].filter(d => d.value > 0);

    // Sector breakdown
    const sectorData = deals.reduce((acc, deal) => {
      const sector = deal.sector || 'Uncategorized';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topSectors = Object.entries(sectorData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Month-over-month change
    const momChange = lastMonthDeals.length > 0 
      ? ((currentMonthDeals.length - lastMonthDeals.length) / lastMonthDeals.length) * 100
      : currentMonthDeals.length > 0 ? 100 : 0;

    return {
      monthlyData,
      currentMonthDeals: currentMonthDeals.length,
      lastMonthDeals: lastMonthDeals.length,
      momChange,
      totalDeals,
      closedDeals,
      passedDeals,
      conversionRate,
      passRate,
      avgDaysInPipeline,
      avgAiScore,
      outcomeData,
      topSectors,
      activeDeals: activeDeals.length,
    };
  }, [deals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Monthly Metrics
          </h2>
          <p className="text-muted-foreground">Deal flow performance and trends</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Last 6 months
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{metrics.currentMonthDeals}</p>
              </div>
              <div className={`flex items-center text-xs ${metrics.momChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {metrics.momChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(metrics.momChange).toFixed(0)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs {metrics.lastMonthDeals} last month</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-accent">{metrics.conversionRate.toFixed(1)}%</p>
              </div>
              <Award className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={metrics.conversionRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pass/Reject Rate</p>
                <p className="text-2xl font-bold text-warning">{metrics.passRate.toFixed(1)}%</p>
              </div>
              <Filter className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={metrics.passRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Days in Pipeline</p>
                <p className="text-2xl font-bold">{metrics.avgDaysInPipeline.toFixed(0)}</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeDeals} active deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Deal Flow Trend */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Monthly Deal Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" fill="hsl(var(--accent))" name="Closed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Velocity */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Pipeline Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="evaluating" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--warning))' }}
                  name="In Progress"
                />
                <Line 
                  type="monotone" 
                  dataKey="passed" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--muted-foreground))' }}
                  name="Passed/Rejected"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome Distribution */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Outcome Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.outcomeData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie
                      data={metrics.outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {metrics.outcomeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {metrics.outcomeData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                No outcome data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sectors */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topSectors.length > 0 ? (
                metrics.topSectors.map(([sector, count], index) => {
                  const percentage = (count / metrics.totalDeals) * 100;
                  return (
                    <div key={sector}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground truncate max-w-[150px]">{sector}</span>
                        <span className="font-medium">{count} deals</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No sector data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{metrics.totalDeals}</p>
              <p className="text-xs text-muted-foreground">Total Deals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{metrics.closedDeals}</p>
              <p className="text-xs text-muted-foreground">Closed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.passedDeals}</p>
              <p className="text-xs text-muted-foreground">Passed/Rejected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.activeDeals}</p>
              <p className="text-xs text-muted-foreground">Active Pipeline</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{metrics.avgAiScore.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Avg AI Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
