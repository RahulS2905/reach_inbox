import { EmailJobsTable } from "../components/EmailJobsTable";

export function ScheduledPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Scheduled Emails</h1>
      <EmailJobsTable scope="scheduled" queryKey="scheduled-emails" allowCancel />
    </div>
  );
}
