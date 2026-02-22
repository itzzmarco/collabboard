"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

function isSafeNext(next: string): boolean {
  return (
    next.startsWith("/") && !next.includes("://") && !next.includes("//")
  );
}

interface VerifyEmailCardProps {
  email?: string;
  hasExpiredError?: boolean;
  next?: string;
}

export default function VerifyEmailCard({
  email: emailProp,
  hasExpiredError,
  next: nextProp,
}: VerifyEmailCardProps) {
  const router = useRouter();
  const [resolvedEmail, setResolvedEmail] = useState(emailProp ?? "");
  const [resolvedNext, setResolvedNext] = useState("");
  const [showContinueLink, setShowContinueLink] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string>();

  useEffect(() => {
    if (!emailProp) {
      const stored = sessionStorage.getItem("verify_email");
      if (stored) setResolvedEmail(stored);
    }
    if (nextProp) {
      sessionStorage.setItem("verify_next", nextProp);
      setResolvedNext(nextProp);
    } else {
      const stored = sessionStorage.getItem("verify_next");
      if (stored) setResolvedNext(stored);
    }
  }, [emailProp, nextProp]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email_confirmed_at) {
        const destination = resolvedNext && isSafeNext(resolvedNext) ? resolvedNext : "/dashboard";
        router.push(destination);
      } else if (!user) {
        setShowContinueLink(true);
      }
    });
  }, [resolvedNext, router]);

  async function handleResend() {
    setResendStatus("loading");
    setResendError(undefined);

    const result = await resendVerification(resolvedEmail, resolvedNext || undefined);
    if (result.error) {
      setResendStatus("error");
      setResendError(result.error);
    } else {
      setResendStatus("success");
    }
  }

  return (
    <>
      {hasExpiredError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 text-sm text-red-700">
          Your verification link has expired. Please request a new one.
        </div>
      )}

      <h1 className="text-xl font-semibold text-slate-900 mb-1">
        Verify your email
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        We sent a verification link to your email address. Click the link to
        activate your account.
      </p>

      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 mb-5">
        <p className="text-sm text-slate-600">
          Sent to:{" "}
          <span className="font-medium text-slate-900">
            {resolvedEmail || "your email address"}
          </span>
        </p>
      </div>

      <div className="flex gap-3 mb-5">
        <a
          href={resolvedEmail ? `mailto:${resolvedEmail}` : "mailto:"}
          className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
        >
          Open email app
        </a>
        <Button
          onClick={handleResend}
          disabled={!resolvedEmail || resendStatus === "loading"}
          variant="outline"
          className="flex-1"
        >
          {resendStatus === "loading" ? "Sending..." : "Resend email"}
        </Button>
      </div>

      {showContinueLink && (
        <p className="text-sm text-slate-600 mb-4">
          Already verified?{" "}
          <Link
            href={
              resolvedNext && isSafeNext(resolvedNext)
                ? `/login?next=${encodeURIComponent(resolvedNext)}`
                : "/login"
            }
            className="text-slate-900 font-medium underline"
          >
            Continue to login
          </Link>
        </p>
      )}

      {!resolvedEmail && (
        <p className="text-sm text-slate-500 mb-4">
          We couldn&apos;t determine your email.{" "}
          <Link
            href={resolvedNext ? `/signup?next=${encodeURIComponent(resolvedNext)}` : "/signup"}
            className="text-slate-900 font-medium underline"
          >
            Sign up again
          </Link>{" "}
          to resend verification.
        </p>
      )}
      {resendStatus === "success" && (
        <p className="text-sm text-green-600 mb-4">
          Verification email sent!
        </p>
      )}
      {resendStatus === "error" && resendError && (
        <p className="text-sm text-red-500 mb-4">{resendError}</p>
      )}

      <p className="text-sm text-slate-500 text-center">
        Wrong email?{" "}
        <Link
          href={resolvedNext ? `/signup?next=${encodeURIComponent(resolvedNext)}` : "/signup"}
          className="text-slate-900 font-medium underline"
        >
          Change email
        </Link>
      </p>
    </>
  );
}
