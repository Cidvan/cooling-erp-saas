import UpcomingBirthdays from '../UpcomingBirthdays';
import { Client } from "@shared/schema";

export default function UpcomingBirthdaysExample() {
  // //todo: remove mock functionality
  const mockClients: Client[] = [
    {
      id: "1",
      name: "Juan Dela Cruz",
      company: "CoolDesk Company",
      email: "juan@jcaj.com",
      phone: "09923923922",
      address: "123 Business St., Makati City",
      clientType: "corporate",
      birthdate: new Date("1985-09-30"), // Coming up soon
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
      birthdate: new Date("1990-10-05"), // Next week
      lastCleaningDate: new Date("2025-01-10"),
      totalValue: 45000,
      status: "active",
      dateCreated: new Date("2024-12-15")
    },
    {
      id: "3",
      name: "Anna Rodriguez",
      company: "Rodriguez Restaurant",
      email: "anna@restaurant.com",
      phone: "09234567890",
      address: "789 Food St., Taguig City",
      clientType: "establishment",
      birthdate: new Date("1988-10-15"), // In 2 weeks
      lastCleaningDate: new Date("2025-01-08"),
      totalValue: 78000,
      status: "active",
      dateCreated: new Date("2024-11-20")
    }
  ];

  return (
    <div className="p-4 max-w-md">
      <UpcomingBirthdays clients={mockClients} daysAhead={30} />
    </div>
  );
}