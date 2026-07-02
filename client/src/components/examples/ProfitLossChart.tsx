import ProfitLossChart from '../ProfitLossChart';

export default function ProfitLossChartExample() {
  // //todo: remove mock functionality
  const mockProfitLossData = [
    { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
    { month: 'Feb', revenue: 52000, expenses: 35000, profit: 17000 },
    { month: 'Mar', revenue: 48000, expenses: 33000, profit: 15000 },
    { month: 'Apr', revenue: 61000, expenses: 38000, profit: 23000 },
    { month: 'May', revenue: 55000, expenses: 36000, profit: 19000 },
    { month: 'Jun', revenue: 67000, expenses: 41000, profit: 26000 }
  ];

  return (
    <div className="p-4">
      <ProfitLossChart data={mockProfitLossData} height={300} />
    </div>
  );
}