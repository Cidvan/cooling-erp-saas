import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CompanySettings, InsertCompanySettings, Company, InsertCompany } from "@shared/schema";
import { Loader2, Settings as SettingsIcon, Hash, Palette, Building2 } from "lucide-react";

type DocNumberingConfig = {
  prefix: string;
  padding: number;
  nextNumber: number;
  format: string;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  quotation: "Quotations",
  invoice: "Invoices",
  purchaseOrder: "Purchase Orders",
  serviceReport: "Service Reports",
  accountsReceivable: "Accounts Receivable",
  accountsPayable: "Accounts Payable",
};

const DOC_TYPE_ORDER = [
  "serviceReport",
  "quotation",
  "invoice",
  "accountsReceivable",
  "accountsPayable",
  "purchaseOrder",
];

function previewNumber(config: DocNumberingConfig): string {
  const seqStr = String(config.nextNumber).padStart(config.padding, "0");
  return config.format
    .replace("{PREFIX}", config.prefix)
    .replace("{YEAR}", String(new Date().getFullYear()))
    .replace("{SEQ}", seqStr);
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  const { data: company, isLoading: isLoadingCompany } = useQuery<Company>({
    queryKey: ["/api/company/me"],
  });

  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
  });

  const [general, setGeneral] = useState({
    tagline: "",
    currencyCode: "PHP",
    currencySymbol: "\u20b1",
    timezone: "Asia/Manila",
  });

  const [tax, setTax] = useState({
    taxEnabled: false,
    taxLabel: "VAT",
    taxRate: "0.00",
  });

  const [numbering, setNumbering] = useState<Record<string, DocNumberingConfig>>({});

  useEffect(() => {
    if (!company) return;
    setBusinessInfo({
      name: company.name || "",
      logoUrl: company.logoUrl || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      taxId: company.taxId || "",
    });
  }, [company]);

  useEffect(() => {
    if (!settings) return;
    setGeneral({
      tagline: settings.tagline || "",
      currencyCode: settings.currencyCode || "PHP",
      currencySymbol: settings.currencySymbol || "\u20b1",
      timezone: settings.timezone || "Asia/Manila",
    });
    setTax({
      taxEnabled: settings.taxEnabled || false,
      taxLabel: settings.taxLabel || "VAT",
      taxRate: settings.taxRate || "0.00",
    });
    setNumbering((settings.documentNumbering as Record<string, DocNumberingConfig>) || {});
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertCompanySettings>) => {
      return apiRequest("PATCH", "/api/company/settings", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const updateBusinessInfoMutation = useMutation({
    mutationFn: async (data: Partial<InsertCompany>) => {
      return apiRequest("PATCH", "/api/company/me", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business info updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/company/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update business info",
        variant: "destructive",
      });
    },
  });

  const saveBusinessInfo = () => {
    updateBusinessInfoMutation.mutate(businessInfo);
  };

  const saveGeneral = () => {
    updateMutation.mutate(general);
  };

  const saveTax = () => {
    updateMutation.mutate(tax);
  };

  const saveNumbering = () => {
    updateMutation.mutate({ documentNumbering: numbering });
  };

  const updateNumberingField = (docType: string, field: keyof DocNumberingConfig, value: string | number) => {
    setNumbering((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value,
      },
    }));
  };

  if (isLoading || isLoadingCompany) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-settings">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-settings-title">
          Company Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your company's branding, currency, tax, and document numbering preferences
        </p>
      </div>

      <Tabs defaultValue="business" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="business" data-testid="tab-business">
            <Building2 className="mr-2 h-4 w-4" />
            Business Info
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <Palette className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="tax" data-testid="tab-tax">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="numbering" data-testid="tab-numbering">
            <Hash className="mr-2 h-4 w-4" />
            Document Numbering
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card data-testid="card-business-info">
            <CardHeader>
              <CardTitle>Business Info</CardTitle>
              <CardDescription>
                Your company's name, logo, and contact details as shown on documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Company name"
                  value={businessInfo.name}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://..."
                  value={businessInfo.logoUrl}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, logoUrl: e.target.value })}
                  data-testid="input-logo-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Business address"
                  value={businessInfo.address}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                  data-testid="input-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Phone number"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="Email address"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    data-testid="input-company-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  placeholder="Tax identification number"
                  value={businessInfo.taxId}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                  data-testid="input-tax-id"
                />
              </div>
              <Button
                onClick={saveBusinessInfo}
                disabled={updateBusinessInfoMutation.isPending}
                data-testid="button-save-business-info"
              >
                {updateBusinessInfoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card data-testid="card-general-settings">
            <CardHeader>
              <CardTitle>Branding &amp; Regional</CardTitle>
              <CardDescription>
                Set your company tagline, currency, and timezone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="e.g. Business Operating System for HVAC & Service Companies"
                  value={general.tagline}
                  onChange={(e) => setGeneral({ ...general, tagline: e.target.value })}
                  data-testid="input-tagline"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency Code</Label>
                  <Input
                    id="currencyCode"
                    placeholder="PHP"
                    value={general.currencyCode}
                    onChange={(e) => setGeneral({ ...general, currencyCode: e.target.value })}
                    data-testid="input-currency-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input
                    id="currencySymbol"
                    placeholder="\u20b1"
                    value={general.currencySymbol}
                    onChange={(e) => setGeneral({ ...general, currencySymbol: e.target.value })}
                    data-testid="input-currency-symbol"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="Asia/Manila"
                  value={general.timezone}
                  onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                  data-testid="input-timezone"
                />
              </div>
              <Button
                onClick={saveGeneral}
                disabled={updateMutation.isPending}
                data-testid="button-save-general"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card data-testid="card-tax-settings">
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>
                Enable and configure tax calculation for quotations and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="taxEnabled">Enable Tax</Label>
                  <p className="text-sm text-muted-foreground">
                    Apply tax calculations to quotations and invoices
                  </p>
                </div>
                <Switch
                  id="taxEnabled"
                  checked={tax.taxEnabled}
                  onCheckedChange={(checked) => setTax({ ...tax, taxEnabled: checked })}
                  data-testid="switch-tax-enabled"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxLabel">Tax Label</Label>
                  <Input
                    id="taxLabel"
                    placeholder="VAT"
                    value={tax.taxLabel}
                    onChange={(e) => setTax({ ...tax, taxLabel: e.target.value })}
                    disabled={!tax.taxEnabled}
                    data-testid="input-tax-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="12.00"
                    value={tax.taxRate}
                    onChange={(e) => setTax({ ...tax, taxRate: e.target.value })}
                    disabled={!tax.taxEnabled}
                    data-testid="input-tax-rate"
                  />
                </div>
              </div>
              <Button
                onClick={saveTax}
                disabled={updateMutation.isPending}
                data-testid="button-save-tax"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering">
          <Card data-testid="card-numbering-settings">
            <CardHeader>
              <CardTitle>Document Numbering</CardTitle>
              <CardDescription>
                Customize the prefix and number padding used for each document type. Changes apply to newly created documents only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {DOC_TYPE_ORDER.filter((docType) => numbering[docType]).map((docType) => {
                const config = numbering[docType];
                return (
                  <div key={docType} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="sm:col-span-4">
                      <Label className="text-sm font-medium">{DOC_TYPE_LABELS[docType] || docType}</Label>
                      <p className="text-xs text-muted-foreground">
                        Next number: <span className="font-mono">{previewNumber(config)}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${docType}-prefix`} className="text-xs">Prefix</Label>
                      <Input
                        id={`${docType}-prefix`}
                        value={config.prefix}
                        onChange={(e) => updateNumberingField(docType, "prefix", e.target.value.toUpperCase())}
                        data-testid={`input-numbering-prefix-${docType}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${docType}-padding`} className="text-xs">Digits</Label>
                      <Input
                        id={`${docType}-padding`}
                        type="number"
                        min={1}
                        max={10}
                        value={config.padding}
                        onChange={(e) => updateNumberingField(docType, "padding", parseInt(e.target.value, 10) || 1)}
                        data-testid={`input-numbering-padding-${docType}`}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`${docType}-format`} className="text-xs">Format</Label>
                      <Input
                        id={`${docType}-format`}
                        value={config.format}
                        onChange={(e) => updateNumberingField(docType, "format", e.target.value)}
                        data-testid={`input-numbering-format-${docType}`}
                      />
                    </div>
                  </div>
                );
              })}
              <Button
                onClick={saveNumbering}
                disabled={updateMutation.isPending}
                data-testid="button-save-numbering"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
