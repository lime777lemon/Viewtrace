export type ObservationFactCountSegment = {
  key: string;
  count: number;
  label: string;
  color: string;
};

export function ObservationFactCountBar({
  segments,
  ariaLabel,
}: {
  segments: ObservationFactCountSegment[];
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) return null;
  const visible = segments.filter((row) => row.count > 0);

  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={ariaLabel}
      >
        {visible.map((row) => (
          <span
            key={row.key}
            className="h-full min-w-0"
            style={{ width: `${(row.count / total) * 100}%`, backgroundColor: row.color }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {visible.map((row) => `${row.count} ${row.label}`).join(" · ")}
      </p>
    </div>
  );
}
