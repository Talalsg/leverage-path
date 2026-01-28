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

  const findPath = async () => {
    if (!targetFounder && !targetCompany) return;
    setSearching(true);
    setPath([]);

    // Simulate path finding algorithm
    // In a real implementation, this would use graph traversal
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find contacts that might know the target
    const relevantContacts = contacts.filter(c => {
      const org = (c.organization || '').toLowerCase();
      const target = (targetCompany || targetFounder).toLowerCase();
      
      // Check if this contact works in same industry or organization
      return org.includes(target) || 
             c.tier === 'capital_allocator' ||
             c.tier === 'founder' ||
             (c.warmth_score && c.warmth_score >= 7);
    });

    if (relevantContacts.length > 0) {
      // Build a simulated path
      const bestContact = relevantContacts[0];
      const simulatedPath: PathNode[] = [
        {
          name: 'You',
          organization: null,
          relationship: 'Start',
          warmth: 10,
        },
        {
          name: bestContact.name,
          organization: bestContact.organization,
          relationship: `${bestContact.tier} connection`,
          warmth: bestContact.warmth_score || 5,
        },
      ];

      // Add intermediate node if we have a second strong contact
      if (relevantContacts.length > 1) {
        simulatedPath.push({
          name: relevantContacts[1].name,
          organization: relevantContacts[1].organization,
          relationship: 'Potential intro',
          warmth: relevantContacts[1].warmth_score || 5,
        });
      }

      // Add target
      simulatedPath.push({
        name: targetFounder || 'Target Founder',
        organization: targetCompany || null,
        relationship: 'Target',
        warmth: 0,
      });

      setPath(simulatedPath);
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

        {!path.length && contacts.length > 0 && (
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
