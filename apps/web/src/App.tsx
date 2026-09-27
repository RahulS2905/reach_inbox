import { Navigate, Route, Routes } from "react-router-dom";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { Login } from "./pages/Login";
import { DashboardLayout } from "./components/DashboardLayout";
import { OverviewPage } from "./pages/Overview";
import { ScheduledPage } from "./pages/Scheduled";
import { SentPage } from "./pages/Sent";
import { CampaignsPage } from "./pages/Campaigns";
import { SearchPage } from "./pages/Search";
import { SettingsPage } from "./pages/Settings";
import { CampaignDetailPage } from "./pages/CampaignDetail";
import { CampaignTimelinePage } from "./pages/CampaignTimeline";
import { EmailJobDetailPage } from "./pages/EmailJobDetail";
import { FailureInspectorPage } from "./pages/FailureInspector";
import { QueueHealthPage } from "./pages/QueueHealth";
import { IntegrationsPage } from "./pages/Integrations";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicy";
import { TermsOfServicePage } from "./pages/TermsOfService";
import { NotFoundPage } from "./pages/NotFound";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      Loading…
    </div>
  );
}

export function App() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) return <FullScreenSpinner />;

  if (isError || !user) {
    return (
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="scheduled" element={<ScheduledPage />} />
        <Route path="sent" element={<SentPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="campaigns/:id/timeline" element={<CampaignTimelinePage />} />
        <Route path="emails/:id" element={<EmailJobDetailPage />} />
        <Route path="failures" element={<FailureInspectorPage />} />
        <Route path="queue-health" element={<QueueHealthPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
