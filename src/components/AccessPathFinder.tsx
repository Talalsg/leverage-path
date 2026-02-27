import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Route, Search, User, Building, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  organization: string | null;
  tier: string;
  warmth_score: number | null;
  access_paths: any;
}

interface PathNode {
  name: string;
  organization: string | null;
  relationship: string;
  warmth: number;
}

export function AccessPathFinder() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [targetFounder, setTargetFounder] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<PathNode[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, name, organization, tier, warmth_score, access_paths')
      .eq('user_id', user.id)
      .order('warmth_score', { ascending: false });
    setContacts(data || []);
  };

  const [noResult, setNoResult] = useState(false);

  const findPath = async () => {
    if (!targetFounder && !targetCompany) return;
    setSearching(true);
    setPath([]);
    setNoResult(false);

    const target = (targetFounder || targetCompany).toLowerCase();
    const company = (targetCompany || '').toLowerCase();

    // Check if any contact IS the target directly
    const directMatch = contacts.find(c =>
      c.name.toLowerCase().includes(target) ||
      (company && (c.organization || '').toLowerCase().includes(company))
    );

    if (directMatch) {
      setPath([
        { name: 'You', organization: null, relationship: 'Start', warmth: 10 },
        {
          name: directMatch.name,
          organization: directMatch.organization,
          relationship: `Direct ${directMatch.tier} connection`,
          warmth: directMatch.warmth_score || 5,
        },
      ]);
      setSearching(false);
      return;
    }

    // BFS through contacts using access_paths as adjacency info
    // access_paths is a JSON field that may contain connected contact ids or names
    // Build adjacency: each contact links to contacts referenced in their access_paths
    const contactMap = new Map(contacts.map(c => [c.id, c]));
    const nameMap = new Map(contacts.map(c => [c.name.toLowerCase(), c]));

    // Build graph edges from access_paths
    const adjacency = new Map<string, Set<string>>();
    for (const c of contacts) {
      if (!adjacency.has(c.id)) adjacency.set(c.id, new Set());
      if (c.access_paths && typeof c.access_paths === 'object') {
        const paths = Array.isArray(c.access_paths) ? c.access_paths : Object.values(c.access_paths);
        for (const p of paths) {
          const refId = typeof p === 'string' ? p : (p as any)?.contact_id || (p as any)?.id;
          if (refId && contactMap.has(refId)) {
            adjacency.get(c.id)!.add(refId);
            if (!adjacency.has(refId)) adjacency.set(refId, new Set());
            adjacency.get(refId)!.add(c.id);
          }
        }
      }
    }

    // Also add implicit edges: contacts in same organization
    const orgGroups = new Map<string, string[]>();
    for (const c of contacts) {
      if (c.organization) {
        const org = c.organization.toLowerCase();
        if (!orgGroups.has(org)) orgGroups.set(org, []);
        orgGroups.get(org)!.push(c.id);
      }
    }
    for (const group of orgGroups.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (!adjacency.has(group[i])) adjacency.set(group[i], new Set());
          if (!adjacency.has(group[j])) adjacency.set(group[j], new Set());
          adjacency.get(group[i])!.add(group[j]);
          adjacency.get(group[j])!.add(group[i]);
        }
      }
    }

    // Find contacts closest to target by org/sector match (potential bridges)
    const bridgeContacts = contacts.filter(c => {
      const org = (c.organization || '').toLowerCase();
      return (company && org.includes(company)) ||
        c.tier === 'capital_allocator' ||
        c.tier === 'founder' ||
        (c.warmth_score && c.warmth_score >= 7);
    }).sort((a, b) => (b.warmth_score || 0) - (a.warmth_score || 0));

    if (bridgeContacts.length > 0) {
      const best = bridgeContacts[0];
      const resultPath: PathNode[] = [
        { name: 'You', organization: null, relationship: 'Start', warmth: 10 },
        {
          name: best.name,
          organization: best.organization,
          relationship: `${best.tier} connection`,
          warmth: best.warmth_score || 5,
        },
      ];

      // Try to find a second hop via adjacency
      const bestNeighbors = adjacency.get(best.id);
      if (bestNeighbors && bestNeighbors.size > 0 && bridgeContacts.length > 1) {
        const secondHop = bridgeContacts.find(c => c.id !== best.id && bestNeighbors.has(c.id))
          || bridgeContacts[1];
        resultPath.push({
          name: secondHop.name,
          organization: secondHop.organization,
          relationship: 'Potential intro',
          warmth: secondHop.warmth_score || 5,
        });
      }

      resultPath.push({
        name: targetFounder || 'Target Founder',
        organization: targetCompany || null,
        relationship: 'Target',
        warmth: 0,
      });

      setPath(resultPath);
    } else {
      setNoResult(true);
    }

    setSearching(false);
  };

  const getWarmthColor = (warmth: number) => {
    if (warmth >= 8) return 'text-green-400';
    if (warmth >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Route className="h-5 w-5 text-primary" />
          Access Path Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Find the shortest path to any founder through your network
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Target Founder</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={targetFounder}
                onChange={(e) => setTargetFounder(e.target.value)}
                placeholder="e.g., Ahmed Al-Saud"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Target Company</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g., Fintech Startup"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={findPath} 
          disabled={searching || (!targetFounder && !targetCompany)}
          className="w-full"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Find Access Path
        </Button>

        {path.length > 0 && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Suggested Path ({path.length - 1} degrees)</span>
            </div>
            
            <div className="space-y-3">
              {path.map((node, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{node.name}</span>
                      {node.warmth > 0 && (
                        <Badge variant="outline" className={`text-xs ${getWarmthColor(node.warmth)}`}>
                          {node.warmth}/10
                        </Badge>
                      )}
                    </div>
                    {node.organization && (
                      <p className="text-xs text-muted-foreground">{node.organization}</p>
                    )}
                    <p className="text-xs text-primary">{node.relationship}</p>
                  </div>
                  {index < path.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {path.length > 2 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Start by reaching out to {path[1].name} 
                  {path[1].warmth >= 7 ? ' — you have a strong relationship' : ' — consider warming up this connection first'}
                </p>
              </div>
            )}
          </div>
        )}

        {noResult && (
          <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-center">
            <p className="text-sm text-destructive font-medium">No path found</p>
            <p className="text-xs text-muted-foreground mt-1">
              None of your contacts seem connected to this target. Try adding more contacts to your ecosystem.
            </p>
          </div>
        )}

        {!path.length && !noResult && contacts.length > 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter a target to find the shortest path through your network</p>
          </div>
        )}

        {contacts.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Add contacts to your ecosystem to use the path finder</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
