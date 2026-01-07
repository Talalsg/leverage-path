-- Add outcome tracking and AI analysis fields to deals
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win', 'miss', 'regret', 'noise', 'pending')),
ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
ADD COLUMN IF NOT EXISTS ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
ADD COLUMN IF NOT EXISTS ai_memo TEXT,
ADD COLUMN IF NOT EXISTS founder_linkedin_data JSONB,
ADD COLUMN IF NOT EXISTS crunchbase_data JSONB,
ADD COLUMN IF NOT EXISTS backtest_result JSONB;

-- Create deal patterns table for ML training data
CREATE TABLE public.deal_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  positive_signals TEXT[],
  negative_signals TEXT[],
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own patterns" ON public.deal_patterns FOR ALL USING (auth.uid() = user_id);

-- Create AI evaluations history
CREATE TABLE public.ai_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('score', 'memo', 'backtest', 'pattern_match')),
  input_data JSONB,
  output_data JSONB,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own evaluations" ON public.ai_evaluations FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_deal_patterns_updated_at BEFORE UPDATE ON public.deal_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();