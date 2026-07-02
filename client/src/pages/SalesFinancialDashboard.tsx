import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Invoice, Quotation, SalesEntry, OperationalExpense, AccountsReceivable, AccountsPayable } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

export default function SalesFinancialDashboard() {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const [, setLocation] = useLocation();
  const currentDate = new Date();
  const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
  
  const [startMonth, setStartMonth] = useState(format(sixMonthsAgo, 'yyyy-MM'));
  const [endMonth, setEndMonth] = useState(format(currentDate, 'yyyy-MM'));

  // Fetch all data sources
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: quotations = [], isLoading: isLoadingQuotations } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations'],
  });

  const { data: salesEntries = [], isLoading: isLoadingSales } = useQuery<SalesEntry[]>({
    queryKey: ['/api/sales-entries'],
  });

  const { data: operationalExpenses = [], isLoading: isLoadingExpenses } = useQuery<OperationalExpense[]>({
    queryKey: ['/api/operational-expenses'],
  });

  const { data: accountsReceivables = [], isLoading: isLoadingAR } = useQuery<AccountsReceivable[]>({
    queryKey: ['/api/accounts-receivables'],
  });

  const { data: accountsPayables = [], isLoading: isLoadingAP } = useQuery<AccountsPayable[]>({
    queryKey: ['/api/accounts-payables'],
  });


  const isLoading = isLoadingInvoices || isLoadingQuotations || isLoadingSales || isLoadingExpenses || isLoadingAR || isLoadingAP;

  // Calculate date range
  const dateInterval = useMemo(() => {
    try {
      const start = startOfMonth(parseISO(startMonth + '-01'));
      const end = endOfMonth(parseISO(endMonth + '-01'));
      return { start, end };
    } catch {
      return null;
    }
  }, [startMonth, endMonth]);

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!dateInterval) return { invoices: [], quotations: [], salesEntries: [], expenses: [], ar: [], ap: [] };

    const isInRange = (date: Date | string | null | undefined) => {
      if (!date) return false;
      try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return isWithinInterval(dateObj, dateInterval);
      } catch {
        return false;
      }
    };

    return {
      invoices: invoices.filter(inv => inv.invoiceDate && isInRange(inv.invoiceDate)),
      quotations: quotations.filter(q => q.quotationDate && isInRange(q.quotationDate)),
      salesEntries: salesEntries.filter(s => s.date && isInRange(s.date)),
      expenses: operationalExpenses.filter(e => e.date && isInRange(e.date)),
      ar: accountsReceivables.filter(a => a.date && isInRange(a.date)),
      ap: accountsPayables.filter(a => a.date && isInRange(a.date)),
    };
  }, [dateInterval, invoices, quotations, salesEntries, operationalExpenses, accountsReceivables, accountsPayables]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Cash-based: only count sales entries (created when AR is paid)
    const totalSales = filteredData.salesEntries
      .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
    
    // Credit-based: all AR created in range (including outstanding)
    const totalCreditSales = filteredData.ar
      .reduce((sum, ar) => sum + parseFloat(ar.amount.toString()), 0);

    const receivablesDue = 
      filteredData.invoices
        .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0) +
      filteredData.ar
        .filter(ar => ar.status === 'unsettled')
        .reduce((sum, ar) => sum + parseFloat(ar.balance.toString()), 0);
    
    const payablesDue = 
      filteredData.ap
        .filter(ap => ap.status === 'pending')
        .reduce((sum, ap) => sum + parseFloat(ap.amount.toString()), 0);

    const totalExpenses = filteredData.expenses
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

    const netIncome = totalSales - totalExpenses;

    return { totalSales, totalCreditSales, receivablesDue, payablesDue, totalExpenses, netIncome };
  }, [filteredData]);

  // Reusable helper for per-month filtering
  const makeMonthFilter = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthInterval = { start: monthStart, end: monthEnd };
    return (date: Date | string | null | undefined) => {
      if (!date) return false;
      try {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return isWithinInterval(d, monthInterval);
      } catch { return false; }
    };
  };

  // Sales Summary Chart Data - cash collected vs credit sales by month
  const salesSummaryData = useMemo(() => {
    if (!dateInterval) return [];
    return eachMonthOfInterval(dateInterval).map(month => {
      const inRange = makeMonthFilter(month);
      const cashCollected = salesEntries
        .filter(s => s.date && inRange(s.date))
        .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
      const creditSales = accountsReceivables
        .filter(ar => ar.date && inRange(ar.date))
        .reduce((sum, ar) => sum + parseFloat(ar.amount.toString()), 0);
      return { month: format(month, 'MMM yyyy'), cashCollected, creditSales };
    });
  }, [dateInterval, salesEntries, accountsReceivables]);

  // P&L Graph Data - revenue (cash + credit) vs expenses by month
  const plData = useMemo(() => {
    if (!dateInterval) return [];
    return eachMonthOfInterval(dateInterval).map(month => {
      const inRange = makeMonthFilter(month);
      // Cash revenue (AR payments received, direct sales)
      const cashRevenue = salesEntries
        .filter(s => s.date && inRange(s.date))
        .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
      // Credit revenue (AR created this month, by creation date)
      const creditRevenue = accountsReceivables
        .filter(ar => ar.date && inRange(ar.date))
        .reduce((sum, ar) => sum + parseFloat(ar.amount.toString()), 0);
      const expenses = operationalExpenses
        .filter(e => e.date && inRange(e.date))
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      return {
        month: format(month, 'MMM yyyy'),
        cashRevenue,
        creditRevenue,
        expenses,
        netProfit: cashRevenue - expenses,
      };
    });
  }, [dateInterval, salesEntries, accountsReceivables, operationalExpenses]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales & Financial Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of revenue, receivables, and payables</p>
      </div>

      {/* Month Range Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="start-month" className="mb-2 block">Start Month</Label>
              <Input
                id="start-month"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                data-testid="input-start-month"
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="end-month" className="mb-2 block">End Month</Label>
              <Input
                id="end-month"
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                data-testid="input-end-month"
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const current = new Date();
                const sixMonthsAgo = new Date(current.getFullYear(), current.getMonth() - 5, 1);
                setStartMonth(format(sixMonthsAgo, 'yyyy-MM'));
                setEndMonth(format(current, 'yyyy-MM'));
              }}
              data-testid="button-reset-range"
            >
              Reset to Last 6 Months
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card className="bg-primary mb-6" data-testid="card-tabs-navigation">
        <CardHeader>
          <CardTitle className="text-white text-center">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => setLocation('/sales-financial/sales-tracking')}
            data-testid="button-sales-tracking"
          >
            Sales Tracking
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => setLocation('/sales-financial/accounts-receivables')}
            data-testid="button-accounts-receivables"
          >
            Accounts Receivables
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => setLocation('/sales-financial/pl-cash-flow')}
            data-testid="button-pl-cash-flow"
          >
            P&L | Cash Flow
          </Button>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-total-sales">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cash Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-sales">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Actual payments received</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-credit-sales">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Credit Sales (AR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" data-testid="text-credit-sales">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.totalCreditSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">AR records created</p>
              </CardContent>
            </Card>

            <Card data-testid="card-net-income">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-income">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.netIncome)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cash collected − Expenses</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <Card data-testid="card-receivables-due">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receivables Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-receivables-due">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.receivablesDue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Outstanding AR balance</p>
              </CardContent>
            </Card>

            <Card data-testid="card-payables-due">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payables Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-payables-due">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.payablesDue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending AP obligations</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-expenses">
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500" data-testid="text-total-expenses">
                  {isLoading ? 'Loading...' : formatCurrency(metrics.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Operational expenses logged</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Summary Chart */}
          <Card data-testid="card-sales-summary">
            <CardHeader>
              <CardTitle>Sales Summary — Cash Collected vs Credit Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="cashCollected" fill="#2563eb" name="Cash Collected" />
                  <Bar dataKey="creditSales" fill="#7c3aed" name="Credit Sales (AR)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P&L Graph */}
          <Card data-testid="card-pl-graph">
            <CardHeader>
              <CardTitle>P&L Graph — Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={plData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="cashRevenue" fill="#22c55e" name="Cash Revenue" />
                  <Bar dataKey="creditRevenue" fill="#7c3aed" name="Credit Revenue (AR)" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
