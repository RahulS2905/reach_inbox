import { Link } from "react-router-dom";

export function Login() {
  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
      {/* Left Column - Product Hero & Feature Highlights */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-brand-950/40 to-slate-950 border-r border-slate-800/80 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">ReachInbox</span>
        </div>

        {/* Middle Value Proposition */}
        <div className="space-y-6 relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
            <span>✨ Production Email Campaign Scheduling</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Schedule cold emails with distributed rate-limiting & zero domain burn.
          </h2>
          <p className="text-slate-400 text-base max-w-md leading-relaxed">
            ReachInbox orchestrates your outbound campaigns via BullMQ background queues, atomic Redis Lua rate-limiters, multi-tenant search, and Slack lifecycle alerts.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <div className="text-2xl font-bold text-brand-400">100k+</div>
              <div className="text-xs text-slate-400 mt-0.5">Emails / Hour Capacity</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <div className="text-2xl font-bold text-emerald-400">99.9%</div>
              <div className="text-xs text-slate-400 mt-0.5">Transactional Outbox Guarantees</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 relative z-10">
          © {new Date().getFullYear()} ReachInbox SaaS. All rights reserved.
        </div>
      </div>

      {/* Right Column - Login Interface */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16 bg-slate-950">
        <div className="flex justify-end">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <Link to="/privacy" className="hover:text-slate-200 transition">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-200 transition">Terms of Service</Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm space-y-8 my-auto">
          {/* Mobile Brand Title */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-bold text-white">ReachInbox</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back
            </h1>
            <p className="text-sm text-slate-400">
              Sign in to manage campaigns, monitor rate limits, and inspect delivery queues.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition duration-200 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                <path
                  fill="#4285F4"
                  d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.6z"
                />
                <path
                  fill="#34A853"
                  d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.3 46 24 46z"
                />
                <path
                  fill="#FBBC05"
                  d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 7 2.3 10l7.3-5.9z"
                />
                <path
                  fill="#EA4335"
                  d="M24 10.8c3.3 0 6.2 1.1 8.5 3.4l6.3-6.3C35 4.1 30 2 24 2 15.3 2 7.9 7 4.3 14.1l7.3 5.7c1.7-5.2 6.6-9 12.4-9z"
                />
              </svg>
              <span>Continue with Google Account</span>
            </a>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-950 px-2 text-slate-500 uppercase tracking-wider font-medium">
                  Protected & Encrypted OAuth 2.0
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                AES-256 Encrypted Credential Vault
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Atomic Rate-Limit & Sender Throttling
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Real-Time Slack Event Stream
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-600 sm:hidden">
          © {new Date().getFullYear()} ReachInbox SaaS.
        </div>
      </div>
    </div>
  );
}
