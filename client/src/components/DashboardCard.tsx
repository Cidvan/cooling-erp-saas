import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export default function DashboardCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description
}: DashboardCardProps) {
  const changeColor = {
    positive: "text-chart-2",
    negative: "text-chart-4", 
    neutral: "text-muted-foreground"
  }[changeType];

  return (
    <Card data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`} className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" data-testid={`icon-${title.toLowerCase().replace(/\s+/g, '-')}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {change && (
          <p className={`text-xs ${changeColor} mt-1`} data-testid={`change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {change}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1" data-testid={`description-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}