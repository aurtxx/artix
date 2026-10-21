"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface QuestionReview {
  id: number;
  qno: number;
  qtxt: string;
  subj: string;
  candidate_ans: string[];
  correct_key: string[];
  is_correct: boolean;
  cmk: number;
  imk: number;
}

interface ResultData {
  attempt_id?: number;
  candidate_name?: string;
  candidate_rollnum?: string;
  exam_name: string;
  score: number;
  total_marks: number;
  switch_count: number;
  submitted_at: string;
  questions: QuestionReview[];
}

export default function ResultsClient() {
  const params = useParams();
  const examId = params?.id as string;
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    async function loadResult() {
      try {
        const headers: Record<string, string> = {};
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("auth_token");
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/result`, {
          headers,
          credentials: "include"
        });
        if (res.ok) {
          setData(await res.json());
          setError(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.detail || "Unable to locate candidate scorecard.");
        }
      } catch (e: any) {
        console.error("Failed to load result:", e);
        setError("Network error fetching scorecard.");
      }
    }
    loadResult();
  }, [examId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans text-slate-900">
        <div className="max-w-md w-full border-3 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center">
          <div className="inline-block border border-red-900 bg-red-100 px-3 py-1 font-mono text-xs font-black uppercase text-red-900 mb-4">
            Scorecard Unavailable
          </div>
          <h2 className="text-xl font-black uppercase">No Submitted Record</h2>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/staff"
              className="border-2 border-slate-900 bg-blue-600 px-4 py-2 font-mono text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700"
            >
              Staff Console
            </Link>
            <Link
              href="/student"
              className="border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-mono font-bold">
        <div className="border-2 border-white bg-slate-800 p-8 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] text-center">
          <div className="text-xl tracking-wider">COMPUTING CANDIDATE SCORECARD...</div>
          <div className="text-xs text-slate-400 mt-2 font-sans font-normal">Authoritative server-side evaluation & answer key reconciliation</div>
        </div>
      </div>
    );
  }

  const percentage = data.total_marks > 0 ? Math.round((data.score / data.total_marks) * 100) : 0;
  const correctCount = data.questions.filter(q => q.is_correct).length;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Main Scorecard Header */}
        <div className="border-3 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <div className="inline-block border border-slate-900 bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-black uppercase tracking-wider text-blue-900">
                Official Examination Scorecard
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
                {data.exam_name}
              </h1>
              <div className="mt-1 font-mono text-xs text-slate-600 flex flex-wrap gap-3">
                {data.candidate_name && (
                  <span>Candidate: <strong>{data.candidate_name}</strong> {data.candidate_rollnum && `(${data.candidate_rollnum})`}</span>
                )}
                <span>Submitted At: {data.submitted_at || "Just now"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/student"
                className="border-2 border-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Student Portal
              </Link>
              <Link
                href="/staff"
                className="border-2 border-slate-900 bg-blue-600 hover:bg-blue-700 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Staff Console &rarr;
              </Link>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border-2 border-slate-900 bg-blue-50 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <span className="font-mono text-xs font-black uppercase text-slate-700">Total Score</span>
              <p className="mt-2 font-mono text-2xl font-black text-blue-900">
                {data.score} <span className="text-xs font-normal text-slate-600">/ {data.total_marks}</span>
              </p>
            </div>
            <div className="border-2 border-slate-900 bg-emerald-50 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <span className="font-mono text-xs font-black uppercase text-slate-700">Percentage</span>
              <p className="mt-2 font-mono text-2xl font-black text-emerald-900">
                {percentage}%
              </p>
            </div>
            <div className="border-2 border-slate-900 bg-purple-50 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <span className="font-mono text-xs font-black uppercase text-slate-700">Accuracy</span>
              <p className="mt-2 font-mono text-2xl font-black text-purple-900">
                {correctCount} / {data.questions.length}
              </p>
            </div>
            <div className="border-2 border-slate-900 bg-amber-50 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <span className="font-mono text-xs font-black uppercase text-slate-700">Tab Switches</span>
              <p className="mt-2 font-mono text-2xl font-black text-amber-900">
                {data.switch_count}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Solutions Review */}
        <div className="space-y-4">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="font-mono text-lg font-black uppercase tracking-tight text-slate-900">
              Detailed Question-by-Question Reconciliation
            </h2>
          </div>

          {data.questions.map((q, idx) => (
            <div
              key={q.id}
              className="border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <span className="border border-slate-900 bg-blue-100 px-2 py-0.5 font-mono text-xs font-black text-blue-900">
                    Q{idx + 1}
                  </span>
                  <span className="border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 uppercase">
                    {q.subj}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`border-2 border-slate-900 px-3 py-0.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
                      q.is_correct
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-rose-400 text-slate-950"
                    }`}
                  >
                    {q.is_correct ? `CORRECT (+${q.cmk})` : `INCORRECT (${q.imk})`}
                  </span>
                </div>
              </div>

              <p className="my-4 font-bold text-sm leading-relaxed text-slate-900 whitespace-pre-line">
                {q.qtxt}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border-2 border-slate-900 bg-slate-50 p-3 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <span className="font-black uppercase text-slate-500 block mb-1">Your Submitted Response:</span>
                  <span className={`font-black text-sm ${q.is_correct ? "text-emerald-700" : "text-rose-700"}`}>
                    {q.candidate_ans.length > 0 ? q.candidate_ans.join(", ") : "NOT ATTEMPTED"}
                  </span>
                </div>
                <div className="border-2 border-slate-900 bg-emerald-50 p-3 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <span className="font-black uppercase text-slate-500 block mb-1">Authoritative Key:</span>
                  <span className="font-black text-sm text-emerald-900">
                    {q.correct_key.join(", ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
