import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { useCurrency } from "@/hooks/use-currency";

interface ProfitLossData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ProfitLossChartProps {
  data: ProfitLossData[];
  height?: number;
}

export default function ProfitLossChart({ data, height = 300 }: ProfitLossChartProps) {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  return (
    <Card data-testid="card-profit-loss-chart" className="hover-elevate">
      <CardHeader>
        <CardTitle data-testid="text-profit-loss-title">Profit & Loss Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Profit'
              ]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--chart-2))"
              radius={[2, 2, 0, 0]}
              data-testid="bar-revenue"
            />
            <Bar 
              dataKey="expenses" 
              fill="hsl(var(--chart-4))"
              radius={[2, 2, 0, 0]}
              data-testid="bar-expenses"
            />
            <Bar 
              dataKey="profit" 
              fill="hsl(var(--chart-1))"
              radius={[2, 2, 0, 0]}
              data-testid="bar-profit"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}