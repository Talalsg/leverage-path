import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CSVImportProps {
  onImportComplete: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

const DEAL_FIELDS = [
  { key: 'company_name', label: 'Company Name', required: true },
  { key: 'sector', label: 'Sector', required: false },
  { key: 'valuation_usd', label: 'Valuation (USD)', required: false },
  { key: 'equity_offered', label: 'Equity %', required: false },
  { key: 'founder_name', label: 'Founder Name', required: false },
  { key: 'stage', label: 'Stage', required: false },
  { key: 'outcome', label: 'Outcome', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const VALID_STAGES = ['review', 'evaluating', 'passed', 'term_sheet', 'closed', 'rejected'];
const VALID_OUTCOMES = ['win', 'miss', 'regret', 'noise', 'pending'];

export function CSVImport({ onImportComplete }: CSVImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing'>('upload');
  const [csvData, setCSVData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      
      if (headers.length === 0) {
        toast({ title: 'Invalid CSV', description: 'Could not parse headers', variant: 'destructive' });
        return;
      }

      setCSVHeaders(headers);
      setCSVData(rows);
      
      // Auto-map columns with matching names
      const autoMapping: Record<string, string> = {};
      DEAL_FIELDS.forEach(field => {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().includes(field.key.replace('_', ' ')) ||
          h.toLowerCase().includes(field.label.toLowerCase()) ||
          h.toLowerCase() === field.key
        );
        if (matchingHeader) {
          autoMapping[field.key] = matchingHeader;
        }
      });
      setColumnMapping(autoMapping);
      setStep('map');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user) return;
    
    setStep('importing');
    let imported = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      const dealData: Record<string, any> = {
        user_id: user.id,
      };

      // Map CSV columns to deal fields
      DEAL_FIELDS.forEach(field => {
        const csvColumn = columnMapping[field.key];
        if (csvColumn && row[csvColumn]) {
          let value = row[csvColumn];
          
          // Type conversions
          if (field.key === 'valuation_usd' || field.key === 'equity_offered') {
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
            dealData[field.key] = isNaN(numValue) ? null : numValue;
          } else if (field.key === 'stage') {
            dealData[field.key] = VALID_STAGES.includes(value.toLowerCase()) 
              ? value.toLowerCase() 
              : 'review';
          } else if (field.key === 'outcome') {
            dealData[field.key] = VALID_OUTCOMES.includes(value.toLowerCase()) 
              ? value.toLowerCase() 
              : null;
          } else {
            dealData[field.key] = value;
          }
        }
      });

      // Skip rows without company name
      if (!dealData.company_name) {
        errors.push(`Row ${imported + 1}: Missing company name`);
        continue;
      }

      const { error } = await supabase.from('deals').insert(dealData as any);
      
      if (error) {
        errors.push(`${dealData.company_name}: ${error.message}`);
      } else {
        imported++;
      }
      
      setImportProgress(Math.round(((imported + errors.length) / csvData.length) * 100));
    }

    if (errors.length > 0) {
      toast({ 
        title: `Imported ${imported} deals`, 
        description: `${errors.length} errors occurred`, 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Import Complete', description: `${imported} deals imported successfully` });
    }

    onImportComplete();
    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setStep('upload');
    setCSVData([]);
    setCSVHeaders([]);
    setColumnMapping({});
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Historical Deals
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-12 text-center">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-primary/30 mb-4" />
            <p className="text-muted-foreground mb-4">
              Upload a CSV file with your historical deals
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose CSV File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Include columns like: Company Name, Sector, Valuation, Founder, Stage, Outcome
            </p>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to deal fields:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEAL_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-sm min-w-[120px]">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </span>
                  <Select
                    value={columnMapping[field.key] || '_skip'}
                    onValueChange={(value) => 
                      setColumnMapping(prev => ({ 
                        ...prev, 
                        [field.key]: value === '_skip' ? '' : value 
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">— Skip —</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columnMapping[field.key] && (
                    <Check className="h-4 w-4 text-accent" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button 
                onClick={() => setStep('preview')} 
                disabled={!columnMapping.company_name}
                className="flex-1"
              >
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Preview of {csvData.length} deals to import:
              </p>
              <Badge variant="outline">{csvData.length} rows</Badge>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Valuation</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {row[columnMapping.company_name] || '—'}
                      </TableCell>
                      <TableCell>{row[columnMapping.sector] || '—'}</TableCell>
                      <TableCell>{row[columnMapping.valuation_usd] || '—'}</TableCell>
                      <TableCell>
                        {row[columnMapping.outcome] ? (
                          <Badge variant="outline">{row[columnMapping.outcome]}</Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {csvData.length > 10 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  ...and {csvData.length - 10} more rows
                </p>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import {csvData.length} Deals
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground mb-4">
              Importing deals... {importProgress}%
            </p>
            <div className="w-full bg-muted rounded-full h-2 max-w-md mx-auto">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
