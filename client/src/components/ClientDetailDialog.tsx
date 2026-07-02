import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Client, ServiceReport, Quotation, ServiceLineItem, ServiceTechnician, ServiceAcUnit } from "@shared/schema";
import { format } from "date-fns";
import { FileText, Receipt, Building2, Mail, Phone, MapPin, Calendar, Eye, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface ClientDetailDialogProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientDetailDialog({ client, isOpen, onClose }: ClientDetailDialogProps) {
  const [viewingReport, setViewingReport] = useState<ServiceReport | null>(null);
  const { data: serviceReports = [], isLoading: reportsLoading } = useQuery<ServiceReport[]>({
    queryKey: ['/api/service-reports', client?.id],
    enabled: !!client?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service-reports?clientId=${client?.id}`);
      if (!response.ok) throw new Error('Failed to fetch service reports');
      return response.json();
    },
  });

  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations', client?.id],
    enabled: !!client?.id,
    queryFn: async () => {
      const response = await fetch(`/api/quotations?clientId=${client?.id}`);
      if (!response.ok) throw new Error('Failed to fetch quotations');
      return response.json();
    },
  });

  const { data: viewLineItems = [] } = useQuery<ServiceLineItem[]>({
    queryKey: ['/api/service-reports', viewingReport?.id, 'line-items'],
    enabled: !!viewingReport?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service-reports/${viewingReport?.id}/line-items`);
      if (!response.ok) throw new Error('Failed to fetch line items');
      return response.json();
    },
  });

  const { data: viewTechnicians = [] } = useQuery<ServiceTechnician[]>({
    queryKey: ['/api/service-reports', viewingReport?.id, 'technicians'],
    enabled: !!viewingReport?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service-reports/${viewingReport?.id}/technicians`);
      if (!response.ok) throw new Error('Failed to fetch technicians');
      return response.json();
    },
  });

  const { data: viewAcUnits = [] } = useQuery<ServiceAcUnit[]>({
    queryKey: ['/api/service-reports', viewingReport?.id, 'ac-units'],
    enabled: !!viewingReport?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service-reports/${viewingReport?.id}/ac-units`);
      if (!response.ok) throw new Error('Failed to fetch AC units');
      return response.json();
    },
  });

  if (!client) return null;

  type ServiceDoneEntry = { acBrand: string; acModel: string; acLocation: string; serviceDone: string };

  const renderServiceDoneList = (list: ServiceDoneEntry[] | undefined) => {
    if (!list || list.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
    return (
      <ul className="space-y-0.5">
        {list.map((entry, i) => {
          const unit = [entry.acLocation, entry.acBrand, entry.acModel].filter(Boolean).join(' · ');
          return (
            <li key={i} className="text-sm">
              {unit && <span className="text-muted-foreground text-xs">{unit}: </span>}
              {entry.serviceDone}
            </li>
          );
        })}
      </ul>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      scheduled: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      expired: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };

    return (
      <Badge 
        variant="outline" 
        className={statusColors[status] || ""}
        data-testid={`badge-status-${status}`}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setViewingReport(null); onClose(); } }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-client-detail">
        <DialogHeader>
          {viewingReport ? (
            <>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setViewingReport(null)} data-testid="btn-back-to-client">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="flex items-center gap-2" data-testid="text-sr-detail-title">
                  <FileText className="h-5 w-5" />
                  Service Report — {viewingReport.reportNumber}
                </DialogTitle>
              </div>
              <DialogDescription>Full details of this service report</DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-2xl" data-testid="text-client-detail-title">
                Client Details
              </DialogTitle>
              <DialogDescription>
                View detailed information, service reports, and quotations for this client
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {!viewingReport && (
          <div className="space-y-6">
          {/* Client Information Card */}
          <Card data-testid="card-client-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium" data-testid="text-client-name">{client.name}</p>
                  </div>
                  {client.company && (
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium" data-testid="text-client-company">{client.company}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" data-testid="badge-client-type">{client.clientType}</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm" data-testid="text-client-email">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <div className="flex flex-col gap-0.5" data-testid="text-client-phone">
                        {Array.isArray(client.phone) ? client.phone.map((p, i) => (
                          <p key={i} className="text-sm">{p}</p>
                        )) : <p className="text-sm">{client.phone}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="text-sm" data-testid="text-client-address">{client.address}</p>
                    </div>
                  </div>
                  {client.firstTransactionDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">First Transaction Date</p>
                        <p className="text-sm" data-testid="text-client-first-transaction-date">
                          {format(new Date(client.firstTransactionDate), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Reports and Quotations Tabs */}
          <Tabs defaultValue="service-reports" className="w-full" data-testid="tabs-client-history">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="service-reports" data-testid="tab-service-reports">
                <FileText className="h-4 w-4 mr-2" />
                Service Reports ({serviceReports.length})
              </TabsTrigger>
              <TabsTrigger value="quotations" data-testid="tab-quotations">
                <Receipt className="h-4 w-4 mr-2" />
                Quotations ({quotations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="service-reports" className="mt-4" data-testid="content-service-reports">
              <Card>
                <CardHeader>
                  <CardTitle>Service Report History</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportsLoading ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-reports-loading">
                      Loading service reports...
                    </div>
                  ) : serviceReports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-reports">
                      No service reports found for this client
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead data-testid="header-report-number">Report Number</TableHead>
                            <TableHead data-testid="header-service-date">Service Date</TableHead>
                            <TableHead data-testid="header-status">Status</TableHead>
                            <TableHead data-testid="header-technician">Technician</TableHead>
                            <TableHead data-testid="header-service-done">Service Done</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceReports.map((report) => (
                            <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                              <TableCell className="font-medium" data-testid={`text-report-number-${report.id}`}>
                                {report.reportNumber}
                              </TableCell>
                              <TableCell data-testid={`text-service-date-${report.id}`}>
                                {format(new Date(report.serviceDate), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(report.status)}
                              </TableCell>
                              <TableCell data-testid={`text-technician-${report.id}`}>
                                {report.technicianName || '-'}
                              </TableCell>
                              <TableCell data-testid={`text-service-done-${report.id}`}>
                                                                {renderServiceDoneList((report as any).serviceDoneList)}
                                </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setViewingReport(report)}
                                  data-testid={`btn-view-report-${report.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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

            <TabsContent value="quotations" className="mt-4" data-testid="content-quotations">
              <Card>
                <CardHeader>
                  <CardTitle>Quotation History</CardTitle>
                </CardHeader>
                <CardContent>
                  {quotationsLoading ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-quotations-loading">
                      Loading quotations...
                    </div>
                  ) : quotations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-quotations">
                      No quotations found for this client
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead data-testid="header-quotation-number">Quotation Number</TableHead>
                            <TableHead data-testid="header-quotation-date">Date</TableHead>
                            <TableHead data-testid="header-valid-until">Valid Until</TableHead>
                            <TableHead data-testid="header-quotation-title">Title</TableHead>
                            <TableHead data-testid="header-total">Total</TableHead>
                            <TableHead data-testid="header-quotation-status">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotations.map((quotation) => (
                            <TableRow key={quotation.id} data-testid={`row-quotation-${quotation.id}`}>
                              <TableCell className="font-medium" data-testid={`text-quotation-number-${quotation.id}`}>
                                {quotation.quotationNumber}
                              </TableCell>
                              <TableCell data-testid={`text-quotation-date-${quotation.id}`}>
                                {format(new Date(quotation.quotationDate), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell data-testid={`text-valid-until-${quotation.id}`}>
                                {format(new Date(quotation.validUntil), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell data-testid={`text-quotation-title-${quotation.id}`}>
                                {quotation.title || '-'}
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-quotation-total-${quotation.id}`}>
                                ₱{parseFloat(quotation.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(quotation.status)}
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
          </Tabs>
        </div>
        )}

        {viewingReport && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Service Date</p>
                <p className="font-medium">{format(new Date(viewingReport.serviceDate), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                {getStatusBadge(viewingReport.status)}
              </div>
            </div>

            {/* AC Units */}
            {viewAcUnits.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">AC Units</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {viewAcUnits.map((unit, i) => (
                      <div key={unit.id} className="border rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Unit {i + 1}</p>
                        <div className="grid gap-2 md:grid-cols-5 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Brand</p>
                            <p>{unit.acBrand || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Model</p>
                            <p>{unit.acModel || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Serial No.</p>
                            <p>{unit.acSerialNumber || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p>{unit.acLocation || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Service Done</p>
                            <p>{unit.serviceDone || '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technicians */}
            {viewTechnicians.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Technicians</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Time Started</TableHead>
                        <TableHead>Time Ended</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewTechnicians.map((tech) => (
                        <TableRow key={tech.id}>
                          <TableCell className="font-medium">{tech.technicianName}</TableCell>
                          <TableCell>
                            {tech.timeStarted ? format(new Date(tech.timeStarted), 'MMM dd, yyyy hh:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            {tech.timeEnded ? format(new Date(tech.timeEnded), 'MMM dd, yyyy hh:mm a') : '-'}
                          </TableCell>
                          <TableCell>{tech.duration || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Service Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {[
                  { label: 'Trouble Reported', value: viewingReport.troubleReported },
                  { label: 'Trouble Found', value: viewingReport.troubleFound },
                  { label: 'Work Done', value: viewingReport.workDone },
                  { label: 'Recommendations', value: viewingReport.recommendations },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">None</span>}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Line Items */}
            {viewLineItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Line Items</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
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
                          <TableCell className="text-right">
                            ₱{parseFloat(item.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₱{parseFloat(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end pt-3 border-t mt-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-4">Total</span>
                      <span className="font-semibold text-base">
                        ₱{viewLineItems.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    );
}
