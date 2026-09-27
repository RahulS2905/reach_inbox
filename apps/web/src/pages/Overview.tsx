import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ComposeModal } from "../components/ComposeModal";
import { StatusBadge } from "../components/Common";
import type { DashboardStatsDTO } from "@reachinbox/shared";

export function OverviewPage() {
  const [composeOpen, setComposeOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<DashboardStatsDTO>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/api/stats/dashboard"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <button
          onClick={() => setComposeOpen(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label="Compose a new email campaign"
        >
          Compose New Email
        </button>
      </div>

      {isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard stats. Please try again later.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Campaigns" value={data?.totalCampaigns} loading={isLoading} />
        <StatCard label="Scheduled" value={data?.scheduledEmails} loading={isLoading} />
        <StatCard label="Sent" value={data?.sentEmails} loading={isLoading} color="emerald" />
        <StatCard label="Failed" value={data?.failedEmails} loading={isLoading} color="red" />
        <StatCard label="Deferred" value={data?.deferredEmails} loading={isLoading} color="amber" />
        <StatCard label="Cancelled" value={data?.cancelledEmails} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <section className="rounded-xl border border-slate-200 bg-white" aria-label="Recent activity">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-medium text-slate-800">Recent Activity</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded" />
                ))}
              </div>
            ) : !data?.recentEvents?.length ? (
              <p className="text-sm text-slate-500 py-4 text-center">No recent activity</p>
            ) : (
              <ul className="space-y-4">
                {data.recentEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="relative flex h-2 w-2 mt-1.5 flex-shrink-0">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          event.eventType === "sent"
                            ? "bg-emerald-400"
                            : event.eventType === "failed"
                              ? "bg-red-400"
                              : "bg-brand-400"
                        }`}
                      />
                      <span
                        className={`relative inline-flex h-2 w-2 rounded-full ${
                          event.eventType === "sent"
                            ? "bg-emerald-500"
                            : event.eventType === "failed"
                              ? "bg-red-500"
                              : "bg-brand-500"
                        }`}
                      />
                    </span>
                    <div>
                      <p className="text-slate-800">
                        <Link
                          to={`/dashboard/campaigns/${event.campaignId}`}
                          className="hover:underline hover:text-brand-600"
                        >
                          {event.message}
                        </Link>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Upcoming Campaigns */}
        <section className="rounded-xl border border-slate-200 bg-white" aria-label="Upcoming campaigns">
          <div className="border-b border-slate-100 p-4 flex justify-between items-center">
            <h2 className="font-medium text-slate-800">Upcoming Campaigns</h2>
            <Link to="/dashboard/campaigns" className="text-xs font-medium text-brand-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded" />
                ))}
              </div>
            ) : !data?.upcomingCampaigns?.length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No upcoming campaigns</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.upcomingCampaigns.map((campaign) => (
                  <li key={campaign.id} className="p-4 hover:bg-slate-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Link
                          to={`/dashboard/campaigns/${campaign.id}`}
                          className="font-medium text-slate-900 hover:text-brand-600 hover:underline"
                        >
                          {campaign.subject}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">
                          {campaign.nextScheduledFor
                            ? `Next send: ${new Date(campaign.nextScheduledFor).toLocaleString()}`
                            : "No upcoming sends"}
                        </p>
                      </div>
                      <StatusBadge status={campaign.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  color,
}: {
  label: string;
  value: number | undefined;
  loading?: boolean;
  color?: "emerald" | "red" | "amber";
}) {
  const valueColor =
    color === "emerald"
      ? "text-emerald-600"
      : color === "red"
        ? "text-red-600"
        : color === "amber"
          ? "text-amber-600"
          : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-1 h-8 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value ?? 0}</p>
      )}
    </div>
  );
}
