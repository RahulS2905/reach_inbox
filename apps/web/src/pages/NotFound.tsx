import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <h1 className="text-9xl font-bold text-slate-200">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Page Not Found</h2>
      <p className="mt-2 text-slate-500 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-8 rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
