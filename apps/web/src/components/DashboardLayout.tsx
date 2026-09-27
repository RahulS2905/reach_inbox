import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCurrentUser } from "../hooks/useCurrentUser";
import type { SlackStatusDTO } from "@reachinbox/shared";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/scheduled", label: "Scheduled Emails" },
  { to: "/dashboard/sent", label: "Sent Emails" },
  { to: "/dashboard/campaigns", label: "Campaigns" },
  { to: "/dashboard/search", label: "Search" },
  { to: "/dashboard/failures", label: "Failure Inspector" },
  { to: "/dashboard/queue-health", label: "Queue Health" },
  { to: "/dashboard/integrations", label: "Integrations" },
  { to: "/dashboard/settings", label: "Settings" },
];

export function DashboardLayout() {
  const { data: user } = useCurrentUser();
  const { data: slack } = useQuery<SlackStatusDTO>({
    queryKey: ["slack-status"],
    queryFn: () => api.get<SlackStatusDTO>("/api/slack/status"),
  });
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function logout() {
    await api.post("/api/auth/logout");
    queryClient.clear();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden p-1 mr-2 text-slate-600 rounded-md hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="h-7 w-7 rounded-md bg-brand-600" />
          <span className="font-semibold text-slate-800">ReachInbox</span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${
              slack?.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${slack?.connected ? "bg-emerald-500" : "bg-slate-400"}`} />
            {slack?.connected ? `Slack: ${slack.teamName}` : "Slack not connected"}
          </span>
          {user && (
            <div className="flex items-center gap-2">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="hidden text-xs leading-tight sm:block">
                <div className="font-medium text-slate-800">{user.name}</div>
                <div className="text-slate-400">{user.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-4 sm:px-6">
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 flex-col bg-white border-r border-slate-200">
              <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm font-medium transition ${
                        isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="flex w-full gap-6 py-6">
          <nav className="hidden w-52 shrink-0 space-y-1 md:block">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
