import RecentActivity from '../RecentActivity';

export default function RecentActivityExample() {
  // //todo: remove mock functionality
  const mockActivities = [
    {
      id: "1",
      user: {
        name: "Maria Santos",
        initials: "MS"
      },
      action: "updated client information for",
      target: "ABC Manufacturing",
      type: "update" as const,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      description: "Updated contact details and billing address"
    },
    {
      id: "2", 
      user: {
        name: "Juan Dela Cruz",
        initials: "JD"
      },
      action: "completed service report for",
      target: "Tech Solutions Inc", 
      type: "complete" as const,
      timestamp: new Date(Date.now() - 23 * 60 * 1000).toISOString(), // 23 minutes ago
      description: "AC maintenance and filter replacement completed"
    },
    {
      id: "3",
      user: {
        name: "Anna Rodriguez",
        initials: "AR"
      },
      action: "created new quotation for",
      target: "Cool Stores Ltd",
      type: "create" as const,
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      description: "Commercial refrigeration system proposal"
    },
    {
      id: "4",
      user: {
        name: "Miguel Torres",
        initials: "MT"
      },
      action: "approved purchase order",
      target: "PO-2024-001",
      type: "approve" as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      description: "Compressor and spare parts order approved"
    },
    {
      id: "5",
      user: {
        name: "System",
        initials: "SY"
      },
      action: "flagged overdue payment for",
      target: "INV-2024-156",
      type: "warning" as const,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      description: "Payment is 15 days overdue - ₱45,000"
    }
  ];

  return (
    <div className="p-4 max-w-md">
      <RecentActivity activities={mockActivities} />
    </div>
  );
}