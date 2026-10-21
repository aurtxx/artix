"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"account" | "student">("account");
  const [sdom, setSdom] = useState("ezexamqwertyuiop");
  const [username, setUsername] = useState("ezexam@yopmail.com");
  const [password, setPassword] = useState("qwertyuiop");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const payload = {
          sdom: sdom.trim(),
          username: username.trim(),
          password: password,
          next: tab === "student" ? "/student" : "/staff"
        };

        const res = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (data.login_status === "OK") {
          if (data.token && typeof window !== "undefined") {
            localStorage.setItem("auth_token", data.token);
          }
          if (data.user?.role === "student" || tab === "student") {
            router.push("/student");
          } else {
            router.push("/staff");
          }
        } else {
          setError(data.error || "Authentication failed: invalid credentials.");
        }
      } catch {
        setError("Could not reach backend API at localhost:8000. Ensure FastAPI server is running.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-md border-2 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
        {/* Brand Header */}
        <div className="mb-8 border-b-2 border-slate-900 pb-4 dark:border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-blue-600 text-white font-black text-sm shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                EZ
              </div>
              <span className="font-black text-2xl tracking-tight uppercase">EZexam</span>
            </div>
            <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              Self-Hosted
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-400">
            Online Examination & Assessment Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setTab("account"); setUsername("ezexam@yopmail.com"); setPassword("qwertyuiop"); }}
            className={`border-2 border-slate-900 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              tab === "account"
                ? "bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:bg-slate-100 dark:text-slate-900"
                : "bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            Staff / Faculty
          </button>
          <button
            type="button"
            onClick={() => { setTab("student"); setUsername("student@ezexam.local"); setPassword("password123"); }}
            className={`border-2 border-slate-900 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              tab === "student"
                ? "bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:bg-slate-100 dark:text-slate-900"
                : "bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            Student Candidate
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Institution Account Code
            </label>
            <div className="mt-1 flex border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100">
              <input
                id="sdom"
                type="text"
                required
                value={sdom}
                onChange={(e) => setSdom(e.target.value)}
                placeholder="ezexamqwertyuiop"
                className="w-full bg-white px-3 py-2 text-xs font-semibold outline-none dark:bg-slate-800"
              />
              <span className="flex items-center border-l-2 border-slate-900 bg-slate-100 px-3 text-[11px] font-bold text-slate-600 select-none dark:border-slate-100 dark:bg-slate-700 dark:text-slate-300">
                .ezexam.local
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {tab === "student" ? "Student ID / Registered Email" : "Staff Username / Email"}
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full border-2 border-slate-900 bg-white px-3 py-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full border-2 border-slate-900 bg-white px-3 py-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
            />
          </div>

          {error && (
            <div className="border-2 border-red-900 bg-red-100 p-3 text-xs font-bold text-red-900 shadow-[2px_2px_0px_0px_rgba(153,27,27,1)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full border-2 border-slate-900 bg-blue-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            {isPending ? "Validating Credentials..." : `Sign In as ${tab === "student" ? "Candidate" : "Staff"}`}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 border-2 border-slate-900 bg-amber-50 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Authorized Demo Credentials:
          </span>
          <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <li>&bull; <strong>Staff:</strong> <span className="font-mono">ezexam@yopmail.com</span> / <span className="font-mono">qwertyuiop</span></li>
            <li>&bull; <strong>Student:</strong> <span className="font-mono">student@ezexam.local</span> / <span className="font-mono">password123</span></li>
          </ul>
        </div>
      </div>
    </main>
  );
}
