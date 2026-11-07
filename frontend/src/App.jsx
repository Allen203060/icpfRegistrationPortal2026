import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import {
  UserPlus,
  Search,
  BarChart3,
  Sun,
  Moon,
  RefreshCw,
  BedDouble,
  Sparkles,
  Layers
} from 'lucide-react';
import ThreeBackground from './components/common/ThreeBackground';
import CheckinForm from './components/checkin/CheckinForm';
import AttendeeLookup from './components/lookup/AttendeeLookup';
import DashboardStats from './components/dashboard/DashboardStats';
import OverrideModal from './components/admin/OverrideModal';
import {
  getActiveCampConfig,
  getParticipants,
  updateParticipant,
  deleteParticipant,
} from './services/api';

// Initial seed participants for immediate offline visual proofing
const INITIAL_DEMO_PARTICIPANTS = [
  {
    _id: 'seed_101',
    serialNo: 101,
    name: 'Samuel George',
    age: 19,
    gender: 'Male',
    church: 'ICPF Trivandrum',
    location: 'Kerala',
    staying: true,
    phone: '+91 98470 11111',
    assignedTeam: 'Team Joshua',
    assignedRoom: 'Male Room 1',
    paymentStatus: 'Paid Online',
    amountPaid: 500,
    feeTotal: 500,
    balanceDue: 0,
    checkedInAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'seed_102',
    serialNo: 102,
    name: 'Sarah Elizabeth Thomas',
    age: 21,
    gender: 'Female',
    church: 'IPC Ebenezer',
    location: 'Kottayam',
    staying: true,
    phone: '+91 98470 22222',
    assignedTeam: 'Team Deborah',
    assignedRoom: 'Female Room 1',
    paymentStatus: 'Paid Cash',
    amountPaid: 500,
    feeTotal: 500,
    balanceDue: 0,
    checkedInAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    _id: 'seed_103',
    serialNo: 103,
    name: 'Joshua K. Mathew',
    age: 18,
    gender: 'Male',
    church: 'Sharon Fellowship',
    location: 'Ernakulam',
    staying: true,
    phone: '+91 98470 33333',
    assignedTeam: 'Team Gideon',
    assignedRoom: 'Male Room 2',
    paymentStatus: 'Waiting Payment',
    amountPaid: 0,
    feeTotal: 500,
    balanceDue: 500,
    checkedInAt: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    _id: 'seed_104',
    serialNo: 104,
    name: 'Rebecca Miriam Varghese',
    age: 20,
    gender: 'Female',
    church: 'Assemblies of God',
    location: 'Pathanamthitta',
    staying: false,
    phone: '+91 98470 44444',
    assignedTeam: 'Team Esther',
    assignedRoom: 'Day Scholar',
    paymentStatus: 'Paid Online',
    amountPaid: 400,
    feeTotal: 400,
    balanceDue: 0,
    checkedInAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('desk'); // 'desk' | 'lookup' | 'dashboard'
  const [campConfig, setCampConfig] = useState(null);
  const [participants, setParticipants] = useState(INITIAL_DEMO_PARTICIPANTS);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dark Mode State (default to dark mode with palette #06141B)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('icpf_theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark mode
  });

  const toggleTheme = (isDark) => {
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('icpf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('icpf_theme', 'light');
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    loadConfig();
    fetchLiveParticipants(false);

    // Auto-update polling: automatically syncs every 3 seconds so desk operators never need to click refresh
    const pollInterval = setInterval(() => {
      fetchLiveParticipants(true);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getActiveCampConfig();
      setCampConfig(config);
    } catch (err) {
      console.error('Config fetch failed:', err);
    }
  };

  const fetchLiveParticipants = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getParticipants({ limit: 2500 });
      if (res.data && Array.isArray(res.data)) {
        setParticipants(res.data);
      }
    } catch (err) {
      // Retain existing state if offline
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleRegistered = (newCamperOrCampers) => {
    if (Array.isArray(newCamperOrCampers)) {
      setParticipants((prev) => [...newCamperOrCampers, ...prev]);
    } else {
      setParticipants((prev) => [newCamperOrCampers, ...prev]);
    }
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    // Smooth reset scroll position so the new page view enters cleanly from the top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleOpenOverride = (camper) => {
    setOverrideTarget(camper);
    setIsOverrideOpen(true);
  };

  const handleSaveOverride = async (updatedCamper) => {
    try {
      let finalCamper = updatedCamper;
      if (updatedCamper._id && !String(updatedCamper._id).startsWith('seed_')) {
        const res = await updateParticipant(updatedCamper._id, updatedCamper);
        if (res) finalCamper = res;
      }
      setParticipants((prev) =>
        prev.map((p) =>
          (p._id || p.serialNo) === (finalCamper._id || finalCamper.serialNo)
            ? finalCamper
            : p
        )
      );
      if (!updatedCamper.assignedTeam && finalCamper.assignedTeam) {
        toast.success(`Payment confirmed! ${finalCamper.name} allocated to ${finalCamper.assignedTeam}! 🎉`, {
          description: `Room: ${finalCamper.staying ? (finalCamper.assignedRoom || 'Assigned') : 'Day Scholar'}`,
        });
      } else {
        toast.success(`Updated details for ${finalCamper.name}`, {
          description: finalCamper.assignedTeam ? `Team: ${finalCamper.assignedTeam} • Room: ${
            finalCamper.assignedRoom || 'Day Scholar'
          }` : 'Allocation pending payment confirmation',
        });
      }
    } catch (err) {
      toast.error(`Failed to update participant: ${err.message}`);
    }
  };

  const handleDeleteParticipant = async (id) => {
    try {
      if (typeof id === 'string' && !id.startsWith('seed_')) {
        await deleteParticipant(id);
      }
      setParticipants((prev) => prev.filter((p) => p._id !== id && p.serialNo !== id));
      toast.success('Attendee record deleted');
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const getTeamColor = (teamName) => {
    return (
      campConfig?.teams?.find(
        (t) => t.name?.toLowerCase() === teamName?.toLowerCase()
      )?.themeColor || '#4A5C6A'
    );
  };

  const getContrastTextColor = (hexColor) => {
    if (!hexColor) return '#FFFFFF';
    const hex = hexColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 135 ? '#06141B' : '#FFFFFF';
    }
    return '#FFFFFF';
  };

  return (
    <div className="relative min-h-dvh flex flex-col bg-slateFrost dark:bg-slateVoid text-slateVoid dark:text-slateFrost font-sans selection:bg-slateSteel/30 transition-colors duration-200">
      {/* Three.js Interactive 3D Background */}
      <ThreeBackground darkMode={darkMode} />

      {/* Toast Notifications (Sonner with theme synchronization) */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme={darkMode ? 'dark' : 'light'}
      />

      {/* Main Content Wrapper (Z-index above Three.js background) */}
      <div className="relative z-10 flex flex-col flex-1 pb-20 md:pb-0">
        {/* Top Header Navigation */}
        <header className="bg-white dark:bg-slateMidnight border-b border-slateMuted/30 dark:border-slateElevated sticky top-0 z-40 transition-colors shadow-subtle">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Identity */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-slateElevated text-slateFrost flex items-center justify-center font-black text-sm shadow-subtle border border-slateSteel/30">
                IC
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold tracking-tight text-slateVoid dark:text-slateFrost leading-none">
                  {campConfig?.campTitle || 'ICPF Camp 2026'}
                </h1>
                <span className="hidden sm:block text-[11px] font-medium text-slateSteel dark:text-slateMuted">
                  Registration & 4-Tier Allocator
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Desktop only — the fixed bottom nav below
                covers the same three tabs on phones, so the top bar fits) */}
            <div className="hidden md:flex items-center p-1 bg-slateElevated/15 dark:bg-slateElevated/50 rounded-xl border border-slateMuted/30 dark:border-slateElevated shadow-subtle">
              <button
                type="button"
                onClick={() => handleTabChange('desk')}
                className={`btn-press flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'desk'
                    ? 'bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost shadow-subtle border border-slateMuted/20 dark:border-slateElevated'
                    : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span><span className="hidden sm:inline">Check-in </span>Desk</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('lookup')}
                className={`btn-press flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'lookup'
                    ? 'bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost shadow-subtle border border-slateMuted/20 dark:border-slateElevated'
                    : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span><span className="hidden sm:inline">Attendee </span>Lookup</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('dashboard')}
                className={`btn-press flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost shadow-subtle border border-slateMuted/20 dark:border-slateElevated'
                    : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span><span className="hidden sm:inline">Live </span>Stats</span>
              </button>
            </div>

            {/* Right Controls: Auto-Sync Badge, Refresh & Day/Night Switcher */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Auto-sync active (every 3s)" />
                <span className="hidden sm:inline text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Live Sync</span>
                <button
                  type="button"
                  onClick={() => {
                    fetchLiveParticipants(false);
                    toast.success('Synced live attendee data');
                  }}
                  className="btn-press p-1 rounded-lg hover:bg-slateElevated/20 dark:hover:bg-slateElevated text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost transition-colors cursor-pointer"
                  title="Click to force immediate sync"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Day / Night Segmented Switcher */}
              <div className="flex p-0.5 bg-slateElevated/15 dark:bg-slateMidnight rounded-xl border border-slateMuted/30 dark:border-slateElevated shadow-subtle">
                <button
                  type="button"
                  onClick={() => toggleTheme(false)}
                  className={`btn-press flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                    !darkMode
                      ? 'bg-white text-slateVoid shadow-subtle border border-slateMuted/40'
                      : 'text-slateSteel hover:text-slateVoid dark:text-slateMuted dark:hover:text-slateFrost'
                  }`}
                  title="Switch to Day Mode (Light)"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleTheme(true)}
                  className={`btn-press flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                    darkMode
                      ? 'bg-slateElevated text-slateFrost shadow-subtle border border-slateSteel/40'
                      : 'text-slateSteel hover:text-slateVoid dark:text-slateMuted dark:hover:text-slateFrost'
                  }`}
                  title="Switch to Night Mode (Dark)"
                >
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Night</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 2026 Team Ribbon */}
        <div className="bg-white/60 dark:bg-slateMidnight/60 backdrop-blur-xs border-b border-slateMuted/20 dark:border-slateElevated/60 py-2 overflow-x-auto transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-xs">
            <span className="text-[10px] font-extrabold text-slateSteel dark:text-slateMuted uppercase tracking-wider shrink-0">
              2026 Teams:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {campConfig?.teams?.map((team) => {
                const bg = team.themeColor || '#4A5C6A';
                const textColor = getContrastTextColor(bg);
                return (
                  <span
                    key={team.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-2xs shrink-0 border border-black/10"
                    style={{ backgroundColor: bg, color: textColor }}
                  >
                    {team.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main View Port */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div
            key={activeTab}
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            className="page-enter"
          >
            {activeTab === 'desk' && (
              /* Check-in Desk View */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                {/* Form Column */}
                <div className="lg:col-span-7">
                  <CheckinForm
                    onRegistered={handleRegistered}
                    teamConfigs={campConfig?.teams || []}
                  />
                </div>

                {/* Latest Shift Registrations Side Column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated p-5 shadow-card-light dark:shadow-card-dark transition-all">
                    <div className="flex items-center justify-between pb-3 border-b border-slateMuted/20 dark:border-slateElevated mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted">
                        Latest Shift Registrations
                      </h4>
                      <span className="text-xs font-mono font-semibold text-slateVoid dark:text-slateFrost">
                        {participants.length} Total
                      </span>
                    </div>

                    <div className="divide-y divide-slateMuted/15 dark:divide-slateElevated max-h-[480px] overflow-y-auto">
                      {participants.slice(0, 8).map((camper) => {
                        const color = getTeamColor(camper.assignedTeam);
                        const textColor = getContrastTextColor(color);
                        return (
                          <div
                            key={camper._id || camper.serialNo}
                            className="py-3 flex items-center justify-between text-xs px-2.5 rounded-xl hover:bg-slateElevated/10 dark:hover:bg-slateElevated/30 transition-colors"
                          >
                            <div className="truncate max-w-[200px]">
                              <span className="font-bold text-slateVoid dark:text-slateFrost block truncate text-xs sm:text-sm">
                                {camper.name}
                              </span>
                              <span className="text-[10px] text-slateSteel dark:text-slateMuted font-mono">
                                #{camper.serialNo} • {camper.gender} • {camper.church || 'General'}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-2xs border border-black/10"
                                style={{ backgroundColor: color, color: textColor }}
                              >
                                {camper.assignedTeam}
                              </span>
                              <span className="text-[10px] text-slateSteel dark:text-slateMuted block mt-0.5 font-medium">
                                {camper.assignedRoom || 'Day Scholar'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lookup' && (
              /* Dedicated Attendee Lookup Tab */
              <AttendeeLookup
                participants={participants}
                campConfig={campConfig}
                onUpdateParticipant={handleOpenOverride}
                onSaveParticipant={handleSaveOverride}
                onDeleteParticipant={handleDeleteParticipant}
              />
            )}

            {activeTab === 'dashboard' && (
              /* Live Insights & Analytics View */
              <DashboardStats
                participants={participants}
                campConfig={campConfig}
              />
            )}
          </div>
        </main>

        {/* Supervisor Manual Override Modal */}
        <OverrideModal
          isOpen={isOverrideOpen}
          participant={overrideTarget}
          campConfig={campConfig}
          onClose={() => setIsOverrideOpen(false)}
          onSave={handleSaveOverride}
        />

        {/* Global Footer */}
        <footer className="border-t border-slateMuted/20 dark:border-slateElevated/60 bg-white/70 dark:bg-slateMidnight/70 backdrop-blur-md py-3 text-center text-xs text-slateSteel dark:text-slateMuted transition-colors">
          ICPF Camp Registration System • 2026 MERN Edition
        </footer>
      </div>

      {/* Mobile-Native Ergonomic Bottom Navigation Bar (Screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slateMidnight/95 backdrop-blur-lg border-t border-slateMuted/30 dark:border-slateElevated px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => handleTabChange('desk')}
          className={`btn-press flex flex-col items-center gap-1 py-2 px-4 min-w-[64px] rounded-xl text-[10px] font-bold transition-all duration-200 ${
            activeTab === 'desk'
              ? 'text-sky-600 dark:text-slateFrost bg-slateElevated/15 dark:bg-slateElevated'
              : 'text-slateSteel dark:text-slateMuted'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Desk</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lookup')}
          className={`btn-press flex flex-col items-center gap-1 py-2 px-4 min-w-[64px] rounded-xl text-[10px] font-bold transition-all duration-200 ${
            activeTab === 'lookup'
              ? 'text-sky-600 dark:text-slateFrost bg-slateElevated/15 dark:bg-slateElevated'
              : 'text-slateSteel dark:text-slateMuted'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Lookup</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('dashboard')}
          className={`btn-press flex flex-col items-center gap-1 py-2 px-4 min-w-[64px] rounded-xl text-[10px] font-bold transition-all duration-200 ${
            activeTab === 'dashboard'
              ? 'text-sky-600 dark:text-slateFrost bg-slateElevated/15 dark:bg-slateElevated'
              : 'text-slateSteel dark:text-slateMuted'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Insights</span>
        </button>
      </nav>
    </div>
  );
}
