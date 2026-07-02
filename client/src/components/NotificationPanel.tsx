import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Check, CheckCheck, Gift, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

interface NotificationPanelProps {
  userId: string;
}

export default function NotificationPanel({ userId }: NotificationPanelProps) {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/notifications/${userId}/read-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const generateNotificationsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/notifications/${userId}/generate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Gift className="h-4 w-4 text-pink-500" />;
      case 'receivable_aging':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 p-4">
        <p className="text-sm text-muted-foreground text-center" data-testid="text-loading">
          Loading notifications...
        </p>
      </div>
    );
  }

  return (
    <div className="w-80" data-testid="panel-notifications">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base" data-testid="text-notifications-title">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="default" data-testid="badge-unread-count">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateNotificationsMutation.mutate()}
            disabled={generateNotificationsMutation.isPending}
            data-testid="button-generate-notifications"
          >
            <Bell className="h-3 w-3 mr-1" />
            Check for new
          </Button>
        </div>
      </div>

      <ScrollArea className="h-96">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-notifications">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  !notification.isRead 
                    ? "bg-accent/20 hover-elevate" 
                    : "hover-elevate"
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-medium" data-testid={`notification-title-${index}`}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" data-testid={`notification-unread-dot-${index}`} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`notification-message-${index}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`notification-time-${index}`}>
                      {notification.createdAt 
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                        : 'Just now'}
                    </p>
                  </div>
                  {notification.isRead && (
                    <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" data-testid={`notification-read-check-${index}`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
