import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Pencil, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  ai_score?: number | null;
  ai_analysis?: string | null;
  ai_memo?: string | null;
  created_at: string;
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
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (deal) {
      // Extract existing analysis notes if present, or set empty
      const notes = deal.notes || '';
      // Check if there's already an "## Analysis Notes" section
      const analysisMatch = notes.match(/## Analysis Notes\n([\s\S]*?)(?=\n## |$)/);
      if (analysisMatch) {
        setAnalysisNotes(analysisMatch[1].trim());
      } else {
        setAnalysisNotes('');
      }
    }
  }, [deal]);

  const handleSaveAnalysis = async () => {
    if (!deal) return;
    setSaving(true);

    try {
      const existingNotes = deal.notes || '';
      let updatedNotes: string;
      
      // Check if analysis notes section already exists
      if (existingNotes.includes('## Analysis Notes')) {
        // Replace existing analysis notes
        updatedNotes = existingNotes.replace(
          /## Analysis Notes\n[\s\S]*?(?=\n## |$)/,
          `## Analysis Notes\n${analysisNotes}\n`
        );
      } else {
        // Append analysis notes section
        updatedNotes = existingNotes + (existingNotes ? '\n\n' : '') + `## Analysis Notes\n${analysisNotes}`;
      }

      const { error } = await supabase
        .from('deals')
        .update({ notes: updatedNotes })
        .eq('id', deal.id);

      if (error) throw error;

      toast({ title: 'Analysis saved', description: 'Your analysis notes have been saved.' });
      setIsEditing(false);
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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

  // Extract the intake submission content (everything except analysis notes)
  const getIntakeContent = () => {
    if (!deal?.notes) return null;
    const notes = deal.notes;
    // Remove the Analysis Notes section if it exists
    const withoutAnalysis = notes.replace(/## Analysis Notes\n[\s\S]*?(?=\n## |$)/, '').trim();
    return withoutAnalysis;
  };

  if (!deal) return null;

  const intakeContent = getIntakeContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{deal.company_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
                {deal.sector && <span className="text-muted-foreground">• {deal.sector}</span>}
                {deal.ai_score && (
                  <Badge variant="outline" className="ml-2">AI Score: {deal.ai_score}</Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {deal.founder_name && (
                <div>
                  <span className="text-muted-foreground">Founder:</span>
                  <span className="ml-2 font-medium">{deal.founder_name}</span>
                </div>
              )}
              {deal.valuation_usd && (
                <div>
                  <span className="text-muted-foreground">Valuation:</span>
                  <span className="ml-2 font-medium">${(deal.valuation_usd / 1000000).toFixed(1)}M</span>
                </div>
              )}
              {deal.vision_2030_alignment && (
                <div>
                  <span className="text-muted-foreground">Vision 2030:</span>
                  <span className="ml-2 font-medium">{deal.vision_2030_alignment}/5</span>
                </div>
              )}
              {deal.equity_offered && (
                <div>
                  <span className="text-muted-foreground">Equity:</span>
                  <span className="ml-2 font-medium">{deal.equity_offered}%</span>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="flex gap-3 flex-wrap">
              {deal.founder_linkedin && (
                <Button variant="outline" size="sm" asChild>
                  <a href={deal.founder_linkedin} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-2" />LinkedIn
                  </a>
                </Button>
              )}
              {deal.deck_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={deal.deck_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-2" />Pitch Deck
                  </a>
                </Button>
              )}
            </div>

            {/* Intake Submission Details */}
            {intakeContent && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Intake Submission</h3>
                  <div className="prose prose-sm prose-invert max-w-none bg-muted/30 rounded-lg p-4">
                    <ReactMarkdown>{intakeContent}</ReactMarkdown>
                  </div>
                </div>
              </>
            )}

            {/* AI Analysis if available */}
            {deal.ai_analysis && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">AI Analysis</h3>
                  <div className="prose prose-sm prose-invert max-w-none bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <ReactMarkdown>{deal.ai_analysis}</ReactMarkdown>
                  </div>
                </div>
              </>
            )}

            {/* Analysis Notes - Editable */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="font-semibold text-base">Your Analysis Notes</Label>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3 w-3 mr-2" />Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-3 w-3 mr-2" />Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAnalysis} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <Textarea
                  value={analysisNotes}
                  onChange={(e) => setAnalysisNotes(e.target.value)}
                  placeholder="Add your analysis notes here... What are the strengths? Weaknesses? Questions to ask the founder?"
                  rows={6}
                  className="resize-none"
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 min-h-[100px]">
                  {analysisNotes ? (
                    <p className="text-sm whitespace-pre-wrap">{analysisNotes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No analysis notes yet. Click Edit to add your thoughts.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
