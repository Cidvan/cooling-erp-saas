import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccountsReceivableSchema, type AccountsReceivable, type ArPayment, type Client } from "@shared/schema";
import { ArrowLeft, Plus, Pencil, Trash2, CalendarIcon, Eye, CreditCard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"; 
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { z } from "zod";

type FilterView = "weekly" | "monthly" | "year";

type PaymentEntry = {
  id: string;
  paymentMode: "cheque" | "cash" | "gcash_bank";
  amount: string;
  paymentDate: Date;
  chequeNumber?: string;
  referenceNumber?: string;
};

export default function AccountsReceivables() {
  const [location, setLocation] = useLocation();
  const [filterView, setFilterView] = useState<FilterView>("monthly");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAR, setEditingAR] = useState<AccountsReceivable | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [viewingAR, setViewingAR] = useState<AccountsReceivable | null>(null);
  const [viewPayments, setViewPayments] = useState<ArPayment[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdatePaymentOpen, setIsUpdatePaymentOpen] = useState(false);
  const [updatePaymentAR, setUpdatePaymentAR] = useState<AccountsReceivable | null>(null);
  const [updatePaymentEntries, setUpdatePaymentEntries] = useState<PaymentEntry[]>([]);
  const { toast} = useToast();

  // Get query parameters for pre-populating fields (e.g., ?srNumber=SR-001&clientId=123)
  const params = new URLSearchParams(window.location.search);

  const { data: ars = [] } = useQuery<AccountsReceivable[]>({
    queryKey: ['/api/accounts-receivables'],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const form = useForm<z.infer<typeof insertAccountsReceivableSchema>>({
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

  // Watch amount to auto-calculate balance and status
  const amount = form.watch("amount");
  const currentStatus = form.watch("status");

  // Calculate total payments
  const totalPayments = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || "0"), 0);

  useEffect(() => {
    const amountNum = parseFloat(amount || "0");
    let calculatedBalance = amountNum - totalPayments;
    
    // Clamp balance to 0 if negative (overpayment)
    if (calculatedBalance < 0) {
      calculatedBalance = 0;
    }
    
    // Update balance
    form.setValue("balance", calculatedBalance.toFixed(2));
    
    // Auto-set status based on balance (only if not manually set to "waived")
    if (currentStatus !== "waived") {
      if (calculatedBalance <= 0) {
        form.setValue("status", "paid");
      } else {
        form.setValue("status", "unsettled");
      }
    }
  }, [amount, totalPayments, currentStatus, form]);

  // Helper functions for managing payments
  const addPayment = () => {
    setPayments(prev => [...prev, {
      id: crypto.randomUUID(),
      paymentMode: "cash",
      amount: "0.00",
      paymentDate: new Date(),
    }]);
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const updatePayment = (id: string, updates: Partial<PaymentEntry>) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // Auto-open dialog if query parameters are present
  useEffect(() => {
    if (params.get('srNumber') || params.get('clientId')) {
      handleCreateNew();
      // Clean up URL parameters after opening dialog
      window.history.replaceState({}, '', location.split('?')[0]);
    }
  }, []); // Run only once on mount

  const createARMutation = useMutation<AccountsReceivable, Error, { arData: z.infer<typeof insertAccountsReceivableSchema>, payments: PaymentEntry[] }>({
    mutationFn: async ({ arData, payments }) => {
      const response = await apiRequest('POST', '/api/accounts-receivables', { ...arData, payments });
      return response.json();
    },
    onSuccess: (data: AccountsReceivable) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      toast({
        title: "Success",
        description: `Accounts Receivable ${data.arNumber} created successfully`,
      });
      setIsDialogOpen(false);
      setEditingAR(null);
      setPayments([]);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create accounts receivable",
        variant: "destructive",
      });
    },
  });

  const updateARMutation = useMutation<AccountsReceivable, Error, { id: string; data: z.infer<typeof insertAccountsReceivableSchema>; payments: PaymentEntry[] }>({
    mutationFn: async ({ id, data, payments }) => {
      const response = await apiRequest('PATCH', `/api/accounts-receivables/${id}`, { ...data, payments });
      return response.json();
    },
    onSuccess: (data: AccountsReceivable) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      toast({
        title: "Success",
        description: `Accounts Receivable ${data.arNumber} updated successfully`,
      });
      setIsDialogOpen(false);
      setEditingAR(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update accounts receivable",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertAccountsReceivableSchema>) => {
    if (editingAR) {
      updateARMutation.mutate({ id: editingAR.id, data, payments });
    } else {
      createARMutation.mutate({ arData: data, payments });
    }
  };

  const handleClearAll = () => {
    form.reset({
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
    });
    setPayments([]);
  };

  const handleEdit = async (ar: AccountsReceivable) => {
    setEditingAR(ar);
    form.reset({
      date: new Date(ar.date),
      clientId: ar.clientId,
      srNumber: ar.srNumber || "",
      ciNumber: ar.ciNumber || "",
      amount: ar.amount.toString(),
      firstPaymentAmount: ar.firstPaymentAmount?.toString() || "0.00",
      firstPaymentDate: ar.firstPaymentDate ? new Date(ar.firstPaymentDate) : undefined,
      balance: ar.balance.toString(),
      status: ar.status,
      orNumber: ar.orNumber || "",
      chequeNumber: ar.chequeNumber || "",
      dueDate: ar.dueDate ? new Date(ar.dueDate) : undefined,
      paymentTerms: ar.paymentTerms || "",
    });
    // Load existing payments so they appear in the stacking
    try {
      const resp = await fetch(`/api/accounts-receivables/${ar.id}/payments`);
      const existing: ArPayment[] = await resp.json();
      setPayments(existing.map(p => ({
        id: p.id,
        paymentMode: p.paymentMode as "cheque" | "cash" | "gcash_bank",
        amount: p.amount.toString(),
        paymentDate: new Date(p.paymentDate),
        chequeNumber: p.chequeNumber || undefined,
        referenceNumber: p.referenceNumber || undefined,
      })));
    } catch {
      setPayments([]);
    }
    setIsDialogOpen(true);
  };

  const handleViewPayments = async (ar: AccountsReceivable) => {
    setViewingAR(ar);
    try {
      const resp = await fetch(`/api/accounts-receivables/${ar.id}/payments`);
      const data: ArPayment[] = await resp.json();
      setViewPayments(data);
    } catch {
      setViewPayments([]);
    }
    setIsViewDialogOpen(true);
  };

  const handleOpenUpdatePayment = async (ar: AccountsReceivable) => {
    setUpdatePaymentAR(ar);
    try {
      const resp = await fetch(`/api/accounts-receivables/${ar.id}/payments`);
      const existing: ArPayment[] = await resp.json();
      setUpdatePaymentEntries(existing.map(p => ({
        id: p.id,
        paymentMode: p.paymentMode as "cheque" | "cash" | "gcash_bank",
        amount: p.amount.toString(),
        paymentDate: new Date(p.paymentDate),
        chequeNumber: p.chequeNumber || undefined,
        referenceNumber: p.referenceNumber || undefined,
      })));
    } catch {
      setUpdatePaymentEntries([]);
    }
    setIsUpdatePaymentOpen(true);
  };

  const updatePaymentsMutation = useMutation({
    mutationFn: async ({ ar, entries }: { ar: AccountsReceivable; entries: PaymentEntry[] }) => {
      const totalPaid = entries.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
      const balance = Math.max(0, parseFloat(ar.amount.toString()) - totalPaid).toFixed(2);
      const status = parseFloat(balance) <= 0 ? "paid" : "unsettled";
      const response = await apiRequest('PATCH', `/api/accounts-receivables/${ar.id}`, {
        balance,
        status,
        firstPaymentAmount: entries.length > 0 ? entries[0].amount : "0.00",
        firstPaymentDate: entries.length > 0 ? entries[0].paymentDate : null,
        payments: entries,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      toast({ title: "Success", description: "Payments updated successfully" });
      setIsUpdatePaymentOpen(false);
      setUpdatePaymentAR(null);
      setUpdatePaymentEntries([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payments", variant: "destructive" });
    },
  });

  const handleCreateNew = () => {
    setEditingAR(null);
    
    // Pre-populate from query parameters if available
    const srNumber = params.get('srNumber') || "";
    const clientId = params.get('clientId') || "";
    
    form.reset({
      date: new Date(),
      clientId: clientId,
      srNumber: srNumber,
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
    });
    setPayments([]);
    setIsDialogOpen(true);
  };

  // Map AR data with client names
  const arsWithClients = ars.map(ar => {
    const client = clients.find(c => c.id === ar.clientId);
    return {
      ...ar,
      clientName: client?.name || 'Unknown',
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals
  const totalReceivables = arsWithClients
    .filter(ar => ar.status === 'unsettled')
    .reduce((sum, ar) => sum + parseFloat(ar.balance.toString()), 0);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/sales-financial')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Accounts Receivables</h1>
              <p className="text-muted-foreground mt-1">Track and manage client receivables</p>
            </div>
          </div>

          <Button onClick={handleCreateNew} data-testid="button-create-ar">
            <Plus className="h-4 w-4 mr-2" />
            Create New Receivables
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingAR(null);
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAR ? 'Edit Accounts Receivable' : 'Create New Accounts Receivable'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                              data-testid="input-ar-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ar-customer">
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
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
                      control={form.control}
                      name="srNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SR#</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} data-testid="input-ar-sr-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ciNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CI#</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} data-testid="input-ar-ci-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-ar-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ar-payment-terms">
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
                      control={form.control}
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
                                  data-testid="button-ar-due-date"
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPayment}
                        data-testid="button-add-payment"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment
                      </Button>
                    </div>

                    {payments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No payments added yet. Click "Add Payment" to add one.
                      </p>
                    )}

                    {payments.map((payment, index) => (
                      <div key={payment.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Payment</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePayment(payment.id)}
                            data-testid={`button-remove-payment-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Mode</label>
                            <Select
                              value={payment.paymentMode}
                              onValueChange={(value: "cheque" | "cash" | "gcash_bank") => updatePayment(payment.id, { paymentMode: value })}
                            >
                              <SelectTrigger data-testid={`select-payment-mode-${index}`}>
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
                              onChange={(e) => updatePayment(payment.id, { amount: e.target.value })}
                              data-testid={`input-payment-amount-${index}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Date</label>
                            <Input
                              type="date"
                              value={payment.paymentDate instanceof Date && !isNaN(payment.paymentDate.getTime()) 
                                ? format(payment.paymentDate, 'yyyy-MM-dd') 
                                : format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => updatePayment(payment.id, { paymentDate: new Date(e.target.value) })}
                              data-testid={`input-payment-date-${index}`}
                            />
                          </div>

                          {payment.paymentMode === 'cheque' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Cheque Number</label>
                              <Input
                                value={payment.chequeNumber || ''}
                                onChange={(e) => updatePayment(payment.id, { chequeNumber: e.target.value })}
                                placeholder="Enter cheque number"
                                data-testid={`input-cheque-number-${index}`}
                              />
                            </div>
                          )}

                          {payment.paymentMode === 'gcash_bank' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reference Number</label>
                              <Input
                                value={payment.referenceNumber || ''}
                                onChange={(e) => updatePayment(payment.id, { referenceNumber: e.target.value })}
                                placeholder="Enter reference number"
                                data-testid={`input-reference-number-${index}`}
                              />
                            </div>
                          )}
                        </div>

                        {totalPayments > 0 && index === payments.length - 1 && (
                          <div className="text-sm text-muted-foreground pt-2 border-t">
                            Total Payments: ₱{totalPayments.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balance (Auto-calculated)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} disabled className="bg-muted" data-testid="input-ar-balance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ar-status">
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
                      control={form.control}
                      name="orNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OR#</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} data-testid="input-ar-or-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="chequeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cheque#</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} data-testid="input-ar-cheque-number" />
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
                      onClick={handleClearAll}
                      data-testid="button-clear-all"
                    >
                      Clear All
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createARMutation.isPending || updateARMutation.isPending} 
                      data-testid="button-save-ar"
                    >
                      {createARMutation.isPending || updateARMutation.isPending 
                        ? "Saving..." 
                        : editingAR 
                        ? "Update" 
                        : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
      </div>

      {/* View Payments Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payments — {viewingAR?.arNumber}</DialogTitle>
          </DialogHeader>
          {viewPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paymentNumber}</TableCell>
                    <TableCell>{format(new Date(p.paymentDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="capitalize">{p.paymentMode.replace('_', '/')}</TableCell>
                    <TableCell>₱{parseFloat(p.amount.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.chequeNumber || p.referenceNumber || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="border-t pt-3 text-sm font-medium text-right">
            Total: ₱{viewPayments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filterView === "weekly" ? "default" : "outline"}
              onClick={() => setFilterView("weekly")}
              data-testid="button-filter-weekly"
            >
              Weekly
            </Button>
            <Button
              variant={filterView === "monthly" ? "default" : "outline"}
              onClick={() => setFilterView("monthly")}
              data-testid="button-filter-monthly"
            >
              Monthly
            </Button>
            <Button
              variant={filterView === "year" ? "default" : "outline"}
              onClick={() => setFilterView("year")}
              data-testid="button-filter-year"
            >
              Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="mb-6" data-testid="card-total-receivables">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivables Due</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary" data-testid="text-total-receivables">
            ₱{totalReceivables.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card data-testid="card-receivables-table">
        <CardHeader>
          <CardTitle>Accounts Receivable Records</CardTitle>
        </CardHeader>
        <CardContent>
          {arsWithClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accounts receivable records
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AR#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>SR#</TableHead>
                  <TableHead>CI#</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>1st Payment</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>OR#</TableHead>
                  <TableHead>Cheque#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arsWithClients.map((ar) => (
                  <TableRow key={ar.id} data-testid={`row-ar-${ar.id}`}>
                    <TableCell data-testid={`text-ar-number-${ar.id}`}>{ar.arNumber}</TableCell>
                    <TableCell>{format(new Date(ar.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{ar.clientName}</TableCell>
                    <TableCell>{ar.srNumber || '-'}</TableCell>
                    <TableCell>{ar.ciNumber || '-'}</TableCell>
                    <TableCell>₱{parseFloat(ar.amount.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      {ar.firstPaymentAmount && parseFloat(ar.firstPaymentAmount.toString()) > 0
                        ? `₱${parseFloat(ar.firstPaymentAmount.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>₱{parseFloat(ar.balance.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{ar.dueDate ? format(new Date(ar.dueDate), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell>{ar.paymentTerms || '-'}</TableCell>
                    <TableCell>{ar.orNumber || '-'}</TableCell>
                    <TableCell>{ar.chequeNumber || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        ar.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : ar.status === 'waived'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ar.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewPayments(ar)}
                          data-testid={`button-view-ar-${ar.id}`}
                          title="View payments"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenUpdatePayment(ar)}
                          disabled={ar.status === 'paid' || ar.status === 'waived'}
                          data-testid={`button-update-payment-${ar.id}`}
                          title="Update payments"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(ar)}
                          data-testid={`button-edit-ar-${ar.id}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Payments Dialog */}
      {updatePaymentAR && (() => {
        const totalUpd = updatePaymentEntries.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
        const balanceUpd = Math.max(0, parseFloat(updatePaymentAR.amount.toString()) - totalUpd);
        return (
          <Dialog open={isUpdatePaymentOpen} onOpenChange={(open) => {
            if (!open) { setIsUpdatePaymentOpen(false); setUpdatePaymentAR(null); setUpdatePaymentEntries([]); }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Update Payments — {updatePaymentAR.arNumber}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Total Amount: ₱{parseFloat(updatePaymentAR.amount.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment entries */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Payments</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUpdatePaymentEntries(prev => [...prev, {
                        id: crypto.randomUUID(),
                        paymentMode: "cash",
                        amount: "0.00",
                        paymentDate: new Date(),
                      }])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </div>

                  {updatePaymentEntries.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payments added yet. Click "Add Payment" to add one.
                    </p>
                  )}

                  {updatePaymentEntries.map((payment, index) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Payment
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setUpdatePaymentEntries(prev => prev.filter(p => p.id !== payment.id))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payment Mode</label>
                          <Select
                            value={payment.paymentMode}
                            onValueChange={(value: "cheque" | "cash" | "gcash_bank") =>
                              setUpdatePaymentEntries(prev => prev.map(p => p.id === payment.id ? { ...p, paymentMode: value } : p))
                            }
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
                            onChange={(e) =>
                              setUpdatePaymentEntries(prev => prev.map(p => p.id === payment.id ? { ...p, amount: e.target.value } : p))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payment Date</label>
                          <Input
                            type="date"
                            value={payment.paymentDate instanceof Date && !isNaN(payment.paymentDate.getTime())
                              ? format(payment.paymentDate, 'yyyy-MM-dd')
                              : format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) =>
                              setUpdatePaymentEntries(prev => prev.map(p => p.id === payment.id ? { ...p, paymentDate: new Date(e.target.value) } : p))
                            }
                          />
                        </div>
                        {payment.paymentMode === 'cheque' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cheque Number</label>
                            <Input
                              value={payment.chequeNumber || ''}
                              onChange={(e) =>
                                setUpdatePaymentEntries(prev => prev.map(p => p.id === payment.id ? { ...p, chequeNumber: e.target.value } : p))
                              }
                              placeholder="Enter cheque number"
                            />
                          </div>
                        )}
                        {payment.paymentMode === 'gcash_bank' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Reference Number</label>
                            <Input
                              value={payment.referenceNumber || ''}
                              onChange={(e) =>
                                setUpdatePaymentEntries(prev => prev.map(p => p.id === payment.id ? { ...p, referenceNumber: e.target.value } : p))
                              }
                              placeholder="Enter reference number"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Balance (Auto-calculated)</label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={balanceUpd.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      balanceUpd <= 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {balanceUpd <= 0 ? 'Paid' : 'Unsettled'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setIsUpdatePaymentOpen(false); setUpdatePaymentAR(null); setUpdatePaymentEntries([]); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => updatePaymentsMutation.mutate({ ar: updatePaymentAR, entries: updatePaymentEntries })}
                    disabled={updatePaymentsMutation.isPending}
                  >
                    {updatePaymentsMutation.isPending ? "Saving..." : "Save Payments"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
