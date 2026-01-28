-- Phase 1: Relationship Intelligence - Add warmth scoring fields to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS warmth_score decimal DEFAULT 5.0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS relationship_context text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS access_paths jsonb;

-- Phase 2: Institutional Memory - Add pass tracking fields to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pass_reason text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pass_date timestamp with time zone;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS objections_at_pass jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS stage_history jsonb DEFAULT '[]'::jsonb;

-- Phase 5: Portfolio Health Monitor - Add health tracking fields
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS monthly_revenue numeric;
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS burn_rate numeric;
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS runway_months integer;
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'healthy';
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS last_metrics_update timestamp with time zone;

-- Phase 2: Create decision journal table for institutional memory
CREATE TABLE public.decision_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('pass', 'invest', 'monitor', 'follow_up')),
  reasoning text,
  confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 10),
  market_conditions text,
  follow_up_date date,
  follow_up_outcome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on decision_journal
ALTER TABLE public.decision_journal ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for decision_journal
CREATE POLICY "Users can CRUD own journal entries"
ON public.decision_journal
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on decision_journal
CREATE TRIGGER update_decision_journal_updated_at
BEFORE UPDATE ON public.decision_journal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-update stage_history when deal stage changes
CREATE OR REPLACE FUNCTION public.track_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_history = COALESCE(OLD.stage_history, '[]'::jsonb) || 
      jsonb_build_object('stage', NEW.stage, 'entered_at', now(), 'previous_stage', OLD.stage);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for stage history tracking
CREATE TRIGGER track_deal_stage_history
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.track_deal_stage_change();

-- Create function to calculate warmth score based on touchpoints
CREATE OR REPLACE FUNCTION public.calculate_contact_warmth(contact_uuid uuid)
RETURNS decimal AS $$
DECLARE
  recency_score decimal;
  frequency_score decimal;
  context_score decimal;
  days_since_last integer;
  touchpoint_count integer;
  meeting_count integer;
  total_score decimal;
BEGIN
  -- Get days since last touchpoint
  SELECT EXTRACT(DAY FROM (now() - MAX(date)))::integer
  INTO days_since_last
  FROM public.touchpoints
  WHERE contact_id = contact_uuid;
  
  -- Recency score (decay curve: 10 if today, 1 if 90+ days)
  IF days_since_last IS NULL THEN
    recency_score := 1.0;
  ELSIF days_since_last <= 7 THEN
    recency_score := 10.0;
  ELSIF days_since_last <= 14 THEN
    recency_score := 8.0;
  ELSIF days_since_last <= 30 THEN
    recency_score := 6.0;
  ELSIF days_since_last <= 60 THEN
    recency_score := 4.0;
  ELSIF days_since_last <= 90 THEN
    recency_score := 2.0;
  ELSE
    recency_score := 1.0;
  END IF;
  
  -- Frequency score (touchpoints in last 90 days)
  SELECT COUNT(*)
  INTO touchpoint_count
  FROM public.touchpoints
  WHERE contact_id = contact_uuid
    AND date > (now() - interval '90 days');
  
  frequency_score := LEAST(touchpoint_count * 2.0, 10.0);
  
  -- Context score (meetings weighted higher)
  SELECT COUNT(*)
  INTO meeting_count
  FROM public.touchpoints
  WHERE contact_id = contact_uuid
    AND type IN ('meeting', 'call', 'coffee')
    AND date > (now() - interval '90 days');
  
  context_score := LEAST(meeting_count * 3.0 + (touchpoint_count - meeting_count) * 1.0, 10.0);
  
  -- Weighted average: Recency 40%, Frequency 30%, Context 30%
  total_score := (recency_score * 0.4) + (frequency_score * 0.3) + (context_score * 0.3);
  
  RETURN ROUND(total_score, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;