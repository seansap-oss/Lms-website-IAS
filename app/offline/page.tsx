import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Offline — Ibemhal IAS" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-5">
          <WifiOff className="h-8 w-8 text-blue-300" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re offline</h1>
        <p className="text-sm text-gray-300 mb-6">
          Cached lessons and notes are still available. Reconnect to sync your progress and use the AI tutor.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
