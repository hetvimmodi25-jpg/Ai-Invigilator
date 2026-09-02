import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import ThemeToggle from '../components/ThemeToggle';
import { getDashboardStats, createSession } from '../services/authService';

import API from '../services/api.js';

const AdminOverview = ({ protectedMode = false }) => {
  const navigate = useNavigate();
  const { admin, adminLogout } = useAuth();

  const [stats, setStats] = useState({
    onlineStudents: 0,
    activeExams: 0,
    totalViolations: 0,
    todaysAlerts: 0,
    violationStats: [],
    recentAlerts: [],
    previewStudents: []
  });

  const [publishedExams, setPublishedExams] = useState([]);
  const [inspectExam, setInspectExam] = useState(null);
  const [inspectQuestions, setInspectQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const fetchPublishedExams = async () => {
    try {
      const res = await API.get('/exam/all');
      if (res.data && res.data.success) {
        setPublishedExams(res.data.exams || []);
      }
    } catch (err) {
      console.error("Failed to fetch published exams:", err);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        if (res.success) {
          setStats(res);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
    fetchPublishedExams();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInspectExam = async (exam) => {
    setInspectExam(exam);
    setIsLoadingQuestions(true);
    try {
      const res = await API.get(`/exam/questions/${exam.exam_id}`);
      if (res.data && res.data.questions) {
        setInspectQuestions(res.data.questions);
      } else {
        setInspectQuestions([]);
      }
    } catch (err) {
      console.error("Failed to fetch exam questions:", err);
      setInspectQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this published exam?")) return;
    try {
      const res = await API.delete(`/exam/${examId}`);
      if (res.data && res.data.success) {
        fetchPublishedExams();
      }
    } catch (err) {
      alert("Failed to delete exam.");
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin-login');
  };

  // Handler for glass-card hover micro-interactions
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleExport = () => {
    window.open('http://localhost:5000/api/proctor/export', '_blank');
  };

  const handleCreateSession = async () => {
    const examName = window.prompt("Enter new exam name (e.g. Midterm 2026):");
    if (!examName) return;
    const subject = window.prompt("Enter subject:");
    const duration = window.prompt("Enter duration in minutes:");
    try {
      const res = await createSession({ examName, subject, duration });
      if (res.success) {
        alert("Session created successfully!");
      } else {
        alert("Failed to create session.");
      }
    } catch (e) {
      alert("Error connecting to server.");
    }
  };

  return (
    <div className="theme-admin admin-overview-root text-white bg-slate-950 dark min-h-screen transition-colors duration-300" style={{ backgroundColor: '#020617' }}>
      {/* 
        Styles are scoped to .admin-overview-root rather than the global
        `body` selector so navigating to other pages in this single-page
        app doesn't leak this page's background/font onto them.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-overview-root {
            font-family: 'Inter', sans-serif;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid #E2E8F0;
            transition: all 0.3s ease;
        }
        .dark .glass-card {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(71, 85, 105, 0.5);
        }
        .glass-card:hover {
            border-color: #004ac6;
            box-shadow: 0 4px 20px rgba(30, 41, 59, 0.05);
        }
        .dark .glass-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .status-pill {
            padding: 2px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .btn-primary {
            background: linear-gradient(135deg, #004ac6 0%, #712ae2 100%);
            color: white;
            transition: transform 0.2s active:scale-95;
        }
        .proctor-video-container {
            aspect-ratio: 16/9;
            background: #000;
            position: relative;
            overflow: hidden;
        }
        .ai-marker {
            position: absolute;
            border: 1.5px solid #712ae2;
            pointer-events: none;
        }
      `}} />

      {/* Sidebar Navigation (shared across all /admin/* views, with active-route highlighting) */}
      <AdminSidebar protectedMode={protectedMode} />

      {/* Main Content */}
      <main className="ml-[280px] min-h-screen p-xl">
        {/* Header */}
        <header className="flex justify-between items-end mb-xl">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-white">Admin Dashboard</h2>
            <p className="text-slate-300 font-body-md text-body-md">Real-time oversight of ongoing academic sessions.</p>
          </div>
          <div className="flex gap-md items-center">
            <ThemeToggle />
            <button onClick={() => navigate('/')} className="px-lg py-sm rounded-xl glass-card flex items-center gap-sm text-slate-300 font-label-md text-label-md cursor-pointer active:scale-95 transition-all">
              <span className="material-symbols-outlined">arrow_back</span> Back to Home
            </button>
            <button onClick={handleExport} className="px-lg py-sm rounded-xl glass-card flex items-center gap-sm text-primary font-label-md text-label-md cursor-pointer active:scale-95 transition-all" onMouseMove={handleMouseMove}>
              <span className="material-symbols-outlined">download</span> Export Report
            </button>
            <button onClick={handleCreateSession} className="btn-primary px-lg py-sm rounded-xl flex items-center gap-sm font-label-md text-label-md cursor-pointer active:scale-95 transition-all">
              <span className="material-symbols-outlined">add</span> Create New Session
            </button>
          </div>
        </header>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
          {/* Active Exams */}
          <div className="glass-card p-lg rounded-2xl relative overflow-hidden group" onMouseMove={handleMouseMove}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-md">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-sm rounded-lg">history_edu</span>
              <span className="text-emerald-500 font-label-md text-label-md flex items-center">Live</span>
            </div>
            <p className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Active Exams</p>
            <h3 className="font-headline-md text-headline-md text-white">{stats.activeExams}</h3>
          </div>

          {/* Students Online */}
          <div className="glass-card p-lg rounded-2xl relative overflow-hidden group" onMouseMove={handleMouseMove}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-md">
              <span className="material-symbols-outlined text-secondary bg-secondary/10 p-sm rounded-lg">sensors</span>
              <span className="text-emerald-500 font-label-md text-label-md flex items-center">Live</span>
            </div>
            <p className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Students Online</p>
            <h3 className="font-headline-md text-headline-md text-white">{stats.onlineStudents.toLocaleString()}</h3>
          </div>

          {/* Total Violations */}
          <div className="glass-card p-lg rounded-2xl relative overflow-hidden group" onMouseMove={handleMouseMove}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-md">
              <span className="material-symbols-outlined text-error bg-error/10 p-sm rounded-lg">gavel</span>
              <span className="text-error font-label-md text-label-md flex items-center">All-Time</span>
            </div>
            <p className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Total Violations</p>
            <h3 className="font-headline-md text-headline-md text-white">{stats.totalViolations}</h3>
          </div>

          {/* Today's Alerts */}
          <div className="glass-card p-lg rounded-2xl relative overflow-hidden group" onMouseMove={handleMouseMove}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-md">
              <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-sm rounded-lg">notifications_active</span>
              <span className="text-secondary font-label-md text-label-md flex items-center">Today</span>
            </div>
            <p className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Today's Alerts</p>
            <h3 className="font-headline-md text-headline-md text-white">{stats.todaysAlerts}</h3>
          </div>
        </div>

        {/* Middle Section: Monitoring & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-xl">
          {/* Monitoring Table */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col" onMouseMove={handleMouseMove}>
            <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
              <h4 className="font-title-lg text-title-lg text-white">Live Student Monitoring</h4>
              <div className="flex gap-sm">
                <span className="status-pill bg-emerald-100 text-emerald-700">92% Safe</span>
                <span className="status-pill bg-amber-100 text-amber-700">8% Alert</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/60/50">
                    <th className="px-lg py-md font-label-md text-label-md text-slate-300">Student Name</th>
                    <th className="px-lg py-md font-label-md text-label-md text-slate-300">Webcam Preview</th>
                    <th className="px-lg py-md font-label-md text-label-md text-slate-300">Status</th>
                    <th className="px-lg py-md font-label-md text-label-md text-slate-300">Violations</th>
                    <th className="px-lg py-md font-label-md text-label-md text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {stats.previewStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-md">
                          <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-primary">
                            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-body-md text-body-md text-white font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        <div className="w-24 h-14 bg-black rounded-lg overflow-hidden relative">
                          <div className="proctor-video-container">
                            <img 
                              className="w-full h-full object-cover" 
                              src={`http://localhost:5000/uploads/snapshots/student_${student.id}.jpg?t=${Date.now()}`} 
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                              onLoad={(e) => { e.target.style.display = 'block'; e.target.nextSibling.style.display = 'none'; }}
                              alt="Live feed" 
                            />
                            <div style={{display: 'none'}} className="w-full h-full flex items-center justify-center text-white bg-slate-800 text-xs">NO CAM</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        {student.status === 'Active' ? (
                          <span className="status-pill bg-emerald-100 text-emerald-700">Safe</span>
                        ) : student.status === 'Flagged' ? (
                          <span className="status-pill bg-error/20 text-error">Flagged</span>
                        ) : (
                          <span className="status-pill bg-amber-100 text-amber-700">Warning</span>
                        )}
                      </td>
                      <td className="px-lg py-md">
                        <span className="text-slate-300 font-body-md text-body-md">{student.violationCount > 0 ? student.violationCount : 'None'}</span>
                      </td>
                      <td className="px-lg py-md">
                        <button className="p-sm text-primary hover:bg-primary/10 rounded-full transition-all" onClick={() => navigate('/admin/live-monitoring')}>
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.previewStudents.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-xl text-slate-300 font-body-md">
                        No students are currently taking an exam.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-md mt-auto bg-slate-900/60/30 border-t border-outline-variant/20 text-center">
              <button className="text-primary font-label-md text-label-md hover:underline">View All Students</button>
            </div>
          </div>

          {/* Violation Chart */}
          <div className="glass-card rounded-2xl p-lg flex flex-col" onMouseMove={handleMouseMove}>
            <h4 className="font-title-lg text-title-lg text-white mb-lg">Violations by Type</h4>
            <div className="flex-1 flex flex-col gap-lg justify-center">
              {/* Fake Chart: Bar Chart Representation */}
              <div className="space-y-md">
                {stats.violationStats.map((stat, i) => {
                  const percent = Math.round((parseInt(stat.count) / (stats.totalViolations || 1)) * 100);
                  const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-error'];
                  return (
                    <div key={i} className="space-y-xs">
                      <div className="flex justify-between text-slate-300 font-label-md text-label-md uppercase">
                        <span>{stat.incident_type}</span>
                        <span className="font-bold">{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                {stats.violationStats.length === 0 && (
                   <p className="text-slate-300 text-center font-body-md py-lg">No violations logged yet.</p>
                )}
              </div>
              <div className="mt-lg p-md bg-primary-fixed/30 rounded-xl border border-primary/10">
                <div className="flex gap-md items-start">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  <div>
                    <p className="text-on-primary-fixed-variant font-label-md text-label-md font-bold">AI Insight</p>
                    <p className="text-slate-300 font-body-md text-body-md text-xs">
                      {stats.totalViolations > 0 ? "Violations are actively being tracked by the AI vision models." : "System is operating securely with zero recorded violations."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Published Exams Library Section */}
        <div className="glass-card rounded-2xl p-lg mb-xl" onMouseMove={handleMouseMove}>
          <div className="flex justify-between items-center mb-lg">
            <div>
              <h4 className="font-title-lg text-title-lg text-white flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Published Exams & Assessments Library
              </h4>
              <p className="text-xs text-slate-400">Exams generated by AI or created by instructors currently saved in database.</p>
            </div>
            <button
              onClick={() => navigate('/admin/ai-generator')}
              className="px-md py-xs bg-primary text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 cursor-pointer hover:brightness-110"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Generate New AI Exam
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/60/50 text-slate-300 font-label-md text-xs border-b border-slate-700">
                  <th className="px-md py-sm">Exam Title</th>
                  <th className="px-md py-sm">Subject / Topic</th>
                  <th className="px-md py-sm text-center">Questions</th>
                  <th className="px-md py-sm text-center">Duration</th>
                  <th className="px-md py-sm text-center">Total Marks</th>
                  <th className="px-md py-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {publishedExams.map((exam) => (
                  <tr key={exam.exam_id} className="hover:bg-slate-800/40 text-sm">
                    <td className="px-md py-md font-semibold text-white">
                      {exam.exam_name}
                    </td>
                    <td className="px-md py-md text-slate-300 text-xs">
                      {exam.subject || 'General'}
                    </td>
                    <td className="px-md py-md text-center font-bold text-primary">
                      {exam.question_count || 0}
                    </td>
                    <td className="px-md py-md text-center text-slate-300 text-xs">
                      {exam.duration_minutes || 60} mins
                    </td>
                    <td className="px-md py-md text-center text-emerald-400 font-bold text-xs">
                      {exam.total_marks || 100} pts
                    </td>
                    <td className="px-md py-md text-right">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() => handleInspectExam(exam)}
                          className="px-sm py-xs bg-slate-800 hover:bg-slate-700 text-primary text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          View Questions
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.exam_id)}
                          className="p-xs text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                          title="Delete Exam"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {publishedExams.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-xl text-slate-400 text-sm">
                      No published exams yet. Click <b>Generate New AI Exam</b> to create your first exam.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Question Inspector Modal */}
        {inspectExam && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-md">
            <div className="glass-card max-w-3xl w-full max-h-[85vh] rounded-2xl p-lg flex flex-col bg-slate-900 border border-slate-700 shadow-2xl">
              <div className="flex justify-between items-center pb-md border-b border-slate-700">
                <div>
                  <h3 className="font-title-lg text-white text-lg font-bold">{inspectExam.exam_name}</h3>
                  <p className="text-xs text-slate-400">
                    Subject: {inspectExam.subject} | Duration: {inspectExam.duration_minutes} Mins | Total Marks: {inspectExam.total_marks}
                  </p>
                </div>
                <button
                  onClick={() => setInspectExam(null)}
                  className="text-slate-400 hover:text-white p-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-md flex flex-col gap-md pr-xs">
                {isLoadingQuestions ? (
                  <div className="py-xl text-center text-primary font-semibold animate-pulse">Loading exam questions…</div>
                ) : inspectQuestions.length > 0 ? (
                  inspectQuestions.map((q, qIdx) => (
                    <div key={q.question_id || qIdx} className="p-md rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-xs">
                      <div className="flex items-center gap-xs">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="font-semibold text-white text-sm">{q.question_text}</span>
                      </div>

                      {/* Options if present */}
                      {(q.option_a && q.option_a !== 'N/A' && !q.option_a.startsWith('Starter Code')) && (
                        <div className="grid grid-cols-2 gap-xs mt-xs text-xs text-slate-300">
                          <div className={`p-xs rounded border ${q.correct_option === 'A' ? 'border-green-500/80 bg-green-500/10 font-bold text-green-300' : 'border-slate-800'}`}>
                            A) {q.option_a}
                          </div>
                          <div className={`p-xs rounded border ${q.correct_option === 'B' ? 'border-green-500/80 bg-green-500/10 font-bold text-green-300' : 'border-slate-800'}`}>
                            B) {q.option_b}
                          </div>
                          <div className={`p-xs rounded border ${q.correct_option === 'C' ? 'border-green-500/80 bg-green-500/10 font-bold text-green-300' : 'border-slate-800'}`}>
                            C) {q.option_c}
                          </div>
                          <div className={`p-xs rounded border ${q.correct_option === 'D' ? 'border-green-500/80 bg-green-500/10 font-bold text-green-300' : 'border-slate-800'}`}>
                            D) {q.option_d}
                          </div>
                        </div>
                      )}

                      {/* Starter code or rubric text */}
                      {q.option_a && q.option_a.startsWith('Starter Code') && (
                        <pre className="p-xs bg-slate-900 text-green-400 font-mono text-[11px] rounded overflow-x-auto">
                          {q.option_a}
                        </pre>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-lg">No questions found for this exam.</p>
                )}
              </div>

              <div className="pt-sm border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => setInspectExam(null)}
                  className="px-lg py-xs bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Alerts / Activity Feed */}
        <div className="glass-card rounded-2xl p-lg" onMouseMove={handleMouseMove}>
          <h4 className="font-title-lg text-title-lg text-white mb-lg">Recent Security Alerts</h4>
          <div className="space-y-md">
            {stats.recentAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start gap-md p-md hover:bg-slate-800/50 rounded-xl transition-colors border-l-4 ${alert.incident_type.includes('Tab') ? 'border-error' : alert.incident_type.includes('Face') ? 'border-amber-400' : 'border-primary'}`}>
                <div className={`${alert.incident_type.includes('Tab') ? 'bg-error/10' : alert.incident_type.includes('Face') ? 'bg-amber-100' : 'bg-primary/10'} p-sm rounded-full`}>
                  <span className={`material-symbols-outlined ${alert.incident_type.includes('Tab') ? 'text-error' : alert.incident_type.includes('Face') ? 'text-amber-700' : 'text-primary'}`} style={{ fontVariationSettings: "'opsz' 20" }}>
                    {alert.incident_type.includes('Tab') ? 'lock_reset' : alert.incident_type.includes('Face') ? 'visibility_off' : 'warning'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-xs">
                    <p className="font-body-md text-body-md font-bold text-white">{alert.incident_type}</p>
                    <span className="text-slate-300 text-[10px] font-mono-sm">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 font-body-md text-body-md">
                    <strong>{alert.name} (ID #{alert.student_id})</strong>: {alert.message}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentAlerts.length === 0 && (
              <p className="text-slate-300 text-center font-body-md py-lg">No recent security alerts.</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="ml-[280px] bg-slate-900/60est dark:bg-slate-900-dim relative w-full py-lg mt-auto border-t border-outline-variant/30">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter gap-lg max-w-container-max mx-auto">
          <div className="flex flex-col items-center md:items-start gap-xs">
            <p onClick={() => navigate('/')} className="font-title-lg text-title-lg font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">AI-Invigilator</p>
            <p className="text-slate-300 font-body-md text-body-md text-xs">© 2024 AI-Invigilator. Secure. Objective. Sophisticated.</p>
          </div>
          <div className="flex gap-lg">
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Privacy Policy</a>
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Terms of Service</a>
            <a className="text-slate-300 font-body-md text-body-md hover:text-secondary transition-colors" href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminOverview;
