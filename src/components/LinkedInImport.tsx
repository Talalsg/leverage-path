import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ParsedContact {
  name: string;
  organization: string | null;
  role: string | null;
  linkedin: string | null;
  tier?: string;
}

interface LinkedInImportProps {
  onImportComplete: () => void;
}

export function LinkedInImport({ onImportComplete }: LinkedInImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'categorizing' | 'importing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseLinkedInCSV = (csvText: string): ParsedContact[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    // LinkedIn export format: First Name, Last Name, Email Address, Company, Position, Connected On
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const firstNameIdx = headers.findIndex(h => h.includes('first'));
    const lastNameIdx = headers.findIndex(h => h.includes('last'));
    const companyIdx = headers.findIndex(h => h.includes('company'));
    const positionIdx = headers.findIndex(h => h.includes('position') || h.includes('title'));
    const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('profile'));

    const parsed: ParsedContact[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quoted fields
      const values = line.match(/("([^"]|"")*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
      
      const firstName = firstNameIdx >= 0 ? values[firstNameIdx] : '';
      const lastName = lastNameIdx >= 0 ? values[lastNameIdx] : '';
      const name = `${firstName} ${lastName}`.trim();
      
      if (!name) continue;

      parsed.push({
        name,
        organization: companyIdx >= 0 ? values[companyIdx] || null : null,
        role: positionIdx >= 0 ? values[positionIdx] || null : null,
        linkedin: urlIdx >= 0 ? values[urlIdx] || null : null,
      });
    }

    return parsed;
  };

  const categorizeWithAI = async (contactsBatch: ParsedContact[]): Promise<ParsedContact[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('deal-evaluator', {
        body: {
          action: 'categorize-contacts',
          contacts: contactsBatch.map(c => ({
            name: c.name,
            company: c.organization,
            role: c.role,
          })),
        },
      });

      if (error) throw error;

      const categories = data?.categories || [];
      return contactsBatch.map((contact, idx) => ({
        ...contact,
        tier: categories[idx] || 'connector',
      }));
    } catch (err) {
      console.error('AI categorization failed, using fallback:', err);
      // Fallback: assign tier based on role keywords
      return contactsBatch.map(contact => ({
        ...contact,
        tier: inferTierFromRole(contact.role),
      }));
    }
  };

  const inferTierFromRole = (role: string | null): string => {
    if (!role) return 'connector';
    const lower = role.toLowerCase();
    if (lower.includes('founder') || lower.includes('ceo') || lower.includes('co-founder')) return 'founder';
    if (lower.includes('partner') || lower.includes('investor') || lower.includes('vc') || lower.includes('capital') || lower.includes('fund')) return 'capital_allocator';
    if (lower.includes('advisor') || lower.includes('board') || lower.includes('mentor')) return 'advisor';
    if (lower.includes('director') || lower.includes('manager') || lower.includes('head') || lower.includes('vp') || lower.includes('chief')) return 'gatekeeper';
    return 'connector';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStep('processing');
    setProgress(10);

    try {
      const text = await file.text();
      const parsed = parseLinkedInCSV(text);
      
      if (parsed.length === 0) {
        setError('No valid contacts found in CSV. Make sure it\'s a LinkedIn export.');
        setStep('upload');
        return;
      }

      setProgress(30);
      setStep('categorizing');
      
      // Process in batches of 20 for AI categorization
      const batchSize = 20;
      const categorized: ParsedContact[] = [];
      
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        const result = await categorizeWithAI(batch);
        categorized.push(...result);
        setProgress(30 + Math.floor((i / parsed.length) * 40));
      }

      setContacts(categorized);
      setProgress(70);
      setStep('importing');

      // Import to database
      if (!user) throw new Error('Not authenticated');

      const toInsert = categorized.map(c => ({
        user_id: user.id,
        name: c.name,
        organization: c.organization,
        role: c.role,
        linkedin: c.linkedin,
        tier: c.tier || 'connector',
      }));

      // Insert in batches to avoid hitting limits
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error: insertError } = await supabase.from('contacts').insert(batch);
        if (insertError) {
          console.error('Insert error:', insertError);
        }
        setProgress(70 + Math.floor((i / toInsert.length) * 30));
      }

      setProgress(100);
      setStep('done');
      toast({ title: 'Import Complete', description: `Added ${categorized.length} contacts with AI-assigned tiers` });
      
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('upload');
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (step === 'done') {
      onImportComplete();
    }
    // Reset state
    setTimeout(() => {
      setStep('upload');
      setProgress(0);
      setContacts([]);
      setError(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import LinkedIn Connections</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Upload LinkedIn Export CSV</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Export from LinkedIn: Settings → Data privacy → Get a copy of your data → Connections
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {(step === 'processing' || step === 'categorizing' || step === 'importing') && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>
                  {step === 'processing' && 'Parsing CSV...'}
                  {step === 'categorizing' && 'AI categorizing contacts...'}
                  {step === 'importing' && 'Importing to database...'}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 mx-auto text-accent mb-3" />
              <p className="font-semibold text-lg">Import Complete!</p>
              <p className="text-muted-foreground mt-1">
                Added {contacts.length} contacts with AI-assigned tiers
              </p>
              <Button onClick={handleClose} className="mt-4">
                View Contacts
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
