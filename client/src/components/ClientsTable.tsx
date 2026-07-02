import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye } from "lucide-react";
import { Client } from "@shared/schema";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
  onView: (clientId: string) => void;
}

export default function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onView,
}: ClientsTableProps) {
  const getClientTypeBadge = (type: string) => {
    const variants = {
      residential: "default" as const,
      corporate: "secondary" as const,
      establishment: "outline" as const
    };
    return variants[type as keyof typeof variants] || "default";
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "active") {
      return <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600 text-white">Active</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatBirthdate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden" data-testid="clients-table">
      <div className="bg-muted p-3">
        <h3 className="font-medium text-sm">Clients List</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-id">#</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-name">Name</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-address">Address</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-contact">Contact #</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-type">Type</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-status">Status</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-first-transaction-date">First Transaction Date</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-date-entered">Date Entered</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-last-transaction">Last Transaction Date</th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground" data-testid="header-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground" data-testid="no-clients">
                  No clients found matching your criteria
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr 
                  key={client.id} 
                  className="border-b hover:bg-muted/30 transition-colors"
                  data-testid={`client-row-${client.id}`}
                >
                  <td className="px-4 py-3 text-sm" data-testid={`client-number-${client.id}`}>
                    {String(clients.length - index).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-3" data-testid={`client-name-${client.id}`}>
                    <div>
                      <div className="font-medium text-sm">{client.name}</div>
                      {client.company && (
                        <div className="text-xs text-muted-foreground">{client.company}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[150px] truncate" data-testid={`client-address-${client.id}`}>
                    {client.address}
                  </td>
                  <td className="px-4 py-3 text-sm" data-testid={`client-phone-${client.id}`}>
                    {Array.isArray(client.phone) ? client.phone.join(' / ') : client.phone}
                  </td>
                  <td className="px-4 py-3" data-testid={`client-type-${client.id}`}>
                    <Badge variant={getClientTypeBadge(client.clientType)} className="text-xs">
                      {client.clientType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" data-testid={`client-status-${client.id}`}>
                    {getStatusBadge(client.status)}
                  </td>
                  <td className="px-4 py-3 text-sm" data-testid={`client-first-transaction-date-${client.id}`}>
                    {formatDate(client.firstTransactionDate)}
                  </td>
                  <td className="px-4 py-3 text-sm" data-testid={`client-date-created-${client.id}`}>
                    {formatDate(client.dateCreated)}
                  </td>
                  <td className="px-4 py-3 text-sm" data-testid={`client-last-transaction-${client.id}`}>
                    {formatDate(client.lastTransactionDate)}
                  </td>
                  <td className="px-4 py-3" data-testid={`client-actions-${client.id}`}>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onEdit(client.id)}
                        data-testid={`button-edit-${client.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(client.id)}
                        data-testid={`button-delete-${client.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(client.id)}
                        data-testid={`button-view-${client.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}