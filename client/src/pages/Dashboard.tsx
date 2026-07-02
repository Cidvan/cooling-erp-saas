import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import ReceivablesAging from "@/components/ReceivablesAging";
import SalesChart from "@/components/SalesChart";
import ProfitLossChart from "@/components/ProfitLossChart";
import RecentActivity from "@/components/RecentActivity";
import type { ActivityLog } from "@shared/schema";

interface AnalyticsData {
  metrics: {
    totalSales: number;
    totalClients: number;
    completedJobs: number;
    outstandingReceivables: number;
    monthlyExpenses: number;
  };
  salesByMonth: Array<{ month: string; sales: number }>;
  expensesByMonth: Array<{ month: string; expenses: number }>;
  recentActivities: any[];
}

export default function Dashboard() {
  // Fetch real dashboard analytics - refresh every 30 seconds
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/dashboard/analytics'],
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Fetch real-time activity logs
  const { data: activityLogs = [], isLoading: isLoadingActivities } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time updates
  });

  // Default mock aging buckets until we implement this calculation
  const defaultAgingBuckets = [
    {
      range: "0-15 days",
      amount: analytics?.metrics?.outstandingReceivables ? analytics.metrics.outstandingReceivables * 0.6 : 0,
      count: 5,
      percentage: 60,
      type: "current" as const
    },
    {
      range: "15-30 days", 
      amount: analytics?.metrics?.outstandingReceivables ? analytics.metrics.outstandingReceivables * 0.25 : 0,
      count: 3,
      percentage: 25,
      type: "early" as const
    },
    {
      range: "Over 30 days",
      amount: analytics?.metrics?.outstandingReceivables ? analytics.metrics.outstandingReceivables * 0.15 : 0,
      count: 2,
      percentage: 15,
      type: "overdue" as const
    }
  ];

  // Generate profit/loss data from real sales and expense data
  const profitLossData = analytics?.salesByMonth?.slice(-6).map((item: any, index: number) => {
    const expenseData = analytics?.expensesByMonth?.[analytics.salesByMonth.length - 6 + index];
    const revenue = item.sales || 0;
    const expenses = expenseData?.expenses || 0;
    const profit = revenue - expenses;
    
    return {
      month: item.month,
      revenue,
      expenses,
      profit
    };
  }) || [];

  // Transform activity logs to format expected by RecentActivity component
  const formattedActivities = activityLogs.slice(0, 10).map((log) => {
    // Map activityType to RecentActivity type
    const typeMap: Record<string, "create" | "update" | "delete" | "approve" | "complete" | "warning"> = {
      'created': 'create',
      'updated': 'update',
      'deleted': 'delete',
    };

    // Generate initials from userName
    const getInitials = (name: string) => {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    };

    // Format action based on entityType and activityType
    const getAction = (activityType: string, entityType: string) => {
      const actionMap: Record<string, string> = {
        'created': 'created',
        'updated': 'updated',
        'deleted': 'deleted',
      };
      const entityMap: Record<string, string> = {
        'client': 'client',
        'service_report': 'service report',
        'quotation': 'quotation',
        'purchase_order': 'purchase order',
        'accounts_receivable': 'accounts receivable',
        'sales_entry': 'sales entry',
        'operational_expense': 'operational expense',
      };
      return `${actionMap[activityType] || activityType} ${entityMap[entityType] || entityType}`;
    };

    return {
      id: log.id,
      user: {
        name: log.userName,
        initials: getInitials(log.userName),
      },
      action: getAction(log.activityType, log.entityType),
      target: log.entityName || '',
      type: typeMap[log.activityType] || 'create' as const,
      timestamp: typeof log.timestamp === 'string' ? log.timestamp : (log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString()),
      description: log.description,
    };
  });

  if (isLoading || isLoadingActivities) {
    return (
      <div className="flex-1 space-y-6 p-6" data-testid="page-dashboard">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h2>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Loading business performance data...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border bg-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-dashboard">
      <div>
        <h2 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h2>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          Overview of your cooling solutions business performance
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Sales"
          value={`₱${(analytics?.metrics?.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          change="All revenue"
          changeType="positive"
          icon={DollarSign}
          description="From all sales & service reports"
        />
        <DashboardCard
          title="Total Clients"
          value={analytics?.metrics?.totalClients?.toString() || "0"}
          change="Active clients"
          changeType="positive"
          icon={Users}
          description="Registered clients"
        />
        <DashboardCard
          title="Completed Jobs"
          value={analytics?.metrics?.completedJobs?.toString() || "0"}
          change="Service reports completed"
          changeType="positive"
          icon={CheckCircle}
          description="Total completed services"
        />
        <DashboardCard
          title="Outstanding Receivables"
          value={`₱${(analytics?.metrics?.outstandingReceivables || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          change="Unpaid invoices"
          changeType="negative"
          icon={Clock}
          description="Pending payments"
        />
      </div>

      {/* Monthly Expenses Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Expenses (Month)"
          value={`₱${(analytics?.metrics?.monthlyExpenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          change="Current month expenses"
          changeType="neutral"
          icon={TrendingUp}
          description="Operating costs"
        />
        <div className="md:col-span-2">
          <ReceivablesAging 
            buckets={defaultAgingBuckets} 
            totalAmount={analytics?.metrics?.outstandingReceivables || 0} 
          />
        </div>
      </div>

      {/* Charts and Activity Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesChart 
              data={analytics?.salesByMonth || []} 
              title="Sales Trend (12 Months)" 
              height={350}
            />
            <ProfitLossChart data={profitLossData} height={350} />
          </div>
        </div>
        <div>
          <RecentActivity activities={formattedActivities} />
        </div>
      </div>
    </div>
  );
}