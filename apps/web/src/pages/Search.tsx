import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { EmptyState, TableSkeleton, StatusBadge } from "../components/Common";

interface SearchHit {
  recipient: string;
  subject: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
}
interface SearchResponse {
  total: number;
  page: number;
  pageSize: number;
  items: SearchHit[];
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery<SearchResponse, ApiError>({
    queryKey: ["search", q, status],
    queryFn: () =>
      api.get(`/api/search/emails?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`),
    enabled: submitted,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipient, subject, or body…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
          <option value="">Any status</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="QUEUED">Queued</option>
          <option value="RESCHEDULED">Rescheduled</option>
        </select>
        <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Search
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {!submitted ? (
          <EmptyState title="Search across all your emails" hint="Query is powered by Elasticsearch and always scoped to your account." />
        ) : isLoading ? (
          <TableSkeleton cols={4} />
        ) : error ? (
          <EmptyState title="Search is currently unavailable" hint={error.message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No matching emails" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Recipient</th>
                <th className="pb-2">Subject</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((hit, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-2 pr-2">{hit.recipient}</td>
                  <td className="py-2 pr-2">{hit.subject}</td>
                  <td className="py-2 pr-2">
                    <StatusBadge status={hit.status} />
                  </td>
                  <td className="py-2 pr-2 text-slate-500">
                    {new Date(hit.sentAt ?? hit.scheduledFor).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
