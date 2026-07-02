import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal
} from "lucide-react";

interface Activity {
  id: string;
  user: {
    name: string;
    initials: string;
  };
  action: string;
  target: string;
  type: "create" | "update" | "delete" | "approve" | "complete" | "warning";
  timestamp: string;
  description?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  showViewAll?: boolean;
}

export default function RecentActivity({ activities, showViewAll = true }: RecentActivityProps) {
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "create": return FileText;
      case "update": return Settings;
      case "delete": return AlertTriangle;
      case "approve": return CheckCircle;
      case "complete": return CheckCircle;
      case "warning": return AlertTriangle;
      default: return FileText;
    }
  };

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "create": return "text-chart-2";
      case "update": return "text-chart-1";
      case "delete": return "text-chart-4";
      case "approve": return "text-chart-2";
      case "complete": return "text-chart-2";
      case "warning": return "text-chart-3";
      default: return "text-muted-foreground";
    }
  };

  const getBadgeVariant = (type: Activity["type"]) => {
    switch (type) {
      case "create": return "default" as const;
      case "update": return "secondary" as const;
      case "delete": return "destructive" as const;
      case "approve": return "default" as const;
      case "complete": return "default" as const;
      case "warning": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  const handleActivityClick = (activityId: string) => {
    console.log('Activity clicked:', activityId);
  };

  const handleViewAll = () => {
    console.log('View all activities clicked');
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card data-testid="card-recent-activity" className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" data-testid="text-activity-title">
            Recent Activity
          </CardTitle>
          {showViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleViewAll}
              data-testid="button-view-all-activity"
            >
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm" data-testid="text-no-activity">
              No recent activity to display
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover-elevate cursor-pointer border"
                onClick={() => handleActivityClick(activity.id)}
                data-testid={`activity-item-${activity.id}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs" data-testid={`avatar-${activity.id}`}>
                    {activity.user.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${getActivityColor(activity.type)}`} />
                    <Badge 
                      variant={getBadgeVariant(activity.type)} 
                      className="text-xs"
                      data-testid={`badge-${activity.id}`}
                    >
                      {activity.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium" data-testid={`text-action-${activity.id}`}>
                      <span className="font-semibold">{activity.user.name}</span>{" "}
                      {activity.action}{" "}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    
                    {activity.description && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-description-${activity.id}`}>
                        {activity.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${activity.id}`}>
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
                
                <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}