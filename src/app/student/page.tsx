"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StudentUser {
  id: number;
  username: string;
  email: string;
  rollnum: string;
  branch: string;
  centre: string;
  role: string;
  institution: string;
}

interface AssignedExam {
  id: number;
  name: string;
  mins: number;
  stime: string;
  etime: string;
  switches: boolean;
  num_switches: number;
  subjects: string;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  submitted_score?: number | null;
  attempt_id?: number | null;
}

interface PastSubmission {
  attempt_id: number;
  exam_id: number;
  exam_name: string;
  score: number;
  total_marks: number;
  submitted_at: string;
  switch_count: number;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
}

export default function StudentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<StudentUser | null>(null);
  const [exams, setExams] = useState<AssignedExam[]>([]);
  const [submissions, setSubmissions] = useState<PastSubmission[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/exam/student/portal", {
        headers: getHeaders(),
        credentials: "include"
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load candidate portal data");
      }

      const data = await res.json();
      setUser(data.user);
      setExams(data.assigned_exams || []);
      setSubmissions(data.past_submissions || []);
      setNotices(data.notices || []);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Network error loading student portal.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, router]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  async function handleLogout() {
    try {
      await fetch("http://127.0.0.1:8000/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-mono font-bold">
        <div className="border-2 border-white bg-slate-800 p-8 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] text-center">
          <div className="text-xl tracking-wider">LOADING CANDIDATE PORTAL...</div>
          <div className="text-xs text-slate-400 mt-2 font-sans font-normal">Retrieving assigned examination schedule and academic notices</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b-2 border-slate-900 bg-white dark:border-slate-100 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-blue-600 text-white font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              EZ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight uppercase">{user?.institution || "EZexam"}</span>
                <span className="border border-slate-900 bg-amber-300 px-1.5 py-0.2 text-[10px] font-black uppercase text-slate-900">
                  Candidate Portal
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {user?.username} &bull; Roll No: <span className="font-mono">{user?.rollnum}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="border-2 border-slate-900 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Candidate Profile Card */}
        {user && (
          <div className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Student Profile</span>
                <h2 className="text-2xl font-black uppercase tracking-tight">{user.username}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="border border-slate-900 bg-blue-50 px-2 py-0.5 font-mono text-blue-900">
                    Roll: {user.rollnum}
                  </span>
                  <span className="border border-slate-900 bg-emerald-50 px-2 py-0.5 text-emerald-900">
                    Cohort: {user.branch || "General"}
                  </span>
                  <span className="border border-slate-900 bg-purple-50 px-2 py-0.5 text-purple-900">
                    Campus: {user.centre || "Main Campus"}
                  </span>
                  <span className="border border-slate-900 bg-slate-50 px-2 py-0.5 text-slate-700">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Assessments</span>
                <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {submissions.length} Completed
                </p>
                <span className="text-xs font-bold text-slate-500">
                  {exams.filter(e => e.status !== "COMPLETED").length} Active / Upcoming
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-2 border-red-900 bg-red-100 p-4 font-bold text-xs text-red-900 shadow-[4px_4px_0px_0px_rgba(153,27,27,1)]">
            {error}
          </div>
        )}

        {/* Section 1: Assigned Exams */}
        <div>
          <div className="mb-4 flex items-center justify-between border-b-2 border-slate-900 pb-2 dark:border-slate-100">
            <h3 className="font-black text-lg uppercase tracking-tight">Active &amp; Scheduled Examinations</h3>
            <span className="font-mono text-xs font-bold text-slate-500">
              {exams.length} Test{exams.length === 1 ? "" : "s"} Assigned
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="border-2 border-slate-900 bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              No online examinations currently scheduled for your cohort. Check back when your examination window begins.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {exams.map(ex => (
                <div
                  key={ex.id}
                  className="border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between dark:border-slate-100 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-base uppercase leading-snug">{ex.name}</h4>
                      <span className={`border px-2 py-0.5 text-[10px] font-black uppercase font-mono ${
                        ex.status === "COMPLETED"
                          ? "border-emerald-900 bg-emerald-200 text-emerald-900"
                          : ex.status === "IN_PROGRESS"
                          ? "border-amber-900 bg-amber-200 text-amber-900"
                          : "border-blue-900 bg-blue-200 text-blue-900"
                      }`}>
                        {ex.status === "COMPLETED" ? "Submitted" : ex.status === "IN_PROGRESS" ? "In Progress" : "Available"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="border border-slate-300 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                        Duration: {ex.mins} Mins
                      </span>
                      {ex.subjects && (
                        <span className="border border-slate-300 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                          Subjects: {ex.subjects}
                        </span>
                      )}
                      {ex.switches && (
                        <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Max {ex.num_switches} Tab Switches
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800 flex items-center justify-between">
                    {ex.status === "COMPLETED" ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          Score: <strong className="text-emerald-600 text-sm">{ex.submitted_score} pts</strong>
                        </span>
                        <Link
                          href={`/results/${ex.attempt_id || ex.id}`}
                          className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                        >
                          View Scorecard &rarr;
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/exam/${ex.id}`}
                        className="w-full text-center border-2 border-slate-900 bg-blue-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                      >
                        {ex.status === "IN_PROGRESS" ? "Resume Examination &rarr;" : "Start CBT Examination &rarr;"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Completed Scorecards */}
        {submissions.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between border-b-2 border-slate-900 pb-2 dark:border-slate-100">
              <h3 className="font-black text-lg uppercase tracking-tight">Completed Submissions &amp; Scorecards</h3>
              <span className="font-mono text-xs font-bold text-slate-500">{submissions.length} Record{submissions.length === 1 ? "" : "s"}</span>
            </div>

            <div className="border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-x-auto dark:border-slate-100 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b-2 border-slate-900 bg-slate-100 font-black uppercase tracking-wider text-slate-800 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">Examination Name</th>
                    <th className="px-4 py-3">Marks Scored</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Violations</th>
                    <th className="px-4 py-3">Submission Timestamp</th>
                    <th className="px-4 py-3 text-right">Detailed Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 font-semibold dark:divide-slate-800">
                  {submissions.map(sub => {
                    const pct = sub.total_marks > 0 ? Math.round((sub.score / sub.total_marks) * 100) : 0;
                    return (
                      <tr key={sub.attempt_id} className="hover:bg-yellow-50/40 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{sub.exam_name}</td>
                        <td className="px-4 py-3.5 font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                          {sub.score} / {sub.total_marks}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold">
                          <span className={`border px-1.5 py-0.5 text-[10px] ${
                            pct >= 75 ? "border-emerald-900 bg-emerald-100 text-emerald-900" :
                            pct >= 40 ? "border-blue-900 bg-blue-100 text-blue-900" : "border-rose-900 bg-rose-100 text-rose-900"
                          }`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {sub.switch_count} tab switches
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{sub.submitted_at}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/results/${sub.attempt_id}`}
                            className="border-2 border-slate-900 bg-white px-3 py-1 text-[11px] font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                          >
                            Scorecard &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Campus Noticeboard */}
        {notices.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between border-b-2 border-slate-900 pb-2 dark:border-slate-100">
              <h3 className="font-black text-lg uppercase tracking-tight">Academic Noticeboard</h3>
              <span className="font-mono text-xs font-bold text-slate-500">{notices.length} Notice{notices.length === 1 ? "" : "s"}</span>
            </div>

            <div className="space-y-3">
              {notices.map(n => (
                <div
                  key={n.id}
                  className="border-2 border-slate-900 bg-amber-50 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2 dark:border-slate-800">
                    <h4 className="font-black text-sm uppercase text-slate-900 dark:text-slate-100">{n.title}</h4>
                    <span className="font-mono text-[10px] text-slate-500">{n.created_at}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{n.content}</p>
                  <div className="mt-3 font-mono text-[10px] text-slate-500">
                    Posted by: {n.created_by}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
