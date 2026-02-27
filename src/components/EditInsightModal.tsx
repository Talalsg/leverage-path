import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'idea' | 'draft' | 'published';

interface Insight {
  id: string;
  title: string;
  content: string | null;
  status: Status;
  platform: string | null;
  scheduled_date: string | null;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  inbound_inquiries: number;
}

interface EditInsightModalProps {
  insight: Insight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const platforms = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'medium', label: 'Medium' },
  { key: 'substack', label: 'Substack' },
  { key: 'blog', label: 'Personal Blog' },
  { key: 'other', label: 'Other' },
];

export function EditInsightModal({ insight, open, onOpenChange, onSaved }: EditInsightModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'idea' as Status,
    platform: '',
    scheduled_date: null as Date | null,
    engagement_likes: '',
    engagement_comments: '',
    engagement_shares: '',
    inbound_inquiries: '',
  });

  useEffect(() => {
    if (insight) {
      setFormData({
        title: insight.title || '',
        content: insight.content || '',
        status: insight.status || 'idea',
        platform: insight.platform || '',
        scheduled_date: insight.scheduled_date ? parseISO(insight.scheduled_date) : null,
        engagement_likes: insight.engagement_likes?.toString() || '0',
        engagement_comments: insight.engagement_comments?.toString() || '0',
        engagement_shares: insight.engagement_shares?.toString() || '0',
        inbound_inquiries: insight.inbound_inquiries?.toString() || '0',
      });
    }
  }, [insight]);

  const handleSave = async () => {
    if (!insight || !formData.title) return;
    setSaving(true);

    try {
      const updates: any = {
        title: formData.title,
        content: formData.content || null,
        status: formData.status,
        platform: formData.platform || null,
        scheduled_date: formData.scheduled_date ? format(formData.scheduled_date, 'yyyy-MM-dd') : null,
        engagement_likes: parseInt(formData.engagement_likes) || 0,
        engagement_comments: parseInt(formData.engagement_comments) || 0,
        engagement_shares: parseInt(formData.engagement_shares) || 0,
        inbound_inquiries: parseInt(formData.inbound_inquiries) || 0,
      };

      // Set publish_date if status changed to published
      if (formData.status === 'published' && insight.status !== 'published') {
        updates.publish_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('insights')
        .update(updates)
        .eq('id', insight.id);

      if (error) throw error;

      toast({ title: 'Insight updated', description: `"${formData.title}" has been updated.` });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Insight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as Status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(v) => setFormData({ ...formData, platform: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Schedule Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.scheduled_date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.scheduled_date ? format(formData.scheduled_date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.scheduled_date || undefined}
                  onSelect={(d) => setFormData({ ...formData, scheduled_date: d || null })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {formData.status === 'published' && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Engagement Metrics</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Likes</Label>
                  <Input
                    type="number"
                    value={formData.engagement_likes}
                    onChange={(e) => setFormData({ ...formData, engagement_likes: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Comments</Label>
                  <Input
                    type="number"
                    value={formData.engagement_comments}
                    onChange={(e) => setFormData({ ...formData, engagement_comments: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Shares</Label>
                  <Input
                    type="number"
                    value={formData.engagement_shares}
                    onChange={(e) => setFormData({ ...formData, engagement_shares: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Inbound</Label>
                  <Input
                    type="number"
                    value={formData.inbound_inquiries}
                    onChange={(e) => setFormData({ ...formData, inbound_inquiries: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
