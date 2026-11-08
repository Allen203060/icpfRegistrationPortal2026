import React, { useState, useMemo } from 'react';
import {
  Users,
  BedDouble,
  Home,
  Award,
  DollarSign,
  CreditCard,
  Banknote,
  AlertCircle,
  ArrowUpRight,
  X,
  Search,
  Activity,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Download,
  Sparkles
} from 'lucide-react';
import { getExportUrl } from '../../services/api';

export default function DashboardStats({ participants = [], campConfig = null }) {
  const [selectedTeamModal, setSelectedTeamModal] = useState(null);
  const [teamMemberSearch, setTeamMemberSearch] = useState('');
  const [chartViewMode, setChartViewMode] = useState('all'); // 'all' | 'males' | 'females'

  // Core metrics calculation
  const total = participants.length;
  const males = participants.filter((p) => p.gender === 'Male').length;
  const females = participants.filter((p) => p.gender === 'Female').length;
  const staying = participants.filter((p) => p.staying !== false).length;
  const dayScholars = total - staying;

  const isFirstTimerCamper = (p) =>
    p.isFirstTimer === true ||
    /first\s*timer?:\s*yes/i.test(p.notes || '') ||
    /first\s*time/i.test(p.notes || '');

  const firstTimers = participants.filter(isFirstTimerCamper).length;
  const returningCampers = Math.max(0, total - firstTimers);
  const firstTimerPercent = total > 0 ? Math.round((firstTimers / total) * 100) : 0;
  const returningPercent = total > 0 ? 100 - firstTimerPercent : 0;

  const malePercent = total > 0 ? Math.round((males / total) * 100) : 50;
  const femalePercent = total > 0 ? 100 - malePercent : 50;

  // Age metrics
  const validAges = participants
    .map((p) => Number(p.age))
    .filter((a) => Number.isFinite(a) && a > 0);
  const overallMeanAge =
    validAges.length > 0
      ? (validAges.reduce((sum, a) => sum + a, 0) / validAges.length).toFixed(1)
      : '0';

  // Age brackets
  const ageBrackets = useMemo(() => {
    const brackets = {
      'Teens (13-17)': 0,
      'Youth (18-21)': 0,
      'Seniors (22-25)': 0,
      'Leaders (26+)': 0,
    };
    validAges.forEach((age) => {
      if (age <= 17) brackets['Teens (13-17)']++;
      else if (age <= 21) brackets['Youth (18-21)']++;
      else if (age <= 25) brackets['Seniors (22-25)']++;
      else brackets['Leaders (26+)']++;
    });
    return Object.entries(brackets).map(([label, count]) => ({
      label,
      count,
      percent: validAges.length > 0 ? Math.round((count / validAges.length) * 100) : 0,
    }));
  }, [validAges]);

  // Financial statistics
  const totalAmountPaid = participants.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const totalFeesExpected = participants.reduce((sum, p) => sum + Number(p.feeTotal || 0), 0);
  const totalBalanceDue = participants.reduce((sum, p) => sum + Number(p.balanceDue || 0), 0);
  const totalBalanceToReturn = participants.reduce((sum, p) => sum + Number(p.balanceToReturn || 0), 0);

  const cashCollected = participants
    .filter((p) => p.paymentStatus === 'Paid Cash')
    .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

  const onlineCollected = participants
    .filter((p) => p.paymentStatus === 'Paid Online')
    .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

  const paidCount = participants.filter(
    (p) => p.paymentStatus === 'Paid Online' || p.paymentStatus === 'Paid Cash'
  ).length;
  const waitingCount = participants.filter(
    (p) => p.paymentStatus === 'Waiting Payment' || !p.paymentStatus
  ).length;
  const duesCount = participants.filter(
    (p) => p.paymentStatus === 'Partial / Balance Due' || Number(p.balanceDue) > 0
  ).length;

  const collectionRate = totalFeesExpected > 0 ? Math.round((totalAmountPaid / totalFeesExpected) * 100) : 0;

  // Team aggregation
  const teamsData = useMemo(() => {
    return (campConfig?.teams || []).map((team) => {
      const teamMembers = participants.filter(
        (p) => p.assignedTeam?.toLowerCase() === team.name?.toLowerCase()
      );
      const teamMales = teamMembers.filter((p) => p.gender === 'Male').length;
      const teamFemales = teamMembers.filter((p) => p.gender === 'Female').length;
      const teamAges = teamMembers
        .map((p) => Number(p.age))
        .filter((a) => Number.isFinite(a) && a > 0);
      const meanAge =
        teamAges.length > 0
          ? (teamAges.reduce((sum, a) => sum + a, 0) / teamAges.length).toFixed(1)
          : '—';
      const teamPaid = teamMembers.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

      return {
        name: team.name,
        color: team.themeColor || '#4A5C6A',
        count: teamMembers.length,
        males: teamMales,
        females: teamFemales,
        meanAge,
        teamPaid,
        members: teamMembers,
      };
    });
  }, [campConfig, participants]);

  // Room aggregation & Occupancy
  const roomsData = useMemo(() => {
    return (campConfig?.rooms || []).map((room) => {
      const occupants = participants.filter(
        (p) => p.assignedRoom?.toLowerCase() === room.name?.toLowerCase()
      );
      const occupancy = occupants.length;
      const capacity = Number(room.capacity) || 1;
      const percent = Math.min(100, Math.round((occupancy / capacity) * 100));
      const vacancies = Math.max(0, capacity - occupancy);

      return {
        name: room.name,
        gender: room.gender,
        capacity,
        occupancy,
        percent,
        vacancies,
        isFull: occupancy >= capacity,
        leaderName: room.leaderName || 'Unassigned',
      };
    });
  }, [campConfig, participants]);

  // Sending Church Dispersion (Top 5)
  const topChurches = useMemo(() => {
    const counts = {};
    participants.forEach((p) => {
      const ch = p.church?.trim() || 'General / Unspecified';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([church, count]) => ({
        church,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [participants, total]);

  // Hourly / Batch Intake Velocity (for Interactive SVG Area Graph)
  const intakeWave = useMemo(() => {
    if (participants.length === 0) return [];
    // Sort chronologically
    const sorted = [...participants].sort(
      (a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
    );

    // Group into 6 time slices or cumulative points
    const step = Math.max(1, Math.floor(sorted.length / 6));
    const points = [];
    for (let i = 0; i < sorted.length; i += step) {
      const p = sorted[i];
      const timeStr = p.checkedInAt
        ? new Date(p.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `Shift ${points.length + 1}`;
      points.push({ time: timeStr, count: i + 1 });
    }
    // Always include current total
    points.push({
      time: 'Now',
      count: sorted.length,
    });
    return points;
  }, [participants]);

  // Active Team Modal Data
  const activeModalTeam = teamsData.find((t) => t.name === selectedTeamModal);
  const modalMembers = (activeModalTeam?.members || []).filter((m) => {
    if (!teamMemberSearch) return true;
    const q = teamMemberSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.church?.toLowerCase().includes(q) ||
      m.assignedRoom?.toLowerCase().includes(q) ||
      String(m.serialNo).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Executive Telemetry Bar */}
      <div className="bg-white/85 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slateSteel/15 text-slateSteel dark:text-slateFrost flex items-center justify-center border border-slateSteel/20 shadow-subtle">
              <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slateVoid dark:text-slateFrost tracking-tight">
                  Camp Intelligence & Real-Time Analytics
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slateSteel dark:text-slateMuted mt-0.5">
                Dynamic 4-tier parity distribution, room quotas, and financial stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={getExportUrl('stats-pdf')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slateSteel/10 hover:bg-slateSteel/20 dark:bg-slateElevated dark:hover:bg-slateElevated/80 text-slateVoid dark:text-slateFrost border border-slateMuted/30 text-xs font-semibold shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              title="Download executive PDF analytics report"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export Stats (PDF)</span>
            </a>
            <span className="px-3 py-1.5 rounded-xl bg-slateElevated/10 dark:bg-slateElevated text-slateSteel dark:text-slateFrost border border-slateMuted/20 font-mono text-xs font-semibold">
              {campConfig?.campTitle || 'ICPF 2026'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top High-Contrast KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Attendance */}
        <div className="bg-white dark:bg-slateMidnight rounded-2xl p-4 sm:p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex items-center gap-3.5 sm:gap-4 transition-all">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slateSteel/10 dark:bg-slateElevated text-slateSteel dark:text-slateFrost flex items-center justify-center shrink-0 border border-slateSteel/20">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block truncate">
              Total Checked-In
            </span>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-slateVoid dark:text-slateFrost tracking-tight font-mono">
                {total}
              </span>
              <span className="text-[11px] font-mono text-slateSteel dark:text-slateMuted">
                Avg {overallMeanAge}y
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: First-Time Campers */}
        <div className="bg-white dark:bg-slateMidnight rounded-2xl p-4 sm:p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex items-center gap-3.5 sm:gap-4 transition-all">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block truncate">
              First-Time Campers
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slateVoid dark:text-slateFrost tracking-tight font-mono">
                {firstTimers}
              </span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {firstTimerPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Gender Parity Spectrum */}
        <div className="bg-white dark:bg-slateMidnight rounded-2xl p-4 sm:p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted">
              Gender Parity
            </span>
            <span className="text-[11px] font-mono font-bold text-slateVoid dark:text-slateFrost">
              {males}M : {females}F
            </span>
          </div>
          <div className="mt-2.5">
            <div className="w-full h-2 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden flex">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${malePercent}%` }}
                title={`Boys: ${malePercent}%`}
              />
              <div
                className="h-full bg-rose-400 transition-all duration-300"
                style={{ width: `${femalePercent}%` }}
                title={`Girls: ${femalePercent}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slateSteel dark:text-slateMuted mt-1">
              <span>{malePercent}% Boys</span>
              <span>{femalePercent}% Girls</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Residential Lodging */}
        <div className="bg-white dark:bg-slateMidnight rounded-2xl p-4 sm:p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex items-center gap-3.5 sm:gap-4 transition-all">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <BedDouble className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block truncate">
              Residential Beds
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slateVoid dark:text-slateFrost tracking-tight font-mono">
                {staying}
              </span>
              <span className="text-[11px] text-slateSteel dark:text-slateMuted">
                in dorms
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Financial Realization */}
        <div className="bg-white dark:bg-slateMidnight rounded-2xl p-4 sm:p-5 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex items-center gap-3.5 sm:gap-4 transition-all col-span-2 sm:col-span-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slateSteel/10 dark:bg-slateElevated text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-slateSteel/20">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block truncate">
              Fee Collection
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {collectionRate}%
              </span>
              <span className="text-[11px] text-slateSteel dark:text-slateMuted">
                realized
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Registration Waveform & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Registration Velocity Waveform (Custom Interactive SVG Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
            <div>
              <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slateSteel dark:text-slateMuted" />
                Registration Intake Velocity
              </h3>
              <p className="text-xs text-slateSteel dark:text-slateMuted">
                Cumulative attendee registration momentum across check-in shifts
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slateElevated/20 dark:bg-slateElevated text-slateVoid dark:text-slateFrost border border-slateMuted/20">
              {participants.length} Active Nodes
            </span>
          </div>

          {/* SVG Smooth Area Chart */}
          <div className="relative w-full h-44 sm:h-48 pt-2">
            {intakeWave.length >= 2 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A5C6A" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#4A5C6A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Grid Lines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="currentColor" className="text-slateMuted/20 dark:text-slateElevated" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="currentColor" className="text-slateMuted/20 dark:text-slateElevated" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-slateMuted/20 dark:text-slateElevated" strokeDasharray="3 3" />

                {/* Area Gradient Fill */}
                <path
                  d={`
                    M 0 140
                    ${intakeWave
                      .map((pt, i) => {
                        const x = (i / (intakeWave.length - 1)) * 500;
                        const maxVal = Math.max(1, intakeWave[intakeWave.length - 1].count);
                        const y = 140 - (pt.count / maxVal) * 110;
                        return `L ${x} ${y}`;
                      })
                      .join(' ')}
                    L 500 140 Z
                  `}
                  fill="url(#velocityGrad)"
                />

                {/* Main Stroke Line */}
                <path
                  d={`
                    M 0 140
                    ${intakeWave
                      .map((pt, i) => {
                        const x = (i / (intakeWave.length - 1)) * 500;
                        const maxVal = Math.max(1, intakeWave[intakeWave.length - 1].count);
                        const y = 140 - (pt.count / maxVal) * 110;
                        return `L ${x} ${y}`;
                      })
                      .join(' ')}
                  `}
                  fill="none"
                  stroke="#4A5C6A"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Node Points */}
                {intakeWave.map((pt, i) => {
                  const x = (i / (intakeWave.length - 1)) * 500;
                  const maxVal = Math.max(1, intakeWave[intakeWave.length - 1].count);
                  const y = 140 - (pt.count / maxVal) * 110;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#CCD0CF" stroke="#11212D" strokeWidth="2" />
                      <text
                        x={x}
                        y="155"
                        textAnchor="middle"
                        fontSize="9"
                        fill="currentColor"
                        className="text-slateSteel dark:text-slateMuted font-mono"
                      >
                        {pt.time}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slateMuted">
                Awaiting more registration timestamps for velocity graph.
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slateMuted/15 dark:border-slateElevated flex items-center justify-between text-[11px] text-slateSteel dark:text-slateMuted">
            <span>Peak Intake Rate: <strong>{total} registrations</strong></span>
            <span>Update frequency: <strong>Real-time socket</strong></span>
          </div>
        </div>

        {/* Right: Comprehensive Financial Stream & Dues Realization */}
        <div className="lg:col-span-5 bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slateMuted/20 dark:border-slateElevated mb-4">
              <div>
                <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Fee Ledger & Cash Stream
                </h3>
                <p className="text-xs text-slateSteel dark:text-slateMuted">
                  Live accounting of UPI online vs cash and dues
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totalAmountPaid.toLocaleString()}
              </span>
            </div>

            {/* Segmented Payment Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slateSteel dark:text-slateMuted">Collection Target</span>
                <span className="font-bold text-slateVoid dark:text-slateFrost">
                  ₹{totalAmountPaid.toLocaleString()} / ₹{totalFeesExpected.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (onlineCollected / (totalFeesExpected || 1)) * 100)}%` }}
                  title={`UPI Online: ₹${onlineCollected}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (cashCollected / (totalFeesExpected || 1)) * 100)}%` }}
                  title={`Cash: ₹${cashCollected}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slateSteel dark:text-slateMuted font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> UPI Online ({Math.round((onlineCollected / (totalAmountPaid || 1)) * 100)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Cash ({Math.round((cashCollected / (totalAmountPaid || 1)) * 100)}%)
                </span>
              </div>
            </div>

            {/* Financial 2x2 Metric Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slateElevated/10 dark:bg-slateElevated/40 border border-slateMuted/20 dark:border-slateElevated">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block">
                  Online UPI Paid
                </span>
                <span className="text-base font-black text-slateVoid dark:text-slateFrost font-mono">
                  ₹{onlineCollected.toLocaleString()}
                </span>
                <span className="text-[10px] text-slateSteel dark:text-slateMuted block mt-0.5">
                  {participants.filter((p) => p.paymentStatus === 'Paid Online').length} online transactions
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slateElevated/10 dark:bg-slateElevated/40 border border-slateMuted/20 dark:border-slateElevated">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block">
                  Counter Cash
                </span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                  ₹{cashCollected.toLocaleString()}
                </span>
                <span className="text-[10px] text-slateSteel dark:text-slateMuted block mt-0.5">
                  {participants.filter((p) => p.paymentStatus === 'Paid Cash').length} physical cash receipts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slateElevated/10 dark:bg-slateElevated/40 border border-slateMuted/20 dark:border-slateElevated">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block">
                  Pending Dues
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                  ₹{totalBalanceDue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slateSteel dark:text-slateMuted block mt-0.5">
                  {duesCount} campers with balance
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slateElevated/10 dark:bg-slateElevated/40 border border-slateMuted/20 dark:border-slateElevated">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block">
                  Change to Return
                </span>
                <span className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">
                  ₹{totalBalanceToReturn.toLocaleString()}
                </span>
                <span className="text-[10px] text-slateSteel dark:text-slateMuted block mt-0.5">
                  cash change pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 2026 Team Distribution Grid with Visual Balance Bars */}
      <div className="bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
          <div>
            <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
              <Award className="w-4 h-4 text-slateSteel dark:text-slateMuted" />
              2026 Team Allocation & Parity Balancing
            </h3>
            <p className="text-xs text-slateSteel dark:text-slateMuted">
              Evaluating 4-tier parity: group size parity, gender balance, age dispersion, and church dispersion
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slateElevated/20 dark:bg-slateElevated text-slateVoid dark:text-slateFrost border border-slateMuted/20 self-start sm:self-auto">
            {teamsData.length} Allocated Teams
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamsData.map((t) => {
            const teamTotal = t.count;
            const tMalePct = teamTotal > 0 ? Math.round((t.males / teamTotal) * 100) : 50;
            return (
              <div
                key={t.name}
                onClick={() => {
                  setSelectedTeamModal(t.name);
                  setTeamMemberSearch('');
                }}
                className="btn-press rounded-xl p-4 border border-slateMuted/30 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/30 flex flex-col justify-between transition-all duration-150 hover:border-slateSteel cursor-pointer group shadow-subtle"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-xs font-bold text-slateVoid dark:text-slateFrost truncate group-hover:text-sky-500 transition-colors">
                        {t.name}
                      </span>
                    </div>
                    <span className="text-base font-black text-slateVoid dark:text-slateFrost font-mono">
                      {t.count}
                    </span>
                  </div>

                  {/* Mean Age Badge */}
                  <div className="flex items-center justify-between text-[11px] text-slateSteel dark:text-slateMuted mb-2">
                    <span>Mean Age</span>
                    <span className="font-mono font-bold text-slateVoid dark:text-slateFrost">
                      {t.meanAge} yrs
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slateMuted/20 dark:border-slateElevated/50">
                  <div className="flex justify-between text-[10px] text-slateSteel dark:text-slateMuted font-mono mb-1">
                    <span>{t.males} Boys</span>
                    <span>{t.females} Girls</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden flex mb-2.5">
                    <div className="h-full bg-sky-500" style={{ width: `${tMalePct}%` }} />
                    <div className="h-full bg-rose-400" style={{ width: `${100 - tMalePct}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-medium text-slateSteel dark:text-slateMuted">
                    <span className="font-mono font-semibold">₹{t.teamPaid.toLocaleString()}</span>
                    <span className="text-sky-600 dark:text-sky-400 flex items-center gap-0.5 font-bold group-hover:underline">
                      Roster <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Room Occupancy & Gender Quota Visualizer */}
      <div className="bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
          <div>
            <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-slateSteel dark:text-slateMuted" />
              Room Occupancy & Physical Quota Matrix
            </h3>
            <p className="text-xs text-slateSteel dark:text-slateMuted">
              Guaranteed strict gender segregation: Male rooms vs Female rooms with hard bed ceiling
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slateElevated/20 dark:bg-slateElevated text-slateVoid dark:text-slateFrost border border-slateMuted/20 self-start sm:self-auto">
            {roomsData.length} Dorms Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {roomsData.map((room) => {
            const isMale = room.gender === 'Male';
            return (
              <div
                key={room.name}
                className="p-4 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isMale ? 'bg-sky-500' : 'bg-rose-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slateVoid dark:text-slateFrost">
                        {room.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isMale
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {room.gender}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs font-mono mb-1.5">
                    <span className="text-slateSteel dark:text-slateMuted">Occupancy</span>
                    <span className="font-bold text-slateVoid dark:text-slateFrost">
                      {room.occupancy} / {room.capacity} beds
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        room.isFull ? 'bg-amber-500' : isMale ? 'bg-sky-500' : 'bg-rose-400'
                      }`}
                      style={{ width: `${room.percent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slateMuted/15 dark:border-slateElevated/50 flex items-center justify-between text-[10px] text-slateSteel dark:text-slateMuted">
                  <span>
                    Vacancies: <strong className="font-mono">{room.vacancies}</strong>
                  </span>
                  <span>
                    Leader: <strong>{room.leaderName}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Demographics & Church Dispersion Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Age Group Demographics */}
        <div className="lg:col-span-6 bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark">
          <div className="flex items-center justify-between pb-3 border-b border-slateMuted/20 dark:border-slateElevated mb-4">
            <div>
              <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slateSteel dark:text-slateMuted" />
                Age Bracket Demographics
              </h3>
              <p className="text-xs text-slateSteel dark:text-slateMuted">
                Evaluating attendee maturity distribution across camp
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slateVoid dark:text-slateFrost">
              Avg {overallMeanAge} yrs
            </span>
          </div>

          <div className="mb-4 pb-4 border-b border-slateMuted/20 dark:border-slateElevated/60">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Camper Experience Ratio
              </span>
              <span className="font-mono text-slateSteel dark:text-slateMuted">
                {firstTimers} New : {returningCampers} Returning
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${firstTimerPercent}%` }}
                title={`First Timers: ${firstTimerPercent}%`}
              />
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${returningPercent}%` }}
                title={`Returning Campers: ${returningPercent}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slateSteel dark:text-slateMuted mt-1">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{firstTimerPercent}% First-Timers</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{returningPercent}% Returning</span>
            </div>
          </div>

          <div className="space-y-3">
            {ageBrackets.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slateVoid dark:text-slateFrost">{item.label}</span>
                  <span className="font-mono text-slateSteel dark:text-slateMuted">
                    {item.count} campers ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden">
                  <div
                    className="h-full bg-slateSteel dark:bg-slateMuted transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sending Church Dispersion (Tier 4 Heuristic Monitor) */}
        <div className="lg:col-span-6 bg-white dark:bg-slateMidnight rounded-2xl p-5 sm:p-6 border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark">
          <div className="flex items-center justify-between pb-3 border-b border-slateMuted/20 dark:border-slateElevated mb-4">
            <div>
              <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slateSteel dark:text-slateMuted" />
                Top Home Churches & Locality
              </h3>
              <p className="text-xs text-slateSteel dark:text-slateMuted">
                Dispersing attendees from the same congregation across teams
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slateVoid dark:text-slateFrost">
              Top 5 Hubs
            </span>
          </div>

          <div className="space-y-3">
            {topChurches.map((item, idx) => (
              <div key={item.church} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slateVoid dark:text-slateFrost truncate max-w-[240px]">
                    {idx + 1}. {item.church}
                  </span>
                  <span className="font-mono text-slateSteel dark:text-slateMuted">
                    {item.count} ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slateElevated/20 dark:bg-slateElevated overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80 transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Team Roster Detail Modal */}
      {selectedTeamModal && activeModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slateVoid/80 backdrop-blur-sm modal-backdrop-enter">
          <div className="bg-white dark:bg-slateMidnight rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slateMuted/30 dark:border-slateElevated overflow-hidden modal-dialog-enter">
            {/* Modal Header */}
            <div
              className="p-4 sm:p-5 flex items-center justify-between border-b border-black/10 dark:border-white/10"
              style={{ backgroundColor: `${activeModalTeam.color}30` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: activeModalTeam.color }}
                />
                <div>
                  <h3 className="text-base font-bold text-slateVoid dark:text-slateFrost flex items-center gap-2">
                    {activeModalTeam.name}
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                      {activeModalTeam.count} Members
                    </span>
                  </h3>
                  <p className="text-xs text-slateSteel dark:text-slateMuted">
                    Mean Age: <strong>{activeModalTeam.meanAge} yrs</strong> • {activeModalTeam.males} Males,{' '}
                    {activeModalTeam.females} Females
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeamModal(null)}
                className="btn-press p-2 rounded-xl text-slateSteel hover:text-slateVoid dark:text-slateMuted dark:hover:text-slateFrost hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search inside Modal */}
            <div className="p-3 sm:p-4 border-b border-slateMuted/20 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/20">
              <div className="relative">
                <Search className="w-4 h-4 text-slateSteel dark:text-slateMuted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={teamMemberSearch}
                  onChange={(e) => setTeamMemberSearch(e.target.value)}
                  placeholder={`Search ${activeModalTeam.name} members by name, room, or church...`}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slateMuted/40 dark:border-slateElevated bg-white dark:bg-slateMidnight text-xs text-slateVoid dark:text-slateFrost focus:outline-none focus:ring-2 focus:ring-slateSteel"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="overflow-y-auto p-4 divide-y divide-slateMuted/15 dark:divide-slateElevated/50 flex-1">
              {modalMembers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slateSteel dark:text-slateMuted">
                  {teamMemberSearch ? 'No matching members found.' : 'No members in this team yet.'}
                </div>
              ) : (
                modalMembers.map((member) => (
                  <div
                    key={member._id || member.serialNo}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slateVoid dark:text-slateFrost">{member.name}</span>
                        <span className="text-[10px] font-mono text-slateSteel dark:text-slateMuted">
                          #{member.serialNo}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            member.gender === 'Male'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {member.gender}, {member.age}y
                        </span>
                      </div>
                      <div className="text-[11px] text-slateSteel dark:text-slateMuted flex items-center gap-2 mt-0.5">
                        <span>
                          {member.church || 'General'} ({member.location || 'Local'})
                        </span>
                        {member.phone && <span>• {member.phone}</span>}
                        {member.notes && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            • Note: {member.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                      <div className="font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted" />
                        <span>{member.assignedRoom || 'Day Scholar'}</span>
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                          member.paymentStatus === 'Paid Online' || member.paymentStatus === 'Paid Cash'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : member.paymentStatus === 'Partial / Balance Due'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {member.paymentStatus || 'Waiting Payment'}
                        {member.amountPaid ? ` (₹${member.amountPaid})` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slateMuted/20 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/20 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeamModal(null)}
                className="btn-press px-4 py-1.5 rounded-xl bg-slateElevated/20 dark:bg-slateElevated text-xs font-semibold text-slateVoid dark:text-slateFrost hover:bg-slateElevated/30 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
