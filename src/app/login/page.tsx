"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
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
    if (!value) {
      setPasswordError("Password is required");
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
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("next", next);

      const result = await signIn(formData);
      if (result?.error) {
        if (result.error === "Invalid login credentials") {
          setServerError("Incorrect email or password");
        } else if (result.error.toLowerCase().includes("email not confirmed")) {
          sessionStorage.setItem("verify_email", email);
          if (next) sessionStorage.setItem("verify_next", next);
          router.push(next ? `/verify-email?next=${encodeURIComponent(next)}` : "/verify-email");
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
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to your account
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
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              onBlur={() => password && validatePassword(password)}
              autoComplete="current-password"
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
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-slate-900 font-medium underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  );
}
