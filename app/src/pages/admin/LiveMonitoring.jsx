import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import {
  getLiveSessions,
  getStudentLiveFeed,
  flagLiveSession,
  sendNotification,
  endLiveSession
} from '../../services/authService';

const STATUS_FILTERS = ['All', 'Normal', 'Warning', 'Suspicious'];

const LiveMonitoring = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFeedDetails, setSelectedFeedDetails] = useState(null);
  const [streamTab, setStreamTab] = useState('webcam'); // 'webcam' | 'screen' | 'biometric'

  const [heartbeat, setHeartbeat] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [toast, setToast] = useState('');
  const [liveStreamTick, setLiveStreamTick] = useState(Date.now());

  // Helper to calculate traffic-light status
  const getTrafficLight = (s) => {
    const isSuspicious =
      s.status === 'Suspicious' ||
      s.status === 'Flagged' ||
      (typeof s.aiConfidence === 'number' && s.aiConfidence < 50) ||
      s.phoneDetected ||
      s.multipleDetected ||
      s.audioStatus === 'SPEECH';

    const isWarning =
      !isSuspicious &&
      (s.status === 'Warning' ||
        (typeof s.aiConfidence === 'number' && s.aiConfidence < 80) ||
        s.violationCount > 0 ||
        s.headDirection === 'LEFT' ||
        s.headDirection === 'RIGHT' ||
        s.eyeStatus === 'CLOSED' ||
        s.audioStatus === 'WHISPER');

    if (isSuspicious) {
      return {
        key: 'Suspicious',
        color: 'red',
        label: 'Suspicious',
        badgeBg: 'bg-red-500/20 text-red-400 border-red-500/50',
        dotClass: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
        cardBorder: 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-950/10',
        icon: 'gpp_bad',
        defaultConfidence: s.aiConfidence || 35
      };
    }

    if (isWarning) {
      return {
        key: 'Warning',
        color: 'yellow',
        label: 'Warning',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        dotClass: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
        cardBorder: 'border-amber-500/40 bg-amber-950/10',
        icon: 'warning',
        defaultConfidence: s.aiConfidence || 68
      };
    }

    return {
      key: 'Normal',
      color: 'green',
      label: 'Normal',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      dotClass: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
      cardBorder: 'border-slate-800/80 hover:border-emerald-500/40 bg-slate-900/40',
      icon: 'verified_user',
      defaultConfidence: s.aiConfidence || 96
    };
  };

  const loadSessions = async () => {
    try {
      const res = await getLiveSessions();
      if (res.success && res.sessions) {
        setStudents(res.sessions.map((s) => ({
          id: s.id,
          name: s.name || `Student #${s.id}`,
          enrollmentNo: s.enrollmentNo || `20260${s.id}`,
          course: s.course || 'B.Tech',
          semester: s.semester || '8',
          exam: s.exam || 'Computer Fundamentals Finals',
          status: s.status || 'Normal',
          aiConfidence: typeof s.aiConfidence === 'number' ? s.aiConfidence : 95,
          faceStatus: s.faceStatus || 'STABLE',
          eyeStatus: s.eyeStatus || 'OPEN',
          headDirection: s.headDirection || 'CENTERED',
          phoneDetected: !!s.phoneDetected,
          multipleDetected: !!s.multipleDetected,
          audioStatus: s.audioStatus || 'QUIET',
          audioLevel: s.audioLevel || 0,
          profilePhoto: s.profilePhoto,
          violationCount: parseInt(s.violationCount, 10) || 0,
          lastPing: s.lastPing
        })));
        setLastSync(new Date());
      }
    } catch (e) {
      console.error('Failed to load live sessions:', e);
    }
  };

  // High-frequency polling for real-time live monitoring
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
      setHeartbeat((h) => !h);
      setLiveStreamTick(Date.now());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Poll selected student live stream feed when modal is active
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedFeedDetails(null);
      return;
    }

    const loadFeed = async () => {
      try {
        const res = await getStudentLiveFeed(selectedStudent.id);
        if (res.success && res.session) {
          setSelectedFeedDetails(res.session);
        }
      } catch (err) {
        console.error('Failed to load targeted live feed:', err);
      }
    };

    loadFeed();
    const feedInterval = setInterval(loadFeed, 1200);
    return () => clearInterval(feedInterval);
  }, [selectedStudent]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Traffic-light counters
  const totalCount = students.length;
  const normalCount = students.filter((s) => getTrafficLight(s).key === 'Normal').length;
  const warningCount = students.filter((s) => getTrafficLight(s).key === 'Warning').length;
  const suspiciousCount = students.filter((s) => getTrafficLight(s).key === 'Suspicious').length;

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const traffic = getTrafficLight(s);
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.exam.toLowerCase().includes(search.toLowerCase()) ||
        String(s.enrollmentNo).toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        traffic.key === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const handleSync = async () => {
    setIsSyncing(true);
    await loadSessions();
    setIsSyncing(false);
    setToast('Live telemetry synchronized.');
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      setToast('Enter a message before broadcasting.');
      return;
    }

    if (students.length === 0) {
      setToast('No active students to broadcast to.');
      return;
    }

    setToast('Broadcasting live announcement...');
    try {
      await Promise.all(students.map((s) => sendNotification(s.id, broadcastMsg)));
      setToast(`Broadcast sent to ${students.length} students.`);
      setBroadcastMsg('');
    } catch (e) {
      console.error(e);
      setToast('Failed to send broadcast.');
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-md mb-md">
        <div>
          <div className="flex items-center gap-xs mb-xs">
            <span className="text-xs uppercase tracking-widest font-bold text-primary bg-primary/10 px-sm py-[2px] rounded-full border border-primary/20">
              AI Invigilator Telemetry
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-white">
            Real-Time Live Monitoring Dashboard
          </h2>
          <p className="text-slate-400 font-body-md text-body-md">
            Live candidate grid with traffic-light status indicators and instant silent webcam & screen tap-in.
          </p>
        </div>

        <div className="flex items-center gap-sm bg-slate-900/80 px-md py-sm rounded-xl border border-slate-700/60 shadow-lg">
          <span className={`w-3 h-3 rounded-full bg-emerald-500 ${heartbeat ? 'opacity-100 scale-110' : 'opacity-40 scale-95'} transition-all`}></span>
          <span className="font-mono-sm text-mono-sm text-white font-bold tracking-wider">
            {totalCount} CANDIDATES ACTIVE
          </span>
        </div>
      </header>

      {/* Traffic Light Status Indicator Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {/* Total Active */}
        <div className="glass-card p-md rounded-2xl flex items-center justify-between border border-slate-800">
          <div>
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Total Online</span>
            <h3 className="text-3xl font-bold text-white mt-1">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <span className="material-symbols-outlined !text-[28px]">group</span>
          </div>
        </div>

        {/* 🟢 Green: Normal */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Normal' ? 'All' : 'Normal')}
          className={`glass-card p-md rounded-2xl flex items-center justify-between border transition-all text-left cursor-pointer ${
            statusFilter === 'Normal' ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              <span className="text-emerald-400 text-xs uppercase font-bold tracking-wider">🟢 Normal</span>
            </div>
            <h3 className="text-3xl font-bold text-emerald-400 mt-1">{normalCount}</h3>
            <span className="text-[11px] text-slate-400">AI Trust &gt; 80%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined !text-[28px]">check_circle</span>
          </div>
        </button>

        {/* 🟡 Yellow: Warning */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Warning' ? 'All' : 'Warning')}
          className={`glass-card p-md rounded-2xl flex items-center justify-between border transition-all text-left cursor-pointer ${
            statusFilter === 'Warning' ? 'border-amber-500 bg-amber-950/30' : 'border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
              <span className="text-amber-300 text-xs uppercase font-bold tracking-wider">🟡 Warning</span>
            </div>
            <h3 className="text-3xl font-bold text-amber-300 mt-1">{warningCount}</h3>
            <span className="text-[11px] text-slate-400">AI Trust 50-79%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined !text-[28px]">warning</span>
          </div>
        </button>

        {/* 🔴 Red: Suspicious */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Suspicious' ? 'All' : 'Suspicious')}
          className={`glass-card p-md rounded-2xl flex items-center justify-between border transition-all text-left cursor-pointer ${
            statusFilter === 'Suspicious' ? 'border-red-500 bg-red-950/40 animate-pulse' : 'border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping"></span>
              <span className="text-red-400 text-xs uppercase font-bold tracking-wider">🔴 Suspicious</span>
            </div>
            <h3 className="text-3xl font-bold text-red-400 mt-1">{suspiciousCount}</h3>
            <span className="text-[11px] text-slate-400">AI Trust &lt; 50% / Breach</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined !text-[28px]">gpp_bad</span>
          </div>
        </button>
      </div>

      {/* Broadcast Bar + Filter Controls */}
      <div className="glass-card rounded-2xl p-md md:p-lg mb-lg border border-slate-800 space-y-md">
        {/* Global Broadcast */}
        <div className="flex flex-col md:flex-row gap-sm items-stretch md:items-center">
          <div className="flex items-center gap-sm flex-1 bg-slate-900/80 px-md py-sm rounded-xl border border-slate-700/60">
            <span className="material-symbols-outlined text-primary !text-[22px]">campaign</span>
            <input
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
              placeholder="Send live announcement to all active examination screens..."
              className="w-full bg-transparent text-white placeholder-slate-500 outline-none text-sm font-body-md"
            />
          </div>
          <button
            type="button"
            onClick={handleBroadcast}
            className="px-lg py-sm rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-xs cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[18px]">send</span>
            Broadcast to All
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-sm items-center justify-between pt-sm border-t border-slate-800">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-slate-500 !text-[20px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, enrollment ID, or exam..."
              className="w-full pl-xl pr-md py-sm bg-slate-900/60 border border-slate-700/60 rounded-xl text-white text-sm outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-xs w-full md:w-auto overflow-x-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-md py-sm rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === s
                    ? s === 'Suspicious'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : s === 'Warning'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                      : s === 'Normal'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {s === 'All' ? 'All Candidates' : s === 'Normal' ? '🟢 Normal' : s === 'Warning' ? '🟡 Warning' : '🔴 Suspicious'}
              </button>
            ))}

            <button
              type="button"
              onClick={handleSync}
              title="Refresh Live Data"
              className="p-sm bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer ml-auto"
            >
              <span className={`material-symbols-outlined !text-[20px] ${isSyncing ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Student Cards with Traffic Light Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
        {filtered.map((student) => {
          const traffic = getTrafficLight(student);
          const confidence = student.aiConfidence || traffic.defaultConfidence;

          return (
            <div
              key={student.id}
              className={`glass-card rounded-2xl overflow-hidden flex flex-col border transition-all duration-300 ${traffic.cardBorder} group`}
            >
              {/* Snapshot / Live Feed Box */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={`http://localhost:5000/uploads/snapshots/student_${student.id}.jpg?t=${liveStreamTick}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  alt={`${student.name} feed`}
                />

                {/* Fallback portrait avatar if snapshot not captured yet */}
                <div
                  style={{ display: 'none' }}
                  className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-md text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl text-primary mb-xs">
                    {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="text-[11px]">Awaiting Camera Feed...</span>
                </div>

                {/* Top Overlay: Traffic-Light Status Badge */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span
                    className={`px-sm py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 backdrop-blur-md shadow-md ${traffic.badgeBg}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${traffic.dotClass} ${traffic.color === 'red' ? 'animate-ping' : ''}`}></span>
                    {traffic.label}
                  </span>
                </div>

                {/* Top Left: Live Telemetry Indicator */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <div className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/60 text-white text-[10px] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    LIVE
                  </div>
                </div>

                {/* Violation Counter Badge */}
                {student.violationCount > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 z-10 bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded-lg shadow-lg flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">warning</span>
                    {student.violationCount} Alerts
                  </div>
                )}

                {/* Tap-in Overlay on Hover */}
                <div
                  onClick={() => setSelectedStudent(student)}
                  className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-xs cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined !text-[24px]">visibility</span>
                  </div>
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    Tap into Live Stream
                  </span>
                </div>
              </div>

              {/* Card Body: Student Details & AI Trust Gauge */}
              <div className="p-md flex flex-col flex-1 justify-between gap-sm">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">
                      {student.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      ID: #{student.id}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate mb-sm">
                    {student.exam}
                  </p>

                  {/* AI Confidence Meter */}
                  <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">AI Trust Score</span>
                      <span
                        className={`font-mono font-bold ${
                          traffic.color === 'green'
                            ? 'text-emerald-400'
                            : traffic.color === 'yellow'
                            ? 'text-amber-400'
                            : 'text-red-400 font-black'
                        }`}
                      >
                        {confidence}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          traffic.color === 'green'
                            ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                            : traffic.color === 'yellow'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-600 to-red-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, confidence))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Face: {student.faceStatus}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Gaze: {student.headDirection}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                      student.audioStatus === 'SPEECH'
                        ? 'bg-red-950 text-red-300 animate-pulse border border-red-500/50'
                        : student.audioStatus === 'WHISPER'
                        ? 'bg-amber-950 text-amber-300 animate-pulse border border-amber-500/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      🎤 {student.audioStatus}
                    </span>
                    {student.phoneDetected && (
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold">
                        PHONE DETECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Trigger Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    traffic.color === 'red'
                      ? 'bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-600/30'
                      : traffic.color === 'yellow'
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[16px]">sensors</span>
                  {traffic.color === 'red' ? 'Inspect Suspicious Stream' : 'Live Stream Tap-In'}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-2xl glass-card rounded-2xl border border-slate-800">
            <span className="material-symbols-outlined text-slate-600 !text-[48px] mb-sm">
              screen_search_desktop
            </span>
            <p className="text-slate-300 font-semibold">No candidates match current status filter</p>
            <p className="text-xs text-slate-500 mt-1">Try switching to 'All Candidates' or clearing the search box.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SILENT LIVE STREAM TAP-IN MODAL (Webcam & Screen Share)                   */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-lg py-md border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-[24px]">sensors</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedStudent.name}</h3>
                    {(() => {
                      const t = getTrafficLight(selectedFeedDetails || selectedStudent);
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${t.badgeBg}`}>
                          {t.label} ({selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence}%)
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-400">
                    ID: #{selectedStudent.id} | {selectedStudent.enrollmentNo} | {selectedStudent.exam}
                  </p>
                </div>
              </div>

              {/* Feed Stream Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setStreamTab('webcam')}
                  className={`px-md py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    streamTab === 'webcam' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[16px]">videocam</span>
                  Webcam Stream
                </button>
                <button
                  type="button"
                  onClick={() => setStreamTab('screen')}
                  className={`px-md py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    streamTab === 'screen' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[16px]">screen_share</span>
                  Screen Share
                </button>
                <button
                  type="button"
                  onClick={() => setStreamTab('biometric')}
                  className={`px-md py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    streamTab === 'biometric' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[16px]">face_unlock</span>
                  Baseline Match
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[24px]">close</span>
              </button>
            </div>

            {/* Modal Stream Canvas Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              
              {/* Left 8 Cols: Video Player & Stream HUD */}
              <div className="lg:col-span-8 bg-slate-950 p-md flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-800">
                
                {/* Main Player Display */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
                  
                  {/* Tab 1: Webcam Feed */}
                  {streamTab === 'webcam' && (
                    <img
                      src={`http://localhost:5000/uploads/snapshots/student_${selectedStudent.id}.jpg?t=${liveStreamTick}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                      alt="Silent Webcam Tap-in"
                    />
                  )}

                  {/* Tab 2: Screen Share Feed */}
                  {streamTab === 'screen' && (
                    <img
                      src={`http://localhost:5000/uploads/snapshots/student_${selectedStudent.id}_screen.jpg?t=${liveStreamTick}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                      alt="Silent Screen Share Tap-in"
                    />
                  )}

                  {/* Tab 3: Baseline Identity vs Live Face */}
                  {streamTab === 'biometric' && (
                    <div className="grid grid-cols-2 w-full h-full gap-2 p-3 bg-slate-900">
                      <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-2 border border-slate-800">
                        <span className="text-[11px] text-emerald-400 font-bold uppercase mb-1">
                          Registered Baseline
                        </span>
                        <div className="w-full h-44 rounded-lg overflow-hidden border border-emerald-500/40">
                          {selectedStudent.profilePhoto ? (
                            <img
                              src={selectedStudent.profilePhoto}
                              alt="Baseline"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                              No Baseline Photo
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl p-2 border border-slate-800">
                        <span className="text-[11px] text-primary font-bold uppercase mb-1">
                          Live Webcam Feed
                        </span>
                        <div className="w-full h-44 rounded-lg overflow-hidden border border-primary/40">
                          <img
                            src={`http://localhost:5000/uploads/snapshots/student_${selectedStudent.id}.jpg?t=${liveStreamTick}`}
                            alt="Live feed"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback message */}
                  <div
                    style={{ display: 'none' }}
                    className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-md text-center"
                  >
                    <span className="material-symbols-outlined !text-[48px] mb-xs text-slate-600">
                      videocam_off
                    </span>
                    <p className="text-sm font-semibold">Live stream connecting...</p>
                    <p className="text-xs text-slate-500 mt-1">Awaiting client telemetry frame.</p>
                  </div>

                  {/* HUD Overlay: Stream Info */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-xs font-mono flex items-center gap-2 border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      REC | {streamTab === 'screen' ? 'SCREEN SHARE' : 'WEBCAM 1080p'}
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[11px] font-mono border border-white/10">
                      Telemetry: 30 FPS | Latency 14ms | TLS 1.3
                    </div>
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[11px] font-mono border border-white/10">
                      Audio: Active 44.1kHz
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Status Bar in Modal */}
                <div className="mt-md grid grid-cols-2 sm:grid-cols-4 gap-sm text-center">
                  <div className="bg-slate-900/80 p-sm rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Face Mesh</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {selectedFeedDetails?.faceStatus || selectedStudent.faceStatus || 'STABLE'}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-sm rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gaze Position</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {selectedFeedDetails?.headDirection || selectedStudent.headDirection || 'CENTERED'}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-sm rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Audio AI FFT</span>
                    <span className={`text-xs font-mono font-bold ${
                      (selectedFeedDetails?.audioStatus || selectedStudent.audioStatus) === 'SPEECH'
                        ? 'text-red-400 animate-pulse'
                        : (selectedFeedDetails?.audioStatus || selectedStudent.audioStatus) === 'WHISPER'
                        ? 'text-amber-400 animate-pulse'
                        : 'text-emerald-400'
                    }`}>
                      {(selectedFeedDetails?.audioStatus || selectedStudent.audioStatus) || 'QUIET'} ({(selectedFeedDetails?.audioLevel || selectedStudent.audioLevel) || 0} dB)
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-sm rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prohibited Items</span>
                    <span className={`text-xs font-mono font-bold ${
                      selectedFeedDetails?.phoneDetected || selectedStudent.phoneDetected ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {selectedFeedDetails?.phoneDetected || selectedStudent.phoneDetected ? 'PHONE DETECTED' : 'NONE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Telemetry, Incident Log & Proctor Controls */}
              <div className="lg:col-span-4 bg-slate-900/70 p-md flex flex-col justify-between overflow-y-auto max-h-[600px] custom-scrollbar space-y-md">
                
                {/* AI Integrity Gauge */}
                <div className="bg-slate-950/80 rounded-2xl p-md border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      AI Integrity Score
                    </span>
                    <span className={`font-mono font-bold text-sm ${
                      (selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence) >= 80
                        ? 'text-emerald-400'
                        : (selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence) >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        (selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence) >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                          : (selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence) >= 50
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-red-600 to-red-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, selectedFeedDetails?.aiConfidence || selectedStudent.aiConfidence))}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Recent Incident Log */}
                <div className="flex-1 space-y-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Live Incident Feed
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Total: {selectedStudent.violationCount}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedFeedDetails?.incidents && selectedFeedDetails.incidents.length > 0 ? (
                      selectedFeedDetails.incidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-2"
                        >
                          <span className="material-symbols-outlined !text-[16px] text-red-400 shrink-0 mt-0.5">
                            warning
                          </span>
                          <div className="flex-1">
                            <p className="font-bold text-white text-[11px]">{inc.type}</p>
                            <p className="text-slate-400 text-[10px]">{inc.message}</p>
                            <span className="text-[9px] font-mono text-slate-500">
                              {new Date(inc.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-sm text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                        No violations recorded for this candidate.
                      </div>
                    )}
                  </div>
                </div>

                {/* Proctor Action Controls */}
                <div className="pt-sm border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await flagLiveSession(selectedStudent.id);
                        setToast(`Flagged session for ${selectedStudent.name}. Status updated to Suspicious.`);
                        loadSessions();
                      }}
                      className="py-2.5 px-md bg-red-600/90 text-white rounded-xl font-bold text-xs hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[16px]">flag</span>
                      Flag Suspicious
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const msg = prompt(`Enter direct proctor warning for ${selectedStudent.name}:`);
                        if (msg) {
                          await sendNotification(selectedStudent.id, msg);
                          setToast(`Warning delivered to ${selectedStudent.name}.`);
                        }
                      }}
                      className="py-2.5 px-md bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-[16px]">chat</span>
                      Send Warning
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to force terminate the exam session for ${selectedStudent.name}?`)) {
                        await endLiveSession(selectedStudent.id);
                        setToast(`Session terminated for ${selectedStudent.name}.`);
                        setSelectedStudent(null);
                        loadSessions();
                      }
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Terminate Candidate Session
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-lg left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-lg py-sm rounded-xl shadow-2xl font-label-md text-label-md border border-primary/40 flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary !text-[18px]">info</span>
          {toast}
        </div>
      )}
    </AdminLayout>
  );
};

export default LiveMonitoring;
