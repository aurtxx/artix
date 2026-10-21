"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Capacity {
  paid: boolean;
  creds: number;
  atmpts: number;
  cap_left: number;
  total_subm: number;
  valid_till: string;
  studs: number;
}

interface Exam {
  id: number;
  name: string;
  stime: string;
  etime: string;
  mins: number;
  status: string;
  shuf: boolean;
  cam: boolean;
  pc_only: boolean;
  switches: boolean;
  num_switches: number;
  groups: string;
}

interface QuestionPaper {
  Id: number;
  Name: string;
  Subjects: string;
  Type: string;
  mins: number;
  status: string;
}

interface Student {
  id: number;
  name: string;
  rollnum: string;
  email: string;
  branch: string;
  centre: string;
  is_active: boolean;
}

interface Submission {
  id: number;
  student_name: string;
  rollnum: string;
  exam_name: string;
  score: number;
  total_marks: number;
  switch_count: number;
  submitted_at: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"exams" | "qpapers" | "students" | "results">("exams");
  const [cap, setCap] = useState<Capacity | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [qpapers, setQpapers] = useState<QuestionPaper[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Submission[]>([]);

  // Modals
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQModal, setShowQModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // New Exam Form
  const [examName, setExamName] = useState("");
  const [examDuration, setExamDuration] = useState("180");
  const [examSwitches, setExamSwitches] = useState("3");
  const [examProctor, setExamProctor] = useState(false);

  // New Question Form
  const [selectedQpapId, setSelectedQpapId] = useState<number>(1);
  const [qText, setQText] = useState("");
  const [qSubject, setQSubject] = useState("Physics");
  const [qType, setQType] = useState("SINGLE_CORRECT");
  const [qOptions, setQOptions] = useState("Option A, Option B, Option C, Option D");
  const [qKey, setQKey] = useState("Option A");
  const [qCmk, setQCmk] = useState("4.0");
  const [qImk, setQImk] = useState("-1.0");

  // New Student Form
  const [studName, setStudName] = useState("");
  const [studEmail, setStudEmail] = useState("");
  const [studRoll, setStudRoll] = useState("");
  const [studBranch, setStudBranch] = useState("JEE-Main");

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

  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const capRes = await fetch("http://127.0.0.1:8000/staff/get_cap", {
        method: "POST",
        headers,
        credentials: "include"
      });
      if (capRes.status === 401) {
        router.push("/login");
        return;
      }
      if (capRes.ok) setCap(await capRes.json());

      const exRes = await fetch("http://127.0.0.1:8000/staff/get_qexams_paging", {
        method: "POST",
        headers,
        credentials: "include"
      });
      if (exRes.ok) {
        const d = await exRes.json();
        setExams(d.data || []);
      }

      const qpRes = await fetch("http://127.0.0.1:8000/staff/get_qpaps", {
        method: "POST",
        headers,
        credentials: "include"
      });
      if (qpRes.ok) {
        const d = await qpRes.json();
        setQpapers(d.qpaps || []);
      }

      const studRes = await fetch("http://127.0.0.1:8000/staff/get_studs_paging", {
        method: "POST",
        headers,
        credentials: "include"
      });
      if (studRes.ok) {
        const d = await studRes.json();
        setStudents(d.data || []);
      }

      const resRes = await fetch("http://127.0.0.1:8000/staff/get_res", {
        method: "POST",
        headers,
        credentials: "include"
      });
      if (resRes.ok) {
        const d = await resRes.json();
        setResults(d.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    }
  }, [getHeaders, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_onex", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        name: examName,
        mins: parseInt(examDuration),
        num_switches: parseInt(examSwitches),
        cam: examProctor,
        qpap: selectedQpapId,
        branches: "All",
        centres: "Main"
      })
    });
    setShowExamModal(false);
    setExamName("");
    fetchData();
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    const opts = qOptions.split(",").map(s => s.trim()).filter(Boolean);
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_qstn", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        qpap_id: selectedQpapId,
        qtxt: qText,
        type: qType,
        subj: qSubject,
        options: opts,
        key: qKey,
        cmk: parseFloat(qCmk),
        imk: parseFloat(qImk)
      })
    });
    setShowQModal(false);
    setQText("");
    alert("Question added to Question Paper successfully!");
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_stud", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        name: studName,
        email: studEmail,
        rollnum: studRoll,
        branch: studBranch,
        pass: "password123"
      })
    });
    setShowStudentModal(false);
    setStudName("");
    setStudEmail("");
    setStudRoll("");
    fetchData();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b-2 border-slate-900 bg-white dark:border-slate-100 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-blue-600 text-white font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              EZ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight uppercase">Apex Premier Academy</span>
                <span className="border border-slate-900 bg-emerald-300 px-1.5 py-0.2 text-[10px] font-black uppercase text-slate-900">
                  Staff Console
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                EZexam Engine &bull; Subdomain: ezexamqwertyuiop
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/exam/1"
              target="_blank"
              className="border-2 border-slate-900 bg-amber-300 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-amber-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              Launch CBT Exam &rarr;
            </Link>
            <Link
              href="/login"
              className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Metric Cards (Neo-Brutalist Grid) */}
        {cap && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Capacity Left</span>
              <p className="mt-2 text-3xl font-black text-blue-600 font-mono dark:text-blue-400">
                {cap.cap_left.toLocaleString()}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Credits: {cap.creds}</span>
            </div>
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Submissions</span>
              <p className="mt-2 text-3xl font-black text-emerald-600 font-mono dark:text-emerald-400">
                {cap.total_subm}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Total Attempts Logged</span>
            </div>
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Active Students</span>
              <p className="mt-2 text-3xl font-black text-purple-600 font-mono dark:text-purple-400">
                {cap.studs}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Enrolled Candidates</span>
            </div>
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">License Validity</span>
              <p className="mt-2 text-xl font-black text-amber-600 font-mono dark:text-amber-400">
                {cap.valid_till}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Self-Hosted Enterprise</span>
            </div>
          </div>
        )}

        {/* Tab Header & Action Buttons */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-4 dark:border-slate-100">
          <nav className="flex flex-wrap gap-2">
            {[
              { id: "exams", label: "Online Exams" },
              { id: "qpapers", label: "Question Papers" },
              { id: "students", label: "Student Roster" },
              { id: "results", label: "Submissions & Analytics" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`border-2 border-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === t.id
                    ? "bg-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:bg-slate-100 dark:text-slate-900"
                    : "bg-white text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div>
            {activeTab === "exams" && (
              <button
                onClick={() => setShowExamModal(true)}
                className="border-2 border-slate-900 bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                + Schedule New Exam
              </button>
            )}
            {activeTab === "qpapers" && (
              <button
                onClick={() => setShowQModal(true)}
                className="border-2 border-slate-900 bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                + Add Question
              </button>
            )}
            {activeTab === "students" && (
              <button
                onClick={() => setShowStudentModal(true)}
                className="border-2 border-slate-900 bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                + Add Student
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Scheduled Exams */}
        {activeTab === "exams" && (
          <div className="border-2 border-slate-900 bg-white shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b-2 border-slate-900 bg-slate-100 font-black uppercase tracking-wider text-slate-800 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">Exam Name</th>
                    <th className="px-4 py-3">Schedule Window</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Anti-Cheat Controls</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Direct Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-semibold">
                  {exams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs font-bold text-slate-500">
                        No scheduled exams found. Click &quot;+ Schedule New Exam&quot; above to create an exam session.
                      </td>
                    </tr>
                  ) : (
                    exams.map(ex => (
                      <tr key={ex.id} className="hover:bg-yellow-50/40 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{ex.name}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px] dark:text-slate-400">{ex.stime}</td>
                        <td className="px-4 py-3.5 font-bold">{ex.mins} Mins</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 border border-slate-900 bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">
                            {ex.switches && `Max ${ex.num_switches} switches`}
                            {ex.cam && " &bull; Webcam"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="border-2 border-slate-900 bg-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/exam/${ex.id}`}
                            target="_blank"
                            className="border-2 border-slate-900 bg-blue-600 px-3 py-1 text-[11px] font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          >
                            Launch &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Question Papers */}
        {activeTab === "qpapers" && (
          qpapers.length === 0 ? (
            <div className="border-2 border-slate-900 bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              No question papers found. Add questions or create question papers to get started.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {qpapers.map(qp => (
                <div key={qp.Id} className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <h3 className="font-black text-base">{qp.Name}</h3>
                    <span className="border-2 border-slate-900 bg-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {qp.Type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                    Subjects: {qp.Subjects}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t-2 border-slate-900 pt-3 text-xs font-bold dark:border-slate-800">
                    <span className="font-mono">Duration: {qp.mins} mins</span>
                    <button
                      onClick={() => { setSelectedQpapId(qp.Id); setShowQModal(true); }}
                      className="border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 3: Student Roster */}
        {activeTab === "students" && (
          <div className="border-2 border-slate-900 bg-white shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-900 bg-slate-100 font-black uppercase tracking-wider text-slate-800 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Campus Centre</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-semibold">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs font-bold text-slate-500">
                      No registered students found in this roster. Click &quot;+ Add Student&quot; to enroll candidates.
                    </td>
                  </tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="hover:bg-yellow-50/40 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">{s.rollnum}</td>
                      <td className="px-4 py-3.5">{s.email}</td>
                      <td className="px-4 py-3.5">{s.branch}</td>
                      <td className="px-4 py-3.5">{s.centre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Results & Submissions */}
        {activeTab === "results" && (
          <div className="border-2 border-slate-900 bg-white shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-900 bg-slate-100 font-black uppercase tracking-wider text-slate-800 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Exam Name</th>
                  <th className="px-4 py-3">Final Score</th>
                  <th className="px-4 py-3">Tab Switches</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3 text-right">Review Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-semibold">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs font-bold text-slate-500">
                      No candidate submissions recorded yet. Launch an exam session to generate results.
                    </td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-yellow-50/40 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5 font-bold">{r.student_name}</td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{r.rollnum}</td>
                      <td className="px-4 py-3.5">{r.exam_name}</td>
                      <td className="px-4 py-3.5 font-black font-mono text-sm text-blue-600 dark:text-blue-400">
                        {r.score} / {r.total_marks}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${
                          r.switch_count > 0 ? "border-amber-900 bg-amber-200 text-amber-900" : "border-slate-400 text-slate-500"
                        }`}>
                          {r.switch_count} switches
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{r.submitted_at}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/results/${r.id}`}
                          className="border-2 border-slate-900 bg-white px-3 py-1 text-[11px] font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Schedule Exam */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Schedule Online Exam</h3>
              <button onClick={() => setShowExamModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>
            <form onSubmit={handleCreateExam} className="mt-4 space-y-4 text-xs font-bold">
              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Exam Title</label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="e.g. JEE Mock Test Series 2"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Max Tab Switches Allowed</label>
                  <input
                    type="number"
                    value={examSwitches}
                    onChange={e => setExamSwitches(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="proctor"
                  checked={examProctor}
                  onChange={e => setExamProctor(e.target.checked)}
                  className="h-4 w-4 border-2 border-slate-900 text-blue-600 rounded-none focus:ring-0"
                />
                <label htmlFor="proctor" className="uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Enforce Active Webcam Proctoring
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-slate-900 bg-blue-600 px-5 py-2 font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {showQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Add Question to Question Paper</h3>
              <button onClick={() => setShowQModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>
            <form onSubmit={handleAddQuestion} className="mt-4 space-y-4 text-xs font-bold">
              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Question Statement</label>
                <textarea
                  required
                  rows={3}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder="Enter question text / LaTeX..."
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Subject</label>
                  <select
                    value={qSubject}
                    onChange={e => setQSubject(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Question Format</label>
                  <select
                    value={qType}
                    onChange={e => setQType(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    <option value="SINGLE_CORRECT">Single Correct MCQ</option>
                    <option value="MULTI_CORRECT">Multi-Correct MCQ</option>
                    <option value="NUMERICAL">Numerical / Integer Range</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Options (Comma-separated)</label>
                <input
                  type="text"
                  value={qOptions}
                  onChange={e => setQOptions(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Authoritative Answer Key</label>
                <input
                  type="text"
                  required
                  value={qKey}
                  onChange={e => setQKey(e.target.value)}
                  placeholder="e.g. Option A"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Correct Marks (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qCmk}
                    onChange={e => setQCmk(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Negative Penalty (-)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qImk}
                    onChange={e => setQImk(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setShowQModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-slate-900 bg-blue-600 px-5 py-2 font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Student */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Register Candidate</h3>
              <button onClick={() => setShowStudentModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>
            <form onSubmit={handleAddStudent} className="mt-4 space-y-4 text-xs font-bold">
              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={studName}
                  onChange={e => setStudName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={studEmail}
                  onChange={e => setStudEmail(e.target.value)}
                  placeholder="student@ezexam.local"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Roll Number / Student ID</label>
                <input
                  type="text"
                  required
                  value={studRoll}
                  onChange={e => setStudRoll(e.target.value)}
                  placeholder="STU-2026-002"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-slate-900 bg-blue-600 px-5 py-2 font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
