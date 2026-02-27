import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { DecisionJournalModal } from '@/components/DecisionJournalModal';

type DealStage = 'review' | 'evaluating' | 'passed' | 'term_sheet' | 'closed' | 'rejected';
type DealOutcome = 'win' | 'miss' | 'regret' | 'noise' | 'pending';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: DealStage;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  founder_linkedin: string | null;
  overall_score: number | null;
  ai_score: number | null;
  ai_analysis: string | null;
  ai_memo: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  deck_url?: string | null;
  vision_2030_alignment?: number | null;
  founder_execution_score?: number | null;
  founder_sales_ability?: number | null;
  iteration_speed?: number | null;
  failure_modes?: string | null;
  exit_potential?: string | null;
}

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: 'review', label: 'Review', color: 'bg-stage-review' },
  { key: 'evaluating', label: 'Evaluating', color: 'bg-stage-evaluating' },
  { key: 'passed', label: 'Passed', color: 'bg-stage-passed' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-stage-term-sheet' },
  { key: 'closed', label: 'Closed', color: 'bg-stage-closed' },
  { key: 'rejected', label: 'Rejected', color: 'bg-stage-rejected' },
];

const outcomes: { key: DealOutcome; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'win', label: 'Win' },
  { key: 'miss', label: 'Miss' },
  { key: 'regret', label: 'Regret' },
  { key: 'noise', label: 'Noise' },
];

export type SortColumn = 'company_name' | 'sector' | 'stage' | 'ai_score' | 'valuation_usd' | 'created_at' | 'outcome';

interface DealsTableProps {
  deals: Deal[];
  loading: boolean;
  selectedDeals: Set<string>;
  onToggleSelect: (id: string) => void;
  onViewDetails: (deal: Deal) => void;
  onEvaluate: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onUpdateStage: (id: string, stage: DealStage) => void;
  onUpdateOutcome: (id: string, outcome: DealOutcome) => void;
  onRefresh: () => void;
  sortColumn: SortColumn;
  sortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function SortIcon({ column, activeColumn, direction }: { column: string; activeColumn: string; direction: 'asc' | 'desc' }) {
  if (column !== activeColumn) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

export function DealsTable({
  deals, loading, selectedDeals, onToggleSelect, onViewDetails, onEvaluate, onEdit, onDelete,
  onUpdateStage, onUpdateOutcome, onRefresh, sortColumn, sortDirection, onSort,
  page, pageSize, totalCount, onPageChange,
}: DealsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const sortableHeader = (label: string, column: SortColumn) => (
    <button
      className="flex items-center hover:text-foreground transition-colors"
      onClick={() => onSort(column)}
    >
      {label}
      <SortIcon column={column} activeColumn={sortColumn} direction={sortDirection} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Loading deals...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10" />
              <TableHead>{sortableHeader('Company', 'company_name')}</TableHead>
              <TableHead>{sortableHeader('Sector', 'sector')}</TableHead>
              <TableHead>Founder</TableHead>
              <TableHead>{sortableHeader('AI Score', 'ai_score')}</TableHead>
              <TableHead>{sortableHeader('Valuation', 'valuation_usd')}</TableHead>
              <TableHead>{sortableHeader('Stage', 'stage')}</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>{sortableHeader('Date', 'created_at')}</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Target className="h-10 w-10 text-muted-foreground/50" />
                    <h3 className="font-semibold text-lg">No deals yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">Add your first deal or share your intake form to start tracking your pipeline.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              deals.map(deal => (
                <TableRow
                  key={deal.id}
                  className={`cursor-pointer ${selectedDeals.has(deal.id) ? 'bg-primary/5' : ''}`}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedDeals.has(deal.id)}
                      onCheckedChange={() => onToggleSelect(deal.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onViewDetails(deal)}
                      className="font-medium text-sm text-foreground hover:text-primary transition-colors text-left"
                    >
                      {deal.company_name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{deal.sector || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{deal.founder_name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    {deal.ai_score ? (
                      <Badge className={`text-xs border-0 ${
                        deal.ai_score >= 70 ? 'bg-green-500/20 text-green-400' :
                        deal.ai_score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        <Brain className="h-3 w-3 mr-1" />{deal.ai_score}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {deal.valuation_usd ? (
                      <span className="text-xs font-medium text-accent">
                        {deal.valuation_usd >= 1_000_000
                          ? `$${(deal.valuation_usd / 1_000_000).toFixed(1)}M`
                          : `$${(deal.valuation_usd / 1_000).toFixed(0)}K`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Select value={deal.stage} onValueChange={v => onUpdateStage(deal.id, v as DealStage)}>
                      <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => (
                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Select value={deal.outcome || 'pending'} onValueChange={v => onUpdateOutcome(deal.id, v as DealOutcome)}>
                      <SelectTrigger className="h-7 text-xs w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outcomes.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEvaluate(deal)}>
                        <Brain className="h-3 w-3" />
                      </Button>
                      <DecisionJournalModal dealId={deal.id} dealName={deal.company_name} onSaved={onRefresh} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(deal)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(deal)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount > 0 ? `${from}–${to} of ${totalCount.toLocaleString()} deals` : 'No deals'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
