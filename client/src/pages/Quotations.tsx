import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, FileText, Save, Eraser, Edit, Copy, Send, FileCheck, UserPlus, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Client, Quotation, QuotationLineItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import ClientForm from "@/components/ClientForm";
import { useCurrency } from "@/hooks/use-currency";

interface QuotationLineItemWithId extends QuotationLineItem {
  tempId: string; // for tracking during editing
}

export default function Quotations() {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quotation, setQuotation] = useState<Partial<Quotation>>({
    status: "draft",
    title: "",
  });
  const [lineItems, setLineItems] = useState<QuotationLineItemWithId[]>([]);
  const [discount, setDiscount] = useState("0");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  
  // List view state
  const [listSearchTerm, setListSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [viewLineItems, setViewLineItems] = useState<QuotationLineItem[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients from API
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch quotations from API
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations'],
  });

  // Mutation for updating quotation status
  const updateQuotationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest('PUT', `/api/quotations/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quotation status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for duplicating quotations
  const duplicateQuotationMutation = useMutation({
    mutationFn: async (quotation: Quotation) => {
      const lineItems = await fetch(`/api/quotations/${quotation.id}/line-items`).then(res => res.json());
      
      const duplicatedQuotation = {
        ...quotation,
        quotationNumber: `${quotation.quotationNumber}-COPY`,
        status: "draft",
        dateCreated: undefined,
        lastModified: undefined,
        id: undefined
      };

      return apiRequest('POST', '/api/quotations', {
        ...duplicatedQuotation,
        lineItems
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation duplicated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate quotation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/quotations/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Quotation deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quotation", variant: "destructive" });
    },
  });

  const handleViewQuotation = async (quotation: Quotation) => {
    const items = await fetch(`/api/quotations/${quotation.id}/line-items`).then(r => r.json());
    setViewLineItems(items);
    setViewingQuotation(quotation);
  };

  // Mutation for saving quotations
  const saveQuotationMutation = useMutation({
    mutationFn: async (data: { quotation: Partial<Quotation>; lineItems: QuotationLineItemWithId[] }) => {
      // Normalize status values
      const statusMap: Record<string, string> = {
        "Draft": "draft",
        "Sent": "sent", 
        "Accepted": "accepted",
        "Rejected": "rejected",
        "draft": "draft",
        "sent": "sent",
        "accepted": "accepted",
        "rejected": "rejected"
      };

      const normalizedQuotation = {
        ...data.quotation,
        status: statusMap[data.quotation.status || "draft"] || "draft",
        title: data.quotation.title || "",
        quotationDate: data.quotation.quotationDate ? new Date(data.quotation.quotationDate) : new Date(),
        validUntil: data.quotation.validUntil ? new Date(data.quotation.validUntil) : undefined,
      };

      // Prepare line items for API (remove tempId and ensure proper types)
      const apiLineItems = data.lineItems.map(item => ({
        quantity: parseInt(item.quantity.toString()) || 1,
        unitDescription: item.unitDescription,
        unitPrice: parseFloat(item.unitPrice.toString()).toFixed(2),
        amount: parseFloat(item.amount.toString()).toFixed(2),
        orderIndex: item.orderIndex || 0,
      }));

      // If editing an existing quotation, use PUT to update it
      if (editingQuotation && editingQuotation.id) {
        return apiRequest('PUT', `/api/quotations/${editingQuotation.id}`, {
          ...normalizedQuotation,
          lineItems: apiLineItems
        });
      }

      // Otherwise create a new quotation
      return apiRequest('POST', '/api/quotations', {
        ...normalizedQuotation,
        lineItems: apiLineItems
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingQuotation ? "Quotation updated successfully" : "Quotation saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      if (selectedClient) {
        queryClient.invalidateQueries({ queryKey: ['/api/quotations', selectedClient.id] });
      }
      clearForm();
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingQuotation ? 'update' : 'save'} quotation`,
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
    const newItem: QuotationLineItemWithId = {
      id: "",
      quotationId: "",
      tempId: Date.now().toString(),
      quantity: 1,
      unitDescription: "",
      unitPrice: "0",
      amount: "0",
      orderIndex: lineItems.length,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (tempId: string, field: keyof QuotationLineItemWithId, value: string | number) => {
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

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const discountAmount = Math.max(0, Number(discount) || 0);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const tax = taxEnabled ? afterDiscount * 0.12 : 0;
    const total = afterDiscount + tax;
    
    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSubmit = () => {
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!quotation.quotationNumber?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a quotation number",
        variant: "destructive",
      });
      return;
    }

    if (!quotation.validUntil) {
      toast({
        title: "Error",
        description: "Please set a valid until date",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();
    const quotationData = {
      ...quotation,
      clientId: selectedClient.id,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      taxEnabled,
      total: totals.total,
    };

    saveQuotationMutation.mutate({ quotation: quotationData, lineItems });
  };

  const clearForm = () => {
    setQuotation({ status: "draft", title: "" });
    setLineItems([]);
    setSelectedClient(null);
    setSearchTerm("");
    setEditingQuotation(null);
    setDiscount("0");
    setTaxEnabled(true);
  };

  // Helper function to get status badge properties with proper color coding
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'draft': 
        return { variant: 'secondary' as const, className: '' };
      case 'sent': 
        return { 
          variant: 'default' as const, 
          className: 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:text-primary border-transparent'
        };
      case 'accepted': 
        return { 
          variant: 'default' as const, 
          className: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800'
        };
      case 'rejected': 
        return { variant: 'destructive' as const, className: '' };
      default: 
        return { variant: 'secondary' as const, className: '' };
    }
  };

  // Filter quotations based on search term and status
  const filteredQuotations = useMemo(() => {
    return quotations.filter(quotation => {
      const matchesSearch = !listSearchTerm || 
        (quotation.quotationNumber || "").toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        (quotation.description && quotation.description.toLowerCase().includes(listSearchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotations, listSearchTerm, statusFilter]);

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  // Action handlers
  const handleEditQuotation = async (quotation: Quotation) => {
    try {
      // Fetch line items for the quotation
      const lineItems = await fetch(`/api/quotations/${quotation.id}/line-items`).then(res => res.json());
      
      // Find and set the client
      const client = clients.find(c => c.id === quotation.clientId);
      if (client) {
        setSelectedClient(client);
      }
      
      // Set quotation data
      setQuotation({
        ...quotation,
        title: quotation.title || "",
        validUntil: quotation.validUntil ? new Date(quotation.validUntil) : undefined
      });
      setDiscount(quotation.discount ?? "0");
      setTaxEnabled(quotation.taxEnabled ?? true);
      
      // Convert line items to have tempId for editing
      const editableLineItems = lineItems.map((item: QuotationLineItem) => ({
        ...item,
        tempId: Date.now().toString() + Math.random().toString()
      }));
      setLineItems(editableLineItems);
      
      // Switch to create tab for editing
      setActiveTab("create");
      setEditingQuotation(quotation);
      
      toast({
        title: "Editing Quotation",
        description: `Loading quotation ${quotation.quotationNumber} for editing`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load quotation for editing",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateQuotation = (quotation: Quotation) => {
    duplicateQuotationMutation.mutate(quotation);
  };

  const handleSendQuotation = (quotation: Quotation) => {
    updateQuotationStatusMutation.mutate({ id: quotation.id, status: "sent" });
  };

  const handleConvertToInvoice = async (quotation: Quotation) => {
    try {
      const response = await apiRequest('POST', `/api/invoices/from-quotation/${quotation.id}`, {});
      
      toast({
        title: "Success",
        description: `Quotation ${quotation.quotationNumber} converted to invoice successfully`,
      });
      
      // Optionally navigate to invoice or just invalidate quotations
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert quotation to invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClientCreated = (newClient: Client) => {
    setSelectedClient(newClient);
    setQuotation(prev => ({ ...prev, clientId: newClient.id }));
    toast({
      title: "Success",
      description: `Client ${newClient.name} created and selected`,
    });
  };

  const totals = calculateTotals();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Quotations</h1>
          <p className="text-muted-foreground">Create and manage client quotations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="list" data-testid="tab-quotation-list">All Quotations</TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-quotation">
              {editingQuotation ? `Edit ${editingQuotation.quotationNumber}` : "Create Quotation"}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Quotations List Tab */}
        <TabsContent value="list" className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quotations..."
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-quotations"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quotations List */}
            {quotationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading quotations...
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quotations found matching your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotations.map((quotation) => (
                  <Card key={quotation.id} className={`hover-elevate ${quotation.status !== 'accepted' ? 'opacity-50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg" data-testid={`text-quotation-number-${quotation.id}`}>
                              {quotation.quotationNumber}
                            </h3>
                            <Badge 
                              {...getStatusBadgeProps(quotation.status)}
                              data-testid={`badge-status-${quotation.id}`}
                            >
                              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground" data-testid={`text-client-name-${quotation.id}`}>
                            {getClientName(quotation.clientId)}
                          </p>
                          {quotation.description && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-description-${quotation.id}`}>
                              {quotation.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Created: {quotation.dateCreated ? new Date(quotation.dateCreated).toLocaleDateString() : "—"}</span>
                            {quotation.validUntil && (
                              <span>Valid until: {new Date(quotation.validUntil).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-2xl font-bold" data-testid={`text-total-${quotation.id}`}>
                            {formatCurrency(quotation.total)}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewQuotation(quotation)}
                              data-testid={`button-view-${quotation.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditQuotation(quotation)}
                              data-testid={`button-edit-${quotation.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {quotation.status === 'draft' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSendQuotation(quotation)}
                                disabled={updateQuotationStatusMutation.isPending}
                                data-testid={`button-send-${quotation.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteQuotationMutation.mutate(quotation.id)}
                              disabled={deleteQuotationMutation.isPending}
                              data-testid={`button-delete-${quotation.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Create Quotation Tab */}
        <TabsContent value="create" className="flex-1 space-y-6 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Create New Quotation</h2>
                <p className="text-muted-foreground">Fill in the details to create a new quotation</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={clearForm}
                  data-testid="button-clear-form"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={saveQuotationMutation.isPending}
                  data-testid="button-save-quotation"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Quotation
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Client Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Client Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="clientSearch">Search Client</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="clientSearch"
                          placeholder="Search by name or company..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-client-search"
                        />
                      </div>
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

                  {searchTerm && filteredClients.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-3 hover-elevate cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setSelectedClient(client);
                            setSearchTerm("");
                          }}
                          data-testid={`client-option-${client.id}`}
                        >
                          <div className="font-medium">{client.name}</div>
                          {client.company && (
                            <div className="text-sm text-muted-foreground">{client.company}</div>
                          )}
                          <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedClient && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold" data-testid="text-selected-client-name">{selectedClient.name}</h3>
                            {selectedClient.company && (
                              <p className="text-sm text-muted-foreground">{selectedClient.company}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                            <p className="text-sm text-muted-foreground">{Array.isArray(selectedClient.phone) ? selectedClient.phone.join(' / ') : selectedClient.phone}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedClient(null)}
                            data-testid="button-clear-client"
                          >
                            Clear
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Quotation Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Quotation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quotationNumber">Quotation Number</Label>
                      <Input
                        id="quotationNumber"
                        placeholder="Auto-generated if left empty"
                        value={quotation.quotationNumber || ""}
                        onChange={(e) => setQuotation(prev => ({ ...prev, quotationNumber: e.target.value }))}
                        data-testid="input-quotation-number"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={quotation.status || "draft"} 
                        onValueChange={(value) => setQuotation(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="validUntil">Valid Until</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : ""}
                        onChange={(e) => setQuotation(prev => ({ ...prev, validUntil: e.target.value ? new Date(e.target.value) : undefined }))}
                        data-testid="input-valid-until"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Subject</Label>
                    <Input
                      id="title"
                      placeholder="Quotation subject..."
                      value={quotation.title || ""}
                      onChange={(e) => setQuotation(prev => ({ ...prev, title: e.target.value }))}
                      data-testid="input-subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Quotation description..."
                      value={quotation.description || ""}
                      onChange={(e) => setQuotation(prev => ({ ...prev, description: e.target.value }))}
                      data-testid="textarea-description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="terms">Terms & Conditions</Label>
                      <Textarea
                        id="terms"
                        placeholder="Payment terms, delivery conditions..."
                        value={quotation.terms || ""}
                        onChange={(e) => setQuotation(prev => ({ ...prev, terms: e.target.value }))}
                        data-testid="textarea-terms"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Internal Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Internal notes (not visible to client)..."
                        value={quotation.notes || ""}
                        onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))}
                        data-testid="textarea-notes"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Quotation Items</span>
                    <Button onClick={addLineItem} size="sm" data-testid="button-add-line-item">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lineItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added yet. Click "Add Item" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lineItems.map((item, index) => (
                        <div key={item.tempId} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-md">
                          <div className="col-span-12 md:col-span-5">
                            <Label htmlFor={`description-${item.tempId}`}>Description</Label>
                            <Input
                              id={`description-${item.tempId}`}
                              placeholder="Item description"
                              value={item.unitDescription}
                              onChange={(e) => updateLineItem(item.tempId, 'unitDescription', e.target.value)}
                              data-testid={`input-description-${index}`}
                            />
                          </div>
                          
                          <div className="col-span-4 md:col-span-2">
                            <Label htmlFor={`quantity-${item.tempId}`}>Quantity</Label>
                            <Input
                              id={`quantity-${item.tempId}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                              data-testid={`input-quantity-${index}`}
                            />
                          </div>
                          
                          <div className="col-span-4 md:col-span-2">
                            <Label htmlFor={`unitPrice-${item.tempId}`}>Unit Price ({currencySymbol})</Label>
                            <Input
                              id={`unitPrice-${item.tempId}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.tempId, 'unitPrice', e.target.value)}
                              data-testid={`input-unit-price-${index}`}
                            />
                          </div>
                          
                          <div className="col-span-3 md:col-span-2">
                            <Label>Amount ({currencySymbol})</Label>
                            <div className="text-lg font-semibold p-2" data-testid={`text-amount-${index}`}>
                              {formatCurrency(item.amount)}
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(item.tempId)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {lineItems.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      {/* Discount & Tax controls */}
                      <div className="flex flex-wrap gap-6 items-end mb-4">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="discount">Discount ({currencySymbol})</Label>
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="w-40"
                            data-testid="input-discount"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label>12% VAT</Label>
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={taxEnabled}
                              onCheckedChange={setTaxEnabled}
                              data-testid="switch-tax-enabled"
                            />
                            <span className="text-sm text-muted-foreground">{taxEnabled ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-lg">
                          <span>Subtotal:</span>
                          <span data-testid="text-subtotal">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        {Number(totals.discount) > 0 && (
                          <div className="flex justify-between text-lg text-muted-foreground">
                            <span>Discount:</span>
                            <span data-testid="text-discount">- {formatCurrency(totals.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg">
                          <span>Tax (12% VAT):</span>
                          <span data-testid="text-tax">{taxEnabled ? formatCurrency(totals.tax) : "—"}</span>
                        </div>
                        
                        <Separator />
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total:</span>
                          <span data-testid="text-total">{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Client Form Modal */}
      <ClientForm
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onClientCreated={handleClientCreated}
      />

      {/* View Quotation Dialog */}
      {viewingQuotation && (
        <Dialog open={!!viewingQuotation} onOpenChange={() => setViewingQuotation(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {viewingQuotation.quotationNumber}
                <Badge {...getStatusBadgeProps(viewingQuotation.status)}>
                  {viewingQuotation.status.charAt(0).toUpperCase() + viewingQuotation.status.slice(1)}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{getClientName(viewingQuotation.clientId)}</p>
                </div>
                {viewingQuotation.quotationDate && (
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(viewingQuotation.quotationDate).toLocaleDateString()}</p>
                  </div>
                )}
                {viewingQuotation.validUntil && (
                  <div>
                    <p className="text-muted-foreground">Valid Until</p>
                    <p className="font-medium">{new Date(viewingQuotation.validUntil).toLocaleDateString()}</p>
                  </div>
                )}
                {viewingQuotation.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p className="font-medium">{viewingQuotation.description}</p>
                  </div>
                )}
                {viewingQuotation.terms && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Terms</p>
                    <p className="font-medium">{viewingQuotation.terms}</p>
                  </div>
                )}
                {viewingQuotation.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{viewingQuotation.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {viewLineItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewLineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.unitDescription}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(viewingQuotation.subtotal)}</span>
                </div>
                {Number(viewingQuotation.discount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>- {formatCurrency(viewingQuotation.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (12% VAT)</span>
                  <span>{viewingQuotation.taxEnabled ? formatCurrency(viewingQuotation.tax) : "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(viewingQuotation.total)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}