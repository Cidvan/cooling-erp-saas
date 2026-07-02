import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useCurrency } from "@/hooks/use-currency";

interface SalesData {
  month: string;
  sales: number;
  target?: number;
}

interface SalesChartProps {
  data: SalesData[];
  title: string;
  height?: number;
}

export default function SalesChart({ data, title, height = 300 }: SalesChartProps) {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  return (
    <Card data-testid="card-sales-chart" className="hover-elevate">
      <CardHeader>
        <CardTitle data-testid="text-chart-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Sales']}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="sales" 
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
              data-testid="bar-sales"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}