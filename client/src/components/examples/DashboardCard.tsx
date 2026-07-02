import DashboardCard from '../DashboardCard';
import { DollarSign, Users, CheckCircle, Clock } from 'lucide-react';

export default function DashboardCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {/* //todo: remove mock functionality */}
      <DashboardCard
        title="Total Sales"
        value="₱124,500"
        change="+12.5% from last month"
        changeType="positive"
        icon={DollarSign}
        description="Monthly revenue"
      />
      <DashboardCard
        title="Total Clients"
        value="348"
        change="+4 new this week"
        changeType="positive"
        icon={Users}
        description="Active clients"
      />
      <DashboardCard
        title="Completed Jobs"
        value="89"
        change="+23% completion rate"
        changeType="positive"
        icon={CheckCircle}
        description="This month"
      />
      <DashboardCard
        title="Outstanding Receivables"
        value="₱34,200"
        change="2 overdue invoices"
        changeType="negative"
        icon={Clock}
        description="Pending payments"
      />
    </div>
  );
}