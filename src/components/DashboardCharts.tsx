import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid
} from 'recharts';

interface DashboardChartsProps {
  deals: Array<{
    id: string;
    stage: string | null;
    outcome: string | null;
    ai_score: number | null;
    sector: string | null;
    created_at: string;
  }>;
}

const COLORS = {
  stages: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'],
  outcomes: {
    win: 'hsl(var(--accent))',
    miss: 'hsl(var(--destructive))',
    regret: 'hsl(var(--warning))',
    noise: 'hsl(var(--muted-foreground))',
  },
};

export function DashboardCharts({ deals }: DashboardChartsProps) {
  // Deal Flow by Stage
  const stageData = deals.reduce((acc, deal) => {
    const stage = deal.stage || 'unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const stagePieData = Object.entries(stageData).map(([name, value]) => ({ name, value }));

  // Outcome Distribution
  const outcomeData = deals.reduce((acc, deal) => {
    if (deal.outcome) {
      acc[deal.outcome] = (acc[deal.outcome] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const outcomeBarData = Object.entries(outcomeData).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1), 
    value,
    fill: COLORS.outcomes[name as keyof typeof COLORS.outcomes] || 'hsl(var(--muted-foreground))'
  }));

  // AI Score Distribution
  const scoreRanges = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
  deals.forEach(deal => {
    if (deal.ai_score !== null) {
      if (deal.ai_score <= 25) scoreRanges['0-25']++;
      else if (deal.ai_score <= 50) scoreRanges['26-50']++;
      else if (deal.ai_score <= 75) scoreRanges['51-75']++;
      else scoreRanges['76-100']++;
    }
  });
  const scoreBarData = Object.entries(scoreRanges).map(([range, count]) => ({ range, count }));

  // Sector Breakdown
  const sectorData = deals.reduce((acc, deal) => {
    const sector = deal.sector || 'Unknown';
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sectorPieData = Object.entries(sectorData).map(([name, value]) => ({ name, value }));

  // Monthly Deal Flow (last 6 months)
  const monthlyData: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short' });
    monthlyData[key] = 0;
  }
  deals.forEach(deal => {
    const dealDate = new Date(deal.created_at);
    const monthDiff = (now.getFullYear() - dealDate.getFullYear()) * 12 + now.getMonth() - dealDate.getMonth();
    if (monthDiff >= 0 && monthDiff < 6) {
      const key = dealDate.toLocaleDateString('en-US', { month: 'short' });
      if (monthlyData[key] !== undefined) monthlyData[key]++;
    }
  });
  const monthlyLineData = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Deal Flow by Stage */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Deal Flow by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stagePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {stagePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.stages[index % COLORS.stages.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Outcome Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Deal Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomeBarData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {outcomeBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Score Distribution */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">AI Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBarData}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sector Breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sector Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectorPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} label={({ name }) => name.slice(0, 10)}>
                  {sectorPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.stages[index % COLORS.stages.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Deal Flow */}
      <Card className="bg-card border-border/50 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Deal Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyLineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
