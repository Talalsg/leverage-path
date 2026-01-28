import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  dealId: string;
  dealName: string;
  onUploadComplete?: (url: string) => void;
}

export function DocumentUpload({ dealId, dealName, onUploadComplete }: DocumentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.pptx') && !file.name.endsWith('.ppt')) {
        toast({ title: 'Invalid file type', description: 'Please upload a PDF or PowerPoint file.', variant: 'destructive' });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    setProgress(0);

    try {
      // Create file path: userId/dealId/filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${user.id}/${dealId}/${fileName}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('deal-documents')
        .upload(filePath, selectedFile);

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(filePath);

      // Update deal with deck URL
      await supabase
        .from('deals')
        .update({ deck_url: urlData.publicUrl })
        .eq('id', dealId);

      toast({ title: 'Document uploaded', description: `${selectedFile.name} has been uploaded successfully.` });
      setSelectedFile(null);
      onUploadComplete?.(urlData.publicUrl);
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label>Pitch Deck / Term Sheet</Label>
      
      {!selectedFile ? (
        <div 
          className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload PDF or PowerPoint</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Max 10MB</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <File className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {uploading && (
            <div className="mt-3">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progress}% uploaded</p>
            </div>
          )}
          
          {!uploading && (
            <Button onClick={handleUpload} className="w-full mt-3" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.ppt,.pptx"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
