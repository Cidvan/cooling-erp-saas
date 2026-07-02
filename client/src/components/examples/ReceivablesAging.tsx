import ReceivablesAging from '../ReceivablesAging';

export default function ReceivablesAgingExample() {
  // //todo: remove mock functionality
  const mockBuckets = [
    {
      range: "0-15 days",
      amount: 15800,
      count: 12,
      percentage: 46,
      type: "current" as const
    },
    {
      range: "15-30 days", 
      amount: 8900,
      count: 7,
      percentage: 26,
      type: "early" as const
    },
    {
      range: "Over 30 days",
      amount: 9500,
      count: 5,
      percentage: 28,
      type: "overdue" as const
    }
  ];

  return (
    <div className="p-4 max-w-md">
      <ReceivablesAging buckets={mockBuckets} totalAmount={34200} />
    </div>
  );
}