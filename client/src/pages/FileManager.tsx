import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Image as ImageIcon, Download, Trash2, Eye, Search, UploadCloud } from "lucide-react";
import type { Attachment, Client } from "@shared/schema";
import { AttachmentUploader } from "@/components/AttachmentUploader";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  client: "Client",
  service_report: "Service Report",
  quotation: "Quotation",
  purchase_order: "Purchase Order",
  accounts_receivable: "Accounts Receivable",
  accounts_payable: "Accounts Payable",
  sales_entry: "Sales Entry",
  expense: "Expense",
  other: "Other",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export default function FileManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatDateTime } = useCurrency();

  const [search, setSearch] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/attachments"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attachments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attachments/entity"] });
      toast({ title: "File deleted" });
      setAttachmentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete file", description: error.message, variant: "destructive" });
    },
  });

  const filteredAttachments = useMemo(() => {
    return attachments.filter((att) => {
      if (entityTypeFilter !== "all" && att.entityType !== entityTypeFilter) return false;
      if (clientFilter !== "all") {
        if (att.entityType === "client") {
          if (att.entityId !== clientFilter) return false;
        } else {
          return false;
        }
      }
      if (search && !att.fileName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [attachments, entityTypeFilter, clientFilter, search]);

  return (
    <div className="p-6 space-y-6" data-testid="page-file-manager">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">File Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse, preview, and manage all files uploaded across clients, service reports, and documents.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by file name..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-files"
                />
              </div>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-full sm:w-56" data-testid="select-entity-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full sm:w-56" data-testid="select-client-filter">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="flex items-center gap-2" data-testid="button-upload-file">
              <UploadCloud className="h-4 w-4" />
              Upload File
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading files...</p>
          ) : filteredAttachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No files found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttachments.map((att) => (
                  <TableRow key={att.id} data-testid={`row-attachment-${att.id}`}>
                    <TableCell className="flex items-center gap-2">
                      {isImage(att.mimeType) ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate max-w-xs" title={att.fileName}>{att.fileName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ENTITY_TYPE_LABELS[att.entityType] || att.entityType}</Badge>
                      {att.entityType === "client" && clientNameById.get(att.entityId) && (
                        <span className="ml-2 text-xs text-muted-foreground">{clientNameById.get(att.entityId)}</span>
                      )}
                    </TableCell>
                    <TableCell>{formatBytes(att.sizeBytes)}</TableCell>
                    <TableCell>{att.uploadedBy || "—"}</TableCell>
                    <TableCell>{att.dateCreated ? formatDateTime(att.dateCreated) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPreviewAttachment(att)}
                          data-testid={`button-preview-${att.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" download={att.fileName}>
                          <Button size="icon" variant="ghost" data-testid={`button-download-${att.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAttachmentToDelete(att)}
                          data-testid={`button-delete-${att.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <UploadToEntityForm
            clients={clients}
            onUploaded={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/attachments"] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.fileName}</DialogTitle>
          </DialogHeader>
          {previewAttachment && (
            isImage(previewAttachment.mimeType) ? (
              <img src={previewAttachment.fileUrl} alt={previewAttachment.fileName} className="w-full rounded-md" />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preview isn't available for this file type.</p>
                <a href={previewAttachment.fileUrl} target="_blank" rel="noopener noreferrer" download={previewAttachment.fileName}>
                  <Button className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{attachmentToDelete?.fileName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => attachmentToDelete && deleteMutation.mutate(attachmentToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadToEntityForm({ clients, onUploaded }: { clients: Client[]; onUploaded: () => void }) {
  const [entityType, setEntityType] = useState<string>("client");
  const [entityId, setEntityId] = useState<string>("");

  if (entityType !== "client") {
    return (
      <div className="space-y-4">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger data-testid="select-upload-entity-type">
            <SelectValue placeholder="Select record type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          To attach files to a {ENTITY_TYPE_LABELS[entityType]?.toLowerCase()}, open that record directly and use the attachments section there.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger data-testid="select-upload-entity-type">
          <SelectValue placeholder="Select record type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={entityId} onValueChange={setEntityId}>
        <SelectTrigger data-testid="select-upload-client">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {entityId && (
        <AttachmentUploader entityType="client" entityId={entityId} title="" compact onUploadedExternal={onUploaded} />
      )}
    </div>
  );
}
