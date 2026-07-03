import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileText, Image as ImageIcon, Download, Trash2, Loader2 } from "lucide-react";
import type { Attachment } from "@shared/schema";

interface AttachmentUploaderProps {
  entityType: string;
  entityId: string;
  title?: string;
  compact?: boolean;
  onUploadedExternal?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function AttachmentUploader({ entityType, entityId, title = "Attachments", compact = false, onUploadedExternal }: AttachmentUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const queryKey = ["/api/attachments/entity", entityType, entityId];

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/attachments/entity/${entityType}/${entityId}`);
      return res.json();
    },
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "File deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete file", description: error.message, variant: "destructive" });
    },
  });

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploadingCount((c) => c + fileArray.length);

      for (const file of fileArray) {
        try {
          const urlRes = await apiRequest("POST", "/api/attachments/upload-url");
          const { uploadURL, objectPath } = await urlRes.json();

          const putRes = await fetch(uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          if (!putRes.ok) {
            throw new Error("Failed to upload file to storage");
          }

          await apiRequest("POST", "/api/attachments", {
            entityType,
            entityId,
            fileName: file.name,
            fileUrl: objectPath,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });

          queryClient.invalidateQueries({ queryKey });
          onUploadedExternal?.();
        } catch (error: any) {
          const message: string = error?.message || "Upload failed";
          if (message.includes("already exists")) {
            toast({ title: `"${file.name}" already exists`, description: "This file was already attached to this record.", variant: "destructive" });
          } else {
            toast({ title: `Failed to upload "${file.name}"`, description: message, variant: "destructive" });
          }
        } finally {
          setUploadingCount((c) => Math.max(0, c - 1));
        }
      }
    },
    [entityType, entityId, queryClient, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  return (
    <Card data-testid="card-attachment-uploader">
      <CardContent className="pt-6 space-y-4">
        {title && <h3 className="text-sm font-medium">{title}</h3>}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          data-testid="dropzone-attachment-upload"
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop files here, or <span className="text-primary font-medium">click to browse</span>
          </p>
          {uploadingCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}...
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                uploadFiles(e.target.files);
                e.target.value = "";
              }
            }}
            data-testid="input-file-upload"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading files...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
            {attachments.map((att) => (
              <div key={att.id} className="relative group rounded-md border overflow-hidden bg-muted/30" data-testid={`attachment-item-${att.id}`}>
                {isImage(att.mimeType) ? (
                  <img src={att.fileUrl} alt={att.fileName} className="h-24 w-full object-cover" />
                ) : (
                  <div className="h-24 w-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate" title={att.fileName}>{att.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(att.sizeBytes)}</p>
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.fileName}
                    className="p-1 rounded bg-background/90 border hover:bg-background"
                    data-testid={`button-download-${att.id}`}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 p-1 rounded bg-background/90 border hover:bg-background"
                    onClick={() => deleteMutation.mutate(att.id)}
                    data-testid={`button-delete-attachment-${att.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
