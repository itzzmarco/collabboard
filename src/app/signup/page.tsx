"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/app/actions/auth";

function SignUpForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  function isSafeNext(value: string): boolean {
    return value.startsWith("/") && !value.includes("://") && !value.includes("//");
  }
  const safeNext = isSafeNext(next) ? next : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState<React.ReactNode>("");
  const [isPending, startTransition] = useTransition();

  function validateEmail(value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePassword(value: string) {
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    startTransition(async () => {
      sessionStorage.setItem("verify_email", email);
      if (safeNext) sessionStorage.setItem("verify_next", safeNext);
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      if (safeNext) formData.set("next", safeNext);

      const result = await signUp(formData);
      if (result?.error) {
        if (result.error.toLowerCase().includes("already registered")) {
          setServerError(
            <>
              An account with this email already exists.{" "}
              <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"} className="underline font-medium">
                Log in instead
              </Link>
            </>
          );
        } else {
          setServerError(result.error);
        }
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-500">
            Collab Board
          </span>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Get started with your free account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              onBlur={() => email && validateEmail(email)}
              autoComplete="email"
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              onBlur={() => password && validatePassword(password)}
              autoComplete="new-password"
            />
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-500">{serverError}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{" "}
          <Link
            href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
            className="text-slate-900 font-medium underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div />}>
      <SignUpForm />
    </Suspense>
  );
}
