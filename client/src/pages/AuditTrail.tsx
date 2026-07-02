import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Globe, Monitor, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import type { ActivityLog } from "@shared/schema";

const ENTITY_LABELS: Record<string, string> = {
  client: "Client",
  service_report: "Service Report",
  quotation: "Quotation",
  purchase_order: "Purchase Order",
  accounts_receivable: "Accounts Receivable",
  accounts_payable: "Accounts Payable",
  sales_entry: "Sales Entry",
  operational_expense: "Operational Expense",
};

const ENTITY_TYPES = Object.keys(ENTITY_LABELS);

function getBadgeVariant(activityType: string) {
  if (activityType === "deleted") return "destructive" as const;
  if (activityType === "updated") return "secondary" as const;
  return "default" as const;
}

function parseDiff(value: string | null | undefined): Record<string, any> | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseUserAgent(ua: string | null | undefined) {
  if (!ua) return "Unknown device";
  if (/Mobile|Android|iPhone/.test(ua)) return "Mobile browser";
  if (/Chrome/.test(ua)) return "Chrome (Desktop)";
  if (/Firefox/.test(ua)) return "Firefox (Desktop)";
  if (/Safari/.test(ua)) return "Safari (Desktop)";
  return "Desktop browser";
}

interface AuditLogsResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

interface CompanyUser {
  id: string;
  username: string;
  role: string;
}

export default function AuditTrail() {
  const [entityType, setEntityType] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/company/users"],
  });

  const params = new URLSearchParams();
  if (entityType !== "all") params.set("entityType", entityType);
  if (userId !== "all") params.set("userId", userId);
  if (startDate) params.set("startDate", new Date(startDate).toISOString());
  if (endDate) params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/audit-logs", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const resetFilters = () => {
    setEntityType("all");
    setUserId("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-audit-trail">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Audit Trail</h2>
          <p className="text-muted-foreground">Full history of changes with IP, device, and before/after details</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Record type</label>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
            <SelectTrigger className="w-52" data-testid="select-entity-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{ENTITY_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
          <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(1); }}>
            <SelectTrigger className="w-52" data-testid="select-user">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {companyUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-40" data-testid="input-start-date" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-40" data-testid="input-end-date" />
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
          Reset
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8" data-testid="text-no-logs">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const previous = parseDiff((log as any).previousValue);
                  const next = parseDiff((log as any).newValue);
                  const changedKeys = previous || next
                    ? Array.from(new Set([...(previous ? Object.keys(previous) : []), ...(next ? Object.keys(next) : [])]))
                    : [];
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        data-testid={`row-audit-${log.id}`}
                      >
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(log.activityType)} className="text-xs">
                            {log.activityType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
                          {log.entityName && <span className="text-xs text-muted-foreground ml-1">({log.entityName})</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? format(new Date(log.timestamp), "MMM d, yyyy h:mm a") : ""}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="p-3 space-y-3">
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-3.5 w-3.5" />
                                  IP: {(log as any).ipAddress || "Unknown"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Monitor className="h-3.5 w-3.5" />
                                  {parseUserAgent((log as any).userAgent)}
                                </div>
                              </div>
                              {changedKeys.length > 0 ? (
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Before</TableHead>
                                        <TableHead>After</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {changedKeys.map((key) => (
                                        <TableRow key={key}>
                                          <TableCell className="font-medium text-sm">{key}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {previous?.[key] !== undefined ? String(previous[key]) : "—"}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {next?.[key] !== undefined ? String(next[key]) : "—"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No field-level changes recorded for this entry.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} entries)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} data-testid="button-prev-page">
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} data-testid="button-next-page">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
