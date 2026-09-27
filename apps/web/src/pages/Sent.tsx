import { EmailJobsTable } from "../components/EmailJobsTable";

export function SentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Sent Emails</h1>
      <EmailJobsTable scope="sent" queryKey="sent-emails" />
    </div>
  );
}
