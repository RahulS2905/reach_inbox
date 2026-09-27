import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState, TableSkeleton } from "../components/Common";
import { useToast } from "../components/Toast";
import type { EmailJobDTO, Paginated } from "@reachinbox/shared";

export function FailureInspectorPage() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { push } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<EmailJobDTO>>({
    queryKey: ["failed-emails"],
    queryFn: () => api.get(`/api/emails/sent?status=FAILED&pageSize=50`),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/emails/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failed-emails"] });
      push("Email queued for retry", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  const retryAllMutation = useMutation({
    mutationFn: () => Promise.all((data?.items || []).map(job => api.post(`/api/emails/${job.id}/retry`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failed-emails"] });
      push("All failed emails queued for retry", "success");
    },
    onError: (err: Error) => push(err.message, "error"),
  });

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Failure Inspector</h1>
        {data && data.items.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to retry all failed emails on this page?")) {
                retryAllMutation.mutate();
              }
            }}
            disabled={retryAllMutation.isPending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Retry All ({data.items.length})
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton cols={4} /></div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-8"><EmptyState title="No failed emails" hint="Everything is running smoothly." /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Recipient / Subject</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Last Attempt</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((job) => (
                  <React.Fragment key={job.id}>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{job.recipient}</div>
                        <div className="text-slate-500 truncate max-w-md">{job.subject}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{job.attemptCount}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {job.sentAt ? new Date(job.sentAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => toggleRow(job.id)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            {expandedRows.has(job.id) ? "Hide Error" : "View Error"}
                          </button>
                          <button
                            onClick={() => retryMutation.mutate(job.id)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-800"
                          >
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(job.id) && (
                      <tr className="bg-red-50/50">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="text-xs font-mono text-red-800 break-words whitespace-pre-wrap">
                            {job.lastError || "Unknown error occurred"}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
import React from 'react';
