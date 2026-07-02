import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileText, Users, DollarSign, CreditCard, ShoppingCart, FileCheck, TrendingUp, Eye, Trash2, ReceiptText, CalendarIcon, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { insertAccountsReceivableSchema } from "@shared/schema";
import type { ServiceReport, Quotation, Client, AccountsReceivable, PurchaseOrder } from "@shared/schema";
import type { z } from "zod";

type PaymentEntry = {
  id: string;
  paymentMode: "cheque" | "cash" | "gcash_bank";
  amount: string;
  paymentDate: string;
  chequeNumber?: string;
  referenceNumber?: string;
};

type SalesEntry = {
  id: string;
  date: Date;
  amount: string;
  paymentMethod: string;
  sourceType: string | null;
  sourceId: string | null;
  remarks: string | null;
  dateCreated: Date | null;
};

type OperationalExpense = {
  id: string;
  date: Date;
  amount: string;
  category: string;
  paymentMethod: string;
  vendor: string | null;
  referenceNo: string | null;
  remarks: string | null;
  dateCreated: Date | null;
};

type ARPaymentEntry = {
  id: string;
  paymentMode: "cheque" | "cash" | "gcash_bank";
  amount: string;
  paymentDate: Date;
  chequeNumber?: string;
  referenceNumber?: string;
};

export default function Documents() {
  const { formatCurrency, symbol: currencySymbol, formatDate } = useCurrency();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("service-reports");
  const [reportToDelete, setReportToDelete] = useState<ServiceReport | null>(null);
  const [arDialog, setArDialog] = useState(false);
  const [arLoadingId, setArLoadingId] = useState<string | null>(null);
  const [arPayments, setArPayments] = useState<ARPaymentEntry[]>([]);
  const arForm = useForm<z.infer<typeof insertAccountsReceivableSchema>>({
    resolver: zodResolver(insertAccountsReceivableSchema),
    defaultValues: {
      date: new Date(),
      clientId: "",
      srNumber: "",
      ciNumber: "",
      amount: "0.00",
      firstPaymentAmount: "0.00",
      firstPaymentDate: undefined,
      balance: "0.00",
      status: "unsettled",
      orNumber: "",
      chequeNumber: "",
      dueDate: undefined,
      paymentTerms: "",
    },
  });
  const [updatePaymentsDialog, setUpdatePaymentsDialog] = useState(false);
  const [updatePaymentsAR, setUpdatePaymentsAR] = useState<AccountsReceivable | null>(null);
  const [updatePayments, setUpdatePayments] = useState<PaymentEntry[]>([]);
  const { toast } = useToast();

  const arAmount = arForm.watch("amount");
  const arCurrentStatus = arForm.watch("status");
  const totalARPayments = arPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  useEffect(() => {
    const amountNum = parseFloat(arAmount || "0");
    let calculatedBalance = amountNum - totalARPayments;
    if (calculatedBalance < 0) calculatedBalance = 0;
    arForm.setValue("balance", calculatedBalance.toFixed(2));
    if (arCurrentStatus !== "waived") {
      if (calculatedBalance <= 0) {
        arForm.setValue("status", "paid");
      } else {
        arForm.setValue("status", "unsettled");
      }
    }
  }, [arAmount, totalARPayments, arCurrentStatus, arForm]);

  const addARPayment = () => {
    setArPayments(prev => [...prev, {
      id: crypto.randomUUID(),
      paymentMode: "cash",
      amount: "0.00",
      paymentDate: new Date(),
    }]);
  };
  const removeARPayment = (id: string) => setArPayments(prev => prev.filter(p => p.id !== id));
  const updateARPayment = (id: string, updates: Partial<ARPaymentEntry>) =>
    setArPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/service-reports/${id}`);
      if (!res.ok) throw new Error("Failed to delete service report");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-reports"] });
      toast({ title: "Service report deleted successfully" });
      setReportToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete service report", variant: "destructive" });
      setReportToDelete(null);
    },
  });

  const createARMutation = useMutation<AccountsReceivable, Error, { arData: z.infer<typeof insertAccountsReceivableSchema>; payments: ARPaymentEntry[] }>({
    mutationFn: async ({ arData, payments }) => {
      const res = await apiRequest("POST", "/api/accounts-receivables", { ...arData, payments });
      return res.json();
    },
    onSuccess: (data: AccountsReceivable) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics"] });
      toast({ title: "Success", description: `Accounts Receivable ${data.arNumber} created successfully` });
      setArDialog(false);
      setArPayments([]);
      arForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create Accounts Receivable", variant: "destructive" });
    },
  });

  const updateARPaymentsMutation = useMutation({
    mutationFn: async ({ ar, payments }: { ar: AccountsReceivable; payments: PaymentEntry[] }) => {
      const res = await apiRequest("PATCH", `/api/accounts-receivables/${ar.id}`, { payments });
      if (!res.ok) throw new Error("Failed to update payments");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivables"] });
      toast({ title: "Payments updated", description: "AR payments have been saved." });
      setUpdatePaymentsDialog(false);
      setUpdatePaymentsAR(null);
      setUpdatePayments([]);
    },
    onError: () => {
      toast({ title: "Failed to update payments", variant: "destructive" });
    },
  });

  const openARDialogFromSR = async (report: ServiceReport) => {
    setArLoadingId(report.id);
    try {
      const res = await fetch(`/api/service-reports/${report.id}/line-items`);
      const lineItems: Array<{ amount: string; quantity: number; unitPrice: string }> = res.ok ? await res.json() : [];
      const total = lineItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
      arForm.reset({
        date: new Date(),
        clientId: report.clientId,
        srNumber: report.reportNumber,
        ciNumber: "",
        amount: total > 0 ? total.toFixed(2) : "0.00",
        firstPaymentAmount: "0.00",
        firstPaymentDate: undefined,
        balance: total > 0 ? total.toFixed(2) : "0.00",
        status: "unsettled",
        orNumber: "",
        chequeNumber: "",
        dueDate: undefined,
        paymentTerms: "",
      });
      setArPayments([]);
      setArDialog(true);
    } finally {
      setArLoadingId(null);
    }
  };

  const openUpdatePaymentsDialog = async (ar: AccountsReceivable) => {
    setUpdatePaymentsAR(ar);
    // Load existing payments
    try {
      const res = await fetch(`/api/accounts-receivables/${ar.id}/payments`);
      const existing = res.ok ? await res.json() : [];
      setUpdatePayments(existing.map((p: any) => ({
        id: p.id || crypto.randomUUID(),
        paymentMode: p.paymentMode as "cheque" | "cash" | "gcash_bank",
        amount: p.amount?.toString() || "0.00",
        paymentDate: p.paymentDate ? format(new Date(p.paymentDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        chequeNumber: p.chequeNumber || undefined,
        referenceNumber: p.referenceNumber || undefined,
      })));
    } catch {
      setUpdatePayments([]);
    }
    setUpdatePaymentsDialog(true);
  };

  const openARDialogFromQuotation = (quotation: Quotation) => {
    const total = parseFloat(quotation.total || "0");
    arForm.reset({
      date: new Date(),
      clientId: quotation.clientId || "",
      srNumber: "",
      ciNumber: "",
      amount: total.toFixed(2),
      firstPaymentAmount: "0.00",
      firstPaymentDate: undefined,
      balance: total.toFixed(2),
      status: "unsettled",
      orNumber: "",
      chequeNumber: "",
      dueDate: undefined,
      paymentTerms: "",
    });
    setArPayments([]);
    setArDialog(true);
  };

  const { data: serviceReports = [], isLoading: loadingReports } = useQuery<ServiceReport[]>({
    queryKey: ["/api/service-reports"],
    enabled: activeTab === "service-reports" || activeTab === "completed-jobs"
  });

  const { data: quotations = [], isLoading: loadingQuotations } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    enabled: activeTab === "quotations"
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const { data: accountsReceivables = [], isLoading: loadingAR } = useQuery<AccountsReceivable[]>({
    queryKey: ["/api/accounts-receivables"],
    enabled: activeTab === "accounts-receivables" || activeTab === "service-reports" || activeTab === "quotations"
  });

  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    enabled: activeTab === "purchase-orders"
  });

  const { data: salesEntries = [], isLoading: loadingSales, error: salesError, refetch: refetchSales } = useQuery<SalesEntry[]>({
    queryKey: ["/api/sales-entries"],
    enabled: activeTab === "sales",
    staleTime: 0,
    retry: 2,
  });

  const { data: operationalExpenses = [], isLoading: loadingExpenses } = useQuery<OperationalExpense[]>({
    queryKey: ["/api/operational-expenses"],
    enabled: activeTab === "cash-flow"
  });

  const completedJobs = serviceReports.filter(sr => sr.status === "completed");

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "accepted":
      case "paid":
        return "success";
      case "in_progress":
      case "sent":
        return "info";
      case "scheduled":
      case "draft":
      case "unsettled":
        return "warning";
      case "rejected":
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-documents">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Documents</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">
          View and manage all your business documents in one place
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-documents">
        <TabsList className="grid grid-cols-4 lg:grid-cols-9 gap-2 h-auto p-2 bg-muted/50" data-testid="tabs-list">
          <TabsTrigger 
            value="service-reports" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-service-reports"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs font-medium">Service Reports</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="quotations" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-quotations"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs font-medium">Quotations</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="clients" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-clients"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">Clients</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="accounts-payable" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-accounts-payable"
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-xs font-medium">Accounts Payable</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="accounts-receivables" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-accounts-receivables"
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs font-medium">Accounts Receivables</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="sales" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-sales"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-medium">Sales</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="purchase-orders" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-purchase-orders"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-medium">Purchase Orders</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="completed-jobs" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-completed-jobs"
          >
            <FileCheck className="h-5 w-5" />
            <span className="text-xs font-medium">Completed Jobs</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="cash-flow" 
            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            data-testid="tab-cash-flow"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-medium">Cash Flow</span>
          </TabsTrigger>
        </TabsList>

        {/* Service Reports Tab */}
        <TabsContent value="service-reports" className="space-y-4" data-testid="content-service-reports">
          <Card>
            <CardContent className="p-6">
              {loadingReports ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-reports">
                  Loading service reports...
                </div>
              ) : serviceReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-service-reports">
                  No service reports found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Number</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>AC Details</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceReports.map((report) => (
                        <TableRow key={report.id} data-testid={`row-service-report-${report.id}`}>
                          <TableCell className="font-medium">{report.reportNumber}</TableCell>
                          <TableCell>{getClientName(report.clientId)}</TableCell>
                          <TableCell>
                            {formatDate(report.serviceDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {report.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.technicianName || "-"}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {report.acBrand} {report.acModel}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/service-reports/edit/${report.id}`)}
                                className="flex items-center gap-2"
                                data-testid={`button-edit-report-${report.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/service-reports/pdf-preview/${report.reportNumber}`)}
                                className="flex items-center gap-2"
                                data-testid={`button-preview-pdf-${report.id}`}
                              >
                                <Eye className="h-4 w-4" />
                                Preview PDF
                              </Button>
                              {(() => {
                                const existingAR = accountsReceivables.find(ar => ar.srNumber === report.reportNumber);
                                return existingAR ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openUpdatePaymentsDialog(existingAR)}
                                    className="flex items-center gap-2"
                                    data-testid={`button-update-payments-sr-${report.id}`}
                                  >
                                    <ReceiptText className="h-4 w-4" />
                                    Update Payments
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openARDialogFromSR(report)}
                                    disabled={arLoadingId === report.id}
                                    className="flex items-center gap-2"
                                    data-testid={`button-create-ar-sr-${report.id}`}
                                  >
                                    <ReceiptText className="h-4 w-4" />
                                    {arLoadingId === report.id ? "Loading..." : "Create AR"}
                                  </Button>
                                );
                              })()}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setReportToDelete(report)}
                                className="flex items-center gap-2"
                                data-testid={`button-delete-report-${report.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-4" data-testid="content-quotations">
          <Card>
            <CardContent className="p-6">
              {loadingQuotations ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-quotations">
                  Loading quotations...
                </div>
              ) : quotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-quotations">
                  No quotations found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quotation Number</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.map((quotation) => (
                        <TableRow 
                          key={quotation.id} 
                          data-testid={`row-quotation-${quotation.id}`}
                          className={quotation.status !== 'accepted' ? 'opacity-50' : ''}
                        >
                          <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                          <TableCell>{getClientName(quotation.clientId)}</TableCell>
                          <TableCell>
                            {formatDate(quotation.quotationDate)}
                          </TableCell>
                          <TableCell>
                            {formatDate(quotation.validUntil)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{quotation.title || "-"}</TableCell>
                          <TableCell>{formatCurrency(quotation.total)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(quotation.status)}>
                              {quotation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/quotations/pdf-preview/${quotation.quotationNumber}`)}
                                data-testid={`button-preview-pdf-quotation-${quotation.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openARDialogFromQuotation(quotation)}
                                data-testid={`button-create-ar-quotation-${quotation.id}`}
                              >
                                <ReceiptText className="h-3 w-3 mr-1" />
                                Create AR
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4" data-testid="content-clients">
          <Card>
            <CardContent className="p-6">
              {loadingClients ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-clients">
                  Loading clients...
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-clients">
                  No clients found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Client Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.company || "-"}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{Array.isArray(client.phone) ? client.phone.join(' / ') : client.phone}</TableCell>
                          <TableCell className="max-w-xs truncate">{client.address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {client.clientType}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Payable Tab */}
        <TabsContent value="accounts-payable" className="space-y-4" data-testid="content-accounts-payable">
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AP Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-accounts-payable">
                        No accounts payable records found. This feature is coming soon.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Receivables Tab */}
        <TabsContent value="accounts-receivables" className="space-y-4" data-testid="content-accounts-receivables">
          <Card>
            <CardContent className="p-6">
              {loadingAR ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-ar">
                  Loading accounts receivables...
                </div>
              ) : accountsReceivables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-ar">
                  No accounts receivables found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>AR Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>SR#</TableHead>
                        <TableHead>CI#</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Terms</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountsReceivables.map((ar) => (
                        <TableRow key={ar.id} data-testid={`row-ar-${ar.id}`}>
                          <TableCell className="font-medium">{ar.arNumber}</TableCell>
                          <TableCell>
                            {formatDate(ar.date)}
                          </TableCell>
                          <TableCell>{getClientName(ar.clientId)}</TableCell>
                          <TableCell>{ar.srNumber || "-"}</TableCell>
                          <TableCell>{ar.ciNumber || "-"}</TableCell>
                          <TableCell>{formatCurrency(ar.amount)}</TableCell>
                          <TableCell>{formatCurrency(ar.balance)}</TableCell>
                          <TableCell>
                            {formatDate(ar.dueDate)}
                          </TableCell>
                          <TableCell>{ar.paymentTerms || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ar.status)}>
                              {ar.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4" data-testid="content-sales">
          <Card>
            <CardContent className="p-6">
              {loadingSales ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-sales">
                  Loading sales entries...
                </div>
              ) : salesError ? (
                <div className="text-center py-8 space-y-3" data-testid="text-sales-error">
                  <p className="text-destructive">Failed to load sales entries.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchSales()}>Try Again</Button>
                </div>
              ) : salesEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-sales">
                  No sales entries found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Source Type</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesEntries.map((sale) => (
                        <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                          <TableCell>
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell>{formatCurrency(sale.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sale.paymentMethod.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{sale.sourceType || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{sale.remarks || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4" data-testid="content-purchase-orders">
          <Card>
            <CardContent className="p-6">
              {loadingPOs ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-pos">
                  Loading purchase orders...
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-pos">
                  No purchase orders found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Grand Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map((po) => (
                        <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>
                            {formatDate(po.date)}
                          </TableCell>
                          <TableCell>{po.supplierName}</TableCell>
                          <TableCell>{formatCurrency(po.grandTotal)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(po.status)}>
                              {po.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Jobs Tab */}
        <TabsContent value="completed-jobs" className="space-y-4" data-testid="content-completed-jobs">
          <Card>
            <CardContent className="p-6">
              {loadingReports ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-completed-jobs">
                  Loading completed jobs...
                </div>
              ) : completedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-completed-jobs">
                  No completed jobs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Number</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service Date</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>AC Details</TableHead>
                        <TableHead>Findings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedJobs.map((report) => (
                        <TableRow key={report.id} data-testid={`row-completed-job-${report.id}`}>
                          <TableCell className="font-medium">{report.reportNumber}</TableCell>
                          <TableCell>{getClientName(report.clientId)}</TableCell>
                          <TableCell>
                            {formatDate(report.serviceDate)}
                          </TableCell>
                          <TableCell>{report.technicianName || "-"}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {report.acBrand} {report.acModel}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {report.troubleFound || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cash-flow" className="space-y-4" data-testid="content-cash-flow">
          <Card>
            <CardContent className="p-6">
              {loadingExpenses ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-cash-flow">
                  Loading operational expenses...
                </div>
              ) : operationalExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-cash-flow">
                  No operational expenses found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Reference No</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operationalExpenses.map((expense) => (
                        <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                          <TableCell>
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell>{formatCurrency(expense.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.paymentMethod.replace("_", " ")}</TableCell>
                          <TableCell>{expense.vendor || "-"}</TableCell>
                          <TableCell>{expense.referenceNo || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{expense.remarks || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Service Report Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => { if (!open) setReportToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Report</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-semibold text-destructive">
                Warning: This action cannot be undone.
              </span>
              <span className="block">
                You are about to permanently delete service report{" "}
                <span className="font-semibold">{reportToDelete?.reportNumber}</span>.
                All associated data including line items, technician records, and AC unit details will be removed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReportMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReportMutation.isPending}
              onClick={() => reportToDelete && deleteReportMutation.mutate(reportToDelete.id)}
            >
              {deleteReportMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Payments Dialog */}
      <Dialog open={updatePaymentsDialog} onOpenChange={(open) => { if (!open) { setUpdatePaymentsDialog(false); setUpdatePaymentsAR(null); setUpdatePayments([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Payments</DialogTitle>
            {updatePaymentsAR && (
              <div className="text-sm text-muted-foreground space-y-0.5 pt-1">
                <p><span className="font-medium">AR Number:</span> {updatePaymentsAR.arNumber}</p>
                <p><span className="font-medium">Client:</span> {getClientName(updatePaymentsAR.clientId)}</p>
                <p><span className="font-medium">Total Amount:</span> {formatCurrency(updatePaymentsAR.amount)}</p>
                <p><span className="font-medium">Balance:</span> {formatCurrency(updatePaymentsAR.balance)}</p>
                <p><span className="font-medium">Payment Terms:</span> {updatePaymentsAR.paymentTerms || "—"} <span className="text-xs">(fixed)</span></p>
                {updatePaymentsAR.dueDate && (
                  <p><span className="font-medium">Due Date:</span> {formatDate(updatePaymentsAR.dueDate)}</p>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
            {updatePayments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No payments yet. Add one below.</p>
            )}
            {updatePayments.map((p, idx) => (
              <div key={p.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Payment {idx + 1}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setUpdatePayments(prev => prev.filter(x => x.id !== p.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Mode</Label>
                    <Select value={p.paymentMode} onValueChange={(val) => setUpdatePayments(prev => prev.map(x => x.id === p.id ? { ...x, paymentMode: val as PaymentEntry["paymentMode"] } : x))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="gcash_bank">GCash / Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount ({currencySymbol})</Label>
                    <Input className="h-8 text-xs" type="number" step="0.01" min="0" value={p.amount} onChange={(e) => setUpdatePayments(prev => prev.map(x => x.id === p.id ? { ...x, amount: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Date</Label>
                    <Input className="h-8 text-xs" type="date" value={p.paymentDate} onChange={(e) => setUpdatePayments(prev => prev.map(x => x.id === p.id ? { ...x, paymentDate: e.target.value } : x))} />
                  </div>
                  {p.paymentMode === "cheque" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Cheque No.</Label>
                      <Input className="h-8 text-xs" placeholder="Cheque number" value={p.chequeNumber || ""} onChange={(e) => setUpdatePayments(prev => prev.map(x => x.id === p.id ? { ...x, chequeNumber: e.target.value } : x))} />
                    </div>
                  )}
                  {p.paymentMode === "gcash_bank" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Reference No.</Label>
                      <Input className="h-8 text-xs" placeholder="Reference number" value={p.referenceNumber || ""} onChange={(e) => setUpdatePayments(prev => prev.map(x => x.id === p.id ? { ...x, referenceNumber: e.target.value } : x))} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => setUpdatePayments(prev => [...prev, { id: crypto.randomUUID(), paymentMode: "cash", amount: "", paymentDate: format(new Date(), "yyyy-MM-dd") }])}>
            + Add Payment
          </Button>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUpdatePaymentsDialog(false); setUpdatePaymentsAR(null); setUpdatePayments([]); }} disabled={updateARPaymentsMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => updatePaymentsAR && updateARPaymentsMutation.mutate({ ar: updatePaymentsAR, payments: updatePayments })}
              disabled={updateARPaymentsMutation.isPending}
            >
              {updateARPaymentsMutation.isPending ? "Saving..." : "Save Payments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create AR Dialog — full form */}
      <Dialog open={arDialog} onOpenChange={(open) => {
        if (!open) { setArDialog(false); setArPayments([]); arForm.reset(); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Accounts Receivable</DialogTitle>
          </DialogHeader>
          <Form {...arForm}>
            <form onSubmit={arForm.handleSubmit((data) => createARMutation.mutate({ arData: data, payments: arPayments }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={arForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value instanceof Date && !isNaN(field.value.getTime())
                            ? format(field.value, 'yyyy-MM-dd')
                            : format(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={arForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={arForm.control}
                  name="srNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SR#</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={arForm.control}
                  name="ciNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CI#</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={arForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={arForm.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                          <SelectItem value="Net 7">Net 7 (7 days)</SelectItem>
                          <SelectItem value="Net 15">Net 15 (15 days)</SelectItem>
                          <SelectItem value="Net 30">Net 30 (30 days)</SelectItem>
                          <SelectItem value="Net 45">Net 45 (45 days)</SelectItem>
                          <SelectItem value="Net 60">Net 60 (60 days)</SelectItem>
                          <SelectItem value="Net 90">Net 90 (90 days)</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={arForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? format(new Date(field.value), "MMM dd, yyyy") : "Select date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payments Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Payments</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addARPayment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </div>

                {arPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No payments added yet. Click "Add Payment" to add one.
                  </p>
                )}

                {arPayments.map((payment, index) => (
                  <div key={payment.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Payment
                      </h4>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeARPayment(payment.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Mode</label>
                        <Select
                          value={payment.paymentMode}
                          onValueChange={(value: "cheque" | "cash" | "gcash_bank") => updateARPayment(payment.id, { paymentMode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="gcash_bank">GCash / Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={payment.amount}
                          onChange={(e) => updateARPayment(payment.id, { amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Date</label>
                        <Input
                          type="date"
                          value={payment.paymentDate instanceof Date && !isNaN(payment.paymentDate.getTime())
                            ? format(payment.paymentDate, 'yyyy-MM-dd')
                            : format(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => updateARPayment(payment.id, { paymentDate: new Date(e.target.value) })}
                        />
                      </div>
                      {payment.paymentMode === 'cheque' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Cheque Number</label>
                          <Input
                            value={payment.chequeNumber || ''}
                            onChange={(e) => updateARPayment(payment.id, { chequeNumber: e.target.value })}
                            placeholder="Enter cheque number"
                          />
                        </div>
                      )}
                      {payment.paymentMode === 'gcash_bank' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Reference Number</label>
                          <Input
                            value={payment.referenceNumber || ''}
                            onChange={(e) => updateARPayment(payment.id, { referenceNumber: e.target.value })}
                            placeholder="Enter reference number"
                          />
                        </div>
                      )}
                    </div>
                    {totalARPayments > 0 && index === arPayments.length - 1 && (
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        Total Payments: {formatCurrency(totalARPayments)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={arForm.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={arForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="waived">Waived</SelectItem>
                        <SelectItem value="unsettled">Unsettled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={arForm.control}
                  name="orNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OR#</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={arForm.control}
                  name="chequeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque#</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { arForm.reset(); setArPayments([]); }}
                >
                  Clear All
                </Button>
                <Button type="submit" disabled={createARMutation.isPending}>
                  {createARMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
