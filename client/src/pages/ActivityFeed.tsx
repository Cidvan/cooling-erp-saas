import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { FileText, Settings, AlertTriangle, Search } from "lucide-react";
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

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
};

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getIcon(activityType: string) {
  if (activityType === "deleted") return AlertTriangle;
  if (activityType === "updated") return Settings;
  return FileText;
}

function getBadgeVariant(activityType: string) {
  if (activityType === "deleted") return "destructive" as const;
  if (activityType === "updated") return "secondary" as const;
  return "default" as const;
}

interface ActivityFeedResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

export default function ActivityFeed() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = new URLSearchParams();
  if (entityFilter !== "all") params.set("entityType", entityFilter);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { data, isLoading } = useQuery<ActivityFeedResponse>({
    queryKey: ["/api/activity-logs", "feed", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/activity-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const filtered = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const entityTypes = useMemo(() => Object.keys(ENTITY_LABELS), []);

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-activity-feed">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Activity Feed</h2>
          <p className="text-muted-foreground">A live stream of everything happening in your workspace</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search activity..."
              className="w-56 pl-8"
              data-testid="input-activity-search"
            />
          </div>
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-52" data-testid="select-entity-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>{ENTITY_LABELS[type] || type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading activity...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground" data-testid="text-no-activity">
              No activity to display
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => {
                const Icon = getIcon(log.activityType);
                return (
                  <div key={log.id} className="flex items-start gap-3 p-4" data-testid={`activity-item-${log.id}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">{getInitials(log.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Badge variant={getBadgeVariant(log.activityType)} className="text-xs">
                          {log.activityType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">
                        <span className="font-semibold">{log.userName}</span>{" "}
                        {ACTION_LABELS[log.activityType] || log.activityType}{" "}
                        <span className="font-medium">{log.entityName}</span>
                      </p>
                      {log.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
