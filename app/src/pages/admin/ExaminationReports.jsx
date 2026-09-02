import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { generateReports } from '../../data/adminMockData.js';
import { getAllResults } from "../../services/authService";

const STATUS_STYLES = {
  Clean: 'bg-emerald-100 text-emerald-700',
  Review: 'bg-amber-100 text-amber-700',
  Flagged: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 8;

const ExaminationReports = () => {
const [reports, setReports] = useState([]);
const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');


  useEffect(() => {
    const loadResults = async () => {
        try {
            const data = await getAllResults();

            console.log(data);

            setReports(data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    loadResults();
}, []);
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.exam_name.toLowerCase().includes(search.toLowerCase());
        
      const resultDateStr = r.submitted_at ? new Date(r.submitted_at).toISOString().split('T')[0] : '';
      const matchesDate = !dateFilter || resultDateStr === dateFilter;
      
      const computedStatus = r.score >= 35 ? 'Passed' : 'Failed';
      const matchesStatus = statusFilter === 'All' || computedStatus === statusFilter;
      
      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [reports, search, dateFilter, statusFilter]);

  const completed = filtered.length;

  const avgScore = Math.round(
      filtered.reduce((sum, r) => sum + r.score, 0) /
      (filtered.length || 1)
  );

  const integrityLevel =
      avgScore >= 35
          ? "Passed"
          : "Failed";

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Email", "Exam Name", "Score", "Total Marks", "Status", "Date"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(r => `"${r.full_name}","${r.email}","${r.exam_name}","${r.score}","${r.total_marks}","${r.score >= 35 ? 'Passed' : 'Failed'}","${new Date(r.submitted_at).toLocaleString()}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Examination_Reports.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV Exported Successfully');
  };

  const downloadStudentReport = (r) => {
    import('jspdf').then(async ({ jsPDF }) => {
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      const resultStatus = r.score >= 35 ? "PASSED" : "FAILED";
      const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(r.submitted_at));
      
      const tabSwitching = parseInt(r.tab_switches, 10) || 0;
      const phoneDetected = parseInt(r.phone_detected, 10) || 0;
      const multiFaces = parseInt(r.multi_faces, 10) || 0;
      const fullscreenExits = parseInt(r.fullscreen_exits, 10) || 0;
      const headMovements = parseInt(r.head_movements, 10) || 0;
      const noFaceDetected = parseInt(r.no_face_detected, 10) || 0;
      const eyesClosed = parseInt(r.eyes_closed, 10) || 0;
      const totalIncidents = tabSwitching + phoneDetected + multiFaces + fullscreenExits + headMovements + noFaceDetected + eyesClosed;
      
      let riskScore = 32;
      let integrityLevel = "MODERATE";
      if (totalIncidents === 0) {
          riskScore = 5;
          integrityLevel = "LOW";
      } else if (totalIncidents > 5) {
          riskScore = 78;
          integrityLevel = "HIGH";
      }

      // Colors
      const primaryColor = [0, 74, 198]; 
      const errorColor = [220, 38, 38];
      const successColor = [16, 185, 129];
      const darkText = [30, 41, 59];
      const lightText = [100, 116, 139];

      // Header: Logo (Shield) and Title
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      // Top-right filled quadrant
      doc.rect(25, 16, 9, 9, 'F');
      
      // Bottom-left filled quadrant
      doc.rect(16, 25, 9, 2, 'F');
      doc.triangle(16, 27, 25, 27, 25, 34, 'F');
      
      // Shield Outline & Cross
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      
      // Outline
      doc.line(16, 16, 34, 16); // Top
      doc.line(34, 16, 34, 27); // Right
      doc.line(34, 27, 25, 34); // Bottom-right diagonal
      doc.line(25, 34, 16, 27); // Bottom-left diagonal
      doc.line(16, 27, 16, 16); // Left
      
      // Inner cross
      doc.line(25, 16, 25, 34); // Vertical
      doc.line(16, 25, 34, 25); // Horizontal
      
      // Titles
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("AI-Invigilator", 40, 25);
      
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("EXAMINATION REPORT", 41, 31.5);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 40, 195, 40);

      // Section: Student Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Student Information", 15, 50);
      
      // Render Student Biometric Face Photo
      if (r.profile_photo && typeof r.profile_photo === 'string' && r.profile_photo.startsWith('data:image')) {
        try {
          const imgType = r.profile_photo.includes('png') ? 'PNG' : 'JPEG';
          doc.setDrawColor(0, 74, 198);
          doc.setLineWidth(0.8);
          doc.roundedRect(145, 46, 40, 40, 3, 3, 'D');
          doc.addImage(r.profile_photo, imgType, 146, 47, 38, 38);

          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text("VERIFIED BIOMETRIC FACE", 165, 89, { align: 'center' });
        } catch (imgErr) {
          console.warn("Failed to embed profile photo into PDF report:", imgErr);
        }
      }

      autoTable(doc, {
        startY: 55,
        margin: { right: 60 },
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2, textColor: darkText },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: lightText } },
        body: [
          ['Name:', r.full_name],
          ['Email:', r.email],
          ['Enrollment No:', r.student_id || 'N/A'],
        ],
      });

      // Section: Exam Info
      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Examination Details", 15, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2, textColor: darkText },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: lightText } },
        body: [
          ['Exam Name:', r.exam_name],
          ['Date Submitted:', formattedDate],
          ['Final Score:', `${r.score} / ${r.total_marks}`],
          ['Result Status:', resultStatus],
        ],
      });

      // Section: Proctoring Analysis
      finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("AI Proctoring Analysis", 15, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 2: { fontStyle: 'bold', halign: 'center' } },
        head: [['Metric', 'Detail', 'Status']],
        body: [
          ['Face Presence', noFaceDetected > 0 ? `${noFaceDetected} Incident(s) Not Detected` : 'Verified', noFaceDetected > 0 ? 'FAIL' : 'PASS'],
          ['Sleeping / Eyes Closed', `${eyesClosed} Incident(s)`, eyesClosed > 0 ? 'FAIL' : 'PASS'],
          ['Tab Switching', `${tabSwitching} Incident(s)`, tabSwitching > 0 ? 'FAIL' : 'PASS'],
          ['Mobile Phone Detected', `${phoneDetected} Incident(s)`, phoneDetected > 0 ? 'FAIL' : 'PASS'],
          ['Multiple Faces Detected', `${multiFaces} Incident(s)`, multiFaces > 0 ? 'FAIL' : 'PASS'],
          ['Full-Screen Exit', `${fullscreenExits} Incident(s)`, fullscreenExits > 0 ? 'FAIL' : 'PASS'],
          ['Head Movements', `${headMovements} Incident(s)`, headMovements > 0 ? 'FAIL' : 'PASS'],
        ],
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 2) {
            if (data.cell.raw === 'PASS') {
              data.cell.styles.textColor = successColor;
            } else if (data.cell.raw === 'FAIL') {
              data.cell.styles.textColor = errorColor;
            }
          }
        }
      });

      // Section: Integrity Assessment
      finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text("Integrity Assessment", 15, finalY);
      
      // Draw a box for integrity
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, finalY + 5, 180, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.text("Risk Score", 20, finalY + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      let riskColor = integrityLevel === 'HIGH' ? errorColor : (integrityLevel === 'LOW' ? successColor : [245, 158, 11]);
      doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      doc.text(`${riskScore}%`, 20, finalY + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.text("Integrity Level", 80, finalY + 12);
      doc.setFontSize(14);
      doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      doc.text(`${integrityLevel} RISK`, 80, finalY + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.text("Total Incidents", 140, finalY + 12);
      doc.setFontSize(14);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`${totalIncidents}`, 140, finalY + 22);

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.text("Generated securely by the AI Invigilator Proctoring System.", 105, 285, { align: 'center' });

      doc.save(`${r.full_name.replace(/\s+/g, '_')}_Report.pdf`);
      showToast(`Professional Report downloaded for ${r.full_name}`);
    });
  };

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));
if (loading) {
    return <h2>Loading results...</h2>;
}
  return (
    <AdminLayout>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-white">Examination Reports</h2>
          <p className="text-slate-300 font-body-md text-body-md">Comprehensive analysis and integrity scores for completed sessions.</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn-primary px-lg py-sm rounded-xl flex items-center gap-sm font-label-md text-label-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">ios_share</span> Export CSV
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="glass-card p-lg rounded-2xl flex flex-col justify-between">
          <span className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Completed Exams</span>
          <h3 className="font-headline-lg text-headline-lg text-primary mt-xs">{completed}</h3>
          <div className="flex items-center gap-xs text-emerald-600 mt-md">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span className="font-label-md text-label-md">All sessions accounted for</span>
          </div>
        </div>
        <div className="glass-card p-lg rounded-2xl flex flex-col justify-between">
          <span className="text-slate-300 font-label-md text-label-md uppercase tracking-wider"> Average Score</span>
          <h3 className="font-headline-lg text-headline-lg text-secondary mt-xs">{avgScore}</h3>
          <div className="flex items-center gap-xs text-slate-300/70 mt-md">
            <span className="material-symbols-outlined text-sm">info</span>
            <span className="font-label-md text-label-md">Across all filtered sessions</span>
          </div>
        </div>
        <div className="glass-card p-lg rounded-2xl flex flex-col justify-between bg-primary-container/10">
          <span className="text-slate-300 font-label-md text-label-md uppercase tracking-wider">Integrity Level</span>
          <h3 className="font-headline-lg text-headline-lg text-white mt-xs">{integrityLevel}</h3>
          <div className="flex items-center gap-xs mt-md">
            <span className="font-label-md text-label-md text-slate-300">Based on average examination score</span>
          </div>
        </div>
      </div>

      {/* Table + Controls */}
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
        <div className="p-lg border-b border-outline-variant/20 flex flex-col md:flex-row justify-between gap-lg items-stretch md:items-center">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-xl pr-md py-sm bg-slate-900/60 border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-md"
              placeholder="Search student name or exam ID..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-md w-full md:w-auto">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-outline-variant/30 rounded-lg px-md py-sm font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-outline-variant/30 rounded-lg px-md py-sm font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Statuses</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
            {(dateFilter || statusFilter !== 'All' || search) && (
              <button
                onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter('All'); setPage(1); }}
                className="text-slate-300 hover:text-error text-[13px] font-label-md underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
           <thead>
    <tr className="bg-slate-900/60/50">
        <th className="px-lg py-md">Student Name</th>
        <th className="px-lg py-md">Email</th>
        <th className="px-lg py-md">Exam Name</th>
        <th className="px-lg py-md">Score</th>
        <th className="px-lg py-md">Status</th>
        <th className="px-lg py-md">Date</th>
        <th className="px-lg py-md">Action</th>
    </tr>
</thead>
{console.log(pageItems)}
<tbody className="divide-y divide-outline-variant/20">
      {pageItems.map((r) => (
        <tr key={r.result_id}>
            <td className="px-lg py-md flex items-center gap-md">
                {r.profile_photo && typeof r.profile_photo === 'string' && r.profile_photo.startsWith('data:image') ? (
                  <img src={r.profile_photo} alt={r.full_name} className="w-9 h-9 rounded-xl object-cover border border-primary/40 shadow-sm shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/30">
                    {r.full_name?.charAt(0) || 'S'}
                  </div>
                )}
                <span className="font-medium text-slate-100">{r.full_name}</span>
            </td>

            <td className="px-lg py-md">{r.email}</td>

            <td className="px-lg py-md">{r.exam_name}</td>

            <td className="px-lg py-md">
                {r.score}/{r.total_marks}
            </td>

            <td className="px-lg py-md">
                {r.score >= 35 ? "Passed" : "Failed"}
            </td>

            <td className="px-lg py-md">
                {new Date(r.submitted_at).toLocaleString()}
            </td>

            <td className="px-lg py-md">
                <button onClick={() => downloadStudentReport(r)} className="bg-blue-500 hover:bg-blue-600 transition-colors text-white px-3 py-2 rounded-lg">
                    Download Report
                </button>
            </td>
        </tr>
    ))}
</tbody>
          </table>
        </div>

        <div className="p-gutter border-t border-outline-variant/20 flex justify-between items-center bg-slate-900/60est/30">
          <span className="text-[12px] text-slate-300">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} reports
          </span>
          <div className="flex gap-sm">
            <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-sm glass-card rounded-lg hover:bg-primary/10 disabled:opacity-30">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`px-md py-xs rounded-lg text-[12px] ${p === page ? 'bg-primary text-on-primary font-bold' : 'hover:bg-primary/10'}`}
              >
                {p}
              </button>
            ))}
            <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-sm glass-card rounded-lg hover:bg-primary/10 disabled:opacity-30">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-lg left-1/2 -translate-x-1/2 z-50 toast-animate bg-on-surface text-surface px-lg py-sm rounded-xl shadow-2xl font-label-md text-label-md">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
};

export default ExaminationReports;
