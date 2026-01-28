import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Mail, Handshake, Calendar } from 'lucide-react';

interface TouchpointLoggerProps {
  contactId: string;
  contactName: string;
  onLogged?: () => void;
}

const touchpointTypes = [
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'intro', label: 'Introduction', icon: Handshake },
  { value: 'message', label: 'Message', icon: MessageSquare },
];

export function TouchpointLogger({ contactId, contactName, onLogged }: TouchpointLoggerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'meeting',
    summary: '',
    outcome: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('touchpoints').insert({
      user_id: user.id,
      contact_id: contactId,
      type: formData.type,
      summary: formData.summary || null,
      outcome: formData.outcome || null,
      date: formData.date,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update last_touchpoint on contact
      await supabase.from('contacts').update({ last_touchpoint: formData.date }).eq('id', contactId);
      toast({ title: 'Touchpoint logged' });
      setOpen(false);
      setFormData({ type: 'meeting', summary: '', outcome: '', date: new Date().toISOString().split('T')[0] });
      onLogged?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Log Touchpoint</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Touchpoint with {contactName}</DialogTitle>
          <DialogDescription>Record an interaction to track relationship warmth.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {touchpointTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({ ...formData, date: e.target.value })} 
            />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea 
              placeholder="What was discussed..." 
              value={formData.summary} 
              onChange={e => setFormData({ ...formData, summary: e.target.value })} 
            />
          </div>
          <div>
            <Label>Outcome / Next Steps</Label>
            <Input 
              placeholder="Follow-up action..." 
              value={formData.outcome} 
              onChange={e => setFormData({ ...formData, outcome: e.target.value })} 
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Logging...' : 'Log Touchpoint'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Utility to calculate decay status
export function getDecayStatus(lastTouchpoint: string | null): { color: string; label: string; days: number } {
  if (!lastTouchpoint) return { color: 'text-muted-foreground', label: 'No contact', days: -1 };
  
  const days = Math.floor((Date.now() - new Date(lastTouchpoint).getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 14) return { color: 'text-accent', label: `${days}d ago`, days };
  if (days <= 30) return { color: 'text-warning', label: `${days}d ago`, days };
  return { color: 'text-destructive', label: `${days}d ago`, days };
}
