import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, TrendingUp, Flame, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentDeal {
  id: string;
  company_name: string;
  sector: string | null;
  ai_score: number | null;
  created_at: string;
}

interface WarmContact {
  id: string;
  name: string;
  organization: string | null;
  warmth_score: number | null;
  tier: string;
}

export function CriticalQuestionsDashboard() {
  const { user } = useAuth();
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [warmContacts, setWarmContacts] = useState<WarmContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [dealsResult, contactsResult] = await Promise.all([
        // Recent deals (last 7 days)
        supabase
          .from('deals')
          .select('id, company_name, sector, ai_score, created_at')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Warmest contacts
        supabase
          .from('contacts')
          .select('id, name, organization, warmth_score, tier')
          .eq('user_id', user.id)
          .order('warmth_score', { ascending: false })
          .limit(5),
      ]);

      setRecentDeals((dealsResult.data as RecentDeal[]) || []);
      setWarmContacts((contactsResult.data as WarmContact[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const sectorBreakdown = recentDeals.reduce((acc, deal) => {
    const sector = deal.sector || 'Other';
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Critical Questions — Daily Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question 1: Who is building right now? */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h4 className="font-semibold text-foreground">Who is building right now?</h4>
          </div>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recentDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new deals in the last 7 days</p>
          ) : (
            <>
              <div className="space-y-2">
                {recentDeals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{deal.company_name}</span>
                      {deal.sector && <Badge variant="outline" className="text-xs">{deal.sector}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {deal.ai_score && (
                        <Badge className="bg-primary/20 text-primary text-xs">
                          Score: {deal.ai_score}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Sector breakdown */}
              {Object.keys(sectorBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(sectorBreakdown).map(([sector, count]) => (
                    <Badge key={sector} variant="secondary" className="text-xs">
                      {sector}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border pt-4" />

        {/* Question 2: Who do we know? */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-tier-gatekeeper" />
            <h4 className="font-semibold text-foreground">Who do we know?</h4>
          </div>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : warmContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet. Build your network.</p>
          ) : (
            <div className="space-y-2">
              {warmContacts.map(contact => (
                <div key={contact.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {(contact.warmth_score ?? 5) >= 7 && <Flame className="h-3 w-3 text-accent" />}
                    <span className="text-sm font-medium">{contact.name}</span>
                    {contact.organization && (
                      <span className="text-xs text-muted-foreground">@ {contact.organization}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{contact.tier}</Badge>
                    <Badge 
                      className={`text-xs ${
                        (contact.warmth_score ?? 5) >= 7 
                          ? 'bg-accent/20 text-accent' 
                          : (contact.warmth_score ?? 5) >= 4 
                            ? 'bg-warning/20 text-warning' 
                            : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {(contact.warmth_score ?? 5).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground italic text-center pt-2">
          "Access is everything. Who can get you into the room?"
        </p>
      </CardContent>
    </Card>
  );
}
