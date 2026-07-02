import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, ExternalLink, MoreVertical, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import type { AccountsReceivable, OperationalExpense, SalesEntry, AccountsPayable, PurchaseOrder, PurchaseOrderItem, Client } from "@shared/schema";
import { insertOperationalExpenseSchema, insertSalesEntrySchema } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

// Expense form schema
const expenseFormSchema = insertOperationalExpenseSchema.extend({
  date: z.string(),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.enum(["cash", "bank_gcash", "cheque"]),
  vendor: z.string().optional(),
  referenceNo: z.string().optional(),
  remarks: z.string().optional(),
});

// Sales form schema
const salesFormSchema = insertSalesEntrySchema.extend({
  date: z.string(),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.enum(["cash", "bank_gcash", "cheque"]),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  remarks: z.string().optional(),
});

// Daily cash flow data structure
interface DailyCashFlow {
  date: Date;
  day: string;
  cash: number;
  bankGCash: number;
  cheque: number;
  accountsReceivables: number;
  grossSales: number;
  operationalExpenses: number;
  accountsPayables: number;
  poRemarks: string;
  remarks: string;
  netCashFlow: number;
}

export default function PLCashFlow() {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isSalesDialogOpen, setIsSalesDialogOpen] = useState(false);
  const [isPODetailsDialogOpen, setIsPODetailsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createAsReceivable, setCreateAsReceivable] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // Auto-calculate due date based on payment terms
  useEffect(() => {
    if (!paymentTerms || paymentTerms === "COD" || paymentTerms === "Custom") {
      // Don't auto-calculate for COD or Custom terms
      return;
    }
    
    // Parse the number of days from payment terms (e.g., "Net 30" -> 30)
    const daysMatch = paymentTerms.match(/Net (\d+)/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const salesDate = salesForm.getValues("date");
      const calculatedDueDate = addDays(new Date(salesDate), days);
      setDueDate(format(calculatedDueDate, "yyyy-MM-dd"));
    }
  }, [paymentTerms]);

  // Fetch all data
  const { data: accountsReceivables = [], isLoading: isLoadingAR } = useQuery<AccountsReceivable[]>({
    queryKey: ["/api/accounts-receivables"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: operationalExpenses = [], isLoading: isLoadingExpenses } = useQuery<OperationalExpense[]>({
    queryKey: ["/api/operational-expenses"],
  });

  const { data: salesEntries = [], isLoading: isLoadingSales } = useQuery<SalesEntry[]>({
    queryKey: ["/api/sales-entries"],
  });

  const { data: accountsPayables = [], isLoading: isLoadingAP } = useQuery<AccountsPayable[]>({
    queryKey: ["/api/accounts-payables"],
  });

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: purchaseOrderItems = [] } = useQuery<PurchaseOrderItem[]>({
    queryKey: ["/api/purchase-order-items"],
  });

  // Aggregate data by day
  const dailyCashFlowData = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    // Group data by date
    const dataByDate = new Map<string, DailyCashFlow>();
    
    // Initialize all days in the month
    const currentDate = new Date(monthStart);
    while (currentDate <= monthEnd) {
      const dateKey = format(currentDate, "yyyy-MM-dd");
      dataByDate.set(dateKey, {
        date: new Date(currentDate),
        day: format(currentDate, "EEEE"),
        cash: 0,
        bankGCash: 0,
        cheque: 0,
        accountsReceivables: 0,
        grossSales: 0,
        operationalExpenses: 0,
        accountsPayables: 0,
        poRemarks: "",
        remarks: "",
        netCashFlow: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process Sales Entries
    salesEntries.forEach((sale) => {
      const saleDate = new Date(sale.date);
      if (saleDate >= monthStart && saleDate <= monthEnd) {
        const dateKey = format(saleDate, "yyyy-MM-dd");
        const dayData = dataByDate.get(dateKey);
        if (dayData) {
          const amount = parseFloat(sale.amount.toString());
          
          // Add to payment method column
          if (sale.paymentMethod === "cash") {
            dayData.cash += amount;
          } else if (sale.paymentMethod === "bank_gcash") {
            dayData.bankGCash += amount;
          } else if (sale.paymentMethod === "cheque") {
            dayData.cheque += amount;
          }
          
          // Add to gross sales
          dayData.grossSales += amount;
          
          // Add to remarks
          if (sale.remarks) {
            dayData.remarks += (dayData.remarks ? ", " : "") + sale.remarks;
          }
        }
      }
    });

    // Process AR - new AR created (non-cash sales)
    accountsReceivables.forEach((ar) => {
      const arDate = new Date(ar.date);
      if (arDate >= monthStart && arDate <= monthEnd) {
        const dateKey = format(arDate, "yyyy-MM-dd");
        const dayData = dataByDate.get(dateKey);
        if (dayData) {
          const amount = parseFloat(ar.amount.toString());
          const firstPayment = parseFloat(ar.firstPaymentAmount?.toString() || "0");
          
          // Check if first payment was on the same day
          let sameDayPayment = 0;
          if (ar.firstPaymentDate) {
            const firstPaymentDate = new Date(ar.firstPaymentDate);
            if (format(firstPaymentDate, "yyyy-MM-dd") === dateKey) {
              sameDayPayment = firstPayment;
            }
          }
          
          // AR amount is the non-cash portion
          const arAmount = amount - sameDayPayment;
          if (arAmount > 0) {
            dayData.accountsReceivables += arAmount;
          }
          
          // First payment is cash inflow (if same day)
          if (sameDayPayment > 0) {
            // Assuming first payments are typically cash/bank - add to bankGCash for now
            dayData.bankGCash += sameDayPayment;
          }
          
          // Add to gross sales
          dayData.grossSales += amount;
        }
      }
    });

    // Process Operational Expenses
    operationalExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= monthStart && expenseDate <= monthEnd) {
        const dateKey = format(expenseDate, "yyyy-MM-dd");
        const dayData = dataByDate.get(dateKey);
        if (dayData) {
          const amount = parseFloat(expense.amount.toString());
          dayData.operationalExpenses += amount;
          
          // Add to remarks
          const expenseRemark = `${expense.category}${expense.vendor ? ` (${expense.vendor})` : ""}`;
          dayData.remarks += (dayData.remarks ? ", " : "") + expenseRemark;
        }
      }
    });

    // Process Accounts Payables (only pending ones)
    accountsPayables
      .filter(ap => ap.status === 'pending')
      .forEach((ap) => {
        const apDate = new Date(ap.date);
        if (apDate >= monthStart && apDate <= monthEnd) {
          const dateKey = format(apDate, "yyyy-MM-dd");
          const dayData = dataByDate.get(dateKey);
          if (dayData) {
            const amount = parseFloat(ap.amount.toString());
            dayData.accountsPayables += amount;
            
            // Add to PO remarks
            const poRemark = `PO: ${ap.poNumber || 'N/A'} - ${ap.supplierName}${ap.remarks ? ` (${ap.remarks})` : ""}`;
            dayData.poRemarks += (dayData.poRemarks ? "; " : "") + poRemark;
          }
        }
      });

    // Calculate net cash flow for each day
    dataByDate.forEach((dayData) => {
      dayData.netCashFlow = dayData.cash + dayData.bankGCash + dayData.cheque - dayData.operationalExpenses - dayData.accountsPayables;
    });

    // Convert to array and sort by date
    return Array.from(dataByDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [accountsReceivables, operationalExpenses, salesEntries, accountsPayables, selectedMonth]);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    return dailyCashFlowData.reduce(
      (acc, day) => ({
        totalCash: acc.totalCash + day.cash,
        totalBankGCash: acc.totalBankGCash + day.bankGCash,
        totalCheque: acc.totalCheque + day.cheque,
        totalAR: acc.totalAR + day.accountsReceivables,
        totalOperationalExpenses: acc.totalOperationalExpenses + day.operationalExpenses,
        totalAccountsPayables: acc.totalAccountsPayables + day.accountsPayables,
        totalNetCashFlow: acc.totalNetCashFlow + day.netCashFlow,
      }),
      {
        totalCash: 0,
        totalBankGCash: 0,
        totalCheque: 0,
        totalAR: 0,
        totalOperationalExpenses: 0,
        totalAccountsPayables: 0,
        totalNetCashFlow: 0,
      }
    );
  }, [dailyCashFlowData]);

  // Expense form
  const expenseForm = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      category: "",
      paymentMethod: "cash",
      vendor: "",
      referenceNo: "",
      remarks: "",
    },
  });

  // Sales form
  const salesForm = useForm<z.infer<typeof salesFormSchema>>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paymentMethod: "cash",
      sourceType: "",
      sourceId: "",
      remarks: "",
    },
  });

  // Handle add expense
  const handleAddExpense = async (values: z.infer<typeof expenseFormSchema>) => {
    try {
      await apiRequest('POST', '/api/operational-expenses', {
        ...values,
        amount: values.amount.toString(),
        vendor: values.vendor || null,
        referenceNo: values.referenceNo || null,
        remarks: values.remarks || null,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/operational-expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics"] });
      
      toast({
        title: "Success",
        description: "Operational expense added successfully",
      });
      
      setIsExpenseDialogOpen(false);
      expenseForm.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to add operational expense",
        variant: "destructive",
      });
    }
  };

  // Handle add sales
  const handleAddSales = async (values: z.infer<typeof salesFormSchema>) => {
    // Validate client selection if createAsReceivable is checked
    if (createAsReceivable && !selectedClientId) {
      toast({
        title: "Validation Error",
        description: "Please select a client when creating as Account Receivable",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/sales-entries', values);

      await queryClient.invalidateQueries({ queryKey: ["/api/sales-entries"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics"] });
      
      // Also create AR entry if createAsReceivable is checked
      if (createAsReceivable) {
        const arData = {
          date: new Date(values.date),
          clientId: selectedClientId,
          amount: values.amount,
          balance: values.amount,
          status: "unsettled",
          paymentTerms: paymentTerms || undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        };
        
        await apiRequest('POST', '/api/accounts-receivables', arData);
        await queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivables"] });
        
        toast({
          title: "Success",
          description: "Sales entry and Account Receivable created successfully",
        });
      } else {
        toast({
          title: "Success",
          description: "Sales entry added successfully",
        });
      }
      
      setIsSalesDialogOpen(false);
      salesForm.reset();
      setCreateAsReceivable(false);
      setSelectedClientId("");
      setPaymentTerms("");
      setDueDate("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sales entry",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingAR || isLoadingExpenses || isLoadingSales || isLoadingAP;

  // Get POs for a specific date
  const getPOsForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    
    // Get all APs for this date that are pending
    const dateAPs = accountsPayables.filter(ap => {
      if (ap.status !== 'pending') return false;
      const apDate = new Date(ap.date);
      return format(apDate, "yyyy-MM-dd") === dateKey;
    });
    
    // Get corresponding POs
    const poIds = dateAPs.map(ap => ap.purchaseOrderId).filter(Boolean);
    const datePOs = purchaseOrders.filter(po => poIds.includes(po.id));
    
    // Add items to each PO
    return datePOs.map(po => ({
      ...po,
      items: purchaseOrderItems.filter(item => item.purchaseOrderId === po.id)
    }));
  };

  const selectedDatePOs = selectedDate ? getPOsForDate(selectedDate) : [];

  // Auto-open the PO details dialog for a specific date (e.g. deep link from Calendar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apDate = params.get('apDate');
    if (apDate && !isLoading) {
      const parsedDate = new Date(`${apDate}T00:00:00`);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedMonth(parsedDate);
        setSelectedDate(parsedDate);
        setIsPODetailsDialogOpen(true);
      }
      window.history.replaceState({}, '', location.split('?')[0]);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground mt-1">Daily cash flow and payables overview</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Month Picker */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block" htmlFor="month-select">
                Month
              </label>
              <Input
                id="month-select"
                type="month"
                value={format(selectedMonth, "yyyy-MM")}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + "-01"))}
                data-testid="input-month-filter"
              />
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              onClick={() => setLocation('/sales-financial/sales-tracking')}
              data-testid="button-view-sales-tracking"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Sales Tracking
            </Button>

            <Dialog open={isSalesDialogOpen} onOpenChange={setIsSalesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" data-testid="button-add-sales">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sales
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Sales Entry</DialogTitle>
                </DialogHeader>
                <Form {...salesForm}>
                  <form onSubmit={salesForm.handleSubmit(handleAddSales)} className="space-y-4">
                    <FormField
                      control={salesForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-sales-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-sales-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sales-payment-method">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_gcash">Bank/GCash</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={salesForm.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Optional notes" {...field} data-testid="textarea-sales-remarks" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Create as Receivable Option */}
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="createAsReceivable" 
                          checked={createAsReceivable}
                          onCheckedChange={(checked) => setCreateAsReceivable(checked === true)}
                          data-testid="checkbox-create-ar"
                        />
                        <Label htmlFor="createAsReceivable" className="text-sm font-medium">
                          Create as Account Receivable (On Credit)
                        </Label>
                      </div>

                      {createAsReceivable && (
                        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                          <div>
                            <Label className="text-sm font-medium">Client *</Label>
                            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                              <SelectTrigger className="mt-1" data-testid="select-sales-client">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Payment Terms</Label>
                              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                                <SelectTrigger className="mt-1" data-testid="select-sales-payment-terms">
                                  <SelectValue placeholder="Select terms" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COD">COD</SelectItem>
                                  <SelectItem value="Net 7">Net 7</SelectItem>
                                  <SelectItem value="Net 15">Net 15</SelectItem>
                                  <SelectItem value="Net 30">Net 30</SelectItem>
                                  <SelectItem value="Net 45">Net 45</SelectItem>
                                  <SelectItem value="Net 60">Net 60</SelectItem>
                                  <SelectItem value="Net 90">Net 90</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Due Date</Label>
                              <Input 
                                type="date" 
                                className="mt-1"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                data-testid="input-sales-due-date"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSalesDialogOpen(false)}
                        data-testid="button-cancel-sales"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-save-sales">
                        Save Sales
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" data-testid="button-add-expense">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Operational Expenses
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Operational Expense</DialogTitle>
                </DialogHeader>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(handleAddExpense)} className="space-y-4">
                    <FormField
                      control={expenseForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-expense-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-expense-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., utilities, salaries, supplies" {...field} data-testid="input-expense-category" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-expense-payment-method">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_gcash">Bank/GCash</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Who was paid" {...field} data-testid="input-expense-vendor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="referenceNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference No</FormLabel>
                          <FormControl>
                            <Input placeholder="Receipt or reference number" {...field} data-testid="input-expense-reference" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Optional notes" {...field} data-testid="textarea-expense-remarks" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsExpenseDialogOpen(false)}
                        data-testid="button-cancel-expense"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-save-expense">
                        Save Expense
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Daily Cash Flow - {format(selectedMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[100px]">Day</TableHead>
                    <TableHead className="text-right">GCash/Bank</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Cheque</TableHead>
                    <TableHead className="text-right">Accounts Receivables</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Operational Expenses</TableHead>
                    <TableHead className="text-right">Accounts Payables (PO)</TableHead>
                    <TableHead className="min-w-[150px]">Expense Remarks</TableHead>
                    <TableHead className="min-w-[200px]">Purchase Order Remarks</TableHead>
                    <TableHead className="text-right">Net Cash Flow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyCashFlowData.map((day, index) => (
                    <TableRow key={index} data-testid={`row-cashflow-${format(day.date, "yyyy-MM-dd")}`}>
                      <TableCell className="font-medium" data-testid={`cell-date-${index}`}>
                        {format(day.date, "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell data-testid={`cell-day-${index}`}>{day.day}</TableCell>
                      <TableCell className="text-right" data-testid={`cell-bank-${index}`}>
                        {formatCurrency(day.bankGCash)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-cash-${index}`}>
                        {formatCurrency(day.cash)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-cheque-${index}`}>
                        {formatCurrency(day.cheque)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-ar-${index}`}>
                        {formatCurrency(day.accountsReceivables)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-gross-sales-${index}`}>
                        {formatCurrency(day.grossSales)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-expenses-${index}`}>
                        {formatCurrency(day.operationalExpenses)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-ap-${index}`}>
                        {formatCurrency(day.accountsPayables)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]" data-testid={`cell-remarks-${index}`}>
                        {day.remarks || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]" data-testid={`cell-po-remarks-${index}`}>
                        {day.poRemarks ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate flex-1">{day.poRemarks}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => {
                                setSelectedDate(day.date);
                                setIsPODetailsDialogOpen(true);
                              }}
                              data-testid={`button-view-po-${index}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${day.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        data-testid={`cell-net-${index}`}
                      >
                        {formatCurrency(day.netCashFlow)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Monthly Summary Row */}
                  <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                    <TableCell colSpan={2} className="text-lg">
                      Monthly Total
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-bank">
                      {formatCurrency(monthlySummary.totalBankGCash)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-cash">
                      {formatCurrency(monthlySummary.totalCash)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-cheque">
                      {formatCurrency(monthlySummary.totalCheque)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-ar">
                      {formatCurrency(monthlySummary.totalAR)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-gross-sales">
                      -
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-expenses">
                      {formatCurrency(monthlySummary.totalOperationalExpenses)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="summary-ap">
                      {formatCurrency(monthlySummary.totalAccountsPayables)}
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell
                      className={`text-right text-lg ${monthlySummary.totalNetCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      data-testid="summary-net"
                    >
                      {formatCurrency(monthlySummary.totalNetCashFlow)}
                    </TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableCell className="text-xs font-medium text-muted-foreground">Date</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">Day</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">GCash/Bank</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Cash</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Cheque</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Accounts Receivables</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Gross Sales</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Operational Expenses</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Accounts Payables (PO)</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">Expense Remarks</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">Purchase Order Remarks</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground text-right">Net Cash Flow</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Details Dialog */}
      <Dialog open={isPODetailsDialogOpen} onOpenChange={setIsPODetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order Details - {selectedDate && format(selectedDate, "MMMM dd, yyyy")}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDatePOs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase orders found for this date
            </div>
          ) : (
            <div className="space-y-6">
              {selectedDatePOs.map((po) => (
                <Card key={po.id} data-testid={`po-card-${po.poNumber}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{po.poNumber}</CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div className="font-semibold">{po.supplierName}</div>
                          <div>{po.supplierAddress}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(po.grandTotal)}
                        </div>
                        <div className="text-xs text-muted-foreground">Grand Total</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Order Items</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Qty</TableHead>
                            <TableHead>Item Description</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {po.items && po.items.length > 0 ? (
                            po.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.qty}</TableCell>
                                <TableCell>{item.particulars}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No items found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Units</div>
                        <div className="font-semibold">{po.totalUnits}</div>
                      </div>
                      {po.discount && parseFloat(po.discount.toString()) > 0 && (
                        <div>
                          <div className="text-sm text-muted-foreground">Discount</div>
                          <div className="font-semibold">{formatCurrency(po.discount)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-muted-foreground">Payment Status</div>
                        <div className="font-semibold capitalize">{po.paymentStatus}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">PO Status</div>
                        <div className="font-semibold capitalize">{po.status}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsPODetailsDialogOpen(false)} data-testid="button-close-po-dialog">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
