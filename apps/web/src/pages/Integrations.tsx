import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { SlackStatusDTO } from "@reachinbox/shared";

export function IntegrationsPage() {
  const { data: slack, isLoading } = useQuery<SlackStatusDTO>({
    queryKey: ["slack-status"],
    queryFn: () => api.get<SlackStatusDTO>("/api/slack/status"),
  });

  const handleSlackConnect = () => {
    window.location.href = "/api/slack/install";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">Connect your favorite tools to ReachInbox.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Slack Integration */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center p-2">
                <img src="https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg" alt="Slack" className="w-full h-full" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Slack</h3>
                <p className="text-xs text-slate-500">Workspace notifications</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Get notified in your Slack workspace when campaigns finish sending or when emails fail.
            </p>
            
            {!isLoading && slack?.connected && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs font-medium text-emerald-800">Connected to {slack.teamName}</p>
                {slack.channelName && (
                  <p className="text-xs text-emerald-600 mt-1">Posting to #{slack.channelName}</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
            {!isLoading ? (
              slack?.connected ? (
                <button className="text-sm font-medium text-red-600 hover:text-red-700">Disconnect</button>
              ) : (
                <button 
                  onClick={handleSlackConnect}
                  className="rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Connect
                </button>
              )
            ) : (
              <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Google OAuth (Placeholder) */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col opacity-75">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center p-2">
                <img src="https://cdn.worldvectorlogo.com/logos/google-icon.svg" alt="Google" className="w-full h-full" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Google Workspace</h3>
                <p className="text-xs text-slate-500">Email provider</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Connect your Google Workspace accounts to send emails securely via OAuth.
            </p>
            <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Coming Soon
            </div>
          </div>
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
            <button disabled className="rounded-md bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
              Connect
            </button>
          </div>
        </div>

        {/* Webhooks (Placeholder) */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col opacity-75">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Webhooks</h3>
                <p className="text-xs text-slate-500">Custom integrations</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Send real-time events to your own servers when emails are sent, opened, or clicked.
            </p>
            <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Coming Soon
            </div>
          </div>
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
            <button disabled className="rounded-md bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
