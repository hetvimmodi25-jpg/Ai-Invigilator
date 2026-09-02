import React, { useMemo, useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { getAllIncidents, updateIncidentStatus as updateIncidentStatusAPI } from '../../services/authService';

const VIOLATION_TYPES_LIST = [
  'TAB_SWITCH',
  'MOBILE_PHONE',
  'MULTIPLE_PERSON',
  'FACE_NOT_DETECTED',
  'SLEEPING_OR_AWAY',
  'LOOKING_AWAY',
  'FULLSCREEN_EXIT'
];

const STATUS_STYLES = {
  Critical: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

const PAGE_SIZE = 8;

const IntegrityViolations = () => {
  const [violations, setViolations] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState('');

  const loadIncidents = async () => {
    try {
      const data = await getAllIncidents();
      if (data && data.success) {
        setViolations(data.incidents);
      }
    } catch (error) {
      console.error("Error loading incidents:", error);
    }
  };

  useEffect(() => {
    loadIncidents();
    // Poll for real-time updates across laptops
    const interval = setInterval(() => {
      loadIncidents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalFlagged = violations.length;
  const pending = violations.filter((v) => v.status === 'Pending').length;
  const resolved = violations.filter((v) => v.status === 'Resolved').length;
  const critical = violations.filter((v) => v.status === 'Critical').length;

  const filtered = useMemo(() => {
    return violations.filter((v) => {
      const matchesSearch = !search || v.studentName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All' || v.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [violations, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await updateIncidentStatusAPI(id, newStatus);
      if (res.success) {
        setViolations((prev) => prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v)));
        setOpenMenuId(null);
        showToast(`Marked incident as ${newStatus}.`);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      showToast('Failed to update status.');
    }
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Violation Type", "Timestamp", "Status", "Evidence Link"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(v => {
        const imgLink = v.image_filename ? `http://localhost:5000/uploads/incidents/${v.image_filename}` : "No Image";
        return `"${v.studentName}","${v.type}","${new Date(v.timestamp).toLocaleString()}","${v.status}","${imgLink}"`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Audit Log Exported Successfully');
  };

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <AdminLayout>
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-white">Integrity Violations</h2>
          <p className="text-slate-300 font-body-md text-body-md">Review flagged incidents across all active examination sessions.</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-lg py-sm bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          Export Audit Log
        </button>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg">
        <div className="glass-card p-lg rounded-2xl flex flex-col gap-sm">
          <span className="text-slate-300 font-label-md">Total Flagged</span>
          <span className="font-headline-md text-headline-md text-error">{totalFlagged}</span>
        </div>
        <div className="glass-card p-lg rounded-2xl flex flex-col gap-sm">
          <span className="text-slate-300 font-label-md">Pending Review</span>
          <span className="font-headline-md text-headline-md text-white">{pending}</span>
        </div>
        <div className="glass-card p-lg rounded-2xl flex flex-col gap-sm">
          <span className="text-slate-300 font-label-md">Resolved</span>
          <span className="font-headline-md text-headline-md text-emerald-600">{resolved}</span>
        </div>
        <div className="glass-card p-lg rounded-2xl flex flex-col gap-sm">
          <span className="text-slate-300 font-label-md">Critical Alerts</span>
          <span className="font-headline-md text-headline-md text-error">{critical}</span>
        </div>
      </section>

      {/* Table + Controls */}
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
        <div className="p-lg border-b border-outline-variant/20 flex flex-col md:flex-row justify-between gap-lg items-stretch md:items-center">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-xl pr-md py-sm bg-slate-900/60 border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-md"
              placeholder="Search by student name..."
            />
          </div>
          <div className="flex items-center gap-md w-full md:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-outline-variant/30 rounded-lg px-md py-sm font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Types</option>
              {VIOLATION_TYPES_LIST.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-900/60 border border-outline-variant/30 rounded-lg px-md py-sm font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Statuses</option>
              <option value="Critical">Critical</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60/50">
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Student</th>
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Violation Type</th>
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Evidence</th>
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Timestamp</th>
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Status</th>
                <th className="px-lg py-md font-label-md text-label-md text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {pageItems.map((v) => (
                <tr key={v.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-md">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-primary">
                        {v.studentName ? v.studentName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="font-body-md text-body-md text-white font-medium">{v.studentName}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md font-body-md text-body-md text-slate-300">{v.type}</td>
                  <td className="px-lg py-md">
                    {v.image_filename ? (
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800">
                        <img className="w-full h-full object-cover" src={`http://localhost:5000/uploads/incidents/${v.image_filename}`} alt="Evidence thumbnail" />
                      </div>
                    ) : (
                      <span className="text-slate-300/50 text-[11px]">No Image</span>
                    )}
                  </td>
                  <td className="px-lg py-md font-mono-sm text-mono-sm text-slate-300">{new Date(v.timestamp).toLocaleString()}</td>
                  <td className="px-lg py-md">
                    <span className={`status-pill ${STATUS_STYLES[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-lg py-md relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                      className="p-sm text-slate-300 hover:bg-slate-900-variant/60 rounded-full transition-all"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {openMenuId === v.id && (
                      <div className="absolute right-lg top-full mt-xs w-44 glass-card rounded-xl shadow-xl z-10 py-xs flex flex-col">
                        <button onClick={() => updateStatus(v.id, 'Resolved')} className="px-md py-sm text-left text-[13px] hover:bg-emerald-50 text-emerald-700">Mark Resolved</button>
                        <button onClick={() => updateStatus(v.id, 'Pending')} className="px-md py-sm text-left text-[13px] hover:bg-amber-50 text-amber-700">Mark Pending</button>
                        <button onClick={() => updateStatus(v.id, 'Critical')} className="px-md py-sm text-left text-[13px] hover:bg-red-50 text-red-700">Escalate to Critical</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-lg py-xl text-center text-slate-300 font-body-md">
                    No violations match the current search/filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-gutter border-t border-outline-variant/20 flex justify-between items-center bg-slate-900/60est/30">
          <span className="text-[12px] text-slate-300">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} incidents
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

export default IntegrityViolations;
