import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

interface QueueHealthData {
  services: {
    postgres: boolean;
    redis: boolean;
    elasticsearch: boolean;
  };
  metrics: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  worker: {
    status: string;
    lastSeen: string | null;
  };
}

export function QueueHealthPage() {
  const { data, isLoading, isError } = useQuery<QueueHealthData>({
    queryKey: ["queue-health"],
    queryFn: () => api.get("/api/queue-health"),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Queue & System Health</h1>
        <div className="text-xs text-slate-500">Auto-updates every 30s</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-medium text-slate-800 mb-4 uppercase tracking-wide">Services</h2>
            <div className="space-y-3">
              <ServiceStatus name="PostgreSQL" status={data?.services?.postgres} />
              <ServiceStatus name="Redis" status={data?.services?.redis} />
              <ServiceStatus name="Elasticsearch" status={data?.services?.elasticsearch} />
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-medium text-slate-800 mb-4 uppercase tracking-wide">Worker Status</h2>
            <div className="flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${data?.worker?.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <div>
                <p className="font-medium text-slate-900">{data?.worker?.status === 'active' ? 'Running' : 'Offline'}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Last seen: {data?.worker?.lastSeen ? new Date(data.worker.lastSeen).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 h-full">
            <h2 className="text-sm font-medium text-slate-800 mb-4 uppercase tracking-wide">Queue Metrics</h2>
            
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-slate-100 rounded-lg"></div>
                <div className="h-20 bg-slate-100 rounded-lg"></div>
              </div>
            ) : isError || !data ? (
              <div className="text-sm text-red-500 p-4 bg-red-50 rounded-lg">Failed to load metrics.</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Waiting" value={data.metrics.waiting} color="blue" />
                <MetricCard label="Active" value={data.metrics.active} color="amber" />
                <MetricCard label="Delayed" value={data.metrics.delayed} color="indigo" />
                <MetricCard label="Failed" value={data.metrics.failed} color="red" />
                <div className="col-span-2 mt-2">
                  <MetricCard label="Completed (Recent)" value={data.metrics.completed} color="emerald" layout="horizontal" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceStatus({ name, status }: { name: string; status?: boolean }) {
  const isHealthy = status === true;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{name}</span>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${isHealthy ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-500"}`}></span>
        {isHealthy ? "Healthy" : "Offline"}
      </span>
    </div>
  );
}

function MetricCard({ label, value, color, layout = "vertical" }: { label: string; value: number; color: string; layout?: "vertical" | "horizontal" }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    red: "bg-red-50 border-red-100 text-red-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  };

  if (layout === "horizontal") {
    return (
      <div className={`rounded-lg border p-4 flex items-center justify-between ${colorMap[color]}`}>
        <span className="text-sm font-medium uppercase tracking-wide opacity-80">{label}</span>
        <span className="text-2xl font-bold">{value.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <span className="block text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
      <span className="block mt-1 text-3xl font-bold">{value.toLocaleString()}</span>
    </div>
  );
}
