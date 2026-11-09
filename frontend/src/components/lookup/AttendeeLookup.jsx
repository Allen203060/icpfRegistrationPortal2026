import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Edit2,
  Trash2,
  Users,
  BedDouble,
  Check,
  X,
  Building2,
  Phone,
  Wallet,
  FileText,
  Clock,
  AlertCircle,
  IndianRupee,
  Save,
  ChevronRight,
  Download,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { updateParticipantNotes, getExportUrl } from '../../services/api';

export default function AttendeeLookup({
  participants = [],
  campConfig = null,
  onUpdateParticipant,
  onSaveParticipant,
  onDeleteParticipant,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');

  // Quick Inline Notes / Payment Edit State
  const [quickEditCamper, setQuickEditCamper] = useState(null);
  const [quickFeeOption, setQuickFeeOption] = useState('500'); // '500' | '400' | 'custom' | '0'
  const [quickForm, setQuickForm] = useState({
    notes: '',
    paymentStatus: 'Waiting Payment',
    amountPaid: 0,
    feeTotal: 500,
    balanceDue: 0,
    balanceToReturn: 0,
    paymentNotes: '',
  });
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // Lock body scroll when quick edit modal is active (declared after quickEditCamper state)
  useEffect(() => {
    if (quickEditCamper) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [quickEditCamper]);

  // Filtered and sorted participants list (defaults to Most Recent first)
  const filteredParticipants = useMemo(() => {
    const list = (participants || []).filter((p) => {
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.church?.toLowerCase().includes(query) ||
        p.churchLocation?.toLowerCase().includes(query) ||
        p.location?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query) ||
        p.registeredBy?.toLowerCase().includes(query) ||
        String(p.serialNo).includes(query);

      const matchTeam =
        selectedTeam === 'ALL' ||
        p.assignedTeam?.toLowerCase() === selectedTeam.toLowerCase();

      const matchGender =
        selectedGender === 'ALL' ||
        p.gender?.toLowerCase() === selectedGender.toLowerCase();

      const matchPayment =
        selectedPayment === 'ALL' ||
        (selectedPayment === 'DUES' &&
          (Number(p.balanceDue) > 0 || p.paymentStatus === 'Partial / Balance Due')) ||
        (selectedPayment === 'PAID' &&
          (p.paymentStatus === 'Paid Online' || p.paymentStatus === 'Paid Cash')) ||
        (selectedPayment === 'WAITING' &&
          (p.paymentStatus === 'Waiting Payment' || !p.paymentStatus)) ||
        p.paymentStatus === selectedPayment;

      return matchSearch && matchTeam && matchGender && matchPayment;
    });

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.serialNo || 0) - (b.serialNo || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'age-asc':
          return (a.age || 0) - (b.age || 0);
        case 'age-desc':
          return (b.age || 0) - (a.age || 0);
        case 'due-desc':
          return (b.balanceDue || 0) - (a.balanceDue || 0);
        case 'team':
          return (a.assignedTeam || '').localeCompare(b.assignedTeam || '');
        case 'recent':
        default:
          return (b.serialNo || 0) - (a.serialNo || 0);
      }
    });
  }, [participants, searchTerm, selectedTeam, selectedGender, selectedPayment, sortBy]);

  const getTeamColor = (teamName) => {
    return (
      campConfig?.teams?.find(
        (t) => t.name?.toLowerCase() === teamName?.toLowerCase()
      )?.themeColor || '#4A5C6A'
    );
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove attendee "${name}"?`)) {
      if (onDeleteParticipant) onDeleteParticipant(id);
      toast.success(`Removed "${name}"`);
    }
  };

  const openQuickEdit = (camper) => {
    setQuickEditCamper(camper);
    const defaultByAge = (camper.age && Number(camper.age) >= 25) ? 500 : 400;
    const fee = camper.feeTotal !== undefined && camper.feeTotal !== null ? camper.feeTotal : defaultByAge;
    const paid = camper.amountPaid ?? 0;
    const option = fee === 400 ? '400' : fee === 500 ? '500' : fee === 0 ? '0' : 'custom';
    setQuickFeeOption(option);
    setQuickForm({
      notes: camper.notes || '',
      church: camper.church || '',
      churchLocation: camper.churchLocation || '',
      paymentStatus: camper.paymentStatus || 'Waiting Payment',
      amountPaid: paid,
      feeTotal: fee,
      balanceDue: camper.balanceDue ?? Math.max(0, fee - paid),
      balanceToReturn: camper.balanceToReturn ?? Math.max(0, paid - fee),
      paymentNotes: camper.paymentNotes || '',
    });
  };

  const handleQuickStatusChange = (status) => {
    setQuickForm((prev) => {
      let paid = prev.amountPaid;
      if (status === 'Paid Cash' || status === 'Paid Online') {
        paid = prev.feeTotal || 500;
      } else if (status === 'Waiting Payment') {
        paid = 0;
      } else if (status === 'Exempt') {
        paid = 0;
        setQuickFeeOption('0');
      }
      const fee = status === 'Exempt' ? 0 : prev.feeTotal;
      return {
        ...prev,
        paymentStatus: status,
        amountPaid: paid,
        feeTotal: fee,
        balanceDue: Math.max(0, fee - paid),
        balanceToReturn: Math.max(0, paid - fee),
      };
    });
  };

  const handleQuickFeeOptionChange = (option) => {
    setQuickFeeOption(option);
    let fee = quickForm.feeTotal;
    if (option === '500') fee = 500;
    else if (option === '400') fee = 400;
    else if (option === '0') fee = 0;

    setQuickForm((prev) => {
      const isPaid = prev.paymentStatus === 'Paid Cash' || prev.paymentStatus === 'Paid Online';
      const paid = isPaid ? fee : option === '0' ? 0 : prev.amountPaid;
      return {
        ...prev,
        feeTotal: fee,
        amountPaid: paid,
        balanceDue: Math.max(0, fee - paid),
        balanceToReturn: Math.max(0, paid - fee),
      };
    });
  };

  const handleQuickAmountPaidChange = (newPaid) => {
    const paid = Number(newPaid) || 0;
    setQuickForm((prev) => ({
      ...prev,
      amountPaid: paid,
      balanceDue: Math.max(0, prev.feeTotal - paid),
      balanceToReturn: Math.max(0, paid - prev.feeTotal),
    }));
  };

  const handleSaveQuick = async (e) => {
    e.preventDefault();
    if (!quickEditCamper) return;

    setIsSavingQuick(true);
    try {
      let updatedCamper = {
        ...quickEditCamper,
        ...quickForm,
      };

      if (quickEditCamper._id && !String(quickEditCamper._id).startsWith('seed_')) {
        const res = await updateParticipantNotes(quickEditCamper._id, quickForm);
        if (res) {
          updatedCamper = res;
        }
      }

      if (onSaveParticipant) {
        onSaveParticipant(updatedCamper);
      }

      if (!quickEditCamper.assignedTeam && updatedCamper.assignedTeam) {
        toast.success(`Payment confirmed! ${updatedCamper.name} allocated to ${updatedCamper.assignedTeam}! 🎉`, {
          description: `Room: ${updatedCamper.staying ? (updatedCamper.assignedRoom || 'Assigned') : 'Day Scholar'}`
        });
      } else {
        toast.success(`Updated notes & payment for ${quickEditCamper.name}`);
      }
      setQuickEditCamper(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update attendee notes');
    } finally {
      setIsSavingQuick(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Card */}
      <div className="bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated p-5 sm:p-6 shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slateMuted/20 dark:border-slateElevated">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slateVoid dark:text-slateFrost tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-slateSteel dark:text-slateMuted" />
              Attendee Lookup & Verification
            </h2>
            <p className="text-xs text-slateSteel dark:text-slateMuted mt-0.5">
              Instantly find registered campers to confirm group assignment, dorm allocation & fees
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-slateVoid dark:text-slateFrost bg-slateElevated/15 dark:bg-slateElevated px-3 py-1.5 rounded-lg border border-slateMuted/20 shrink-0">
              {filteredParticipants.length} of {participants.length} Campers
            </span>

            {/* Quick Export Downloads */}
            <div className="flex items-center gap-1.5">
              <a
                href={getExportUrl('csv')}
                target="_blank"
                rel="noreferrer"
                className="btn-press flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                title="Download latest Phone & Group ID CSV"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phone & Group CSV</span>
              </a>

              <a
                href={getExportUrl('excel')}
                target="_blank"
                rel="noreferrer"
                className="btn-press flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                title="Download complete attendees Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </a>

              <a
                href={getExportUrl('id-cards')}
                target="_blank"
                rel="noreferrer"
                className="btn-press flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                title="Download 6-up printable ID badges PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Badges PDF</span>
              </a>

              <a
                href={getExportUrl('room-lists')}
                target="_blank"
                rel="noreferrer"
                className="btn-press flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                title="Download room occupancy roster PDF"
              >
                <BedDouble className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rooms PDF</span>
              </a>
            </div>
          </div>
        </div>

        {/* Search input + 4 Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 mt-4">
          <div className="sm:col-span-2 md:col-span-4 relative">
            <Search className="w-4 h-4 text-slateSteel dark:text-slateMuted absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, church, #badge, phone, notes..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/60 text-slateVoid dark:text-slateFrost text-xs focus:outline-none focus:ring-2 focus:ring-slateSteel transition-all placeholder:text-slateSteel/60 dark:placeholder:text-slateMuted/60"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="btn-press absolute right-3 top-3 text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/60 text-slateVoid dark:text-slateFrost text-xs focus:outline-none focus:ring-2 focus:ring-slateSteel font-medium appearance-none cursor-pointer"
              title="Sort Attendees"
            >
              <option value="recent">Most Recent (#Desc)</option>
              <option value="oldest">Oldest First (#Asc)</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="age-asc">Age (Youngest)</option>
              <option value="age-desc">Age (Oldest)</option>
              <option value="due-desc">Highest Dues Pending</option>
              <option value="team">Team Group</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Team Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/60 text-slateVoid dark:text-slateFrost text-xs focus:outline-none focus:ring-2 focus:ring-slateSteel font-medium"
            >
              <option value="ALL">All Teams ({campConfig?.teams?.length || 0})</option>
              {campConfig?.teams?.map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/60 text-slateVoid dark:text-slateFrost text-xs focus:outline-none focus:ring-2 focus:ring-slateSteel font-medium"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male Dorm</option>
              <option value="Female">Female Dorm</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/60 text-slateVoid dark:text-slateFrost text-xs focus:outline-none focus:ring-2 focus:ring-slateSteel font-medium"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid (Cash/Online)</option>
              <option value="WAITING">Waiting Payment</option>
              <option value="DUES">Has Balance Due</option>
              <option value="Paid Online">Paid Online</option>
              <option value="Paid Cash">Paid Cash</option>
              <option value="Exempt">Exempt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results View */}
      {filteredParticipants.length === 0 ? (
        <div className="bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated p-12 text-center shadow-card-light dark:shadow-card-dark">
          <Users className="w-10 h-10 text-slateSteel dark:text-slateMuted mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-bold text-slateVoid dark:text-slateFrost">No matching attendees found</h3>
          <p className="text-xs text-slateSteel dark:text-slateMuted mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No registrations match "${searchTerm}". Double check the spelling or register them directly at the Check-in Desk.`
              : 'No attendees match the chosen filter criteria.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (Screens < 768px for ergonomics) */}
          <div className="block md:hidden space-y-3">
            {filteredParticipants.map((camper) => {
              const teamColor = getTeamColor(camper.assignedTeam);
              const isPaid =
                camper.paymentStatus === 'Paid Cash' || camper.paymentStatus === 'Paid Online';
              const hasDue = Number(camper.balanceDue) > 0;

              return (
                <div
                  key={camper._id || camper.serialNo}
                  className="bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated p-4 shadow-card-light dark:shadow-card-dark space-y-2.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slateVoid dark:text-slateFrost">
                          {camper.name}
                        </span>
                        <span className="text-[10px] font-mono text-slateSteel dark:text-slateMuted">
                          #{camper.serialNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slateSteel dark:text-slateMuted flex items-center gap-1.5 mt-0.5">
                        <span>
                          {camper.gender}, {camper.age}y
                        </span>
                        <span>• {camper.church || 'General'}{camper.churchLocation ? ` (${camper.churchLocation})` : ''}</span>
                        {camper.phone && <span>• {camper.phone}</span>}
                      </div>
                    </div>

                    {camper.assignedTeam ? (
                      <span
                        className="px-2.5 py-0.5 rounded text-[11px] font-bold text-slateVoid shadow-2xs shrink-0 border border-black/10"
                        style={{ backgroundColor: teamColor }}
                      >
                        {camper.assignedTeam}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        Pending Payment
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slateMuted/15 dark:border-slateElevated text-xs">
                    <div className="flex items-center gap-1.5 text-slateVoid dark:text-slateFrost font-semibold">
                      <BedDouble className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted" />
                      <span>{camper.assignedTeam ? (camper.staying ? (camper.assignedRoom || 'Unassigned') : 'Day Scholar') : '—'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openQuickEdit(camper)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold min-h-[32px] ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : camper.paymentStatus === 'Waiting Payment'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {camper.paymentStatus || 'Waiting Payment'} (₹{camper.amountPaid || 0})
                        {hasDue && ` • Due: ₹${camper.balanceDue}`}
                      </button>
                    </div>
                  </div>

                  {camper.notes && (
                    <div className="text-[11px] bg-slateElevated/10 dark:bg-slateElevated/30 p-2 rounded-lg text-slateSteel dark:text-slateMuted flex items-center gap-1.5">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{camper.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slateMuted/15 dark:border-slateElevated">
                    <button
                      type="button"
                      onClick={() => openQuickEdit(camper)}
                      className="btn-press px-3 py-2 rounded-lg bg-slateElevated/10 dark:bg-slateElevated text-[11px] font-semibold text-slateVoid dark:text-slateFrost flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" /> Quick Edit
                    </button>
                    {onUpdateParticipant && (
                      <button
                        type="button"
                        onClick={() => onUpdateParticipant(camper)}
                        className="btn-press px-3 py-2 rounded-lg bg-slateElevated/10 dark:bg-slateElevated text-[11px] font-semibold text-slateVoid dark:text-slateFrost flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Override
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Screens >= 768px) */}
          <div className="hidden md:block bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark overflow-hidden transition-all">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slateMuted/20 dark:border-slateElevated bg-slateElevated/10 dark:bg-slateElevated/30 text-slateSteel dark:text-slateMuted font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Attendee / Badge</th>
                    <th className="py-3 px-4">Assigned Group</th>
                    <th className="py-3 px-4">Room Number</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Demographics</th>
                    <th className="py-3 px-4">Church / Region</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateMuted/15 dark:divide-slateElevated/50">
                  {filteredParticipants.map((camper) => {
                    const teamColor = getTeamColor(camper.assignedTeam);
                    const isPaid =
                      camper.paymentStatus === 'Paid Cash' || camper.paymentStatus === 'Paid Online';
                    const hasDue = Number(camper.balanceDue) > 0;

                    return (
                      <tr
                        key={camper._id || camper.serialNo}
                        className="hover:bg-slateElevated/5 dark:hover:bg-slateElevated/25 transition-colors"
                      >
                        {/* Name & Serial */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-slateVoid dark:text-slateFrost">
                            {camper.name}
                          </div>
                          <div className="text-[11px] font-mono text-slateSteel dark:text-slateMuted flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-slateVoid dark:text-slateFrost">
                              #{camper.serialNo}
                            </span>
                            {camper.phone && <span>• {camper.phone}</span>}
                            {camper.registeredBy && (
                              <span className="text-[10px] bg-slateElevated/15 dark:bg-slateElevated px-1.5 py-0.2 rounded text-slateSteel dark:text-slateMuted">
                                via {camper.registeredBy}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Group */}
                        <td className="py-3.5 px-4">
                          {camper.assignedTeam ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black text-slateVoid shadow-2xs border border-black/10"
                              style={{ backgroundColor: teamColor }}
                            >
                              <span className="w-2 h-2 rounded-full bg-black/20" />
                              {camper.assignedTeam}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              Pending Payment
                            </span>
                          )}
                        </td>

                        {/* Assigned Room */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slateVoid dark:text-slateFrost text-xs">
                            <BedDouble className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted shrink-0" />
                            <span>
                              {camper.assignedTeam
                                ? (camper.staying ? (camper.assignedRoom || 'Unassigned') : 'Day Scholar')
                                : '—'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slateSteel dark:text-slateMuted">
                            {camper.staying !== false ? 'Residential' : 'Day Scholar'}
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => openQuickEdit(camper)}
                            className="text-left group cursor-pointer"
                            title="Click to update payment or notes"
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : camper.paymentStatus === 'Waiting Payment'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {camper.paymentStatus || 'Waiting Payment'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slateSteel dark:text-slateMuted font-mono mt-0.5 flex items-center gap-1">
                              <span>₹{camper.amountPaid || 0}</span>
                              {hasDue && (
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  (Due: ₹{camper.balanceDue})
                                </span>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* Demographics */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                              camper.gender === 'Male'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {camper.gender}
                          </span>
                          <span className="text-slateSteel dark:text-slateMuted font-medium">
                            {camper.age} yrs
                          </span>
                        </td>

                        {/* Church */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slateVoid dark:text-slateFrost truncate max-w-[170px]" title={camper.church}>
                            {camper.church || 'General'}
                          </div>
                          <div className="text-[10px] text-slateSteel dark:text-slateMuted truncate max-w-[170px]" title={`${camper.churchLocation || ''} • ${camper.location || ''}`}>
                            {camper.churchLocation ? (
                              <span>
                                <span className="font-semibold text-slateVoid/80 dark:text-slateFrost/80">{camper.churchLocation}</span>
                                {camper.location ? ` • ${camper.location}` : ''}
                              </span>
                            ) : (
                              camper.location || 'Local'
                            )}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4">
                          {camper.notes ? (
                            <button
                              type="button"
                              onClick={() => openQuickEdit(camper)}
                              className="btn-press inline-flex items-center gap-1 text-[11px] text-slateVoid dark:text-slateFrost bg-slateElevated/15 dark:bg-slateElevated px-2 py-1 rounded-md hover:bg-slateElevated/25 transition-colors max-w-[150px] truncate cursor-pointer text-left"
                              title={`Edit Note: ${camper.notes}`}
                            >
                              <FileText className="w-3 h-3 text-slateSteel dark:text-slateMuted shrink-0" />
                              <span className="truncate">{camper.notes}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openQuickEdit(camper)}
                              className="btn-press text-[10px] text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost transition-colors cursor-pointer"
                            >
                              + Add note
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openQuickEdit(camper)}
                              className="btn-press p-1.5 rounded-lg text-slateSteel hover:text-emerald-600 hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
                              title="Quick Edit Payment / Notes"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                            </button>

                            {onUpdateParticipant && (
                              <button
                                type="button"
                                onClick={() => onUpdateParticipant(camper)}
                                className="btn-press p-1.5 rounded-lg text-slateSteel hover:text-sky-500 hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
                                title="Full Supervisor Override (Team & Room)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDeleteParticipant && (
                              <button
                                type="button"
                                onClick={() => handleDelete(camper._id || camper.serialNo, camper.name)}
                                className="btn-press p-1.5 rounded-lg text-slateSteel hover:text-rose-500 hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
                                title="Delete Attendee"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* QUICK INLINE PAYMENT & NOTES EDIT MODAL (Mounted via Portal directly to body to prevent scroll offset) */}
      {quickEditCamper && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slateVoid/80 backdrop-blur-sm modal-backdrop-enter">
          <div className="bg-white dark:bg-slateMidnight rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto overscroll-contain p-6 shadow-2xl border border-slateMuted/30 dark:border-slateElevated relative modal-dialog-enter">
            <button
              type="button"
              onClick={() => setQuickEditCamper(null)}
              className="btn-press absolute top-5 right-5 p-2 rounded-lg text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                Quick Ledger Update
              </span>
              <h3 className="text-base font-bold text-slateVoid dark:text-slateFrost mt-0.5">
                {quickEditCamper.name}{' '}
                <span className="text-xs text-slateSteel dark:text-slateMuted font-mono font-normal">
                  #{quickEditCamper.serialNo}
                </span>
              </h3>
              <p className="text-xs text-slateSteel dark:text-slateMuted">
                {quickEditCamper.assignedTeam} • {quickEditCamper.assignedRoom || 'Day Scholar'}
              </p>
            </div>

            <form onSubmit={handleSaveQuick} className="space-y-4">
              {/* Payment Status & Fee Preset Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Payment Status
                  </label>
                  <select
                    value={quickForm.paymentStatus}
                    onChange={(e) => handleQuickStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-slateSteel"
                  >
                    <option value="Paid Cash">Paid Cash</option>
                    <option value="Paid Online">Paid Online</option>
                    <option value="Waiting Payment">Waiting Payment</option>
                    <option value="Partial / Balance Due">Partial / Balance Due</option>
                    <option value="Exempt">Exempt</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Fee Rate
                  </label>
                  <select
                    value={quickFeeOption}
                    onChange={(e) => handleQuickFeeOptionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-slateSteel"
                  >
                    <option value="400">₹400 (Student: 13–24 yrs)</option>
                    <option value="500">₹500 (Senior: 25+ yrs)</option>
                    <option value="custom">Custom Fee...</option>
                    <option value="0">₹0 (Exempt)</option>
                  </select>
                </div>
              </div>

              {/* Amount Paid & Total Fee / Balance Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    {quickFeeOption === 'custom' ? 'Custom Fee / Paid (₹)' : 'Amount Paid (₹)'}
                  </label>
                  <div className="flex gap-2">
                    {quickFeeOption === 'custom' && (
                      <input
                        type="number"
                        value={quickForm.feeTotal}
                        onChange={(e) => {
                          const fee = Number(e.target.value) || 0;
                          setQuickForm((p) => ({
                            ...p,
                            feeTotal: fee,
                            balanceDue: Math.max(0, fee - p.amountPaid),
                            balanceToReturn: Math.max(0, p.amountPaid - fee),
                          }));
                        }}
                        placeholder="Fee"
                        min="0"
                        title="Custom Total Fee"
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs"
                      />
                    )}
                    <input
                      type="number"
                      value={quickForm.amountPaid}
                      onChange={(e) => handleQuickAmountPaidChange(e.target.value)}
                      placeholder="Paid"
                      min="0"
                      title="Amount Paid"
                      className={`${
                        quickFeeOption === 'custom' ? 'w-1/2' : 'w-full'
                      } px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Balance Due
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                    ₹{quickForm.balanceDue || 0}
                  </div>
                </div>
              </div>

              {/* Church & Church Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Church / Parish
                  </label>
                  <input
                    type="text"
                    value={quickForm.church || ''}
                    onChange={(e) => setQuickForm((p) => ({ ...p, church: e.target.value }))}
                    placeholder="e.g. IPC Ebenezer"
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs focus:ring-2 focus:ring-slateSteel"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Church Location
                  </label>
                  <input
                    type="text"
                    value={quickForm.churchLocation || ''}
                    onChange={(e) => setQuickForm((p) => ({ ...p, churchLocation: e.target.value }))}
                    placeholder="e.g. Kumbanad / Area"
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs focus:ring-2 focus:ring-slateSteel"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  Candidate Notes / Dietary / Medical
                </label>
                <textarea
                  rows={2}
                  value={quickForm.notes}
                  onChange={(e) => setQuickForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Vegetarian, Asthma, Roommate request"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs focus:ring-2 focus:ring-slateSteel"
                />
              </div>

              {/* Payment Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                  Payment Reference / UTR
                </label>
                <input
                  type="text"
                  value={quickForm.paymentNotes}
                  onChange={(e) => setQuickForm((p) => ({ ...p, paymentNotes: e.target.value }))}
                  placeholder="e.g. GPay ref #1234"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slateMuted/20 dark:border-slateElevated">
                <button
                  type="button"
                  onClick={() => setQuickEditCamper(null)}
                  className="btn-press px-4 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-xs font-semibold text-slateSteel dark:text-slateMuted hover:bg-slateElevated/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuick}
                  className="btn-press px-4 py-2 rounded-xl bg-slateElevated text-slateFrost text-xs font-bold hover:bg-slateSteel flex items-center gap-1.5 shadow-subtle transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingQuick ? 'Saving...' : 'Save Quick Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
