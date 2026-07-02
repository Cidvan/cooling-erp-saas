import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface ClientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  clientType: string;
  onClientTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  transactionMonth: string;
  onTransactionMonthChange: (value: string) => void;
  totalClients: number;
}

export default function ClientFilters({
  searchTerm,
  onSearchChange,
  clientType,
  onClientTypeChange,
  statusFilter,
  onStatusFilterChange,
  transactionMonth,
  onTransactionMonthChange,
  totalClients
}: ClientFiltersProps) {
  const months = [
    { value: "all", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const clientTypes = [
    { value: "all", label: "All Types" },
    { value: "residential", label: "Residential" },
    { value: "corporate", label: "Corporate" },
    { value: "establishment", label: "Establishment" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" }
  ];

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4" data-testid="client-filters">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground">Filter Clients</h3>
        <span className="text-sm text-muted-foreground" data-testid="total-clients">
          {totalClients} Total Clients
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter Client Name"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>

        {/* Client Type Filter */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Client Type</label>
          <Select value={clientType} onValueChange={onClientTypeChange}>
            <SelectTrigger data-testid="select-client-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {clientTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} data-testid={`option-client-type-${type.value}`}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-status-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* First Transaction Month Filter */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">First Transaction Month</label>
          <Select value={transactionMonth} onValueChange={onTransactionMonthChange}>
            <SelectTrigger data-testid="select-transaction-month">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} data-testid={`option-month-${m.value}`}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              onSearchChange("");
              onClientTypeChange("all");
              onStatusFilterChange("all");
              onTransactionMonthChange("all");
            }}
            className="w-full"
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}