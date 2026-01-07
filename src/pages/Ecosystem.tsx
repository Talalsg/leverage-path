import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tier = 'gatekeeper' | 'capital_allocator' | 'founder' | 'advisor' | 'connector';

interface Contact {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  tier: Tier;
  trust_level: number | null;
  is_key_ten: boolean;
  last_touchpoint: string | null;
}

const tiers: { key: Tier; label: string; color: string }[] = [
  { key: 'gatekeeper', label: 'Gatekeeper', color: 'tier-gatekeeper' },
  { key: 'capital_allocator', label: 'Capital Allocator', color: 'tier-capital' },
  { key: 'founder', label: 'Founder', color: 'tier-founder' },
  { key: 'advisor', label: 'Advisor', color: 'tier-advisor' },
  { key: 'connector', label: 'Connector', color: 'tier-connector' },
];

export default function Ecosystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', organization: '', role: '', tier: 'connector' as Tier });

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('is_key_ten', { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.name) return;
    const { error } = await supabase.from('contacts').insert({
      user_id: user.id,
      name: formData.name,
      organization: formData.organization || null,
      role: formData.role || null,
      tier: formData.tier,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Contact added' }); setDialogOpen(false); setFormData({ name: '', organization: '', role: '', tier: 'connector' }); fetchContacts(); }
  };

  const toggleKeyTen = async (id: string, current: boolean) => {
    await supabase.from('contacts').update({ is_key_ten: !current }).eq('id', id);
    fetchContacts();
  };

  const keyTen = contacts.filter(c => c.is_key_ten);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ecosystem Map</h1>
          <p className="text-muted-foreground">People are your leverage — cultivate high-signal relationships</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><Label>Organization</Label><Input value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} /></div>
              <div><Label>Role</Label><Input value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
              <div><Label>Tier</Label>
                <Select value={formData.tier} onValueChange={v => setFormData({...formData, tier: v as Tier})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiers.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">Add Contact</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {keyTen.length > 0 && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4"><Star className="h-5 w-5 text-warning" /><span className="font-semibold">Key 10 Focus List</span></div>
            <div className="flex flex-wrap gap-2">
              {keyTen.map(c => <Badge key={c.id} variant="secondary" className="text-sm">{c.name}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(contact => {
          const tierInfo = tiers.find(t => t.key === contact.tier);
          return (
            <Card key={contact.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {contact.name}
                      {contact.is_key_ten && <Star className="h-4 w-4 text-warning fill-warning" />}
                    </p>
                    {contact.organization && <p className="text-sm text-muted-foreground">{contact.organization}</p>}
                    {contact.role && <p className="text-xs text-muted-foreground/70">{contact.role}</p>}
                  </div>
                  <Badge className={tierInfo?.color}>{tierInfo?.label}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleKeyTen(contact.id, contact.is_key_ten)}>
                    {contact.is_key_ten ? 'Remove from Key 10' : 'Add to Key 10'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {contacts.length === 0 && !loading && (
          <Card className="col-span-full bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No contacts yet. Start building your network.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
