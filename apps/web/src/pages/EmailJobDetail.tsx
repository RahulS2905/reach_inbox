import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge, TableSkeleton } from "../components/Common";
import { useToast } from "../components/Toast";
import type { EmailJobDTO } from "@reachinbox/shared";

export function EmailJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery<EmailJobDTO>({
    queryKey: ["email-job", id],
    queryFn: () => api.get(`/api/emails/${id}`),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/api/emails/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-job", id] });
      push("Email cancelled", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  const retryMutation = useMutation({
    mutationFn: () => api.post(`/api/emails/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-job", id] });
      push("Email retried", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  if (isLoading) {
    return <div className="p-4"><TableSkeleton cols={2} rows={4} /></div>;
  }

  if (!job) {
    return <div className="p-4 text-slate-500">Email job not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Email Job Details</h1>
        <div className="flex gap-2">
          {["PENDING", "QUEUED", "RESCHEDULED"].includes(job.status) && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel this email?")) {
                  cancelMutation.mutate();
                }
              }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          {job.status === "FAILED" && (
            <button
              onClick={() => retryMutation.mutate()}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recipient</p>
            <p className="mt-1 font-medium text-slate-900">{job.recipient}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Status</p>
            <div className="mt-1"><StatusBadge status={job.status} /></div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Subject</p>
            <p className="mt-1 text-slate-900">{job.subject}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sender Label</p>
            <p className="mt-1 text-slate-900">{job.senderLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Campaign</p>
            <p className="mt-1">
              <Link to={`/dashboard/campaigns/${job.campaignId}`} className="text-brand-600 hover:underline">
                View Campaign
              </Link>
            </p>
          </div>
        </div>

        <div className="border-b border-slate-100 p-5 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-700">Scheduled For</p>
            <p className="text-slate-600">{new Date(job.scheduledFor).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Sent At</p>
            <p className="text-slate-600">{job.sentAt ? new Date(job.sentAt).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Attempt Count</p>
            <p className="text-slate-600">{job.attemptCount}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Message ID</p>
            <p className="text-slate-600 truncate" title={job.providerMessageId || ""}>{job.providerMessageId || "—"}</p>
          </div>
        </div>

        {job.previewUrl && (
          <div className="border-b border-slate-100 p-5">
            <p className="text-sm font-medium text-slate-700 mb-2">Ethereal Preview</p>
            <a 
              href={job.previewUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-slate-200"
            >
              Open Ethereal Preview &nearr;
            </a>
          </div>
        )}

        {job.lastError && (
          <div className="p-5 bg-red-50">
            <p className="text-sm font-medium text-red-800 mb-1">Last Error</p>
            <p className="text-sm text-red-700 break-words font-mono">{job.lastError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
