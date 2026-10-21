"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const capRes = await fetch("http://127.0.0.1:8000/staff/get_cap", { method: "POST" });
      if (capRes.ok) setCap(await capRes.json());

      const exRes = await fetch("http://127.0.0.1:8000/staff/get_qexams_paging", { method: "POST" });
      if (exRes.ok) {
        const d = await exRes.json();
        setExams(d.data || []);
      }

      const qpRes = await fetch("http://127.0.0.1:8000/staff/get_qpaps", { method: "POST" });
      if (qpRes.ok) {
        const d = await qpRes.json();
        setQpapers(d.qpaps || []);
      }

      const studRes = await fetch("http://127.0.0.1:8000/staff/get_studs_paging", { method: "POST" });
      if (studRes.ok) {
        const d = await studRes.json();
        setStudents(d.data || []);
      }

      const resRes = await fetch("http://127.0.0.1:8000/staff/get_res", { method: "POST" });
      if (resRes.ok) {
        const d = await resRes.json();
        setResults(d.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    }
  }

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    await fetch("http://127.0.0.1:8000/staff/add_onex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch("http://127.0.0.1:8000/staff/add_qstn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch("http://127.0.0.1:8000/staff/add_stud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              EZ
            </div>
            <div>
              <span className="font-bold text-lg leading-tight block">Apex Premier Academy</span>
              <span className="text-xs text-slate-500 font-medium">EZexam Portal &bull; Staff Console</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/exam/1"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              <span>Launch Live CBT Exam</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Metric Cards */}
        {cap && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity Left</span>
              <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{cap.cap_left.toLocaleString()}</p>
              <span className="text-xs text-slate-400">Total Credits: {cap.creds}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submissions</span>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{cap.total_subm}</p>
              <span className="text-xs text-slate-400">Exam Attempts</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</span>
              <p className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{cap.studs}</p>
              <span className="text-xs text-slate-400">Across Batches</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Validity</span>
              <p className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">{cap.valid_till}</p>
              <span className="text-xs text-slate-400">Enterprise Self-Hosted</span>
            </div>
          </div>
        )}

        {/* Tab Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <nav className="flex gap-2">
            {[
              { id: "exams", label: "Online Exams" },
              { id: "qpapers", label: "Question Papers" },
              { id: "students", label: "Student Roster" },
              { id: "results", label: "Results & Analytics" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  activeTab === t.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Action button corresponding to tab */}
          <div>
            {activeTab === "exams" && (
              <button
                onClick={() => setShowExamModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                + Schedule New Exam
              </button>
            )}
            {activeTab === "qpapers" && (
              <button
                onClick={() => setShowQModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                + Add Question
              </button>
            )}
            {activeTab === "students" && (
              <button
                onClick={() => setShowStudentModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                + Add Student
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Exams Table */}
        {activeTab === "exams" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Exam Name</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Anti-Cheat</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Candidate Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exams.map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{ex.name}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{ex.stime}</td>
                      <td className="px-4 py-3.5 font-medium">{ex.mins} Mins</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                          {ex.switches && `Max ${ex.num_switches} switches`}
                          {ex.cam && " • Webcam"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/exam/${ex.id}`}
                          target="_blank"
                          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Open Exam &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Question Papers */}
        {activeTab === "qpapers" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {qpapers.map(qp => (
              <div key={qp.Id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{qp.Name}</h3>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {qp.Type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Subjects: {qp.Subjects}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span>Duration: {qp.mins} mins</span>
                  <button
                    onClick={() => { setSelectedQpapId(qp.Id); setShowQModal(true); }}
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    + Add Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Students */}
        {activeTab === "students" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Centre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.rollnum}</td>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">{s.branch}</td>
                    <td className="px-4 py-3">{s.centre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Results */}
        {activeTab === "results" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Tab Switches</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No candidate submissions recorded yet. Launch an exam to submit test answers.
                    </td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-bold">{r.student_name}</td>
                      <td className="px-4 py-3 text-slate-500">{r.rollnum}</td>
                      <td className="px-4 py-3">{r.exam_name}</td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                        {r.score} / {r.total_marks}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${r.switch_count > 0 ? "text-amber-600" : "text-slate-500"}`}>
                          {r.switch_count} switches
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.submitted_at}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/results/${r.id}`}
                          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Scorecard &rarr;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold">Schedule Online Exam</h3>
            <form onSubmit={handleCreateExam} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Exam Title</label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="e.g. JEE Mock Test Series 2"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Max Allowed Tab Switches</label>
                  <input
                    type="number"
                    value={examSwitches}
                    onChange={e => setExamSwitches(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="proctor"
                  checked={examProctor}
                  onChange={e => setExamProctor(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="proctor" className="text-slate-700 dark:text-slate-300">
                  Enable Webcam Proctoring
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {showQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold">Add Question to Bank</h3>
            <form onSubmit={handleAddQuestion} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Question Statement</label>
                <textarea
                  required
                  rows={3}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder="Enter question text / LaTeX..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Subject</label>
                  <select
                    value={qSubject}
                    onChange={e => setQSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Question Type</label>
                  <select
                    value={qType}
                    onChange={e => setQType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  >
                    <option value="SINGLE_CORRECT">Single Correct Choice</option>
                    <option value="MULTI_CORRECT">Multi-Correct Choice</option>
                    <option value="NUMERICAL">Numerical Range</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Options (Comma-separated)</label>
                <input
                  type="text"
                  value={qOptions}
                  onChange={e => setQOptions(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Correct Answer Key</label>
                <input
                  type="text"
                  required
                  value={qKey}
                  onChange={e => setQKey(e.target.value)}
                  placeholder="e.g. Option A"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Correct Marks (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qCmk}
                    onChange={e => setQCmk(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qImk}
                    onChange={e => setQImk(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQModal(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold">Register Student</h3>
            <form onSubmit={handleAddStudent} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={studName}
                  onChange={e => setStudName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={studEmail}
                  onChange={e => setStudEmail(e.target.value)}
                  placeholder="student@ezexam.local"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300">Roll Number</label>
                <input
                  type="text"
                  required
                  value={studRoll}
                  onChange={e => setStudRoll(e.target.value)}
                  placeholder="STU-2026-002"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
