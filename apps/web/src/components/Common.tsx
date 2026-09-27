export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-16 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 rounded bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-slate-100 text-slate-600",
  QUEUED: "bg-blue-100 text-blue-700",
  RESERVED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  RESCHEDULED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-400 line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.toLowerCase()}
    </span>
  );
}
