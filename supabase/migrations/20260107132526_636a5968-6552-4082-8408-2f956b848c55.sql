-- Create weekly_reviews table for weekly reflection system
CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  failure_condition_met BOOLEAN DEFAULT false,
  goal_progress_notes TEXT,
  reflections TEXT,
  wins TEXT,
  losses TEXT,
  next_week_priorities TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD own reviews"
ON public.weekly_reviews
FOR ALL
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_weekly_reviews_updated_at
BEFORE UPDATE ON public.weekly_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint for one review per week per user
ALTER TABLE public.weekly_reviews 
ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date);