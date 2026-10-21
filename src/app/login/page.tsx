"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"account" | "student" | "otp">("account");
  const [sdom, setSdom] = useState("ezexamqwertyuiop");
  const [username, setUsername] = useState("ezexam@yopmail.com");
  const [password, setPassword] = useState("qwertyuiop");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const payload = {
          sdom: sdom.trim(),
          username: tab === "otp" ? phone : username.trim(),
          password: tab === "otp" ? "otp123" : password,
          next: tab === "student" ? "/exam/1" : "/staff"
        };

        const res = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (data.login_status === "OK") {
          if (data.user?.role === "student" || tab === "student") {
            router.push("/exam/1");
          } else {
            router.push("/staff");
          }
        } else {
          setError(data.error || "Invalid username or password.");
        }
      } catch {
        setError("Could not reach backend API at localhost:8000. Ensure FastAPI is running.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-blue-600 dark:text-blue-400">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>EZexam</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Online Examination & Assessment Portal
          </p>
        </div>

        {/* Tab switchers */}
        <div className="mb-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { setTab("account"); setUsername("ezexam@yopmail.com"); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              tab === "account"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Staff / Admin
          </button>
          <button
            type="button"
            onClick={() => { setTab("student"); setUsername("student@ezexam.local"); setPassword("password123"); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              tab === "student"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Student Candidate
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subdomain / Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Account Name / Institution Slug
            </label>
            <div className="mt-1 flex rounded-lg border border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
              <input
                type="text"
                required
                value={sdom}
                onChange={(e) => setSdom(e.target.value)}
                placeholder="ezexamqwertyuiop"
                className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="flex items-center pr-3 text-xs text-slate-400 select-none">
                .ezexam.local
              </span>
            </div>
          </div>

          {/* Username / Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tab === "student" ? "Student ID / Email" : "Staff Username / Email"}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Authenticating..." : `Sign In as ${tab === "student" ? "Candidate" : "Staff"}`}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-lg bg-blue-50/60 p-3 text-xs text-slate-600 dark:bg-blue-950/20 dark:text-slate-400">
          <p className="font-semibold text-blue-700 dark:text-blue-400">Demo Credentials:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li><strong>Staff:</strong> ezexam@yopmail.com / qwertyuiop</li>
            <li><strong>Student:</strong> student@ezexam.local / password123</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
