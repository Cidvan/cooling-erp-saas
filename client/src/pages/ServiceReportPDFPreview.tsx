import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useLocation } from "wouter";
import { ServiceReportPDFDocument } from "@/components/ServiceReportPDF";
import { pdf } from '@react-pdf/renderer';
import type { ServiceReport, Client, ServiceLineItem, ServiceTechnician, ServiceAcUnit, Company } from "@shared/schema";

export default function ServiceReportPDFPreview() {
  const [, params] = useRoute("/service-reports/pdf-preview/:reportNumber");
  const [, setLocation] = useLocation();
  const reportNumber = params?.reportNumber;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const currentUrlRef = useRef<string | null>(null);

  const { data: serviceReports = [], isLoading: isLoadingReports, isSuccess: isSuccessReports } = useQuery<ServiceReport[]>({
    queryKey: ["/api/service-reports"],
  });

  const { data: clients = [], isLoading: isLoadingClients, isSuccess: isSuccessClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const serviceReport = serviceReports.find(sr => sr.reportNumber === reportNumber);
  const client = serviceReport ? clients.find(c => c.id === serviceReport.clientId) : undefined;

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/company/me"],
    retry: false,
  });
  const companyName = company?.name;

  const { data: lineItems = [], isLoading: isLoadingLineItems, isSuccess: isSuccessLineItems } = useQuery<ServiceLineItem[]>({
    queryKey: ["/api/service-reports", serviceReport?.id, "line-items"],
    enabled: !!serviceReport?.id,
  });

  const { data: technicians = [], isLoading: isLoadingTechnicians, isSuccess: isSuccessTechnicians } = useQuery<ServiceTechnician[]>({
    queryKey: ["/api/service-reports", serviceReport?.id, "technicians"],
    enabled: !!serviceReport?.id,
  });

  const { data: acUnits = [], isLoading: isLoadingAcUnits, isSuccess: isSuccessAcUnits } = useQuery<ServiceAcUnit[]>({
    queryKey: ["/api/service-reports", serviceReport?.id, "ac-units"],
    enabled: !!serviceReport?.id,
    queryFn: async () => {
      const response = await fetch(`/api/service-reports/${serviceReport?.id}/ac-units`);
      if (!response.ok) throw new Error('Failed to fetch AC units');
      return response.json();
    },
  });

  // Check if all required data is successfully loaded
  const hasServiceReport = !!serviceReport && !!client;
  const allQueriesSuccessful = isSuccessReports && isSuccessClients &&
    (!serviceReport?.id || (isSuccessLineItems && isSuccessTechnicians && isSuccessAcUnits));
  const isDataLoading = isLoadingReports || isLoadingClients || 
    (serviceReport?.id && (isLoadingLineItems || isLoadingTechnicians || isLoadingAcUnits));

  // Generate PDF blob when all data is successfully loaded
  useEffect(() => {
    // Reset PDF URL when data is not available or queries are loading
    if (!hasServiceReport || !allQueriesSuccessful) {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
      setPdfUrl(null);
      if (!hasServiceReport && !isDataLoading) {
        setGenerationError(null);
      }
      return;
    }

    // Reset URL to show loading state when dependencies change
    setPdfUrl(null);
    setIsGenerating(true);
    setGenerationError(null);

    let cancelled = false;

    const generatePdf = async () => {
      try {
        const blob = await pdf(
          <ServiceReportPDFDocument
            serviceReport={serviceReport!}
            client={client!}
            lineItems={lineItems}
            technicians={technicians}
            acUnits={acUnits}
            companyName={companyName}
          />
        ).toBlob();

        if (cancelled) {
          // If effect was cancelled, don't update state
          return;
        }

        // Revoke old URL if it exists
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        setPdfUrl(url);
        setGenerationError(null);
      } catch (error) {
        console.error('Error generating PDF:', error);
        if (!cancelled) {
          setGenerationError(
            error instanceof Error 
              ? `Failed to generate PDF: ${error.message}` 
              : 'Failed to generate PDF. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    };

    generatePdf();

    // Cleanup function to revoke the object URL and cancel any pending updates
    return () => {
      cancelled = true;
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, [serviceReport, client, lineItems, technicians, acUnits, hasServiceReport, allQueriesSuccessful, retryTrigger, companyName]);

  const handleDownload = async () => {
    if (!serviceReport || !client) return;

    const blob = await pdf(
      <ServiceReportPDFDocument
        serviceReport={serviceReport}
        client={client}
        lineItems={lineItems}
        technicians={technicians}
        acUnits={acUnits}
        companyName={companyName}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Service_Report_${serviceReport.reportNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!reportNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">No report number provided</p>
        <Button onClick={() => setLocation("/documents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
    );
  }

  if (isLoadingReports || isLoadingClients) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Loading service report...</p>
      </div>
    );
  }

  if (!serviceReport || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Service report not found</p>
        <Button onClick={() => setLocation("/documents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/documents")}
            data-testid="button-back-to-documents"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-pdf-preview-title">
              PDF Preview: {serviceReport.reportNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client.name}
            </p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          data-testid="button-download-pdf"
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
        {generationError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-destructive" data-testid="text-generation-error">
              {generationError}
            </p>
            <Button
              onClick={() => setRetryTrigger(prev => prev + 1)}
              data-testid="button-retry-pdf"
            >
              Retry
            </Button>
          </div>
        ) : pdfUrl && !isGenerating ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={`Service Report ${serviceReport.reportNumber}`}
            data-testid="iframe-pdf-viewer"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground" data-testid="text-generating-pdf">
              {isDataLoading ? "Loading data..." : isGenerating ? "Generating PDF preview..." : "Loading..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
