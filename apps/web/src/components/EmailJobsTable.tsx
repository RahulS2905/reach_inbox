import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState, TableSkeleton, StatusBadge } from "./Common";
import { useToast } from "./Toast";
import type { EmailJobDTO, Paginated } from "@reachinbox/shared";

export function EmailJobsTable({
  scope,
  queryKey,
  allowCancel,
}: {
  scope: "scheduled" | "sent";
  queryKey: string;
  allowCancel?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<EmailJobDTO>>({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      api.get(
        `/api/emails/${scope}?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
    placeholderData: (prev) => prev,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/emails/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      push("Email cancelled", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by recipient or subject…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto p-4">
        {isLoading ? (
          <TableSkeleton cols={scope === "scheduled" ? 5 : 5} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={scope === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
            hint={scope === "scheduled" ? "Compose a new email to get started." : "Sent emails will show up here."}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Recipient</th>
                <th className="pb-2">Subject</th>
                <th className="pb-2">{scope === "scheduled" ? "Scheduled" : "Sent"}</th>
                <th className="pb-2">Status</th>
                {scope === "sent" && <th className="pb-2">Preview</th>}
                {allowCancel && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {data.items.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="py-2 pr-2">{job.recipient}</td>
                  <td className="py-2 pr-2">{job.subject}</td>
                  <td className="py-2 pr-2 text-slate-500">
                    {new Date(scope === "scheduled" ? job.scheduledFor : (job.sentAt ?? job.scheduledFor)).toLocaleString()}
                  </td>
                  <td className="py-2 pr-2">
                    <StatusBadge status={job.status} />
                    {job.status === "FAILED" && job.lastError && (
                      <span className="ml-2 text-xs text-red-500" title={job.lastError}>
                        (details)
                      </span>
                    )}
                  </td>
                  {scope === "sent" && (
                    <td className="py-2 pr-2">
                      {job.previewUrl ? (
                        <a href={job.previewUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                          Open
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  {allowCancel && (
                    <td className="py-2 text-right">
                      {["PENDING", "QUEUED", "RESCHEDULED"].includes(job.status) && (
                        <button
                          onClick={() => cancelMutation.mutate(job.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500">
          <span>
            Page {page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
