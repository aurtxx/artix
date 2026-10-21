"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

interface QuestionItem {
  id: number;
  qno: number;
  qtxt: string;
  type: string;
  subj: string;
  cmk: number;
  imk: number;
  options: string[];
  key: string;
}

interface QuestionPaper {
  Id: number;
  Name: string;
  Subjects: string;
  Type: string;
  mins: number;
  status: string;
  questions?: QuestionItem[];
}

interface Student {
  id: number;
  name: string;
  rollnum: string;
  email: string;
  phone?: string;
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

interface StructureItem {
  id: number;
  name: string;
  code: string;
  address?: string;
}

interface NoticeItem {
  id: number;
  title: string;
  content: string;
  target_branch: string;
  target_centre: string;
  created_by: string;
  created_at: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"exams" | "qpapers" | "students" | "results" | "structure" | "notices">("exams");
  const [cap, setCap] = useState<Capacity | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [qpapers, setQpapers] = useState<QuestionPaper[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Submission[]>([]);
  const [structure, setStructure] = useState<{ centres: StructureItem[]; branches: StructureItem[]; subjects: StructureItem[] }>({ centres: [], branches: [], subjects: [] });
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  // Modals
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQModal, setShowQModal] = useState(false);
  const [showEditQModal, setShowEditQModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showAddCentreModal, setShowAddCentreModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  // New Exam Form
  const [examName, setExamName] = useState("");
  const [examDuration, setExamDuration] = useState("180");
  const [examSwitches, setExamSwitches] = useState("3");
  const [examProctor, setExamProctor] = useState(false);

  // Question Form
  const [selectedQpapId, setSelectedQpapId] = useState<number>(1);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
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
  const [studCentre, setStudCentre] = useState("Main Campus");

  // CSV Import Form
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvOverwrite, setCsvOverwrite] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvMsg, setCsvMsg] = useState<string | null>(null);

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeBranch, setNoticeBranch] = useState("All");

  // Structure Form Fields
  const [newCentreName, setNewCentreName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");

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
      const capRes = await fetch("http://127.0.0.1:8000/staff/get_cap", { method: "POST", headers, credentials: "include" });
      if (capRes.status === 401) {
        router.push("/login");
        return;
      }
      if (capRes.ok) setCap(await capRes.json());

      const exRes = await fetch("http://127.0.0.1:8000/staff/get_qexams_paging", { method: "POST", headers, credentials: "include" });
      if (exRes.ok) {
        const d = await exRes.json();
        setExams(d.data || []);
      }

      const qpRes = await fetch("http://127.0.0.1:8000/staff/get_qpaps", { method: "POST", headers, credentials: "include" });
      if (qpRes.ok) {
        const d = await qpRes.json();
        setQpapers(d.qpaps || []);
      }

      const studRes = await fetch("http://127.0.0.1:8000/staff/get_studs_paging", { method: "POST", headers, credentials: "include" });
      if (studRes.ok) {
        const d = await studRes.json();
        setStudents(d.data || []);
      }

      const resRes = await fetch("http://127.0.0.1:8000/staff/get_res", { method: "POST", headers, credentials: "include" });
      if (resRes.ok) {
        const d = await resRes.json();
        setResults(d.results || []);
      }

      const structRes = await fetch("http://127.0.0.1:8000/staff/academic_structure", { headers, credentials: "include" });
      if (structRes.ok) {
        const d = await structRes.json();
        setStructure({ centres: d.centres || [], branches: d.branches || [], subjects: d.subjects || [] });
      }

      const notRes = await fetch("http://127.0.0.1:8000/staff/get_notices", { headers, credentials: "include" });
      if (notRes.ok) {
        const d = await notRes.json();
        setNotices(d.notices || []);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    }
  }, [getHeaders, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Exam Scheduling
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

  // Question Creation
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
    fetchData();
    alert("Question added to Question Paper successfully!");
  }

  // Question Edit
  function openEditQuestion(q: QuestionItem) {
    setEditingQuestion(q);
    setQText(q.qtxt);
    setQSubject(q.subj);
    setQType(q.type);
    setQOptions(q.options.join(", "));
    setQKey(q.key);
    setQCmk(String(q.cmk));
    setQImk(String(q.imk));
    setShowEditQModal(true);
  }

  async function handleUpdateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuestion) return;
    const opts = qOptions.split(",").map(s => s.trim()).filter(Boolean);
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/update_qstn", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        qid: editingQuestion.id,
        qtxt: qText,
        type: qType,
        subj: qSubject,
        options: opts,
        key: qKey,
        cmk: parseFloat(qCmk),
        imk: parseFloat(qImk)
      })
    });
    setShowEditQModal(false);
    setEditingQuestion(null);
    fetchData();
    alert("Question updated successfully!");
  }

  async function handleDeleteQuestion(qid: number) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/del_qstn", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ qid })
    });
    fetchData();
  }

  async function handleDeletePaper(qpap_id: number) {
    if (!confirm("Are you sure you want to delete this question paper?")) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    const res = await fetch("http://127.0.0.1:8000/staff/del_qpap", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ qpap_id })
    });
    const d = await res.json();
    if (d.status === "FAILED") {
      alert(d.error);
    } else {
      fetchData();
    }
  }

  // Student Actions
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
        centre: studCentre,
        pass: "password123"
      })
    });
    setShowStudentModal(false);
    setStudName("");
    setStudEmail("");
    setStudRoll("");
    fetchData();
  }

  // Bulk CSV Upload
  async function handleCsvUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) {
      alert("Please select a valid CSV file.");
      return;
    }
    setCsvLoading(true);
    setCsvMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("overwrite", String(csvOverwrite));

      const res = await fetch("http://127.0.0.1:8000/staff/add_studs_csv", {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setCsvMsg(data.msg);
        fetchData();
        setTimeout(() => {
          setShowCsvModal(false);
          setCsvFile(null);
          setCsvMsg(null);
        }, 1500);
      } else {
        setCsvMsg(data.detail || data.error || "CSV upload failed.");
      }
    } catch {
      setCsvMsg("Error uploading CSV. Check network connection.");
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleDownloadRoster() {
    try {
      const res = await fetch("http://127.0.0.1:8000/staff/download_studs", {
        headers: getHeaders(),
        credentials: "include"
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "student_roster.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Failed to download roster:", e);
    }
  }

  // Academic Structure
  async function handleAddCentre(e: React.FormEvent) {
    e.preventDefault();
    if (!newCentreName.trim()) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_centre", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ new_centre: newCentreName.trim() })
    });
    setNewCentreName("");
    setShowAddCentreModal(false);
    fetchData();
  }

  async function handleDeleteCentre(name: string) {
    if (!confirm(`Delete centre '${name}'?`)) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_centre", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ old_centre: name, delete_centre: true })
    });
    fetchData();
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_class", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ new_class: newBranchName.trim() })
    });
    setNewBranchName("");
    setShowAddBranchModal(false);
    fetchData();
  }

  async function handleDeleteBranch(name: string) {
    if (!confirm(`Delete batch '${name}'?`)) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_class", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ old_class: name, delete_class: true })
    });
    fetchData();
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_subj", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ new_subj_name: newSubjectName.trim() })
    });
    setNewSubjectName("");
    setShowAddSubjectModal(false);
    fetchData();
  }

  async function handleDeleteSubject(name: string) {
    if (!confirm(`Delete subject '${name}'?`)) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_edit_subj", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ old_subj_name: name, delete_subj: true })
    });
    fetchData();
  }

  // Notices
  async function handleAddNotice(e: React.FormEvent) {
    e.preventDefault();
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/add_notice", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ title: noticeTitle, content: noticeContent, target_branch: noticeBranch })
    });
    setShowNoticeModal(false);
    setNoticeTitle("");
    setNoticeContent("");
    fetchData();
  }

  async function handleDeleteNotice(notice_id: number) {
    if (!confirm("Delete this notice?")) return;
    const headers = { ...getHeaders(), "Content-Type": "application/json" };
    await fetch("http://127.0.0.1:8000/staff/del_notice", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ notice_id })
    });
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
              onClick={() => { if (typeof window !== "undefined") localStorage.removeItem("auth_token"); }}
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
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Valid: {cap.valid_till}</span>
            </div>
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Registered Students</span>
              <p className="mt-2 text-3xl font-black text-purple-600 font-mono dark:text-purple-400">
                {students.length}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Batches: {structure.branches.length}</span>
            </div>
            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Subscription</span>
              <p className="mt-2 text-2xl font-black text-amber-500 uppercase font-mono">
                {cap.paid ? "Active" : "Trial"}
              </p>
              <span className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Centres: {structure.centres.length}</span>
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
              { id: "structure", label: "Academic Structure" },
              { id: "notices", label: "Noticeboard" },
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadRoster}
                  className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="border-2 border-slate-900 bg-amber-300 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-amber-400"
                >
                  Upload CSV
                </button>
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="border-2 border-slate-900 bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  + Add Student
                </button>
              </div>
            )}
            {activeTab === "structure" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddCentreModal(true)}
                  className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                >
                  + Centre
                </button>
                <button
                  onClick={() => setShowAddBranchModal(true)}
                  className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                >
                  + Batch
                </button>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="border-2 border-slate-900 bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700"
                >
                  + Subject
                </button>
              </div>
            )}
            {activeTab === "notices" && (
              <button
                onClick={() => setShowNoticeModal(true)}
                className="border-2 border-slate-900 bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                + Post Notice
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

        {/* Tab 2: Question Papers & Editing */}
        {activeTab === "qpapers" && (
          qpapers.length === 0 ? (
            <div className="border-2 border-slate-900 bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              No question papers found. Click &quot;+ Add Question&quot; to build your question bank.
            </div>
          ) : (
            <div className="space-y-6">
              {qpapers.map(qp => (
                <div key={qp.Id} className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-900 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg">{qp.Name}</h3>
                        <span className="border-2 border-slate-900 bg-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {qp.Type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                        Subjects: {qp.Subjects} &bull; Duration: {qp.mins} mins
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedQpapId(qp.Id); setShowQModal(true); }}
                        className="border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400"
                      >
                        + Add Question
                      </button>
                      <button
                        onClick={() => handleDeletePaper(qp.Id)}
                        className="border-2 border-slate-900 bg-rose-200 px-3 py-1 text-xs font-black uppercase text-rose-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-300"
                      >
                        Delete Paper
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="mt-4 space-y-3">
                    <h4 className="font-mono text-xs font-black uppercase tracking-wider text-slate-500">
                      Questions ({qp.questions?.length || 0})
                    </h4>
                    {(!qp.questions || qp.questions.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">No questions added yet.</p>
                    ) : (
                      qp.questions.map((q, qidx) => (
                        <div key={q.id} className="border border-slate-900 bg-slate-50 p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:bg-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="border border-slate-900 bg-blue-100 px-2 py-0.5 font-mono text-xs font-black text-blue-900">
                                Q{qidx + 1}
                              </span>
                              <span className="border border-slate-900 bg-white px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-slate-800">
                                {q.subj}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 uppercase">
                                ({q.type}) &bull; +{q.cmk} / {q.imk}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditQuestion(q)}
                                className="border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-slate-900 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="border border-slate-900 bg-rose-100 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-rose-800 hover:bg-rose-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <p className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                            {q.qtxt}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {q.options.map((opt, i) => (
                              <span
                                key={i}
                                className={`border px-2 py-0.5 font-mono ${
                                  opt === q.key
                                    ? "border-emerald-600 bg-emerald-100 font-bold text-emerald-950"
                                    : "border-slate-300 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                }`}
                              >
                                {opt} {opt === q.key && "✓"}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 3: Student Roster & Bulk CSV */}
        {activeTab === "students" && (
          <div className="border-2 border-slate-900 bg-white shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-900 bg-slate-100 font-black uppercase tracking-wider text-slate-800 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Batch / Class</th>
                  <th className="px-4 py-3">Campus Centre</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-semibold">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs font-bold text-slate-500">
                      No registered students found in this roster. Click &quot;+ Add Student&quot; or &quot;Upload CSV&quot; to enroll candidates.
                    </td>
                  </tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="hover:bg-yellow-50/40 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{s.name || (s as any).username}</td>
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

        {/* Tab 5: Academic Structure */}
        {activeTab === "structure" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Centres Card */}
            <div className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <h3 className="font-black text-sm uppercase">Campus Centres</h3>
                <button
                  onClick={() => setShowAddCentreModal(true)}
                  className="border border-slate-900 bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-blue-900 hover:bg-blue-200"
                >
                  + Add
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {structure.centres.map(c => (
                  <li key={c.id} className="flex items-center justify-between border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <span>{c.name}</span>
                      <span className="block text-[10px] font-mono text-slate-500">{c.code}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCentre(c.name)}
                      className="text-rose-600 hover:text-rose-800 font-mono text-xs"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Branches Card */}
            <div className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <h3 className="font-black text-sm uppercase">Batches & Classes</h3>
                <button
                  onClick={() => setShowAddBranchModal(true)}
                  className="border border-slate-900 bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-blue-900 hover:bg-blue-200"
                >
                  + Add
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {structure.branches.map(b => (
                  <li key={b.id} className="flex items-center justify-between border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <span>{b.name}</span>
                      <span className="block text-[10px] font-mono text-slate-500">{b.code}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteBranch(b.name)}
                      className="text-rose-600 hover:text-rose-800 font-mono text-xs"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subjects Card */}
            <div className="border-2 border-slate-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <h3 className="font-black text-sm uppercase">Academic Subjects</h3>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="border border-slate-900 bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-blue-900 hover:bg-blue-200"
                >
                  + Add
                </button>
              </div>
              <ul className="mt-4 space-y-2">
                {structure.subjects.map(s => (
                  <li key={s.id} className="flex items-center justify-between border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <span>{s.name}</span>
                      <span className="block text-[10px] font-mono text-slate-500">{s.code}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSubject(s.name)}
                      className="text-rose-600 hover:text-rose-800 font-mono text-xs"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 6: Digital Noticeboard */}
        {activeTab === "notices" && (
          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="border-2 border-slate-900 bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
                No active announcements on the noticeboard. Click &quot;+ Post Notice&quot; to publish instructions.
              </div>
            ) : (
              notices.map(n => (
                <div key={n.id} className="border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="border border-slate-900 bg-amber-200 px-2 py-0.5 font-mono text-xs font-black uppercase text-amber-950">
                        {n.target_branch}
                      </span>
                      <h3 className="font-black text-base">{n.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-slate-500">{n.created_at}</span>
                      <button
                        onClick={() => handleDeleteNotice(n.id)}
                        className="text-rose-600 hover:text-rose-800 font-mono text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {n.content}
                  </p>
                </div>
              ))
            )}
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
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Max Tab Switches</label>
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
                  className="h-4 w-4 border-2 border-slate-900"
                />
                <label htmlFor="proctor" className="uppercase tracking-wider">Enable WebCam / Photo Proctoring</label>
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
          <div className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Add Question to Paper</h3>
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
                  placeholder="Enter complete question statement here..."
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Subject</label>
                  <select
                    value={qSubject}
                    onChange={e => setQSubject(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    {structure.subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {structure.subjects.length === 0 && (
                      <>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={qType}
                    onChange={e => setQType(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    <option value="SINGLE_CORRECT">Single Correct MCQ</option>
                    <option value="MULTI_CORRECT">Multiple Correct MCQ</option>
                    <option value="NUMERICAL">Numerical Response</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Options (Comma separated)</label>
                <input
                  type="text"
                  value={qOptions}
                  onChange={e => setQOptions(e.target.value)}
                  placeholder="Option A, Option B, Option C, Option D"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Authoritative Key</label>
                <input
                  type="text"
                  required
                  value={qKey}
                  onChange={e => setQKey(e.target.value)}
                  placeholder="Option A"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Marks for Correct (+)</label>
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

      {/* Modal: Edit Question */}
      {showEditQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Edit Question</h3>
              <button onClick={() => setShowEditQModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>
            <form onSubmit={handleUpdateQuestion} className="mt-4 space-y-4 text-xs font-bold">
              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Question Statement</label>
                <textarea
                  required
                  rows={3}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Subject</label>
                  <select
                    value={qSubject}
                    onChange={e => setQSubject(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    {structure.subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {structure.subjects.length === 0 && (
                      <>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={qType}
                    onChange={e => setQType(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    <option value="SINGLE_CORRECT">Single Correct MCQ</option>
                    <option value="MULTI_CORRECT">Multiple Correct MCQ</option>
                    <option value="NUMERICAL">Numerical Response</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Options (Comma separated)</label>
                <input
                  type="text"
                  value={qOptions}
                  onChange={e => setQOptions(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Authoritative Key</label>
                <input
                  type="text"
                  required
                  value={qKey}
                  onChange={e => setQKey(e.target.value)}
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
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Penalty Marks (-)</label>
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
                  onClick={() => setShowEditQModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-slate-900 bg-blue-600 px-5 py-2 font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700"
                >
                  Update Question
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Batch / Class</label>
                  <select
                    value={studBranch}
                    onChange={e => setStudBranch(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    {structure.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    {structure.branches.length === 0 && <option value="JEE-Main">JEE-Main</option>}
                  </select>
                </div>
                <div>
                  <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Centre</label>
                  <select
                    value={studCentre}
                    onChange={e => setStudCentre(e.target.value)}
                    className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                  >
                    {structure.centres.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {structure.centres.length === 0 && <option value="Main Campus">Main Campus</option>}
                  </select>
                </div>
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

      {/* Modal: Bulk CSV Upload */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Bulk Student CSV Ingestion</h3>
              <button onClick={() => setShowCsvModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>

            <form onSubmit={handleCsvUpload} className="mt-4 space-y-4 text-xs font-bold">
              <div className="border-2 border-dashed border-slate-900 p-6 text-center bg-slate-50 dark:bg-slate-800">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100"
                >
                  Choose CSV File
                </button>
                <p className="mt-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {csvFile ? `Selected: ${csvFile.name}` : "Expected headers: Name, Roll Number, Email, Phone, Branch, Centre"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="csvOverwrite"
                  checked={csvOverwrite}
                  onChange={e => setCsvOverwrite(e.target.checked)}
                  className="h-4 w-4 border-2 border-slate-900"
                />
                <label htmlFor="csvOverwrite" className="uppercase tracking-wider">
                  Overwrite existing records matching email/rollnum
                </label>
              </div>

              {csvMsg && (
                <div className={`border-2 border-slate-900 p-3 font-mono text-xs ${
                  csvMsg.includes("Successfully") ? "bg-emerald-100 text-emerald-950" : "bg-rose-100 text-rose-950"
                }`}>
                  {csvMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvLoading || !csvFile}
                  className="border-2 border-slate-900 bg-emerald-500 px-5 py-2 font-black uppercase tracking-wider text-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-600 disabled:opacity-50"
                >
                  {csvLoading ? "Processing CSV..." : "Upload & Ingest Roster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post Notice */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <h3 className="text-base font-black uppercase tracking-tight">Post Announcement</h3>
              <button onClick={() => setShowNoticeModal(false)} className="font-mono font-black text-lg">&times;</button>
            </div>
            <form onSubmit={handleAddNotice} className="mt-4 space-y-4 text-xs font-bold">
              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Notice Title</label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={e => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Mandatory Instructions for CBT Mock 2"
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Target Cohort</label>
                <select
                  value={noticeBranch}
                  onChange={e => setNoticeBranch(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                >
                  <option value="All">All Batches</option>
                  {structure.branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-slate-700 dark:text-slate-300">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={noticeContent}
                  onChange={e => setNoticeContent(e.target.value)}
                  placeholder="Type official announcement details here..."
                  className="mt-1 w-full border-2 border-slate-900 bg-white p-2.5 text-xs font-semibold outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="border-2 border-slate-900 px-4 py-2 uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-2 border-slate-900 bg-blue-600 px-5 py-2 font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Centre */}
      {showAddCentreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <h3 className="text-base font-black uppercase tracking-tight">Add Campus Centre</h3>
            <form onSubmit={handleAddCentre} className="mt-4 space-y-4 text-xs font-bold">
              <input
                type="text"
                required
                placeholder="Centre Name (e.g. West Campus)"
                value={newCentreName}
                onChange={e => setNewCentreName(e.target.value)}
                className="w-full border-2 border-slate-900 p-2.5 outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddCentreModal(false)} className="border-2 border-slate-900 px-3 py-1.5 uppercase">Cancel</button>
                <button type="submit" className="border-2 border-slate-900 bg-blue-600 text-white px-4 py-1.5 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Branch */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <h3 className="text-base font-black uppercase tracking-tight">Add Batch / Class</h3>
            <form onSubmit={handleAddBranch} className="mt-4 space-y-4 text-xs font-bold">
              <input
                type="text"
                required
                placeholder="Batch Name (e.g. Olympiad-2027)"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                className="w-full border-2 border-slate-900 p-2.5 outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddBranchModal(false)} className="border-2 border-slate-900 px-3 py-1.5 uppercase">Cancel</button>
                <button type="submit" className="border-2 border-slate-900 bg-blue-600 text-white px-4 py-1.5 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Subject */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border-2 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-900">
            <h3 className="text-base font-black uppercase tracking-tight">Add Academic Subject</h3>
            <form onSubmit={handleAddSubject} className="mt-4 space-y-4 text-xs font-bold">
              <input
                type="text"
                required
                placeholder="Subject Name (e.g. Computer Science)"
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                className="w-full border-2 border-slate-900 p-2.5 outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSubjectModal(false)} className="border-2 border-slate-900 px-3 py-1.5 uppercase">Cancel</button>
                <button type="submit" className="border-2 border-slate-900 bg-blue-600 text-white px-4 py-1.5 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
