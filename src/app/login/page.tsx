"use client";

import { useState, useTransition } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        // TODO: replace with real API call to FastAPI backend
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.detail ?? "Invalid credentials.");
        } else {
          // TODO: redirect after successful login
          window.location.href = "/";
        }
      } catch {
        setError("Could not reach the server. Please try again.");
      }
    });
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Heading */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-foreground/60">
            Enter your credentials to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm outline-none
                         placeholder:text-foreground/40 focus:border-foreground/60 focus:ring-1 focus:ring-foreground/30
                         disabled:opacity-50 transition-colors"
              placeholder="you@example.com"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm outline-none
                         placeholder:text-foreground/40 focus:border-foreground/60 focus:ring-1 focus:ring-foreground/30
                         disabled:opacity-50 transition-colors"
              placeholder="••••••••"
              disabled={isPending}
            />
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background
                       hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Footer link placeholder */}
        <p className="text-center text-xs text-foreground/50">
          Don&apos;t have an account?{" "}
          <a href="#" className="underline hover:text-foreground transition-colors">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
