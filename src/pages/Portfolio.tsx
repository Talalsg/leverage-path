import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExitScenarioModal } from '@/components/ExitScenarioModal';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { PortfolioHealthDashboard } from '@/components/PortfolioHealthDashboard';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { SearchFilter } from '@/components/SearchFilter';
import { EditPortfolioModal } from '@/components/EditPortfolioModal';

interface Position {
  id: string;
  company_name: string;
  sector: string | null;
  entry_valuation_usd: number | null;
  current_valuation_usd: number | null;
  equity_percent: number | null;
  status: string;
  is_top_position: boolean;
  notes: string | null;
  monthly_revenue: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  health_status: string | null;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'exited', label: 'Exited' },
  { value: 'written_off', label: 'Written Off' },
];

const healthOptions = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export default function Portfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', sector: '', entry_valuation_usd: '', equity_percent: '' });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState<Position | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPositions = async () => {
    if (!user) return;
    const { data } = await supabase.from('portfolio').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPositions((data as Position[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPositions(); }, [user]);

  // Filter positions based on search and filters
  const filteredPositions = useMemo(() => {
    return positions.filter(position => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          position.company_name.toLowerCase().includes(query) ||
          (position.sector?.toLowerCase() || '').includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterValues.status && filterValues.status !== 'all') {
        if (position.status !== filterValues.status) return false;
      }

      // Health filter
      if (filterValues.health && filterValues.health !== 'all') {
        if (position.health_status !== filterValues.health) return false;
      }

      return true;
    });
  }, [positions, searchQuery, filterValues]);

  const handleCreate = async () => {
    if (!user || !formData.company_name) return;
    const { data, error } = await supabase.from('portfolio').insert({
      user_id: user.id,
      company_name: formData.company_name,
      sector: formData.sector || null,
      entry_valuation_usd: formData.entry_valuation_usd ? parseInt(formData.entry_valuation_usd) : null,
      equity_percent: formData.equity_percent ? parseFloat(formData.equity_percent) : null,
      entry_date: new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) { 
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); 
    } else { 
      toast({ title: 'Position added' }); 
      logActivity({ type: 'portfolio_added', title: `Added ${formData.company_name} position`, entityType: 'portfolio', entityId: data?.id });
      setDialogOpen(false); 
      setFormData({ company_name: '', sector: '', entry_valuation_usd: '', equity_percent: '' }); 
      fetchPositions(); 
    }
  };

  const openEditModal = (position: Position) => {
    setPositionToEdit(position);
    setEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!positionToDelete) return;
    setDeleting(true);
    
    try {
      const { error } = await supabase.from('portfolio').delete().eq('id', positionToDelete.id);
      if (error) throw error;
      
      toast({ title: 'Position deleted', description: `${positionToDelete.company_name} has been removed.` });
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
      fetchPositions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (position: Position) => {
    setPositionToDelete(position);
    setDeleteDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

  const totalPaperValue = filteredPositions.reduce((sum, p) => {
    if (p.current_valuation_usd && p.equity_percent) return sum + (p.current_valuation_usd * p.equity_percent / 100);
    if (p.entry_valuation_usd && p.equity_percent) return sum + (p.entry_valuation_usd * p.equity_percent / 100);
    return sum;
  }, 0);

  const filterOptions = [
    { key: 'status', label: 'Status', options: statusOptions },
    { key: 'health', label: 'Health', options: healthOptions },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Track equity positions and projected returns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Position</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Portfolio Position</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Company Name *</Label><Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
              <div><Label>Sector</Label><Input value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} /></div>
              <div><Label>Entry Valuation (USD)</Label><Input type="number" value={formData.entry_valuation_usd} onChange={e => setFormData({...formData, entry_valuation_usd: e.target.value})} /></div>
              <div><Label>Your Equity %</Label><Input type="number" step="0.1" value={formData.equity_percent} onChange={e => setFormData({...formData, equity_percent: e.target.value})} /></div>
              <Button onClick={handleCreate} className="w-full">Add Position</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <SearchFilter
        placeholder="Search positions by company or sector..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filterOptions}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
        onClearAll={clearAllFilters}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Positions</p>
            <p className="text-3xl font-bold mt-1">{filteredPositions.length}</p>
            <p className="text-xs text-muted-foreground/70">Target: 5-10 by EOY 2026</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Paper Value</p>
            <p className="text-3xl font-bold mt-1 text-accent">${(totalPaperValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active Positions</p>
            <p className="text-3xl font-bold mt-1">{filteredPositions.filter(p => p.status === 'active').length}</p>
          </CardContent>
        </Card>
      </div>

      <PortfolioHealthDashboard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPositions.map(position => (
          <Card key={position.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{position.company_name}</p>
                  {position.sector && <p className="text-sm text-muted-foreground">{position.sector}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {position.is_top_position && <Badge className="bg-accent text-accent-foreground">Top</Badge>}
                  {position.health_status && (
                    <Badge variant="outline" className={
                      position.health_status === 'healthy' ? 'text-green-400 border-green-400/50' :
                      position.health_status === 'warning' ? 'text-yellow-400 border-yellow-400/50' :
                      'text-red-400 border-red-400/50'
                    }>
                      {position.health_status}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {position.equity_percent && <p className="text-sm"><span className="text-muted-foreground">Equity:</span> {position.equity_percent}%</p>}
                {position.entry_valuation_usd && <p className="text-sm"><span className="text-muted-foreground">Entry:</span> ${(position.entry_valuation_usd / 1000000).toFixed(1)}M</p>}
                {position.runway_months && <p className="text-sm"><span className="text-muted-foreground">Runway:</span> {position.runway_months} months</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <ExitScenarioModal 
                  companyName={position.company_name}
                  entryValuation={position.entry_valuation_usd}
                  currentValuation={position.current_valuation_usd}
                  equityPercent={position.equity_percent}
                />
                <Button size="sm" variant="ghost" onClick={() => openEditModal(position)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(position)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredPositions.length === 0 && !loading && (
          <Card className="col-span-full bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No positions found. {searchQuery || Object.keys(filterValues).length > 0 ? 'Try adjusting your filters.' : 'Add your first equity position.'}</CardContent></Card>
        )}
      </div>

      <EditPortfolioModal position={positionToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSaved={fetchPositions} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Portfolio Position" itemName={positionToDelete?.company_name} loading={deleting} />
    </div>
  );
}
