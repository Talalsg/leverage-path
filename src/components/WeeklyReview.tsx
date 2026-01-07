import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { Calendar, CheckCircle, XCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface WeeklyReviewData {
  id?: string;
  week_start_date: string;
  failure_condition_met: boolean;
  goal_progress_notes: string;
  reflections: string;
  wins: string;
  losses: string;
  next_week_priorities: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyReview({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pastReviews, setPastReviews] = useState<WeeklyReviewData[]>([]);
  const [showPast, setShowPast] = useState(false);
  
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  
  const [formData, setFormData] = useState<WeeklyReviewData>({
    week_start_date: weekStart,
    failure_condition_met: false,
    goal_progress_notes: '',
    reflections: '',
    wins: '',
    losses: '',
    next_week_priorities: '',
  });

  useEffect(() => {
    if (open && user) {
      fetchCurrentWeekReview();
      fetchPastReviews();
    }
  }, [open, user]);

  const fetchCurrentWeekReview = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .single();
    
    if (data) {
      setFormData({
        id: data.id,
        week_start_date: data.week_start_date,
        failure_condition_met: data.failure_condition_met || false,
        goal_progress_notes: data.goal_progress_notes || '',
        reflections: data.reflections || '',
        wins: data.wins || '',
        losses: data.losses || '',
        next_week_priorities: data.next_week_priorities || '',
      });
    } else {
      setFormData({
        week_start_date: weekStart,
        failure_condition_met: false,
        goal_progress_notes: '',
        reflections: '',
        wins: '',
        losses: '',
        next_week_priorities: '',
      });
    }
  };

  const fetchPastReviews = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .neq('week_start_date', weekStart)
      .order('week_start_date', { ascending: false })
      .limit(10);
    
    setPastReviews((data as WeeklyReviewData[]) || []);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
    const payload = {
      user_id: user.id,
      week_start_date: formData.week_start_date,
      failure_condition_met: formData.failure_condition_met,
      goal_progress_notes: formData.goal_progress_notes,
      reflections: formData.reflections,
      wins: formData.wins,
      losses: formData.losses,
      next_week_priorities: formData.next_week_priorities,
    };

    let error;
    if (formData.id) {
      ({ error } = await supabase.from('weekly_reviews').update(payload).eq('id', formData.id));
    } else {
      ({ error } = await supabase.from('weekly_reviews').insert(payload));
    }

    setLoading(false);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Weekly review saved' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Review — Week of {format(new Date(weekStart), 'MMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Failure Condition Check */}
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="failure-condition"
                  checked={formData.failure_condition_met}
                  onCheckedChange={(checked) => setFormData({ ...formData, failure_condition_met: !!checked })}
                />
                <div>
                  <Label htmlFor="failure-condition" className="font-semibold cursor-pointer">
                    Did someone come to me for access, deals, or advice this week?
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    If unchecked, you're on the failure path — busy but not positioned.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Progress */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Goal Progress Notes
            </Label>
            <Textarea
              value={formData.goal_progress_notes}
              onChange={(e) => setFormData({ ...formData, goal_progress_notes: e.target.value })}
              placeholder="How did you progress on quarterly goals?"
              rows={3}
            />
          </div>

          {/* Wins & Losses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Wins
              </Label>
              <Textarea
                value={formData.wins}
                onChange={(e) => setFormData({ ...formData, wins: e.target.value })}
                placeholder="What went well?"
                rows={3}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Losses / Learnings
              </Label>
              <Textarea
                value={formData.losses}
                onChange={(e) => setFormData({ ...formData, losses: e.target.value })}
                placeholder="What didn't work? What did you learn?"
                rows={3}
              />
            </div>
          </div>

          {/* Reflections */}
          <div>
            <Label className="mb-2 block">Reflections</Label>
            <Textarea
              value={formData.reflections}
              onChange={(e) => setFormData({ ...formData, reflections: e.target.value })}
              placeholder="Deeper thoughts, patterns noticed, mental state..."
              rows={3}
            />
          </div>

          {/* Next Week */}
          <div>
            <Label className="mb-2 block">Next Week Priorities</Label>
            <Textarea
              value={formData.next_week_priorities}
              onChange={(e) => setFormData({ ...formData, next_week_priorities: e.target.value })}
              placeholder="Top 3 priorities for next week..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Weekly Review'}
          </Button>

          {/* Past Reviews */}
          {pastReviews.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPast(!showPast)}
                className="w-full"
              >
                {showPast ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                Past Reviews ({pastReviews.length})
              </Button>
              
              {showPast && (
                <div className="space-y-2 mt-2">
                  {pastReviews.map((review) => (
                    <Card key={review.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            Week of {format(new Date(review.week_start_date), 'MMM d, yyyy')}
                          </span>
                          <Badge variant={review.failure_condition_met ? 'default' : 'destructive'}>
                            {review.failure_condition_met ? 'On Track' : 'Warning'}
                          </Badge>
                        </div>
                        {review.wins && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Wins: {review.wins}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
