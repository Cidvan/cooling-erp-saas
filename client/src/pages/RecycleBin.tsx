import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, Trash } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ENTITY_LABELS: Record<string, string> = {
  client: "Client",
  serviceReport: "Service Report",
  quotation: "Quotation",
  invoice: "Invoice",
  purchaseOrder: "Purchase Order",
  accountsReceivable: "Accounts Receivable",
  accountsPayable: "Accounts Payable",
  salesEntry: "Sales Entry",
  operationalExpense: "Operational Expense",
};

const ENTITY_TYPES = Object.keys(ENTITY_LABELS);

interface RecycleBinItem {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string | null;
}

export default function RecycleBin() {
  const { toast } = useToast();
  const [entityType, setEntityType] = useState<string>("all");
  const [permanentTarget, setPermanentTarget] = useState<RecycleBinItem | null>(null);

  const { data: items = [], isLoading } = useQuery<RecycleBinItem[]>({
    queryKey: ["/api/recycle-bin"],
  });

  const filtered = entityType === "all" ? items : items.filter((i) => i.entityType === entityType);

  const restoreMutation = useMutation({
    mutationFn: async (item: RecycleBinItem) => {
      await apiRequest("POST", `/api/recycle-bin/${item.entityType}/${item.id}/restore`);
    },
    onSuccess: (_data, item) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recycle-bin"] });
      toast({ title: "Restored", description: `${ENTITY_LABELS[item.entityType]} "${item.name}" has been restored.` });
    },
    onError: (error: Error) => {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (item: RecycleBinItem) => {
      await apiRequest("DELETE", `/api/recycle-bin/${item.entityType}/${item.id}/permanent`);
    },
    onSuccess: (_data, item) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recycle-bin"] });
      toast({ title: "Permanently deleted", description: `${ENTITY_LABELS[item.entityType]} "${item.name}" has been permanently deleted.` });
      setPermanentTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      setPermanentTarget(null);
    },
  });

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-recycle-bin">
      <div className="flex items-center gap-2">
        <Trash2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Recycle Bin</h2>
          <p className="text-muted-foreground">Restore or permanently delete removed records</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Record type</label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-56" data-testid="select-entity-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{ENTITY_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Deleted at</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    Loading recycle bin...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8" data-testid="text-no-items">
                    Recycle bin is empty
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={`${item.entityType}-${item.id}`} data-testid={`row-recycle-${item.id}`}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{ENTITY_LABELS[item.entityType] || item.entityType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.deletedAt ? format(new Date(item.deletedAt), "MMM d, yyyy h:mm a") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreMutation.mutate(item)}
                          disabled={restoreMutation.isPending}
                          data-testid={`button-restore-${item.id}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setPermanentTarget(item)}
                          disabled={permanentDeleteMutation.isPending}
                          data-testid={`button-permanent-delete-${item.id}`}
                        >
                          <Trash className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!permanentTarget} onOpenChange={(open) => !open && setPermanentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{permanentTarget?.name}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-permanent-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentTarget && permanentDeleteMutation.mutate(permanentTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-permanent-delete"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
