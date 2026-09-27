import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { TableSkeleton } from "../components/Common";
import type { Paginated } from "@reachinbox/shared";

interface CampaignEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function CampaignTimelinePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<Paginated<CampaignEvent>>({
    queryKey: ["campaign-events", id],
    queryFn: () => api.get(`/api/campaigns/${id}/events?pageSize=50`),
  });

  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "scheduled": return "bg-blue-500";
      case "queued": return "bg-indigo-500";
      case "sent": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "deferred": return "bg-amber-500";
      case "cancelled": return "bg-gray-500";
      case "retried": return "bg-purple-500";
      case "rescheduled": return "bg-orange-500";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to={`/dashboard/campaigns/${id}`} className="text-slate-400 hover:text-slate-600">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Campaign Timeline</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {isLoading ? (
          <TableSkeleton rows={5} cols={1} />
        ) : !data || data.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No events found for this campaign.</div>
        ) : (
          <div className="relative border-l border-slate-200 ml-3 space-y-8">
            {data.items.map((event) => (
              <div key={event.id} className="relative pl-6">
                <span className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white ${getEventColor(event.type)}`} />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                  <span className="font-medium text-slate-900">{event.type}</span>
                  <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700">{event.message}</p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
