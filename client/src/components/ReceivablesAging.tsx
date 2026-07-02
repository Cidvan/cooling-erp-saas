import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/use-currency";

interface AgingBucket {
  range: string;
  amount: number;
  count: number;
  percentage: number;
  type: "current" | "early" | "overdue";
}

interface ReceivablesAgingProps {
  buckets: AgingBucket[];
  totalAmount: number;
}

export default function ReceivablesAging({ buckets, totalAmount }: ReceivablesAgingProps) {
  const { formatCurrency } = useCurrency();
  const getBadgeVariant = (type: AgingBucket["type"]) => {
    switch (type) {
      case "current": return "default";
      case "early": return "secondary"; 
      case "overdue": return "destructive";
      default: return "default";
    }
  };

  const getIndicatorColor = (type: AgingBucket["type"]) => {
    switch (type) {
      case "current": return "bg-chart-2";
      case "early": return "bg-chart-3";
      case "overdue": return "bg-chart-4";
      default: return "bg-muted";
    }
  };

  return (
    <Card data-testid="card-receivables-aging" className="hover-elevate">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Receivables Aging
          <Badge variant="outline" data-testid="text-total-amount">
            {formatCurrency(totalAmount)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((bucket, index) => (
          <div 
            key={bucket.range} 
            className="flex items-center justify-between p-3 border rounded-md"
            data-testid={`aging-bucket-${index}`}
          >
            <div className="flex items-center gap-3">
              <div 
                className={`w-3 h-3 rounded-full ${getIndicatorColor(bucket.type)}`}
                data-testid={`indicator-${bucket.type}`}
              />
              <div>
                <div className="font-medium" data-testid={`range-${index}`}>
                  {bucket.range}
                </div>
                <div className="text-sm text-muted-foreground" data-testid={`count-${index}`}>
                  {bucket.count} invoices
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium" data-testid={`amount-${index}`}>
                {formatCurrency(bucket.amount)}
              </div>
              <Badge 
                variant={getBadgeVariant(bucket.type)} 
                className="text-xs"
                data-testid={`badge-${index}`}
              >
                {bucket.percentage}%
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}