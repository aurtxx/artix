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

  useEffect(() => {
    if (!examId) return;
    async function loadResult() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/result`, {
          credentials: "include"
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error("Failed to load result:", e);
      }
    }
    loadResult();
  }, [examId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Generating Scorecard...
      </div>
    );
  }

  const percentage = data.total_marks > 0 ? Math.round((data.score / data.total_marks) * 100) : 0;
  const correctCount = data.questions.filter(q => q.is_correct).length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest dark:text-blue-400">
                Official Examination Scorecard
              </span>
              <h1 className="mt-1 text-2xl font-bold">{data.exam_name}</h1>
            </div>
            <Link
              href="/staff"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
            >
              Staff Console &rarr;
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 font-semibold">Your Score</span>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.score} <span className="text-sm font-normal text-slate-400">/ {data.total_marks}</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 font-semibold">Percentage</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {percentage}%
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 font-semibold">Accuracy</span>
              <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                {correctCount} / {data.questions.length}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 font-semibold">Proctoring Log</span>
              <p className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-300">
                {data.switch_count} switches
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold">Detailed Question-by-Question Review</h2>

          {data.questions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-xl border p-6 bg-white dark:bg-slate-900 shadow-sm transition ${
                q.is_correct
                  ? "border-emerald-200 dark:border-emerald-950"
                  : "border-red-200 dark:border-red-950"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">Question {idx + 1}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {q.subj}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    q.is_correct
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  }`}>
                    {q.is_correct ? `Correct (+${q.cmk})` : `Incorrect (${q.imk})`}
                  </span>
                </div>
              </div>

              <p className="my-4 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                {q.qtxt}
              </p>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/40">
                <div>
                  <span className="text-slate-400 font-semibold block">Your Answer:</span>
                  <span className={`font-bold ${q.is_correct ? "text-emerald-600" : "text-red-500"}`}>
                    {q.candidate_ans.length > 0 ? q.candidate_ans.join(", ") : "Not Attempted"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Correct Answer:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
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
