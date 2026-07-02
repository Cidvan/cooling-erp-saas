import ClientsTable from '../ClientsTable';
import { Client } from "@shared/schema";

export default function ClientsTableExample() {
  // //todo: remove mock functionality
  const mockClients: Client[] = [
    {
      id: "1",
      name: "Juan Dela Cruz",
      company: "JCAJ Company",
      email: "juan@jcaj.com",
      phone: "09923923922",
      address: "123 Business St., Makati City",
      clientType: "corporate",
      birthdate: new Date("1985-09-08"),
      lastCleaningDate: new Date("2025-01-15"),
      totalValue: 125000,
      status: "active",
      dateCreated: new Date("2025-01-01")
    },
    {
      id: "2",
      name: "Maria Santos",
      company: null,
      email: "maria@email.com",
      phone: "09187654321",
      address: "456 Residential Ave., Quezon City",
      clientType: "residential",
      birthdate: new Date("1990-03-15"),
      lastCleaningDate: new Date("2025-01-10"),
      totalValue: 45000,
      status: "active",
      dateCreated: new Date("2024-12-15")
    }
  ];

  const handleEdit = (clientId: string) => {
    console.log('Edit client:', clientId);
  };

  const handleDelete = (clientId: string) => {
    console.log('Delete client:', clientId);
  };

  const handleView = (clientId: string) => {
    console.log('View client:', clientId);
  };

  const handleViewServiceHistory = (clientId: string) => {
    console.log('View service history:', clientId);
  };

  return (
    <div className="p-4">
      <ClientsTable
        clients={mockClients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onViewServiceHistory={handleViewServiceHistory}
      />
    </div>
  );
}