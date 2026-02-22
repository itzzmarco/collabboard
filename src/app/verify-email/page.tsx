import { LayoutGrid } from "lucide-react";
import VerifyEmailCard from "@/components/auth/VerifyEmailCard";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string }>;
}) {
  const { email, error, next } = await searchParams;
  const hasExpiredError = error === "expired_link" || !!error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-500">
            Collab Board
          </span>
        </div>

        <VerifyEmailCard email={email} hasExpiredError={hasExpiredError} next={next} />
      </div>
    </div>
  );
}
