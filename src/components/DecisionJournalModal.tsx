import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { BookOpen, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface DecisionJournalModalProps {
  dealId: string;
  dealName: string;
  onSaved?: () => void;
}

type Decision = 'pass' | 'invest' | 'monitor' | 'follow_up';

export function DecisionJournalModal({ dealId, dealName, onSaved }: DecisionJournalModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    decision: 'monitor' as Decision,
    reasoning: '',
    confidence_level: 5,
    market_conditions: '',
    follow_up_date: '',
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('decision_journal').insert({
      user_id: user.id,
      deal_id: dealId,
      decision: formData.decision,
      reasoning: formData.reasoning || null,
      confidence_level: formData.confidence_level,
      market_conditions: formData.market_conditions || null,
      follow_up_date: formData.follow_up_date || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // If decision is 'pass', update the deal with pass_reason and pass_date
      if (formData.decision === 'pass') {
        await supabase.from('deals').update({
          pass_reason: formData.reasoning,
          pass_date: new Date().toISOString(),
          stage: 'passed',
        }).eq('id', dealId);
      }

      toast({ title: 'Decision recorded' });
      logActivity({
        type: 'deal_updated',
        title: `Recorded decision for ${dealName}: ${formData.decision.toUpperCase()}`,
        entityType: 'deal',
        entityId: dealId,
      });
      setOpen(false);
      setFormData({ decision: 'monitor', reasoning: '', confidence_level: 5, market_conditions: '', follow_up_date: '' });
      onSaved?.();
    }
    setSaving(false);
  };

  const decisions: { key: Decision; label: string; description: string }[] = [
    { key: 'pass', label: 'Pass', description: 'Not proceeding with this opportunity' },
    { key: 'invest', label: 'Invest', description: 'Committing to this opportunity' },
    { key: 'monitor', label: 'Monitor', description: 'Watching for changes or triggers' },
    { key: 'follow_up', label: 'Follow Up', description: 'Need more information' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-4 w-4 mr-2" />
          Log Decision
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Decision Journal — {dealName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Decision *</Label>
            <Select value={formData.decision} onValueChange={v => setFormData({ ...formData, decision: v as Decision })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {decisions.map(d => (
                  <SelectItem key={d.key} value={d.key}>
                    <div className="flex flex-col">
                      <span>{d.label}</span>
                      <span className="text-xs text-muted-foreground">{d.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reasoning / Notes</Label>
            <Textarea
              value={formData.reasoning}
              onChange={e => setFormData({ ...formData, reasoning: e.target.value })}
              placeholder="Why are you making this decision? What would need to change your mind?"
              rows={3}
            />
          </div>

          <div>
            <Label>Confidence Level: {formData.confidence_level}/10</Label>
            <Slider
              value={[formData.confidence_level]}
              onValueChange={v => setFormData({ ...formData, confidence_level: v[0] })}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <Label>Market Conditions</Label>
            <Textarea
              value={formData.market_conditions}
              onChange={e => setFormData({ ...formData, market_conditions: e.target.value })}
              placeholder="Current market context that influenced this decision..."
              rows={2}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Follow-up Date (optional)
            </Label>
            <Input
              type="date"
              value={formData.follow_up_date}
              onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Record Decision'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
