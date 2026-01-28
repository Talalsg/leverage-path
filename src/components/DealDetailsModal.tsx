import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, FileText, Plus, Calendar, User, Building2, Target, TrendingUp, DollarSign, Briefcase, MapPin, Pencil, Trash2, Check, X, Users, Lightbulb, Rocket, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';

type DealStage = 'review' | 'evaluating' | 'passed' | 'term_sheet' | 'closed' | 'rejected';

const stages: { key: DealStage; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'evaluating', label: 'Evaluating' },
  { key: 'passed', label: 'Passed' },
  { key: 'term_sheet', label: 'Term Sheet' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
];

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  stage: string;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  founder_linkedin?: string | null;
  notes: string | null;
  deck_url?: string | null;
  vision_2030_alignment?: number | null;
  founder_execution_score?: number | null;
  founder_sales_ability?: number | null;
  iteration_speed?: number | null;
  failure_modes?: string | null;
  exit_potential?: string | null;
  ai_score?: number | null;
  ai_analysis?: string | null;
  ai_memo?: string | null;
  created_at: string;
}

interface AnalysisNote {
  date: string;
  content: string;
}

interface DealDetailsModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DealDetailsModal({ deal, open, onOpenChange, onSaved }: DealDetailsModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState<AnalysisNote[]>([]);
  const [deckUrl, setDeckUrl] = useState<string | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [currentStage, setCurrentStage] = useState<DealStage>('review');
  const [updatingStage, setUpdatingStage] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  useEffect(() => {
    if (deal) {
      setCurrentStage(deal.stage as DealStage);
      parseAnalysisNotes(deal.notes || '');
      loadDeckUrl(deal.deck_url);
    }
  }, [deal]);

  const parseAnalysisNotes = (notes: string) => {
    // Look for the Analysis Notes section with dated entries
    const analysisMatch = notes.match(/## Analysis Notes\n([\s\S]*?)(?=\n## |$)/);
    if (analysisMatch) {
      const notesContent = analysisMatch[1].trim();
      // Parse individual dated notes: format is "### YYYY-MM-DD\nNote content"
      const noteEntries: AnalysisNote[] = [];
      const datePattern = /### (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n### \d{4}-\d{2}-\d{2}|$)/g;
      let match;
      while ((match = datePattern.exec(notesContent)) !== null) {
        noteEntries.push({
          date: match[1],
          content: match[2].trim()
        });
      }
      // If no dated entries found but there's content, treat it as a single undated note
      if (noteEntries.length === 0 && notesContent) {
        noteEntries.push({
          date: format(new Date(), 'yyyy-MM-dd'),
          content: notesContent
        });
      }
      setAnalysisNotes(noteEntries);
    } else {
      setAnalysisNotes([]);
    }
  };

  const loadDeckUrl = async (url: string | null | undefined) => {
    if (!url) {
      setDeckUrl(null);
      return;
    }

    // Check if it's a Supabase storage path
    if (url.startsWith('deal-documents/')) {
      setLoadingDeck(true);
      try {
        const { data, error } = await supabase.storage
          .from('deal-documents')
          .createSignedUrl(url.replace('deal-documents/', ''), 3600);
        
        if (error) throw error;
        setDeckUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading deck URL:', error);
        setDeckUrl(null);
      } finally {
        setLoadingDeck(false);
      }
    } else {
      // It's an external URL
      setDeckUrl(url);
    }
  };

  const handleAddNote = async () => {
    if (!deal || !newNote.trim()) return;
    setSaving(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const newNoteEntry: AnalysisNote = { date: today, content: newNote.trim() };
      const updatedNotes = [newNoteEntry, ...analysisNotes];
      
      // Rebuild the notes string
      const existingNotes = deal.notes || '';
      const withoutAnalysis = existingNotes.replace(/## Analysis Notes\n[\s\S]*?(?=\n## |$)/, '').trim();
      
      const analysisSection = `## Analysis Notes\n${updatedNotes.map(n => `### ${n.date}\n${n.content}`).join('\n\n')}`;
      const finalNotes = withoutAnalysis + (withoutAnalysis ? '\n\n' : '') + analysisSection;

      const { error } = await supabase
        .from('deals')
        .update({ notes: finalNotes })
        .eq('id', deal.id);

      if (error) throw error;

      setAnalysisNotes(updatedNotes);
      setNewNote('');
      toast({ title: 'Note added', description: 'Your analysis note has been saved.' });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveNotesToDatabase = async (updatedNotes: AnalysisNote[]) => {
    if (!deal) return false;

    try {
      const existingNotes = deal.notes || '';
      const withoutAnalysis = existingNotes.replace(/## Analysis Notes\n[\s\S]*?(?=\n## |$)/, '').trim();
      
      const analysisSection = updatedNotes.length > 0 
        ? `## Analysis Notes\n${updatedNotes.map(n => `### ${n.date}\n${n.content}`).join('\n\n')}`
        : '';
      const finalNotes = withoutAnalysis + (withoutAnalysis && analysisSection ? '\n\n' : '') + analysisSection;

      const { error } = await supabase
        .from('deals')
        .update({ notes: finalNotes })
        .eq('id', deal.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleEditNote = (index: number) => {
    setEditingNoteIndex(index);
    setEditingNoteContent(analysisNotes[index].content);
  };

  const handleSaveEditedNote = async () => {
    if (editingNoteIndex === null || !editingNoteContent.trim()) return;
    setSaving(true);

    const updatedNotes = [...analysisNotes];
    updatedNotes[editingNoteIndex] = {
      ...updatedNotes[editingNoteIndex],
      content: editingNoteContent.trim()
    };

    const success = await saveNotesToDatabase(updatedNotes);
    if (success) {
      setAnalysisNotes(updatedNotes);
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      toast({ title: 'Note updated', description: 'Your analysis note has been updated.' });
      onSaved();
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingNoteIndex(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = async (index: number) => {
    setSaving(true);
    const updatedNotes = analysisNotes.filter((_, i) => i !== index);

    const success = await saveNotesToDatabase(updatedNotes);
    if (success) {
      setAnalysisNotes(updatedNotes);
      toast({ title: 'Note deleted', description: 'Your analysis note has been removed.' });
      onSaved();
    }
    setSaving(false);
  };

  const handleStageChange = async (newStage: DealStage) => {
    if (!deal || newStage === currentStage) return;
    setUpdatingStage(true);

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage })
        .eq('id', deal.id);

      if (error) throw error;

      setCurrentStage(newStage);
      toast({ title: 'Stage updated', description: `Deal moved to ${stages.find(s => s.key === newStage)?.label}` });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingStage(false);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      review: 'bg-stage-review',
      evaluating: 'bg-stage-evaluating',
      passed: 'bg-stage-passed',
      term_sheet: 'bg-stage-term-sheet',
      closed: 'bg-stage-closed',
      rejected: 'bg-stage-rejected',
    };
    return colors[stage] || 'bg-muted';
  };

  // Parse structured intake data from notes (matches edge function format)
  const parseIntakeData = (notes: string | null) => {
    if (!notes) return null;
    
    const data: Record<string, string> = {};
    
    // Remove Analysis Notes section for parsing
    const cleanNotes = notes.replace(/## Analysis Notes\n[\s\S]*?(?=\n## |$)/, '').trim();
    
    // Check if this is an intake submission
    if (!cleanNotes.includes('## Intake Submission')) return null;
    
    // Parse the submitted timestamp
    const submittedMatch = cleanNotes.match(/\*\*Submitted:\*\* (.+)/);
    if (submittedMatch) data.submitted = submittedMatch[1].trim();
    
    // Parse all sections from the intake form format
    const sectionPatterns = [
      { key: 'oneSentence', pattern: /### One-Sentence Description\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'companyDescription', pattern: /### Company Description\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'keyInsight', pattern: /### Key Insight\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'targetCustomer', pattern: /### Target Customer\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'tractionHighlights', pattern: /### Traction Highlights\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'team', pattern: /### Team\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'funding', pattern: /### Funding\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'nextGoals', pattern: /### Goals \(Next 3-6 Months\)\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'saudiArabia', pattern: /### Saudi Arabia\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'revenue', pattern: /### Revenue\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'additionalNotes', pattern: /### Additional Notes\n([\s\S]*?)(?=\n### |$)/ },
      { key: 'companyDetails', pattern: /### Company Details\n([\s\S]*?)(?=\n### |$)/ },
    ];

    sectionPatterns.forEach(({ key, pattern }) => {
      const match = cleanNotes.match(pattern);
      if (match) {
        const content = match[1].trim();
        if (content && content !== 'N/A') {
          data[key] = content;
        }
      }
    });

    return Object.keys(data).length > 0 ? data : null;
  };

  // Parse team details from the team section
  const parseTeamDetails = (teamStr: string) => {
    const structure = teamStr.match(/\*\*Structure:\*\* (.+)/)?.[1] || null;
    const size = teamStr.match(/\*\*Size:\*\* (.+)/)?.[1] || null;
    const roles = teamStr.match(/\*\*Roles:\*\* (.+)/)?.[1] || null;
    return { structure, size, roles };
  };

  // Parse funding details
  const parseFundingDetails = (fundingStr: string) => {
    const isRaising = fundingStr.match(/\*\*Currently Raising:\*\* (.+)/)?.[1] || null;
    const round = fundingStr.match(/\*\*Round:\*\* (.+)/)?.[1] || null;
    const targetRaise = fundingStr.match(/\*\*Target Raise:\*\* (.+)/)?.[1] || null;
    const existingInvestors = fundingStr.match(/\*\*Existing Investors:\*\* (.+)/)?.[1] || null;
    const lookingFor = fundingStr.match(/\*\*Looking For:\*\* (.+)/)?.[1] || null;
    return { isRaising, round, targetRaise, existingInvestors, lookingFor };
  };

  // Parse company details
  const parseCompanyDetails = (detailsStr: string) => {
    const headquarters = detailsStr.match(/\*\*Headquarters:\*\* (.+)/)?.[1] || null;
    const yearFounded = detailsStr.match(/\*\*Year Founded:\*\* (.+)/)?.[1] || null;
    const companyLinkedIn = detailsStr.match(/\*\*Company LinkedIn:\*\* (.+)/)?.[1] || null;
    const cofounderLinkedIn = detailsStr.match(/\*\*Co-founder LinkedIn:\*\* (.+)/)?.[1] || null;
    return { headquarters, yearFounded, companyLinkedIn, cofounderLinkedIn };
  };

  if (!deal) return null;

  const intakeData = parseIntakeData(deal.notes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl text-foreground">{deal.company_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2 flex-wrap">
                {deal.sector && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Briefcase className="h-3 w-3 mr-1" />{deal.sector}
                  </Badge>
                )}
                {deal.ai_score && (
                  <Badge variant="outline" className="text-primary border-primary/30">
                    AI Score: {deal.ai_score}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Submitted {format(new Date(deal.created_at), 'MMM d, yyyy')}
                </span>
              </DialogDescription>
            </div>
            {/* Stage Selector */}
            <div className="flex-shrink-0">
              <Select value={currentStage} onValueChange={(v) => handleStageChange(v as DealStage)} disabled={updatingStage}>
                <SelectTrigger className={`w-[140px] ${getStageColor(currentStage)} text-white border-0`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {deal.founder_name && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <User className="h-3 w-3" />Founder
                    </div>
                    <p className="font-medium text-sm text-card-foreground truncate">{deal.founder_name}</p>
                  </CardContent>
                </Card>
              )}
              {deal.valuation_usd && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <DollarSign className="h-3 w-3" />Valuation
                    </div>
                    <p className="font-medium text-sm text-card-foreground">${(deal.valuation_usd / 1000000).toFixed(1)}M</p>
                  </CardContent>
                </Card>
              )}
              {deal.equity_offered && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <TrendingUp className="h-3 w-3" />Equity
                    </div>
                    <p className="font-medium text-sm text-card-foreground">{deal.equity_offered}%</p>
                  </CardContent>
                </Card>
              )}
              {deal.vision_2030_alignment && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Target className="h-3 w-3" />Vision 2030
                    </div>
                    <p className="font-medium text-sm text-card-foreground">{deal.vision_2030_alignment}/5</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Founder Scores if available */}
            {(deal.founder_execution_score || deal.founder_sales_ability || deal.iteration_speed) && (
              <div className="grid grid-cols-3 gap-3">
                {deal.founder_execution_score && (
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{deal.founder_execution_score}</p>
                    <p className="text-xs text-muted-foreground">Execution</p>
                  </div>
                )}
                {deal.founder_sales_ability && (
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{deal.founder_sales_ability}</p>
                    <p className="text-xs text-muted-foreground">Sales Ability</p>
                  </div>
                )}
                {deal.iteration_speed && (
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{deal.iteration_speed}</p>
                    <p className="text-xs text-muted-foreground">Iteration Speed</p>
                  </div>
                )}
              </div>
            )}

            {/* Links Row */}
            <div className="flex gap-3 flex-wrap">
              {deal.founder_linkedin && (
                <Button variant="outline" size="sm" asChild className="text-card-foreground">
                  <a href={deal.founder_linkedin} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-2" />Founder LinkedIn
                  </a>
                </Button>
              )}
              {deckUrl && (
                <Button variant="default" size="sm" asChild>
                  <a href={deckUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-3 w-3 mr-2" />
                    {loadingDeck ? 'Loading...' : 'View Pitch Deck'}
                  </a>
                </Button>
              )}
              {intakeData?.companyDetails && (() => {
                const details = parseCompanyDetails(intakeData.companyDetails);
                return details.companyLinkedIn && details.companyLinkedIn !== 'N/A' ? (
                  <Button variant="outline" size="sm" asChild className="text-card-foreground">
                    <a href={details.companyLinkedIn.startsWith('http') ? details.companyLinkedIn : `https://${details.companyLinkedIn}`} target="_blank" rel="noopener noreferrer">
                      <Building2 className="h-3 w-3 mr-2" />Company LinkedIn
                    </a>
                  </Button>
                ) : null;
              })()}
            </div>

            {/* Structured Intake Data - Clean Layout */}
            {intakeData && (
              <>
                <Separator className="bg-border/50" />
                
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      Startup Submission
                    </h3>
                    {intakeData.submitted && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(intakeData.submitted), 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                  </div>

                  {/* Pitch Deck - Prominent Card */}
                  {(deckUrl || deal.deck_url) && (
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/40">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-foreground">Pitch Deck</h4>
                              <p className="text-xs text-muted-foreground">Submitted by founder</p>
                            </div>
                          </div>
                          {loadingDeck ? (
                            <Button variant="outline" size="sm" disabled>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </Button>
                          ) : deckUrl ? (
                            <Button variant="default" size="sm" asChild>
                              <a href={deckUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Pitch Deck
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <FileText className="h-4 w-4 mr-2" />
                              Unavailable
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* One-Liner & Description */}
                  {intakeData.oneSentence && (
                    <Card className="bg-primary/5 border-primary/30">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          One-Liner
                        </h4>
                        <p className="text-base text-foreground font-medium">{intakeData.oneSentence}</p>
                      </CardContent>
                    </Card>
                  )}

                  {intakeData.companyDescription && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Company Description
                        </h4>
                        <p className="text-sm text-card-foreground whitespace-pre-wrap">{intakeData.companyDescription}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Insight */}
                  {intakeData.keyInsight && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-amber-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Key Insight (Why Now?)
                        </h4>
                        <p className="text-sm text-card-foreground">{intakeData.keyInsight}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Target & Traction Row */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {intakeData.targetCustomer && (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Target Customer
                          </h4>
                          <p className="text-sm text-card-foreground font-medium">{intakeData.targetCustomer}</p>
                        </CardContent>
                      </Card>
                    )}
                    {intakeData.revenue && (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Current Revenue
                          </h4>
                          <p className="text-sm text-card-foreground font-medium">{intakeData.revenue}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Traction Highlights */}
                  {intakeData.tractionHighlights && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Traction Highlights
                        </h4>
                        <p className="text-sm text-card-foreground">{intakeData.tractionHighlights}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Team Section */}
                  {intakeData.team && (() => {
                    const team = parseTeamDetails(intakeData.team);
                    return (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Team
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            {team.structure && (
                              <div>
                                <p className="text-xs text-muted-foreground">Structure</p>
                                <p className="text-sm text-card-foreground font-medium">{team.structure}</p>
                              </div>
                            )}
                            {team.size && (
                              <div>
                                <p className="text-xs text-muted-foreground">Team Size</p>
                                <p className="text-sm text-card-foreground font-medium">{team.size}</p>
                              </div>
                            )}
                            {team.roles && (
                              <div className="col-span-3 md:col-span-1">
                                <p className="text-xs text-muted-foreground">Key Roles</p>
                                <p className="text-sm text-card-foreground">{team.roles}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Funding Section */}
                  {intakeData.funding && (() => {
                    const funding = parseFundingDetails(intakeData.funding);
                    return (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Funding
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            {funding.isRaising && (
                              <div>
                                <p className="text-xs text-muted-foreground">Currently Raising</p>
                                <p className="text-sm text-card-foreground font-medium">{funding.isRaising}</p>
                              </div>
                            )}
                            {funding.round && funding.round !== 'N/A' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Round</p>
                                <p className="text-sm text-card-foreground font-medium">{funding.round}</p>
                              </div>
                            )}
                            {funding.targetRaise && funding.targetRaise !== 'N/A' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Target Raise</p>
                                <p className="text-sm text-card-foreground font-medium">{funding.targetRaise}</p>
                              </div>
                            )}
                            {funding.existingInvestors && funding.existingInvestors !== 'N/A' && funding.existingInvestors !== 'None' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Existing Investors</p>
                                <p className="text-sm text-card-foreground">{funding.existingInvestors}</p>
                              </div>
                            )}
                            {funding.lookingFor && funding.lookingFor !== 'N/A' && (
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">Looking For</p>
                                <p className="text-sm text-card-foreground">{funding.lookingFor}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Goals & Saudi Alignment */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {intakeData.nextGoals && (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Goals (3-6 Months)
                          </h4>
                          <p className="text-sm text-card-foreground">{intakeData.nextGoals}</p>
                        </CardContent>
                      </Card>
                    )}
                    {intakeData.saudiArabia && (
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Saudi Arabia
                          </h4>
                          <p className="text-sm text-card-foreground">{intakeData.saudiArabia}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Company Details */}
                  {intakeData.companyDetails && (() => {
                    const details = parseCompanyDetails(intakeData.companyDetails);
                    return (
                      <Card className="bg-muted/30 border-border/50">
                        <CardContent className="p-4">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Company Details
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {details.headquarters && details.headquarters !== 'N/A' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Headquarters</p>
                                <p className="text-sm text-card-foreground font-medium">{details.headquarters}</p>
                              </div>
                            )}
                            {details.yearFounded && details.yearFounded !== 'N/A' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Founded</p>
                                <p className="text-sm text-card-foreground font-medium">{details.yearFounded}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Additional Notes */}
                  {intakeData.additionalNotes && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Additional Notes from Founder
                        </h4>
                        <p className="text-sm text-card-foreground whitespace-pre-wrap">{intakeData.additionalNotes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            {/* Exit Potential & Failure Modes */}
            {(deal.exit_potential || deal.failure_modes) && (
              <>
                <Separator className="bg-border/50" />
                <div className="grid md:grid-cols-2 gap-4">
                  {deal.exit_potential && (
                    <Card className="bg-success/10 border-success/30">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-success uppercase tracking-wide mb-2">Exit Potential</h4>
                        <p className="text-sm text-card-foreground">{deal.exit_potential}</p>
                      </CardContent>
                    </Card>
                  )}
                  {deal.failure_modes && (
                    <Card className="bg-destructive/10 border-destructive/30">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">Failure Modes</h4>
                        <p className="text-sm text-card-foreground">{deal.failure_modes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            {/* AI Analysis */}
            {deal.ai_analysis && (
              <>
                <Separator className="bg-border/50" />
                <div>
                  <h3 className="font-semibold text-foreground mb-3">AI Analysis</h3>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-card-foreground whitespace-pre-wrap">{deal.ai_analysis}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            <Separator className="bg-border/50" />

            {/* Analysis Notes with Date Log */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />Your Analysis Notes
              </h3>
              
              {/* Add New Note */}
              <div className="space-y-2 mb-4">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new analysis note..."
                  rows={3}
                  className="resize-none bg-muted/30 text-foreground placeholder:text-muted-foreground"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNote} 
                  disabled={saving || !newNote.trim()}
                  className="w-full sm:w-auto"
                >
                  {saving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />}
                  Add Note
                </Button>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-3">
                {analysisNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">
                    No analysis notes yet. Add your first note above.
                  </p>
                ) : (
                  analysisNotes.map((note, index) => (
                    <Card key={index} className="bg-muted/20 border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(note.date), 'MMMM d, yyyy')}
                          </div>
                          {editingNoteIndex !== index && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditNote(index)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteNote(index)}
                                disabled={saving}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {editingNoteIndex === index ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              rows={3}
                              className="resize-none bg-background text-foreground"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveEditedNote}
                                disabled={saving || !editingNoteContent.trim()}
                              >
                                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-card-foreground whitespace-pre-wrap">{note.content}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
