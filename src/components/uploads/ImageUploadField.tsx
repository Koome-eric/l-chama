'use client';

import { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/* ────────────────────────────────────────────────────────────── */
/*  Drop-in replacement for a plain "paste an image URL" text field. */
/*  Uploads straight to Cloudflare R2 via the existing authenticated */
/*  /api/upload-doc endpoint (already used for Junior Account docs)  */
/*  and hands back the hosted URL — no new storage config needed.    */
/* ────────────────────────────────────────────────────────────── */

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  uploadLabel = 'image',
  className,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Subfolder in R2 to group these under, e.g. "campaigns" or "chamas". */
  folder: string;
  uploadLabel?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('label', uploadLabel);
      formData.append('folder', folder);
      const res = await fetch('/api/upload-doc', { method: 'POST', body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed. Please try again.');
      onChange(data.url);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <Label>{label}</Label>
      {value ? (
        <div className="relative mt-1.5 h-36 w-full overflow-hidden rounded-lg border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 URL, no next/image domain config needed */}
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label className="mt-1.5 flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          {uploading ? 'Uploading…' : 'Click to upload an image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}
