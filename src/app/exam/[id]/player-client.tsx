"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback((isJson = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (isJson) headers["Content-Type"] = "application/json";
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  useEffect(() => {
    if (!examId) return;
    async function initExam() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/start`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include"
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to load examination.");
        }
        const data = await res.json();
        setExam(data.exam);
        setQuestions(data.questions || []);
        setTimeLeftSeconds((data.exam?.mins || 180) * 60);
        setResponses(data.saved_responses || {});
        setSwitchCount(data.switch_count || 0);
        if (!data.questions || data.questions.length === 0) {
          setError("No examination questions are available for this assessment. Please contact your campus proctor.");
        }
      } catch (e: any) {
        console.error("Exam load error:", e);
        setError(e.message || "Failed to initialize examination engine.");
      }
    }
    initExam();
  }, [examId, getAuthHeaders, router]);

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
            headers: getAuthHeaders(true),
            body: JSON.stringify({ type: "SWITCH_WINDOW" }),
            credentials: "include"
          });
          const data = await res.json();
          setSwitchCount(data.switch_count);
          setSwitchWarning(`ALERT: Tab switch detected! (${data.switch_count}/${exam?.num_switches})`);

          if (data.limit_reached) {
            alert("Maximum tab switch limit exceeded! Your exam is being submitted automatically.");
            handleSubmitExam();
          }
        } catch {}
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [exam, examId, getAuthHeaders]);

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
      headers: getAuthHeaders(true),
      body: JSON.stringify({ q_id, ans, status }),
      credentials: "include"
    }).catch(() => {});
  }

  async function handleSubmitExam() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/exam/${examId}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const targetId = data.attempt_id || examId;
        router.push(`/results/${targetId}`);
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans text-slate-900">
        <div className="max-w-md w-full border-3 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center">
          <div className="inline-block border border-red-900 bg-red-100 px-3 py-1 font-mono text-xs font-black uppercase text-red-900 mb-4">
            Examination Error
          </div>
          <h2 className="text-xl font-black uppercase">Cannot Launch CBT Player</h2>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/student")}
              className="border-2 border-slate-900 bg-blue-600 px-4 py-2 font-mono text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700"
            >
              Return to Candidate Portal
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam || !currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-mono font-bold">
        <div className="border-2 border-white bg-slate-800 p-8 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] text-center">
          <div className="text-xl tracking-wider">INITIALIZING CBT PLAYER...</div>
          <div className="text-xs text-slate-400 mt-2 font-sans font-normal">Authenticating session & retrieving candidate question packet</div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(responses).filter(r => r.status === "ANSWERED").length;
  const reviewCount = Object.values(responses).filter(r => r.status === "REVIEW").length;
  const notAnsweredCount = questions.length - answeredCount;

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 select-none font-sans">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b-2 border-slate-900 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-2 border-slate-900 bg-blue-600 px-3 py-1 font-mono text-xs font-black text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            EZEXAM CBT
          </div>
          <span className="text-slate-300 font-bold">|</span>
          <h1 className="font-black text-sm uppercase tracking-tight text-slate-900 truncate max-w-sm">
            {exam.name}
          </h1>
        </div>

        {switchWarning && (
          <div className="border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] animate-pulse">
            {switchWarning}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-2 border-slate-900 bg-slate-100 px-4 py-1.5 font-mono text-sm font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="border-2 border-slate-900 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-mono text-xs font-black uppercase tracking-wider px-4 py-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Sections Tab Bar */}
      <div className="flex h-12 items-center gap-2 border-b-2 border-slate-900 bg-slate-50 px-6 text-xs">
        <span className="font-mono font-black text-slate-600 uppercase tracking-wider text-[11px] mr-2">
          SECTIONS:
        </span>
        {subjects.map(s => {
          const isActive = activeSubject === s;
          return (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`border-2 border-slate-900 font-mono font-bold text-xs px-3 py-1 uppercase transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  : "bg-white text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Main Examination Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Question & Answering Area */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
          {/* Question Metadata Header */}
          <div className="flex items-center justify-between border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center gap-2">
              <span className="border border-slate-900 bg-blue-100 text-blue-900 font-mono font-black text-xs px-2.5 py-0.5">
                QUESTION {currentQ.qno} OF {questions.length}
              </span>
              <span className="border border-slate-900 bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2 py-0.5 uppercase">
                {currentQ.subj}
              </span>
              <span className="border border-slate-900 bg-amber-100 text-amber-900 font-mono font-bold text-[10px] px-2 py-0.5 uppercase">
                {currentQ.type.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-black">
              <span className="border border-slate-900 bg-emerald-100 text-emerald-900 px-2 py-0.5">+{currentQ.cmk}</span>
              <span className="border border-slate-900 bg-rose-100 text-rose-900 px-2 py-0.5">{currentQ.imk}</span>
            </div>
          </div>

          {/* Question Statement */}
          <div className="my-6 border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-sm md:text-base leading-relaxed font-bold text-slate-900 whitespace-pre-line">
            {currentQ.qtxt}
          </div>

          {/* Response Options */}
          <div className="space-y-3">
            {currentQ.type === "NUMERICAL" ? (
              <div className="max-w-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <label className="block font-mono text-xs font-black uppercase text-slate-700">
                  Enter Numerical Answer:
                </label>
                <input
                  type="number"
                  step="any"
                  value={responses[String(currentQ.id)]?.ans[0] || ""}
                  onChange={e => handleNumericalInput(e.target.value)}
                  placeholder="e.g. 3.14"
                  className="mt-2 w-full border-2 border-slate-900 p-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:bg-amber-50"
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
                    className={`flex w-full items-center gap-3 border-2 border-slate-900 p-4 text-left text-xs md:text-sm font-bold transition-all ${
                      isSelected
                        ? "bg-blue-100 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] translate-x-1"
                        : "bg-white hover:bg-slate-50 text-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 border-slate-900 font-mono text-xs font-black ${
                        isSelected ? "bg-blue-600 text-white" : "bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Question Action Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex gap-2">
              <button
                onClick={handleClearResponse}
                className="border-2 border-slate-900 bg-white hover:bg-rose-50 text-rose-700 font-mono text-xs font-bold uppercase px-3.5 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Clear Response
              </button>
              <button
                onClick={handleMarkForReview}
                className="border-2 border-slate-900 bg-purple-200 hover:bg-purple-300 text-purple-950 font-mono text-xs font-bold uppercase px-3.5 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Mark for Review
              </button>
            </div>

            <div className="flex gap-2">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 font-mono text-xs font-bold uppercase px-4 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:opacity-30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                &larr; Previous
              </button>
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="border-2 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-black uppercase tracking-wider px-6 py-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Save & Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Right Question Palette Sidebar */}
        <aside className="w-80 border-l-2 border-slate-900 bg-white p-5 overflow-y-auto">
          <div className="border-b-2 border-slate-900 pb-2 mb-4">
            <h2 className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">
              Question Palette
            </h2>
          </div>

          {/* Palette Status Legend */}
          <div className="border-2 border-slate-900 bg-slate-50 p-3 mb-6 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] grid grid-cols-2 gap-2 font-mono text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-slate-900 bg-emerald-400"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-slate-900 bg-purple-400"></span>
              <span>Review ({reviewCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-slate-900 bg-white"></span>
              <span>Not Visited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-slate-900 bg-amber-300"></span>
              <span>Unanswered ({notAnsweredCount})</span>
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {filteredQuestions.map((q) => {
              const qid = String(q.id);
              const status = responses[qid]?.status;
              const isCurrent = questions[currentIdx].id === q.id;

              let color = "bg-white text-slate-900 hover:bg-slate-100";
              if (status === "ANSWERED") color = "bg-emerald-400 text-slate-950 font-black";
              else if (status === "REVIEW") color = "bg-purple-400 text-slate-950 font-black";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(questions.findIndex(x => x.id === q.id))}
                  className={`flex h-10 w-10 items-center justify-center border-2 border-slate-900 font-mono text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${color} ${
                    isCurrent ? "ring-4 ring-blue-600 scale-105 z-10" : ""
                  }`}
                >
                  {q.qno}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md border-3 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="border-b-2 border-slate-900 pb-3">
              <h3 className="font-mono text-base font-black uppercase tracking-tight text-center">
                Confirm Final Submission
              </h3>
            </div>
            <p className="mt-3 font-mono text-xs text-center text-slate-600">
              Are you sure you want to finish and submit your exam attempt?
            </p>

            <div className="my-5 border-2 border-slate-900 bg-slate-50 p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>Total Questions:</span>
                <span className="font-black">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold border-b border-slate-200 pb-1">
                <span>Answered:</span>
                <span className="font-black">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-purple-800 font-bold border-b border-slate-200 pb-1">
                <span>Marked for Review:</span>
                <span className="font-black">{reviewCount}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Not Answered:</span>
                <span className="font-black">{notAnsweredCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border-2 border-slate-900 bg-white hover:bg-slate-100 py-2.5 font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Return to Exam
              </button>
              <button
                onClick={handleSubmitExam}
                className="flex-1 border-2 border-slate-900 bg-emerald-500 hover:bg-emerald-600 py-2.5 font-mono text-xs font-black uppercase text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
