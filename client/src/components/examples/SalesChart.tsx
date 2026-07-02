import SalesChart from '../SalesChart';

export default function SalesChartExample() {
  // //todo: remove mock functionality
  const mockSalesData = [
    { month: 'Jan', sales: 45000 },
    { month: 'Feb', sales: 52000 },
    { month: 'Mar', sales: 48000 },
    { month: 'Apr', sales: 61000 },
    { month: 'May', sales: 55000 },
    { month: 'Jun', sales: 67000 },
    { month: 'Jul', sales: 71000 },
    { month: 'Aug', sales: 58000 },
    { month: 'Sep', sales: 64000 },
    { month: 'Oct', sales: 72000 },
    { month: 'Nov', sales: 69000 },
    { month: 'Dec', sales: 78000 }
  ];

  return (
    <div className="p-4">
      <SalesChart 
        data={mockSalesData} 
        title="Sales Trend (12 Months)" 
        height={300}
      />
    </div>
  );
}