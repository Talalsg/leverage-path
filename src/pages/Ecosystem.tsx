import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Star, Clock, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TouchpointLogger, getDecayStatus } from '@/components/TouchpointLogger';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { LinkedInImport } from '@/components/LinkedInImport';
import { RelationshipWarmthBadge } from '@/components/RelationshipWarmthBadge';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { SearchFilter } from '@/components/SearchFilter';
import { EditContactModal } from '@/components/EditContactModal';
import { AccessPathFinder } from '@/components/AccessPathFinder';

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
  warmth_score: number | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  relationship_context: string | null;
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
  const { logActivity } = useActivityLogger();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', organization: '', role: '', tier: 'connector' as Tier });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('is_key_ten', { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [user]);

  // Filter contacts based on search and filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          contact.name.toLowerCase().includes(query) ||
          (contact.organization?.toLowerCase() || '').includes(query) ||
          (contact.role?.toLowerCase() || '').includes(query);
        if (!matchesSearch) return false;
      }

      // Tier filter
      if (filterValues.tier && filterValues.tier !== 'all') {
        if (contact.tier !== filterValues.tier) return false;
      }

      // Key 10 filter
      if (filterValues.keyTen && filterValues.keyTen !== 'all') {
        if (filterValues.keyTen === 'yes' && !contact.is_key_ten) return false;
        if (filterValues.keyTen === 'no' && contact.is_key_ten) return false;
      }

      return true;
    });
  }, [contacts, searchQuery, filterValues]);

  const handleCreate = async () => {
    if (!user || !formData.name) return;
    const { data, error } = await supabase.from('contacts').insert({
      user_id: user.id,
      name: formData.name,
      organization: formData.organization || null,
      role: formData.role || null,
      tier: formData.tier,
    }).select().single();
    if (error) { 
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
    } else { 
      toast({ title: 'Contact added' }); 
      logActivity({ type: 'contact_added', title: `Added ${formData.name}`, entityType: 'contact', entityId: data?.id });
      setDialogOpen(false); 
      setFormData({ name: '', organization: '', role: '', tier: 'connector' }); 
      fetchContacts(); 
    }
  };

  const toggleKeyTen = async (id: string, current: boolean) => {
    await supabase.from('contacts').update({ is_key_ten: !current }).eq('id', id);
    fetchContacts();
  };

  const openEditModal = (contact: Contact) => {
    setContactToEdit(contact);
    setEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    setDeleting(true);
    
    try {
      await supabase.from('touchpoints').delete().eq('contact_id', contactToDelete.id);
      const { error } = await supabase.from('contacts').delete().eq('id', contactToDelete.id);
      if (error) throw error;
      
      toast({ title: 'Contact deleted', description: `${contactToDelete.name} has been removed.` });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

  const keyTen = filteredContacts.filter(c => c.is_key_ten);

  const filterOptions = [
    { key: 'tier', label: 'Tier', options: tiers.map(t => ({ value: t.key, label: t.label })) },
    { key: 'keyTen', label: 'Key 10', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ecosystem Map</h1>
          <p className="text-muted-foreground">People are your leverage — cultivate high-signal relationships</p>
        </div>
        <div className="flex gap-2">
          <LinkedInImport onImportComplete={fetchContacts} />
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
      </div>

      {/* Search and Filter */}
      <SearchFilter
        placeholder="Search contacts by name, organization, or role..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filterOptions}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
        onClearAll={clearAllFilters}
      />

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

      {/* Access Path Finder */}
      <AccessPathFinder />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => {
          const tierInfo = tiers.find(t => t.key === contact.tier);
          const decay = getDecayStatus(contact.last_touchpoint);
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
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={tierInfo?.color}>{tierInfo?.label}</Badge>
                    <RelationshipWarmthBadge warmthScore={contact.warmth_score} />
                  </div>
                </div>
                <div className={`mt-3 flex items-center gap-2 text-xs ${decay.color}`}>
                  <Clock className="h-3 w-3" />
                  <span>{decay.label}</span>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => toggleKeyTen(contact.id, contact.is_key_ten)}>
                    {contact.is_key_ten ? 'Remove from Key 10' : 'Add to Key 10'}
                  </Button>
                  <TouchpointLogger contactId={contact.id} contactName={contact.name} onLogged={fetchContacts} />
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(contact)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(contact)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredContacts.length === 0 && !loading && (
          <Card className="col-span-full bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No contacts found. {searchQuery || Object.keys(filterValues).length > 0 ? 'Try adjusting your filters.' : 'Start building your network.'}</CardContent></Card>
        )}
      </div>

      <EditContactModal contact={contactToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSaved={fetchContacts} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Contact" itemName={contactToDelete?.name} loading={deleting} />
    </div>
  );
}
