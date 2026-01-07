import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ActivityType = 'deal_created' | 'deal_updated' | 'ai_evaluation' | 'contact_added' | 'touchpoint_logged' | 'insight_published' | 'portfolio_added' | 'pattern_created';

interface LogActivityParams {
  type: ActivityType;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
}

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({ type, title, description, entityType, entityId }: LogActivityParams) => {
    if (!user) return;

    await supabase.from('activities').insert({
      user_id: user.id,
      type,
      title,
      description: description || null,
      entity_type: entityType || null,
      entity_id: entityId || null,
    });
  }, [user]);

  return { logActivity };
}
