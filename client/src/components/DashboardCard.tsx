import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
    positive: "text-emerald-600",
    negative: "text-red-600",
    neutral: "text-muted-foreground"
  }[changeType];

  const TrendIcon = changeType === "positive" ? ArrowUpRight : changeType === "negative" ? ArrowDownRight : null;

  return (
    <Card
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="hover-elevate transition-shadow duration-200 hover:shadow-md"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" data-testid={`icon-${title.toLowerCase().replace(/\s+/g, '-')}`} />
          </div>
        </div>
        <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {(change || description) && (
          <div className="mt-2 flex items-center gap-1">
            {change && (
              <p className={`flex items-center gap-0.5 text-xs font-medium ${changeColor}`} data-testid={`change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {TrendIcon && <TrendIcon className="h-3 w-3" />}
                {change}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground" data-testid={`description-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}