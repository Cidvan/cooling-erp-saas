import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Invoice, Quotation, Client, AccountsReceivable, SalesEntry } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function SalesTracking() {
  const [, setLocation] = useLocation();

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations'],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: accountsReceivables = [] } = useQuery<AccountsReceivable[]>({
    queryKey: ['/api/accounts-receivables'],
  });

  const { data: salesEntries = [] } = useQuery<SalesEntry[]>({
    queryKey: ['/api/sales-entries'],
  });

  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  const invoiceSales = invoices.map(invoice => ({
    id: invoice.id,
    refNumber: invoice.invoiceNumber,
    date: invoice.invoiceDate,
    clientName: clientMap.get(invoice.clientId) || 'Unknown',
    type: 'Invoice' as const,
    status: invoice.status,
    amount: parseFloat(invoice.total.toString()),
    balance: null as number | null,
  }));

  const quotationSales = quotations.map(quote => ({
    id: quote.id,
    refNumber: quote.quotationNumber,
    date: quote.quotationDate,
    clientName: clientMap.get(quote.clientId) || 'Unknown',
    type: 'Quotation' as const,
    status: quote.status,
    amount: parseFloat(quote.total.toString()),
    balance: null as number | null,
  }));

  const arSales = accountsReceivables.map(ar => ({
    id: ar.id,
    refNumber: ar.arNumber,
    date: ar.date,
    clientName: clientMap.get(ar.clientId || '') || 'Unknown',
    type: 'AR (Credit)' as const,
    status: ar.status,
    amount: parseFloat(ar.amount.toString()),
    balance: parseFloat(ar.balance.toString()),
  }));

  const cashSales = salesEntries
    .filter(s => s.sourceType !== 'accounts_receivable')
    .map(s => ({
      id: s.id,
      refNumber: s.sourceId || `SE-${s.id.slice(0, 6)}`,
      date: s.date,
      clientName: '—',
      type: 'Cash Sale' as const,
      status: 'paid' as const,
      amount: parseFloat(s.amount.toString()),
      balance: 0 as number | null,
    }));

  const allSales = [...invoiceSales, ...quotationSales, ...arSales, ...cashSales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalInvoiced = invoiceSales.reduce((sum, s) => sum + s.amount, 0);
  const totalAR = arSales.reduce((sum, s) => sum + s.amount, 0);
  const totalAROutstanding = arSales
    .filter(s => s.status === 'unsettled')
    .reduce((sum, s) => sum + (s.balance ?? 0), 0);
  const totalCash = cashSales.reduce((sum, s) => sum + s.amount, 0);
  const totalARCollected = arSales
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + s.amount, 0);

  const statusColor = (type: string, status: string) => {
    if (status === 'paid' || status === 'completed' || status === 'accepted') return 'bg-green-100 text-green-700';
    if (status === 'unsettled' || status === 'in_progress' || status === 'sent') return 'bg-yellow-100 text-yellow-700';
    if (status === 'overdue') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/sales-financial')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Tracking</h1>
          <p className="text-muted-foreground mt-1">Monitor sales entries and invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-total-invoiced">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{totalInvoiced.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{invoiceSales.length} invoice(s)</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-ar">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total AR Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{totalAR.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{arSales.length} AR record(s)</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ar-collected">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AR Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₱{totalARCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Fully paid ARs</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ar-outstanding">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AR Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ₱{totalAROutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Remaining balance</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-sales-table">
        <CardHeader>
          <CardTitle>All Sales Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No sales records found.
                  </TableCell>
                </TableRow>
              )}
              {allSales.map((sale) => (
                <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                  <TableCell className="font-medium" data-testid={`text-ref-${sale.id}`}>
                    {sale.refNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(sale.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{sale.clientName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        sale.type === 'AR (Credit)' ? 'border-primary/30 text-primary' :
                        sale.type === 'Cash Sale' ? 'border-green-300 text-green-700' :
                        sale.type === 'Invoice' ? 'border-purple-300 text-purple-700' :
                        'border-gray-300 text-gray-700'
                      }
                    >
                      {sale.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColor(sale.type, sale.status)}`}>
                      {sale.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₱{sale.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {sale.balance !== null ? (
                      <span className={sale.balance > 0 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                        ₱{sale.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
