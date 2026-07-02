import ClientFilters from '../ClientFilters';
import { useState } from 'react';

export default function ClientFiltersExample() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientType, setClientType] = useState("all");
  const [birthMonth, setBirthMonth] = useState("all");

  return (
    <div className="p-4">
      <ClientFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clientType={clientType}
        onClientTypeChange={setClientType}
        birthMonth={birthMonth}
        onBirthMonthChange={setBirthMonth}
        totalClients={25}
      />
    </div>
  );
}