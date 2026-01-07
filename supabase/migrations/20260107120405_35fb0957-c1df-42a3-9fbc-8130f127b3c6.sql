-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Contacts/Relationships table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  tier TEXT NOT NULL DEFAULT 'connector' CHECK (tier IN ('gatekeeper', 'capital_allocator', 'founder', 'advisor', 'connector')),
  trust_level INTEGER DEFAULT 3 CHECK (trust_level >= 1 AND trust_level <= 5),
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  notes TEXT,
  last_touchpoint TIMESTAMP WITH TIME ZONE,
  is_key_ten BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- Touchpoints table for tracking interactions
CREATE TABLE public.touchpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('meeting', 'call', 'email', 'introduction', 'event', 'other')),
  summary TEXT,
  outcome TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own touchpoints" ON public.touchpoints FOR ALL USING (auth.uid() = user_id);

-- Deals table for startup evaluations
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT,
  stage TEXT DEFAULT 'review' CHECK (stage IN ('review', 'evaluating', 'passed', 'term_sheet', 'closed', 'rejected')),
  valuation_usd BIGINT,
  equity_offered DECIMAL(5,2),
  founder_name TEXT,
  founder_linkedin TEXT,
  deck_url TEXT,
  vision_2030_alignment INTEGER CHECK (vision_2030_alignment >= 1 AND vision_2030_alignment <= 5),
  founder_execution_score INTEGER CHECK (founder_execution_score >= 1 AND founder_execution_score <= 5),
  founder_sales_ability INTEGER CHECK (founder_sales_ability >= 1 AND founder_sales_ability <= 5),
  iteration_speed INTEGER CHECK (iteration_speed >= 1 AND iteration_speed <= 5),
  failure_modes TEXT,
  exit_potential TEXT,
  decision_reason TEXT,
  overall_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own deals" ON public.deals FOR ALL USING (auth.uid() = user_id);

-- Portfolio positions table
CREATE TABLE public.portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  sector TEXT,
  entry_valuation_usd BIGINT,
  current_valuation_usd BIGINT,
  equity_percent DECIMAL(5,3),
  entry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exited', 'written_off')),
  exit_valuation_usd BIGINT,
  exit_date DATE,
  return_multiple DECIMAL(8,2),
  is_top_position BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own portfolio" ON public.portfolio FOR ALL USING (auth.uid() = user_id);

-- Content/Insights table
CREATE TABLE public.insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'published')),
  platform TEXT,
  publish_date DATE,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  inbound_inquiries INTEGER DEFAULT 0,
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own insights" ON public.insights FOR ALL USING (auth.uid() = user_id);

-- Activity log table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own activities" ON public.activities FOR ALL USING (auth.uid() = user_id);

-- Goals tracking table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4),
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON public.portfolio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();