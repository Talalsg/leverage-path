import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PastPass {
  id: string;
  company_name: string;
  pass_date: string | null;
  pass_reason: string | null;
  stage: string;
  outcome: string | null;
}

interface PastPassAlertProps {
  companyName: string;
  onClose?: () => void;
}

export function PastPassAlert({ companyName, onClose }: PastPassAlertProps) {
  const { user } = useAuth();
  const [pastPass, setPastPass] = useState<PastPass | null>(null);

  useEffect(() => {
    if (!user || !companyName || companyName.length < 2) return;

    const checkForPastPass = async () => {
      // Search for similar company names (case-insensitive, partial match)
      const { data } = await supabase
        .from('deals')
        .select('id, company_name, pass_date, pass_reason, stage, outcome')
        .eq('user_id', user.id)
        .in('stage', ['passed', 'rejected'])
        .ilike('company_name', `%${companyName}%`);

      if (data && data.length > 0) {
        setPastPass(data[0] as PastPass);
      } else {
        setPastPass(null);
      }
    };

    const debounceTimer = setTimeout(checkForPastPass, 300);
    return () => clearTimeout(debounceTimer);
  }, [user, companyName]);

  if (!pastPass) return null;

  return (
    <Alert className="border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning flex items-center gap-2">
        Previous Pass Detected
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm">
          You passed on <strong>{pastPass.company_name}</strong> previously.
        </p>
        
        {pastPass.pass_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Passed on {format(new Date(pastPass.pass_date), 'MMMM d, yyyy')}</span>
          </div>
        )}
        
        {pastPass.pass_reason && (
          <div className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded">
            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span><strong>Reason:</strong> {pastPass.pass_reason}</span>
          </div>
        )}
        
        <p className="text-xs text-warning font-medium mt-2">
          What has changed since then?
        </p>
      </AlertDescription>
    </Alert>
  );
}
