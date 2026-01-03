export function StatCard({
  title,
  value,
  className = "",
  testId,
}: {
  title: string;
  value: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`border rounded p-4 ${className}`} data-testid={testId}>
      <div
        className="text-sm text-gray-500"
        data-testid={testId ? `${testId}-title` : undefined}
      >
        {title}
      </div>
      <div
        className="text-2xl font-semibold"
        data-testid={testId ? `${testId}-value` : undefined}
      >
        {value}
      </div>
    </div>
  );
}
