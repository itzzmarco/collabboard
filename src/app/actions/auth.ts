"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  const next = formData.get("next") as string | null;
  const isSafe =
    next &&
    next.startsWith("/") &&
    !next.includes("://") &&
    !next.includes("//");
  if (isSafe) {
    redirect(`/verify-email?next=${encodeURIComponent(next)}`);
  }
  redirect("/verify-email");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const next = formData.get("next") as string | null;
  const isSafe =
    next &&
    next.startsWith("/") &&
    !next.includes("://") &&
    !next.includes("//");
  if (isSafe) {
    redirect(next);
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resendVerification(email: string, next?: string) {
  const supabase = await createClient();

  const isSafe =
    next &&
    next.startsWith("/") &&
    !next.includes("://") &&
    !next.includes("//");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const emailRedirectTo = base
    ? `${base}/verify-email${isSafe ? `?next=${encodeURIComponent(next)}` : ""}`
    : undefined;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
