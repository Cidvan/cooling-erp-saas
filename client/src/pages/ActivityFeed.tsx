import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { FileText, Settings, AlertTriangle } from "lucide-react";
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

export default function ActivityFeed() {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: activityLogs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", { limit: 200 }],
    queryFn: async () => {
      const res = await fetch("/api/activity-logs?limit=200", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const entityTypes = useMemo(() => {
    const set = new Set(activityLogs.map((l) => l.entityType));
    return Array.from(set);
  }, [activityLogs]);

  const filtered = useMemo(() => {
    if (entityFilter === "all") return activityLogs;
    return activityLogs.filter((l) => l.entityType === entityFilter);
  }, [activityLogs, entityFilter]);

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-activity-feed">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Activity Feed</h2>
          <p className="text-muted-foreground">A live stream of everything happening in your workspace</p>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
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
    </div>
  );
}
