import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Tier = 'gatekeeper' | 'capital_allocator' | 'founder' | 'advisor' | 'connector';

interface Contact {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  tier: Tier;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  is_key_ten: boolean;
  relationship_context: string | null;
}

interface EditContactModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const tiers = [
  { key: 'gatekeeper', label: 'Gatekeeper' },
  { key: 'capital_allocator', label: 'Capital Allocator' },
  { key: 'founder', label: 'Founder' },
  { key: 'advisor', label: 'Advisor' },
  { key: 'connector', label: 'Connector' },
];

export function EditContactModal({ contact, open, onOpenChange, onSaved }: EditContactModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    role: '',
    tier: 'connector' as Tier,
    email: '',
    phone: '',
    linkedin: '',
    notes: '',
    is_key_ten: false,
    relationship_context: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        organization: contact.organization || '',
        role: contact.role || '',
        tier: contact.tier || 'connector',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedin: contact.linkedin || '',
        notes: contact.notes || '',
        is_key_ten: contact.is_key_ten || false,
        relationship_context: contact.relationship_context || '',
      });
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact || !formData.name) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: formData.name,
          organization: formData.organization || null,
          role: formData.role || null,
          tier: formData.tier,
          email: formData.email || null,
          phone: formData.phone || null,
          linkedin: formData.linkedin || null,
          notes: formData.notes || null,
          is_key_ten: formData.is_key_ten,
          relationship_context: formData.relationship_context || null,
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({ title: 'Contact updated', description: `${formData.name} has been updated.` });
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Organization</Label>
              <Input
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Tier</Label>
            <Select
              value={formData.tier}
              onValueChange={(v) => setFormData({ ...formData, tier: v as Tier })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <Label>Relationship Context</Label>
            <Textarea
              value={formData.relationship_context}
              onChange={(e) => setFormData({ ...formData, relationship_context: e.target.value })}
              placeholder="How did you meet? What's the relationship history?"
              rows={2}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_key_ten"
              checked={formData.is_key_ten}
              onCheckedChange={(checked) => setFormData({ ...formData, is_key_ten: !!checked })}
            />
            <Label htmlFor="is_key_ten" className="cursor-pointer">Add to Key 10 Focus List</Label>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
