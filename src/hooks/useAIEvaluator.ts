import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface Deal {
  id: string;
  company_name: string;
  sector: string | null;
  valuation_usd: number | null;
  equity_offered: number | null;
  founder_name: string | null;
  stage: string;
  notes: string | null;
  ai_score: number | null;
  outcome: string | null;
  created_at: string;
}

interface ScoreResult {
  overall_score: number;
  vision_2030_alignment: number;
  founder_execution_score: number;
  founder_sales_ability: number;
  iteration_speed: number;
  failure_modes: string[];
  exit_potential: string;
  pattern_matches: string[];
  recommendation: string;
  reasoning: string;
}

interface BacktestResult {
  scenario_analysis: {
    bear_case: { exit_valuation: number; roi: number; probability: number };
    base_case: { exit_valuation: number; roi: number; probability: number };
    bull_case: { exit_valuation: number; roi: number; probability: number };
  };
  expected_value: number;
  lessons_learned: string[];
  filter_update: string;
}

export function useAIEvaluator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistoricalDeals = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .not('outcome', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  };

  const fetchUserPatterns = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('deal_patterns')
      .select('*')
      .eq('user_id', user.id);
    return data || [];
  };

  const scoreDeal = async (deal: Deal): Promise<ScoreResult | null> => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const [historicalDeals, userPatterns] = await Promise.all([
        fetchHistoricalDeals(),
        fetchUserPatterns(),
      ]);

      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: { action: 'score', deal, historicalDeals, userPatterns },
      });

      if (error) throw error;

      const result = data.result as ScoreResult;

      // Safely handle AI response with fallbacks
      const failureModes = Array.isArray(result?.failure_modes) 
        ? result.failure_modes.join('\n') 
        : (result?.failure_modes || '');

      // Update the deal with AI scores
      await supabase.from('deals').update({
        ai_score: result?.overall_score ?? null,
        vision_2030_alignment: result?.vision_2030_alignment ?? null,
        founder_execution_score: result?.founder_execution_score ?? null,
        founder_sales_ability: result?.founder_sales_ability ?? null,
        iteration_speed: result?.iteration_speed ?? null,
        failure_modes: failureModes,
        exit_potential: result?.exit_potential ?? null,
        ai_analysis: result?.reasoning ?? null,
      }).eq('id', deal.id);

      // Log the evaluation
      await supabase.from('ai_evaluations').insert([{
        user_id: user.id,
        deal_id: deal.id,
        evaluation_type: 'score',
        input_data: JSON.parse(JSON.stringify(deal)) as Json,
        output_data: JSON.parse(JSON.stringify(result)) as Json,
        model_used: 'gemini-2.5-flash',
      }]);

      toast({ title: 'AI Score Complete', description: `Score: ${result?.overall_score ?? 'N/A'}/100 - ${result?.recommendation ?? 'See details'}` });
      return result;
    } catch (error: any) {
      console.error('Score error:', error);
      toast({ title: 'Scoring failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateMemo = async (deal: Deal): Promise<string | null> => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: { action: 'memo', deal },
      });

      if (error) throw error;

      const memo = data.result as string;

      // Update the deal with the memo
      await supabase.from('deals').update({ ai_memo: memo }).eq('id', deal.id);

      // Log the evaluation
      await supabase.from('ai_evaluations').insert([{
        user_id: user.id,
        deal_id: deal.id,
        evaluation_type: 'memo',
        input_data: JSON.parse(JSON.stringify(deal)) as Json,
        output_data: { memo } as Json,
        model_used: 'gemini-2.5-flash',
      }]);

      toast({ title: 'Memo Generated', description: 'Investment memo is ready' });
      return memo;
    } catch (error: any) {
      console.error('Memo error:', error);
      toast({ title: 'Memo generation failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const runBacktest = async (deal: Deal): Promise<BacktestResult | null> => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: { action: 'backtest', deal },
      });

      if (error) throw error;

      const result = data.result as BacktestResult;

      // Update the deal with backtest results
      await supabase.from('deals').update({ 
        backtest_result: JSON.parse(JSON.stringify(result)) as Json
      }).eq('id', deal.id);

      // Log the evaluation
      await supabase.from('ai_evaluations').insert([{
        user_id: user.id,
        deal_id: deal.id,
        evaluation_type: 'backtest',
        input_data: JSON.parse(JSON.stringify(deal)) as Json,
        output_data: JSON.parse(JSON.stringify(result)) as Json,
        model_used: 'gemini-2.5-flash',
      }]);

      toast({ title: 'Backtest Complete', description: `Expected value: $${result.expected_value?.toLocaleString()}` });
      return result;
    } catch (error: any) {
      console.error('Backtest error:', error);
      toast({ title: 'Backtest failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const chat = async (message: string): Promise<string | null> => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const historicalDeals = await fetchHistoricalDeals();

      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: { action: 'chat', deal: { message }, historicalDeals },
      });

      if (error) throw error;

      return data.result as string;
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({ title: 'Chat failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { scoreDeal, generateMemo, runBacktest, chat, isLoading };
}
