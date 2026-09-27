import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge, TableSkeleton } from "../components/Common";
import { useToast } from "../components/Toast";
import type { CampaignDTO, EmailJobDTO, Paginated } from "@reachinbox/shared";

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading: isLoadingCampaign } = useQuery<CampaignDTO>({
    queryKey: ["campaign", id],
    queryFn: () => api.get(`/api/campaigns/${id}`),
  });

  const { data: jobs, isLoading: isLoadingJobs } = useQuery<Paginated<EmailJobDTO>>({
    queryKey: ["campaign-jobs", id],
    queryFn: () => api.get(`/api/emails/scheduled?campaignId=${id}&pageSize=100`),
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/api/emails/${jobId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-jobs", id] });
      push("Email cancelled", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/api/emails/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-jobs", id] });
      push("Email retried", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  if (isLoadingCampaign) {
    return <div className="p-4"><TableSkeleton cols={2} rows={4} /></div>;
  }

  if (!campaign) {
    return <div className="p-4 text-slate-500">Campaign not found.</div>;
  }

  const progress = campaign.totalRecipients > 0 ? (campaign.sent / campaign.totalRecipients) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{campaign.subject}</h1>
          <p className="text-sm text-slate-500 mt-1">Sender: {campaign.senderLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          <Link
            to={`/dashboard/campaigns/${id}/timeline`}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            View Timeline
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Progress</span>
          <span className="text-slate-500">{campaign.sent} / {campaign.totalRecipients}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={campaign.totalRecipients} />
        <StatCard label="Queued" value={campaign.queued} />
        <StatCard label="Sent" value={campaign.sent} />
        <StatCard label="Failed" value={campaign.failed} />
        <StatCard label="Deferred" value={0} /> {/* Placeholder for deferred */}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-medium text-slate-800">Email Jobs</h2>
        </div>
        <div className="overflow-x-auto p-4">
          {isLoadingJobs ? (
            <TableSkeleton cols={5} />
          ) : !jobs || jobs.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No email jobs found for this campaign.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Recipient</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Scheduled For</th>
                  <th className="pb-2">Sent At</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.items.map((job) => (
                  <tr key={job.id} className="border-t border-slate-100">
                    <td className="py-3 pr-2">
                      <Link to={`/dashboard/emails/${job.id}`} className="font-medium text-brand-600 hover:underline">
                        {job.recipient}
                      </Link>
                    </td>
                    <td className="py-3 pr-2">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 pr-2 text-slate-500">
                      {new Date(job.scheduledFor).toLocaleString()}
                    </td>
                    <td className="py-3 pr-2 text-slate-500">
                      {job.sentAt ? new Date(job.sentAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {["PENDING", "QUEUED", "RESCHEDULED"].includes(job.status) && (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to cancel this email?")) {
                                cancelMutation.mutate(job.id);
                              }
                            }}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                        {job.status === "FAILED" && (
                          <button
                            onClick={() => retryMutation.mutate(job.id)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
