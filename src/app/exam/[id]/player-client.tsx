"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: number;
  qno: number;
  type: string;
  qtxt: string;
  qimg?: string;
  subj: string;
  cmk: number;
  imk: number;
  diff: string;
  options: string[];
}

interface ExamInfo {
  id: number;
  name: string;
  mins: number;
  switches: boolean;
  num_switches: number;
  sec_skip: boolean;
  shuf: boolean;
}

export default function ExamPlayerClient() {
  const router = useRouter();
  const params = useParams();
  const examId = params?.id as string;

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, { ans: string[]; status: string }>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180 * 60);
  const [switchCount, setSwitchCount] = useState(0);
  const [switchWarning, setSwitchWarning] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState("All");

  useEffect(() => {
    if (!examId) return;
    async function initExam() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/start`, {
          method: "POST",
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to load exam");
        const data = await res.json();
        setExam(data.exam);
        setQuestions(data.questions);
        setTimeLeftSeconds(data.exam.mins * 60);
        setResponses(data.saved_responses || {});
        setSwitchCount(data.switch_count || 0);
      } catch (e) {
        console.error("Exam load error:", e);
      }
    }
    initExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  useEffect(() => {
    if (!exam?.switches || !examId) return;

    async function handleVisibilityChange() {
      if (document.hidden) {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/log_event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "SWITCH_WINDOW" }),
            credentials: "include"
          });
          const data = await res.json();
          setSwitchCount(data.switch_count);
          setSwitchWarning(`Warning: Window switch detected! (${data.switch_count}/${exam?.num_switches})`);

          if (data.limit_reached) {
            alert("Maximum tab switch limit exceeded! Your exam is being submitted automatically.");
            handleSubmitExam();
          }
        } catch {}
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [exam, examId]);

  const currentQ = questions[currentIdx];
  const subjects = ["All", ...Array.from(new Set(questions.map(q => q.subj)))];
  const filteredQuestions = activeSubject === "All" ? questions : questions.filter(q => q.subj === activeSubject);

  function handleOptionSelect(opt: string) {
    if (!currentQ) return;
    const qid = String(currentQ.id);

    if (currentQ.type === "MULTI_CORRECT") {
      const currentAns = responses[qid]?.ans || [];
      const updated = currentAns.includes(opt)
        ? currentAns.filter(x => x !== opt)
        : [...currentAns, opt];
      saveLocalAndRemote(qid, updated, updated.length > 0 ? "ANSWERED" : "NOT_ANSWERED");
    } else {
      saveLocalAndRemote(qid, [opt], "ANSWERED");
    }
  }

  function handleNumericalInput(val: string) {
    if (!currentQ) return;
    const qid = String(currentQ.id);
    saveLocalAndRemote(qid, val ? [val] : [], val ? "ANSWERED" : "NOT_ANSWERED");
  }

  function handleClearResponse() {
    if (!currentQ) return;
    const qid = String(currentQ.id);
    saveLocalAndRemote(qid, [], "NOT_ANSWERED");
  }

  function handleMarkForReview() {
    if (!currentQ) return;
    const qid = String(currentQ.id);
    const curr = responses[qid]?.ans || [];
    saveLocalAndRemote(qid, curr, "REVIEW");
  }

  function saveLocalAndRemote(q_id: string, ans: string[], status: string) {
    setResponses(prev => ({ ...prev, [q_id]: { ans, status } }));
    fetch(`http://127.0.0.1:8000/api/exam/${examId}/save_response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q_id, ans, status }),
      credentials: "include"
    }).catch(() => {});
  }

  async function handleSubmitExam() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/submit`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        router.push(`/results/${examId}`);
      }
    } catch {
      alert("Submission failed. Please check network connection.");
    }
  }

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (!exam || !currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-medium">
        Loading Examination Engine...
      </div>
    );
  }

  const answeredCount = Object.values(responses).filter(r => r.status === "ANSWERED").length;
  const reviewCount = Object.values(responses).filter(r => r.status === "REVIEW").length;
  const notAnsweredCount = questions.length - answeredCount;

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 select-none dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-600 dark:text-blue-400">EZexam CBT</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <h1 className="font-semibold text-sm truncate max-w-sm">{exam.name}</h1>
        </div>

        {switchWarning && (
          <div className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
            {switchWarning}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
          >
            Submit Exam
          </button>
        </div>
      </header>

      <div className="flex h-11 items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 text-xs dark:border-slate-800 dark:bg-slate-900/60">
        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Sections:</span>
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`rounded-md px-3 py-1 font-semibold transition ${
              activeSubject === s
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto p-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Question {currentQ.qno} of {questions.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">({currentQ.subj})</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {currentQ.type.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">+{currentQ.cmk}</span>
              <span className="text-red-500 dark:text-red-400">{currentQ.imk}</span>
            </div>
          </div>

          <div className="my-6 text-sm leading-relaxed font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">
            {currentQ.qtxt}
          </div>

          <div className="mt-4 space-y-3">
            {currentQ.type === "NUMERICAL" ? (
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Enter your numerical answer:
                </label>
                <input
                  type="number"
                  step="any"
                  value={responses[String(currentQ.id)]?.ans[0] || ""}
                  onChange={e => handleNumericalInput(e.target.value)}
                  placeholder="e.g. 3.14"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ) : (
              currentQ.options.map(opt => {
                const isSelected = (responses[String(currentQ.id)]?.ans || []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleOptionSelect(opt)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs font-medium transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                      isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400 text-slate-500"
                    }`}>
                      {isSelected ? "✓" : ""}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={handleClearResponse}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Clear Response
              </button>
              <button
                onClick={handleMarkForReview}
                className="rounded-lg border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
              >
                Mark for Review
              </button>
            </div>

            <div className="flex gap-2">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
              >
                &larr; Previous
              </button>
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
              >
                Save & Next &rarr;
              </button>
            </div>
          </div>
        </div>

        <aside className="w-80 border-l border-slate-200 bg-white p-6 overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Question Palette</h2>

          <div className="my-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-purple-500"></span>
              <span>Review ({reviewCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span>Not Visited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span>Unanswered ({notAnsweredCount})</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2">
            {filteredQuestions.map((q) => {
              const qid = String(q.id);
              const status = responses[qid]?.status;
              const isCurrent = questions[currentIdx].id === q.id;

              let color = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
              if (status === "ANSWERED") color = "bg-emerald-500 text-white border-emerald-600";
              else if (status === "REVIEW") color = "bg-purple-600 text-white border-purple-700";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(questions.findIndex(x => x.id === q.id))}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-bold transition ${color} ${
                    isCurrent ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105" : ""
                  }`}
                >
                  {q.qno}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-center">Confirm Submission</h3>
            <p className="mt-2 text-xs text-center text-slate-500">
              Are you sure you want to finish and submit your exam?
            </p>

            <div className="my-4 rounded-xl bg-slate-50 p-4 text-xs space-y-1.5 dark:bg-slate-800">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Answered:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>Marked for Review:</span>
                <span className="font-bold">{reviewCount}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Not Answered:</span>
                <span className="font-bold">{notAnsweredCount}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700"
              >
                Return to Exam
              </button>
              <button
                onClick={handleSubmitExam}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
