export function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">ReachInbox Scheduler</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to schedule and track your email campaigns.</p>
      </div>
      <a
        href="/api/auth/google"
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#4285F4"
            d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.6z"
          />
          <path
            fill="#34A853"
            d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.3 46 24 46z"
          />
          <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 7 2.3 10l7.3-5.9z" />
          <path
            fill="#EA4335"
            d="M24 10.8c3.3 0 6.2 1.1 8.5 3.4l6.3-6.3C35 4.1 30 2 24 2 15.3 2 7.9 7 4.3 14.1l7.3 5.7c1.7-5.2 6.6-9 12.4-9z"
          />
        </svg>
        Continue with Google
      </a>
    </div>
  );
}
