import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, Check, CheckCheck, Gift, AlertCircle, DollarSign, Package,
  Briefcase, Wrench, Settings as SettingsIcon,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  system: "System",
  sales: "Sales",
  inventory: "Inventory",
  projects: "Projects",
  finance: "Finance",
  service: "Service",
};

const CATEGORY_ICONS: Record<string, any> = {
  system: SettingsIcon,
  sales: Briefcase,
  inventory: Package,
  projects: Briefcase,
  finance: DollarSign,
  service: Wrench,
};

function getNotificationIcon(type: string, category: string) {
  if (type === "birthday") return Gift;
  if (type === "receivable_aging") return AlertCircle;
  return CATEGORY_ICONS[category] || Bell;
}

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const buckets: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };

  for (const n of notifications) {
    const date = n.createdAt ? new Date(n.createdAt) : new Date();
    if (isToday(date)) buckets.Today.push(n);
    else if (isYesterday(date)) buckets.Yesterday.push(n);
    else buckets.Earlier.push(n);
  }

  for (const label of ["Today", "Yesterday", "Earlier"]) {
    if (buckets[label].length > 0) groups.push({ label, items: buckets[label] });
  }
  return groups;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    enabled: !!userId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => apiRequest("PATCH", `/api/notifications/${notificationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/notifications/${userId}/read-all`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] }),
  });

  const categories = useMemo(() => {
    const set = new Set(notifications.map((n) => n.category || "system"));
    return Array.from(set);
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab === "unread" && n.isRead) return false;
      if (categoryFilter !== "all" && (n.category || "system") !== categoryFilter) return false;
      return true;
    });
  }, [notifications, tab, categoryFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-notification-center">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Notification Center</h2>
          <p className="text-muted-foreground">All alerts and updates across your workspace</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "all")}>
          <TabsList>
            <TabsTrigger value="unread" data-testid="tab-unread">
              Unread {unreadCount > 0 && <Badge variant="default" className="ml-1.5">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            data-testid="chip-category-all"
          >
            All categories
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              data-testid={`chip-category-${cat}`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : grouped.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-notifications">
                {tab === "unread" ? "You're all caught up" : "No notifications yet"}
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="divide-y">
                  {group.items.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type, notification.category || "system");
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 cursor-pointer transition-colors flex items-start gap-3 ${
                          !notification.isRead ? "bg-accent/20 hover-elevate" : "hover-elevate"
                        }`}
                        onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                        data-testid={`notification-item-${index}`}
                      >
                        <div className="mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-medium">{notification.title}</h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                {CATEGORY_LABELS[notification.category || "system"] || notification.category}
                              </Badge>
                              {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {notification.createdAt
                              ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                              : "Just now"}
                          </p>
                        </div>
                        {notification.isRead && <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
