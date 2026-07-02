import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, FileText, Save, Eraser, UserPlus } from "lucide-react";
import { Client, ServiceReport, ServiceLineItem, ServiceTechnician, ServiceAcUnit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import ClientForm from "@/components/ClientForm";
import { useCurrency } from "@/hooks/use-currency";

interface ServiceLineItemWithId extends ServiceLineItem {
  tempId: string; // for tracking during editing
}

interface ServiceTechnicianWithId extends Partial<ServiceTechnician> {
  tempId: string;
  _startDate?: string;
  _startTime?: string;
  _endDate?: string;
  _endTime?: string;
}

interface ServiceAcUnitWithId extends Partial<ServiceAcUnit> {
  tempId: string;
}

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const localTimeStr = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const localDateTime = (dateStr: string, timeStr: string) => {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return new Date(y, mo - 1, da, h, mi);
};

export default function ServiceReports() {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const [, setLocation] = useLocation();
  const [, editParams] = useRoute("/service-reports/edit/:id");
  const editReportId = editParams?.id ?? null;
  const isEditing = !!editReportId;
  const formPopulated = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [serviceReport, setServiceReport] = useState<Partial<ServiceReport>>({
    status: "scheduled",
  });
  const [lineItems, setLineItems] = useState<ServiceLineItemWithId[]>([]);
  const [technicians, setTechnicians] = useState<ServiceTechnicianWithId[]>([]);
  const [acUnits, setAcUnits] = useState<ServiceAcUnitWithId[]>([{ tempId: Date.now().toString(), acBrand: "", acModel: "", acSerialNumber: "", acLocation: "", serviceDone: "", orderIndex: 0 }]);
  const [showClientForm, setShowClientForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients from API
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Edit mode: fetch existing report data
  const { data: allReports = [] } = useQuery<ServiceReport[]>({
    queryKey: ['/api/service-reports'],
    enabled: isEditing,
    staleTime: 0,
  });
  const editReport = isEditing ? allReports.find(r => r.id === editReportId) : null;

  const { data: editLineItems = [], isSuccess: editLineItemsLoaded } = useQuery<ServiceLineItem[]>({
    queryKey: ['/api/service-reports', editReportId, 'line-items'],
    enabled: isEditing && !!editReportId,
    queryFn: async () => {
      const res = await fetch(`/api/service-reports/${editReportId}/line-items`);
      if (!res.ok) throw new Error('Failed to fetch line items');
      return res.json();
    },
  });
  const { data: editTechnicians = [], isSuccess: editTechniciansLoaded } = useQuery<ServiceTechnician[]>({
    queryKey: ['/api/service-reports', editReportId, 'technicians'],
    enabled: isEditing && !!editReportId,
    queryFn: async () => {
      const res = await fetch(`/api/service-reports/${editReportId}/technicians`);
      if (!res.ok) throw new Error('Failed to fetch technicians');
      return res.json();
    },
  });
  const { data: editAcUnits = [], isSuccess: editAcUnitsLoaded } = useQuery<ServiceAcUnit[]>({
    queryKey: ['/api/service-reports', editReportId, 'ac-units'],
    enabled: isEditing && !!editReportId,
    queryFn: async () => {
      const res = await fetch(`/api/service-reports/${editReportId}/ac-units`);
      if (!res.ok) throw new Error('Failed to fetch AC units');
      return res.json();
    },
  });

  // Pre-populate form when all edit data is ready
  useEffect(() => {
    if (!isEditing || formPopulated.current) return;
    if (!editReport || !editLineItemsLoaded || !editTechniciansLoaded || !editAcUnitsLoaded) return;
    if (!clients || clients.length === 0) return;

    const client = clients.find(c => c.id === editReport.clientId) ?? null;
    setSelectedClient(client);
    setServiceReport({
      reportNumber: editReport.reportNumber,
      serviceDate: editReport.serviceDate,
      status: editReport.status,
      technicianName: editReport.technicianName,
      acBrand: editReport.acBrand,
      acModel: editReport.acModel,
      acSerialNumber: editReport.acSerialNumber,
      acLocation: editReport.acLocation,
      troubleReported: editReport.troubleReported,
      troubleFound: editReport.troubleFound,
      workDone: editReport.workDone,
      recommendations: editReport.recommendations,
      clientId: editReport.clientId,
    });
    setLineItems(editLineItems.map((item, i) => ({
      ...item,
      tempId: item.id || `li-${i}`,
    })));
    setTechnicians(editTechnicians.map((tech, i) => ({
      ...tech,
      tempId: tech.id || `tech-${i}`,
      _startDate: tech.timeStarted ? localDateStr(new Date(tech.timeStarted)) : "",
      _startTime: tech.timeStarted ? localTimeStr(new Date(tech.timeStarted)) : "",
      _endDate: tech.timeEnded ? localDateStr(new Date(tech.timeEnded)) : "",
      _endTime: tech.timeEnded ? localTimeStr(new Date(tech.timeEnded)) : "",
    })));
    setAcUnits(
      editAcUnits.length > 0
        ? editAcUnits.map((unit, i) => ({
            ...unit,
            tempId: unit.id || `ac-${i}`,
            serviceDone: unit.serviceDone ?? "",
          }))
        : [{ tempId: Date.now().toString(), acBrand: "", acModel: "", acSerialNumber: "", acLocation: "", serviceDone: "", orderIndex: 0 }]
    );
    formPopulated.current = true;
  }, [isEditing, editReport, editLineItemsLoaded, editTechniciansLoaded, editAcUnitsLoaded, clients]);

  // Mutation for saving service reports
  const saveReportMutation = useMutation<ServiceReport, Error, { report: Partial<ServiceReport>; lineItems: ServiceLineItemWithId[]; technicians: ServiceTechnicianWithId[]; acUnits: ServiceAcUnitWithId[] }>({
    mutationFn: async (data) => {
      // Normalize status values
      const statusMap: Record<string, string> = {
        "Scheduled": "scheduled",
        "In Progress": "in_progress", 
        "Completed": "completed",
        "scheduled": "scheduled",
        "in_progress": "in_progress",
        "completed": "completed"
      };

      const normalizedReport = {
        ...data.report,
        status: statusMap[data.report.status || "scheduled"] || "scheduled",
        serviceDate: data.report.serviceDate ? new Date(data.report.serviceDate) : new Date(),
        timeStarted: data.report.timeStarted ? new Date(data.report.timeStarted) : undefined,
        timeEnded: data.report.timeEnded ? new Date(data.report.timeEnded) : undefined,
      };

      // Prepare line items for API (remove tempId and ensure proper types)
      const apiLineItems = data.lineItems.map(item => ({
        quantity: parseInt(item.quantity.toString()) || 1,
        unitDescription: item.unitDescription,
        unitPrice: parseFloat(item.unitPrice.toString()).toFixed(2),
        amount: parseFloat(item.amount.toString()).toFixed(2),
        orderIndex: item.orderIndex || 0,
      }));

      // Prepare technicians for API (remove tempId and ensure proper types)
      const apiTechnicians = data.technicians.map(tech => ({
        technicianName: tech.technicianName || "",
        timeStarted: tech.timeStarted ? new Date(tech.timeStarted) : undefined,
        timeEnded: tech.timeEnded ? new Date(tech.timeEnded) : undefined,
        duration: tech.duration || "",
        orderIndex: tech.orderIndex || 0,
      }));

      const apiAcUnits = data.acUnits
        .filter(u => u.acBrand || u.acModel || u.acSerialNumber || u.acLocation || u.serviceDone)
        .map((unit, i) => ({
          acBrand: unit.acBrand || "",
          acModel: unit.acModel || "",
          acSerialNumber: unit.acSerialNumber || "",
          acLocation: unit.acLocation || "",
          serviceDone: unit.serviceDone || "",
          orderIndex: i,
        }));

      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/service-reports/${editReportId}` : '/api/service-reports';
      const response = await apiRequest(method, url, {
        ...normalizedReport,
        lineItems: apiLineItems,
        technicians: apiTechnicians,
        acUnits: apiAcUnits
      });
      return response.json();
    },
    onSuccess: (response: ServiceReport) => {
      if (isEditing) {
        toast({ title: "Success", description: `Service report ${response.reportNumber} updated successfully` });
        queryClient.invalidateQueries({ queryKey: ['/api/service-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales-entries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
        setLocation('/documents');
      } else {
        toast({
          title: "Success",
          description: `Service report ${response.reportNumber} saved successfully`,
          action: (
            <Button
              size="sm"
              onClick={() => setLocation(`/accounts-receivables?srNumber=${response.reportNumber}&clientId=${response.clientId}`)}
            >
              Create AR
            </Button>
          ),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/service-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales-entries'] });
        if (selectedClient) {
          queryClient.invalidateQueries({ queryKey: ['/api/service-reports', selectedClient.id] });
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to save service report. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);

  const addLineItem = () => {
    const newItem: ServiceLineItemWithId = {
      id: "",
      serviceReportId: "",
      tempId: Date.now().toString(),
      quantity: 1,
      unitDescription: "",
      unitPrice: "0",
      amount: "0",
      orderIndex: lineItems.length,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (tempId: string, field: keyof ServiceLineItemWithId, value: string | number) => {
    setLineItems(items => items.map(item => {
      if (item.tempId === tempId) {
        const updated = { ...item, [field]: value };
        
        // Recalculate amount when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const price = field === 'unitPrice' ? value : item.unitPrice;
          updated.amount = (qty * Number(price)).toFixed(2);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (tempId: string) => {
    setLineItems(items => items.filter(item => item.tempId !== tempId));
  };

  const getTotalAmount = () => {
    return lineItems.reduce((total, item) => total + Number(item.amount || 0), 0).toFixed(2);
  };

  // Technician helper functions
  const calculateDuration = (start: Date | string | undefined, end: Date | string | undefined): string => {
    if (!start || !end) return "";
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "";
    if (endDate <= startDate) return "";
    
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0 && minutes === 0) return "";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const addTechnician = () => {
    const newTechnician: ServiceTechnicianWithId = {
      id: "",
      serviceReportId: "",
      tempId: Date.now().toString(),
      technicianName: "",
      timeStarted: undefined,
      timeEnded: undefined,
      duration: "",
      orderIndex: technicians.length,
      _startDate: "", _startTime: "", _endDate: "", _endTime: "",
    };
    setTechnicians([...technicians, newTechnician]);
  };

  const updateTechnician = (tempId: string, field: keyof ServiceTechnicianWithId, value: any) => {
    setTechnicians(techs => techs.map(tech => {
      if (tech.tempId === tempId) {
        const updated = { ...tech, [field]: value };
        if (field === 'timeEnded' || field === 'timeStarted') {
          const start = field === 'timeStarted' ? value : tech.timeStarted;
          const end = field === 'timeEnded' ? value : tech.timeEnded;
          updated.duration = calculateDuration(start, end);
        }
        return updated;
      }
      return tech;
    }));
  };

  const updateTechnicianTime = (tempId: string, updates: Partial<ServiceTechnicianWithId>) => {
    setTechnicians(techs => techs.map(tech => {
      if (tech.tempId !== tempId) return tech;
      const updated = { ...tech, ...updates };
      updated.duration = calculateDuration(updated.timeStarted, updated.timeEnded);
      return updated;
    }));
  };

  const removeTechnician = (tempId: string) => {
    setTechnicians(techs => techs.filter(tech => tech.tempId !== tempId));
  };

  const addAcUnit = () => {
    setAcUnits(prev => [...prev, { tempId: Date.now().toString(), acBrand: "", acModel: "", acSerialNumber: "", acLocation: "", serviceDone: "", orderIndex: prev.length }]);
  };

  const updateAcUnit = (tempId: string, field: keyof ServiceAcUnitWithId, value: string) => {
    setAcUnits(prev => prev.map(u => u.tempId === tempId ? { ...u, [field]: value } : u));
  };

  const removeAcUnit = (tempId: string) => {
    setAcUnits(prev => prev.filter(u => u.tempId !== tempId));
  };

  const clearAll = () => {
    setSelectedClient(null);
    setServiceReport({
      status: "scheduled",
    });
    setLineItems([]);
    setTechnicians([]);
    setAcUnits([{ tempId: Date.now().toString(), acBrand: "", acModel: "", acSerialNumber: "", acLocation: "", serviceDone: "", orderIndex: 0 }]);
    setSearchTerm("");
  };

  const saveReport = () => {
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    if (!serviceReport.serviceDate || serviceReport.serviceDate.toString().trim() === "") {
      toast({
        title: "Error", 
        description: "Please enter a service date",
        variant: "destructive",
      });
      return;
    }

    // Validate technicians
    for (let i = 0; i < technicians.length; i++) {
      const tech = technicians[i];
      if (!tech.technicianName?.trim()) {
        toast({
          title: "Error",
          description: `Technician #${i + 1}: Name is required. Please enter a name or remove the technician card.`,
          variant: "destructive",
        });
        return;
      }
      if (tech.timeStarted && tech.timeEnded) {
        const start = new Date(tech.timeStarted);
        const end = new Date(tech.timeEnded);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
          toast({
            title: "Error",
            description: `Technician "${tech.technicianName}" — Time Ended must be after Time Started.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.unitDescription?.trim()) {
        toast({
          title: "Error",
          description: `Line item #${i + 1}: Description is required.`,
          variant: "destructive",
        });
        return;
      }
    }

    saveReportMutation.mutate({
      report: {
        ...serviceReport,
        clientId: selectedClient.id,
      },
      lineItems: lineItems,
      technicians: technicians,
      acUnits: acUnits
    });
  };

  const convertToPDF = () => {
    console.log('Converting to PDF:', {
      client: selectedClient,
      report: serviceReport,
      lineItems: lineItems
    });
    // TODO: Implement PDF conversion
  };

  const handleClientCreated = (newClient: Client) => {
    setSelectedClient(newClient);
    setServiceReport(prev => ({ ...prev, clientId: newClient.id }));
    toast({
      title: "Success",
      description: `Client ${newClient.name} created and selected`,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-service-reports">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-service-reports-title">
            {isEditing ? "Edit Service Report" : "Service Reports"}
          </h2>
          <p className="text-muted-foreground" data-testid="text-service-reports-subtitle">
            {isEditing ? `Editing report — changes will overwrite the existing record` : "Create and manage detailed service reports for client visits"}
          </p>
        </div>
        {isEditing && (
          <Button variant="outline" onClick={() => setLocation('/documents')} data-testid="button-cancel-edit">
            Cancel
          </Button>
        )}
      </div>

      {/* Edit mode loading state */}
      {isEditing && !editReport && allReports.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              Loading report data...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Search */}
      <Card data-testid="client-search-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {selectedClient ? "Client" : "Select Client"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* When a client is already selected, show them prominently */}
          {selectedClient ? (
            <div className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-muted/40">
              <div>
                <div className="font-medium" data-testid="selected-client-name">{selectedClient.name}</div>
                {selectedClient.company && (
                  <div className="text-sm text-muted-foreground">{selectedClient.company}</div>
                )}
                <div className="text-xs text-muted-foreground">{selectedClient.address}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClient(null);
                  setServiceReport(prev => ({ ...prev, clientId: undefined }));
                  setSearchTerm("");
                }}
                data-testid="button-change-client"
              >
                Change
              </Button>
            </div>
          ) : (
            <>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="client-search">Search Client</Label>
              <Input
                id="client-search"
                placeholder="Enter client name or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-client-search"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => setShowClientForm(true)}
                data-testid="button-add-client"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
          
          {searchTerm && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {clientsLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading clients...
                </div>
              ) : (
                <>
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => {
                        setSelectedClient(client);
                        setSearchTerm("");
                        setServiceReport(prev => ({ ...prev, clientId: client.id }));
                      }}
                      data-testid={`client-option-${client.id}`}
                    >
                      <div className="font-medium">{client.name}</div>
                      {client.company && <div className="text-sm text-muted-foreground">{client.company}</div>}
                      <div className="text-xs text-muted-foreground">{client.address}</div>
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground" data-testid="no-clients-found">
                      No clients found matching your search
                    </div>
                  )}
                </>
              )}
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          {/* Client Information */}
          <Card data-testid="client-info-section">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="text-sm" data-testid="client-name">{selectedClient.name}</div>
                </div>
                {selectedClient.company && (
                  <div>
                    <Label className="text-sm font-medium">Company</Label>
                    <div className="text-sm" data-testid="client-company">{selectedClient.company}</div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="text-sm" data-testid="client-email">{selectedClient.email}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <div className="text-sm" data-testid="client-phone">{Array.isArray(selectedClient.phone) ? selectedClient.phone.join(' / ') : selectedClient.phone}</div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="text-sm" data-testid="client-address">{selectedClient.address}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Summary */}
          <Card data-testid="service-summary-section">
            <CardHeader>
              <CardTitle>Service Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="report-number">Report Number *</Label>
                  <Input
                    id="report-number"
                    type="text"
                    placeholder="Enter report number (e.g., SR-001)"
                    value={serviceReport.reportNumber || ""}
                    readOnly={isEditing}
                    disabled={isEditing}
                    onChange={(e) => setServiceReport(prev => ({
                      ...prev,
                      reportNumber: e.target.value
                    }))}
                    data-testid="input-report-number"
                  />
                  {isEditing && (
                    <p className="text-xs text-muted-foreground mt-1">Report number cannot be changed after creation.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="service-date">Service Date *</Label>
                  <Input
                    id="service-date"
                    type="date"
                    value={serviceReport.serviceDate ? localDateStr(new Date(serviceReport.serviceDate as any)) : ""}
                    onChange={(e) => setServiceReport(prev => ({
                      ...prev,
                      serviceDate: e.target.value as any
                    }))}
                    data-testid="input-service-date"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-status">Status</Label>
                  <Select
                    value={serviceReport.status || "scheduled"}
                    onValueChange={(value) => setServiceReport(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="select-service-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled" data-testid="status-scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress" data-testid="status-in-progress">In Progress</SelectItem>
                      <SelectItem value="completed" data-testid="status-completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Summary */}
          <Card data-testid="amount-summary-section">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Amount Summary
                <Button
                  size="sm"
                  onClick={addLineItem}
                  data-testid="button-add-line-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-line-items">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lineItems.map((item) => (
                      <div key={item.tempId} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg" data-testid={`line-item-${item.tempId}`}>
                        <div className="col-span-2">
                          <Label className="text-sm">QTY</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                            data-testid={`input-quantity-${item.tempId}`}
                          />
                        </div>
                        <div className="col-span-5">
                          <Label className="text-sm">Unit Description</Label>
                          <Input
                            value={item.unitDescription}
                            onChange={(e) => updateLineItem(item.tempId, 'unitDescription', e.target.value)}
                            placeholder="Describe the service/part..."
                            data-testid={`input-description-${item.tempId}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-sm">Unit Price ({currencySymbol})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(item.tempId, 'unitPrice', e.target.value)}
                            data-testid={`input-unit-price-${item.tempId}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-sm">Amount ({currencySymbol})</Label>
                          <Input
                            value={formatCurrency(item.amount)}
                            disabled
                            className="bg-muted"
                            data-testid={`text-amount-${item.tempId}`}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeLineItem(item.tempId)}
                            data-testid={`button-remove-${item.tempId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="text-2xl font-bold" data-testid="total-amount">
                          {formatCurrency(getTotalAmount())}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AC Details */}
          <Card data-testid="ac-details-section">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
              <CardTitle>AC Details</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAcUnit}
                className="flex items-center gap-2"
                data-testid="button-add-ac-unit"
              >
                <Plus className="h-4 w-4" />
                Add AC Unit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acUnits.map((unit, index) => (
                  <div key={unit.tempId} className="border rounded-md p-4 relative" data-testid={`ac-unit-${index}`}>
                    {acUnits.length > 1 && (
                      <div className="absolute top-3 right-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAcUnit(unit.tempId)}
                          data-testid={`button-remove-ac-unit-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm font-medium text-muted-foreground mb-3">Unit {index + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Brand</Label>
                        <Input
                          value={unit.acBrand || ""}
                          onChange={(e) => updateAcUnit(unit.tempId, 'acBrand', e.target.value)}
                          placeholder="e.g., Carrier, LG, Samsung"
                          data-testid={`input-ac-brand-${index}`}
                        />
                      </div>
                      <div>
                        <Label>Model</Label>
                        <Input
                          value={unit.acModel || ""}
                          onChange={(e) => updateAcUnit(unit.tempId, 'acModel', e.target.value)}
                          placeholder="Model number"
                          data-testid={`input-ac-model-${index}`}
                        />
                      </div>
                      <div>
                        <Label>Serial Number</Label>
                        <Input
                          value={unit.acSerialNumber || ""}
                          onChange={(e) => updateAcUnit(unit.tempId, 'acSerialNumber', e.target.value)}
                          placeholder="Serial number"
                          data-testid={`input-ac-serial-${index}`}
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input
                          value={unit.acLocation || ""}
                          onChange={(e) => updateAcUnit(unit.tempId, 'acLocation', e.target.value)}
                          placeholder="e.g., Living Room, Office, Bedroom"
                          data-testid={`input-ac-location-${index}`}
                        />
                      </div>
                      <div>
                        <Label>Service Done</Label>
                        <Select
                          value={unit.serviceDone || ""}
                          onValueChange={(value) => updateAcUnit(unit.tempId, 'serviceDone', value)}
                        >
                          <SelectTrigger data-testid={`select-service-done-${index}`}>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>
                            <SelectItem value="Check up">Check up</SelectItem>
                            <SelectItem value="Pull Down">Pull Down</SelectItem>
                            <SelectItem value="Reprocess">Reprocess</SelectItem>
                            <SelectItem value="Repair">Repair</SelectItem>
                            <SelectItem value="Relocation">Relocation</SelectItem>
                            <SelectItem value="Installation">Installation</SelectItem>
                            <SelectItem value="AC Sales">AC Sales</SelectItem>
                            <SelectItem value="Dismantle">Dismantle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Technician Assignment */}
          <Card data-testid="technician-assignment-section">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Technician Assignment</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTechnician}
                className="flex items-center gap-2"
                data-testid="button-add-technician"
              >
                <Plus className="h-4 w-4" />
                Add Technician
              </Button>
            </CardHeader>
            <CardContent>
              {technicians.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No technicians assigned yet. Click "Add Technician" to assign a technician.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {technicians.map((tech, index) => (
                    <div key={tech.tempId} className="border rounded-lg p-4 relative" data-testid={`technician-${index}`}>
                      <div className="absolute top-4 right-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTechnician(tech.tempId)}
                          data-testid={`button-remove-technician-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor={`tech-name-${tech.tempId}`}>Technician Name</Label>
                          <Input
                            id={`tech-name-${tech.tempId}`}
                            value={tech.technicianName || ""}
                            onChange={(e) => updateTechnician(tech.tempId, 'technicianName', e.target.value)}
                            placeholder="Technician name"
                            data-testid={`input-technician-name-${index}`}
                          />
                        </div>
                        <div>
                          <Label>Time Started</Label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              className="flex-1"
                              value={tech._startDate ?? ""}
                              onChange={(e) => {
                                const d = e.target.value;
                                const t = tech._startTime || "00:00";
                                updateTechnicianTime(tech.tempId, {
                                  _startDate: d,
                                  timeStarted: d ? localDateTime(d, t) : undefined,
                                });
                              }}
                              data-testid={`input-time-started-date-${index}`}
                            />
                            <Input
                              type="time"
                              className="flex-1"
                              value={tech._startTime ?? ""}
                              onChange={(e) => {
                                const t = e.target.value;
                                const d = tech._startDate || localDateStr(new Date());
                                updateTechnicianTime(tech.tempId, {
                                  _startTime: t,
                                  timeStarted: t ? localDateTime(d, t) : undefined,
                                });
                              }}
                              data-testid={`input-time-started-time-${index}`}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Time Ended</Label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              className="flex-1"
                              value={tech._endDate ?? ""}
                              onChange={(e) => {
                                const d = e.target.value;
                                const t = tech._endTime || "00:00";
                                updateTechnicianTime(tech.tempId, {
                                  _endDate: d,
                                  timeEnded: d ? localDateTime(d, t) : undefined,
                                });
                              }}
                              data-testid={`input-time-ended-date-${index}`}
                            />
                            <Input
                              type="time"
                              className="flex-1"
                              value={tech._endTime ?? ""}
                              onChange={(e) => {
                                const t = e.target.value;
                                const d = tech._endDate || localDateStr(new Date());
                                updateTechnicianTime(tech.tempId, {
                                  _endTime: t,
                                  timeEnded: t ? localDateTime(d, t) : undefined,
                                });
                              }}
                              data-testid={`input-time-ended-time-${index}`}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`tech-duration-${tech.tempId}`}>Duration (Auto)</Label>
                          <Input
                            id={`tech-duration-${tech.tempId}`}
                            value={tech.duration || ""}
                            readOnly
                            className="bg-muted"
                            placeholder="Auto-calculated"
                            data-testid={`input-duration-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card data-testid="service-details-section">
            <CardHeader>
              <CardTitle>Service Details (Staff Input)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trouble-reported">Trouble Reported</Label>
                  <Textarea
                    id="trouble-reported"
                    value={serviceReport.troubleReported || ""}
                    onChange={(e) => setServiceReport(prev => ({ ...prev, troubleReported: e.target.value }))}
                    placeholder="What issue did the client report?"
                    rows={4}
                    data-testid="textarea-trouble-reported"
                  />
                </div>
                <div>
                  <Label htmlFor="trouble-found">Trouble Found</Label>
                  <Textarea
                    id="trouble-found"
                    value={serviceReport.troubleFound || ""}
                    onChange={(e) => setServiceReport(prev => ({ ...prev, troubleFound: e.target.value }))}
                    placeholder="What actual issues were discovered?"
                    rows={4}
                    data-testid="textarea-trouble-found"
                  />
                </div>
                <div>
                  <Label htmlFor="work-done">Work Done</Label>
                  <Textarea
                    id="work-done"
                    value={serviceReport.workDone || ""}
                    onChange={(e) => setServiceReport(prev => ({ ...prev, workDone: e.target.value }))}
                    placeholder="Describe the work performed..."
                    rows={4}
                    data-testid="textarea-work-done"
                  />
                </div>
                <div>
                  <Label htmlFor="recommendations">Recommendations</Label>
                  <Textarea
                    id="recommendations"
                    value={serviceReport.recommendations || ""}
                    onChange={(e) => setServiceReport(prev => ({ ...prev, recommendations: e.target.value }))}
                    placeholder="Any recommendations for the client..."
                    rows={4}
                    data-testid="textarea-recommendations"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card data-testid="action-buttons-section">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={clearAll}
                    className="flex items-center gap-2"
                    data-testid="button-clear-all"
                  >
                    <Eraser className="h-4 w-4" />
                    Clear All
                  </Button>
                )}
                <Button
                  onClick={saveReport}
                  disabled={saveReportMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4" />
                  {saveReportMutation.isPending ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Report" : "Save Report")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={convertToPDF}
                  className="flex items-center gap-2"
                  data-testid="button-convert-pdf"
                >
                  <FileText className="h-4 w-4" />
                  Convert to PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Client Form Modal */}
      <ClientForm
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}