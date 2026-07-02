import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { QuotationPDFDocument } from "@/components/QuotationPDF";
import { pdf } from '@react-pdf/renderer';
import type { Quotation, Client, QuotationLineItem, Company } from "@shared/schema";

export default function QuotationPDFPreview() {
  const [, params] = useRoute("/quotations/pdf-preview/:quotationNumber");
  const [, setLocation] = useLocation();
  const quotationNumber = params?.quotationNumber;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const currentUrlRef = useRef<string | null>(null);

  const { data: quotations = [], isLoading: isLoadingQuotations, isSuccess: isSuccessQuotations } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const { data: clients = [], isLoading: isLoadingClients, isSuccess: isSuccessClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const quotation = quotations.find(q => q.quotationNumber === quotationNumber);
  const client = quotation ? clients.find(c => c.id === quotation.clientId) : undefined;

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/company/me"],
    retry: false,
  });
  const companyName = company?.name;

  const { data: lineItems = [], isLoading: isLoadingLineItems, isSuccess: isSuccessLineItems } = useQuery<QuotationLineItem[]>({
    queryKey: ["/api/quotations", quotation?.id, "line-items"],
    enabled: !!quotation?.id,
  });

  const hasQuotation = !!quotation && !!client;
  const allQueriesSuccessful = isSuccessQuotations && isSuccessClients &&
    (!quotation?.id || isSuccessLineItems);
  const isDataLoading = isLoadingQuotations || isLoadingClients ||
    (quotation?.id && isLoadingLineItems);

  useEffect(() => {
    if (!hasQuotation || !allQueriesSuccessful) {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
      setPdfUrl(null);
      return;
    }

    setPdfUrl(null);
    setIsGenerating(true);
    setGenerationError(null);

    let cancelled = false;

    const generatePdf = async () => {
      try {
        const blob = await pdf(
          <QuotationPDFDocument
            quotation={quotation!}
            client={client!}
            lineItems={lineItems}
            companyName={companyName}
          />
        ).toBlob();

        if (cancelled) return;

        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        setPdfUrl(url);
        setIsGenerating(false);
      } catch (err) {
        if (cancelled) return;
        console.error("PDF generation error:", err);
        setGenerationError("Failed to generate PDF. Please try again.");
        setIsGenerating(false);
      }
    };

    generatePdf();

    return () => {
      cancelled = true;
    };
  }, [hasQuotation, allQueriesSuccessful, quotation, client, lineItems, retryTrigger, companyName]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, []);

  const handleDownload = () => {
    if (!pdfUrl || !quotation) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Quotation_${quotation.quotationNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation('/documents')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <span className="font-semibold text-sm">Quotation</span>
            {quotationNumber && (
              <span className="ml-2 text-sm text-muted-foreground">{quotationNumber}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={!pdfUrl}
        >
          <Download className="h-4 w-4 mr-1" />
          Download PDF
        </Button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {isDataLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Loading quotation data...</p>
          </div>
        )}

        {!isDataLoading && !hasQuotation && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-destructive">Quotation not found: {quotationNumber}</p>
          </div>
        )}

        {hasQuotation && isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Generating PDF...</p>
          </div>
        )}

        {generationError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-destructive">{generationError}</p>
            <Button variant="outline" onClick={() => setRetryTrigger(t => t + 1)}>
              Retry
            </Button>
          </div>
        )}

        {pdfUrl && (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={`Quotation ${quotationNumber}`}
          />
        )}
      </div>
    </div>
  );
}