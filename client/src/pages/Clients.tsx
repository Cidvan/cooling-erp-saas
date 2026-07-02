import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client } from "@shared/schema";
import ClientFilters from "@/components/ClientFilters";
import ClientsTable from "@/components/ClientsTable";
import ClientForm from "@/components/ClientForm";
import ClientDetailDialog from "@/components/ClientDetailDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientType, setClientType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactionMonth, setTransactionMonth] = useState("all");
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);

  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/clients/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    return clients.filter(client => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()));

      // Client type filter
      const matchesType = clientType === "all" || client.clientType === clientType;

      // Status filter
      const clientStatus = client.status || "active";
      const matchesStatus = statusFilter === "all" || clientStatus === statusFilter;

      // First Transaction Month filter
      const matchesMonth = transactionMonth === "all" ||
        (client.firstTransactionDate &&
          new Date(client.firstTransactionDate).getMonth() + 1 === parseInt(transactionMonth));

      return matchesSearch && matchesType && matchesStatus && matchesMonth;
    });
  }, [clients, searchTerm, clientType, statusFilter, transactionMonth]);

  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setEditingClient(client);
      setShowClientForm(true);
    }
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientToDelete(client);
      setShowDeleteDialog(true);
    }
  };

  const handleViewClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClientForDetail(client);
      setShowClientDetail(true);
    }
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
      setShowDeleteDialog(false);
      setClientToDelete(null);
    }
  };

  const handleClientFormClose = () => {
    setShowClientForm(false);
    setEditingClient(null);
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-clients">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-clients-title">
            Clients
          </h2>
          <p className="text-muted-foreground" data-testid="text-clients-subtitle">
            Manage your customer relationships and service records
          </p>
        </div>
        <Button onClick={handleAddClient} data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <ClientFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clientType={clientType}
        onClientTypeChange={setClientType}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        transactionMonth={transactionMonth}
        onTransactionMonthChange={setTransactionMonth}
        totalClients={filteredClients.length}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading clients...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="text-destructive">Failed to load clients. Please try again.</div>
        </div>
      )}

      {/* Clients Table */}
      {!isLoading && !error && (
        <ClientsTable
          clients={filteredClients}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onView={handleViewClient}
        />
      )}

      {/* Client Form Dialog */}
      <ClientForm
        isOpen={showClientForm}
        onClose={handleClientFormClose}
        client={editingClient || undefined}
      />

      {/* Client Detail Dialog */}
      <ClientDetailDialog
        client={selectedClientForDetail}
        isOpen={showClientDetail}
        onClose={() => {
          setShowClientDetail(false);
          setSelectedClientForDetail(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {clientToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}