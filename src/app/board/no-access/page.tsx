import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Board not found or no access
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          The board you&apos;re looking for doesn&apos;t exist, or you
          don&apos;t have permission to view it. Please check the link or
          contact the board owner.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 bg-slate-800 text-white hover:bg-slate-900 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
