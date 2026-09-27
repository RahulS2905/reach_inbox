import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState, TableSkeleton } from "../components/Common";
import type { CampaignDTO } from "@reachinbox/shared";

export function CampaignsPage() {
  const { data, isLoading } = useQuery<{ items: CampaignDTO[] }>({
    queryKey: ["campaigns"],
    queryFn: () => api.get("/api/campaigns"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No campaigns yet" hint="Compose an email to create your first campaign." />
        ) : (
          <div className="space-y-3">
            {data.items.map((c) => {
              const progress = c.totalRecipients > 0 ? Math.round(((c.sent + c.failed) / c.totalRecipients) * 100) : 0;
              return (
                <div key={c.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{c.subject}</p>
                      <p className="text-xs text-slate-400">via {c.senderLabel}</p>
                    </div>
                    <span className="text-xs text-slate-500">{progress}% complete</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-5">
                    <span>Total: {c.totalRecipients}</span>
                    <span>Queued: {c.queued}</span>
                    <span>Sent: {c.sent}</span>
                    <span>Failed: {c.failed}</span>
                    <span>
                      Next send:{" "}
                      {c.nextScheduledFor ? new Date(c.nextScheduledFor).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
