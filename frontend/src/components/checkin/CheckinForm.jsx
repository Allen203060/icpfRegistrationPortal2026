import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  UserPlus,
  Users,
  CheckCircle2,
  RotateCcw,
  BedDouble,
  Building2,
  Phone,
  Plus,
  Trash2,
  Wallet,
  IndianRupee,
  Sparkles,
  FileText
} from 'lucide-react';
import { registerParticipant, registerGroup } from '../../services/api';

const DEFAULT_FEE_PER_PERSON = 500;

const INITIAL_SINGLE_FORM = {
  name: '',
  age: '',
  gender: 'Male',
  church: '',
  location: '',
  staying: true,
  phone: '',
  notes: '',
  paymentStatus: 'Paid Cash',
  feeTotal: DEFAULT_FEE_PER_PERSON,
  amountPaid: DEFAULT_FEE_PER_PERSON,
  balanceDue: 0,
  balanceToReturn: 0,
  paymentNotes: ''
};

const createEmptyMember = (defaultChurch = '', defaultLocation = '') => ({
  name: '',
  age: '',
  gender: 'Male',
  staying: true,
  church: defaultChurch,
  location: defaultLocation,
  notes: ''
});

export default function CheckinForm({ onRegistered, teamConfigs = [] }) {
  const [mode, setMode] = useState('single'); // 'single' | 'group'

  // Single Registration State
  const [singleForm, setSingleForm] = useState(INITIAL_SINGLE_FORM);
  const [singleFeeOption, setSingleFeeOption] = useState('500'); // '500' | '400' | 'custom' | '0'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestAllocation, setLatestAllocation] = useState(null);
  const singleNameRef = useRef(null);

  // Group Registration State
  const [groupFeeOption, setGroupFeeOption] = useState('500'); // '500' | '400' | 'custom' | '0'
  const [groupParent, setGroupParent] = useState({
    registeredBy: '',
    phone: '',
    church: '',
    location: '',
    keepTogether: false,
    paymentStatus: 'Paid Cash',
    feeTotal: DEFAULT_FEE_PER_PERSON * 2,
    amountPaid: DEFAULT_FEE_PER_PERSON * 2,
    balanceDue: 0,
    balanceToReturn: 0,
    paymentNotes: ''
  });
  const [members, setMembers] = useState([
    createEmptyMember(),
    createEmptyMember()
  ]);
  const [latestGroupAllocation, setLatestGroupAllocation] = useState(null);
  const groupLeaderRef = useRef(null);

  // Color lookup helper
  const getTeamColor = (teamName) => {
    return (
      teamConfigs?.find((t) => t.name?.toLowerCase() === teamName?.toLowerCase())?.themeColor ||
      '#38BDF8'
    );
  };

  // ==========================================
  // SINGLE REGISTRATION HANDLERS
  // ==========================================
  const handleSingleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSingleForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto compute balances when fee or amount changes
      if (name === 'feeTotal' || name === 'amountPaid') {
        const fee = Number(name === 'feeTotal' ? value : next.feeTotal) || 0;
        const paid = Number(name === 'amountPaid' ? value : next.amountPaid) || 0;
        next.balanceDue = Math.max(0, fee - paid);
        next.balanceToReturn = Math.max(0, paid - fee);
      }

      // Quick auto-fill for payment status selection
      if (name === 'paymentStatus') {
        if (value === 'Waiting Payment') {
          next.amountPaid = 0;
          next.balanceDue = Number(next.feeTotal) || DEFAULT_FEE_PER_PERSON;
          next.balanceToReturn = 0;
        } else if (value === 'Exempt') {
          next.feeTotal = 0;
          next.amountPaid = 0;
          next.balanceDue = 0;
          next.balanceToReturn = 0;
          setSingleFeeOption('0');
        } else if (value === 'Paid Cash' || value === 'Paid Online') {
          next.amountPaid = next.feeTotal || DEFAULT_FEE_PER_PERSON;
          next.balanceDue = 0;
          next.balanceToReturn = 0;
        }
      }

      return next;
    });
  };

  const handleSingleFeeOptionChange = (option) => {
    setSingleFeeOption(option);
    let fee = singleForm.feeTotal;
    if (option === '500') fee = 500;
    else if (option === '400') fee = 400;
    else if (option === '0') fee = 0;

    setSingleForm((prev) => {
      const isPaid = prev.paymentStatus === 'Paid Cash' || prev.paymentStatus === 'Paid Online';
      const paid = isPaid ? fee : (option === '0' ? 0 : prev.amountPaid);
      return {
        ...prev,
        feeTotal: fee,
        amountPaid: paid,
        balanceDue: Math.max(0, fee - paid),
        balanceToReturn: Math.max(0, paid - fee)
      };
    });
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.name.trim()) {
      toast.error('Camper name is required');
      return;
    }
    const ageNum = parseInt(singleForm.age, 10);
    if (isNaN(ageNum) || ageNum <= 0) {
      toast.error('Please enter a valid age (positive number)');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Allocating team and room...');

    try {
      const payload = {
        ...singleForm,
        name: singleForm.name.trim(),
        age: ageNum,
        feeTotal: Number(singleForm.feeTotal) || 0,
        amountPaid: Number(singleForm.amountPaid) || 0,
        balanceDue: Number(singleForm.balanceDue) || 0,
        balanceToReturn: Number(singleForm.balanceToReturn) || 0
      };

      const result = await registerParticipant(payload);
      setLatestAllocation(result);
      if (onRegistered) onRegistered(result);

      toast.success(`${result.name} allocated to ${result.assignedTeam}!`, {
        id: toastId,
        description: `Room: ${result.assignedRoom || 'Day Scholar'}`
      });

      // Retain church and location for rapid queue processing
      setSingleForm((prev) => ({
        ...INITIAL_SINGLE_FORM,
        church: prev.church,
        location: prev.location,
        staying: prev.staying
      }));
    } catch (err) {
      toast.error(err.message || 'Registration failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextSingle = () => {
    setLatestAllocation(null);
    setTimeout(() => {
      singleNameRef.current?.focus();
    }, 50);
  };

  // ==========================================
  // GROUP REGISTRATION HANDLERS
  // ==========================================
  const handleGroupParentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGroupParent((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'feeTotal' || name === 'amountPaid') {
        const fee = Number(name === 'feeTotal' ? value : next.feeTotal) || 0;
        const paid = Number(name === 'amountPaid' ? value : next.amountPaid) || 0;
        next.balanceDue = Math.max(0, fee - paid);
        next.balanceToReturn = Math.max(0, paid - fee);
      }

      if (name === 'paymentStatus') {
        if (value === 'Waiting Payment') {
          next.amountPaid = 0;
          next.balanceDue = Number(next.feeTotal) || 0;
          next.balanceToReturn = 0;
        } else if (value === 'Exempt') {
          next.feeTotal = 0;
          next.amountPaid = 0;
          next.balanceDue = 0;
          next.balanceToReturn = 0;
          setGroupFeeOption('0');
        } else if (value === 'Paid Cash' || value === 'Paid Online') {
          next.amountPaid = next.feeTotal;
          next.balanceDue = 0;
          next.balanceToReturn = 0;
        }
      }

      return next;
    });
  };

  const handleGroupFeeOptionChange = (option) => {
    setGroupFeeOption(option);
    let perPerson = 500;
    if (option === '400') perPerson = 400;
    else if (option === '0') perPerson = 0;

    const totalFee = option === 'custom' ? groupParent.feeTotal : members.length * perPerson;

    setGroupParent((prev) => {
      const isPaid = prev.paymentStatus === 'Paid Cash' || prev.paymentStatus === 'Paid Online';
      const paid = isPaid ? totalFee : (option === '0' ? 0 : prev.amountPaid);
      return {
        ...prev,
        feeTotal: totalFee,
        amountPaid: paid,
        balanceDue: Math.max(0, totalFee - paid),
        balanceToReturn: Math.max(0, paid - totalFee)
      };
    });
  };

  const handleMemberChange = (index, field, value) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const addMember = () => {
    setMembers((prev) => {
      const next = [...prev, createEmptyMember(groupParent.church, groupParent.location)];
      const totalFee = next.length * DEFAULT_FEE_PER_PERSON;
      setGroupParent((p) => ({
        ...p,
        feeTotal: totalFee,
        amountPaid: p.paymentStatus === 'Paid Cash' || p.paymentStatus === 'Paid Online' ? totalFee : p.amountPaid,
        balanceDue: Math.max(0, totalFee - (p.paymentStatus === 'Paid Cash' || p.paymentStatus === 'Paid Online' ? totalFee : p.amountPaid))
      }));
      return next;
    });
  };

  const removeMember = (index) => {
    if (members.length <= 1) {
      toast.error('Group registration requires at least one member');
      return;
    }
    setMembers((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const totalFee = next.length * DEFAULT_FEE_PER_PERSON;
      setGroupParent((p) => ({
        ...p,
        feeTotal: totalFee,
        amountPaid: p.paymentStatus === 'Paid Cash' || p.paymentStatus === 'Paid Online' ? totalFee : p.amountPaid,
        balanceDue: Math.max(0, totalFee - (p.paymentStatus === 'Paid Cash' || p.paymentStatus === 'Paid Online' ? totalFee : p.amountPaid))
      }));
      return next;
    });
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();

    if (!groupParent.registeredBy.trim()) {
      toast.error('Please enter the name of the Parent, Pastor, or Group Leader');
      return;
    }

    // Validate members
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name.trim()) {
        toast.error(`Attendee #${i + 1} is missing a name`);
        return;
      }
      const ageNum = parseInt(m.age, 10);
      if (isNaN(ageNum) || ageNum <= 0) {
        toast.error(`Attendee "${m.name}" has an invalid age`);
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Registering group of ${members.length} attendees...`);

    try {
      const groupPayload = {
        registeredBy: groupParent.registeredBy.trim(),
        phone: groupParent.phone.trim(),
        church: groupParent.church.trim(),
        location: groupParent.location.trim(),
        keepTogether: Boolean(groupParent.keepTogether),
        paymentStatus: groupParent.paymentStatus,
        feeTotal: Number(groupParent.feeTotal) || 0,
        amountPaid: Number(groupParent.amountPaid) || 0,
        balanceDue: Number(groupParent.balanceDue) || 0,
        balanceToReturn: Number(groupParent.balanceToReturn) || 0,
        paymentNotes: groupParent.paymentNotes,
        members: members.map((m) => ({
          name: m.name.trim(),
          age: parseInt(m.age, 10),
          gender: m.gender,
          staying: m.staying !== false,
          church: m.church?.trim() || groupParent.church.trim(),
          location: m.location?.trim() || groupParent.location.trim(),
          notes: m.notes?.trim() || ''
        }))
      };

      const result = await registerGroup(groupPayload);
      setLatestGroupAllocation(result);

      if (onRegistered && Array.isArray(result.members)) {
        onRegistered(result.members);
      }

      toast.success(
        `Group "${groupParent.registeredBy}" registered (${result.count} attendees)!`,
        {
          id: toastId,
          description: result.keepTogether
            ? `All assigned together to ${result.commonTeam}`
            : 'Dispersed across diverse teams via algorithm'
        }
      );

      // Reset members but retain leader church/city
      setMembers([
        createEmptyMember(groupParent.church, groupParent.location),
        createEmptyMember(groupParent.church, groupParent.location)
      ]);
    } catch (err) {
      toast.error(err.message || 'Group registration failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextGroup = () => {
    setLatestGroupAllocation(null);
    setTimeout(() => {
      groupLeaderRef.current?.focus();
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* ==================================================== */}
      {/* INSTANT SINGLE REGISTRATION SUCCESS RESULT BANNER   */}
      {/* ==================================================== */}
      {latestAllocation && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Registered Successfully
                </span>
                <h3 className="text-lg font-bold text-slateVoid dark:text-slateFrost">
                  {latestAllocation.name}{' '}
                  <span className="text-xs font-mono font-medium text-slateSteel dark:text-slateMuted">
                    #{latestAllocation.serialNo}
                  </span>
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextSingle}
              className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost border border-slateMuted/30 dark:border-slateElevated hover:bg-slateElevated/20 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Next Camper
            </button>
          </div>

          {/* Allocation Key Badges: Group & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {/* Assigned Group */}
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slateMidnight/90 border border-slateMuted/30 dark:border-slateElevated shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block mb-1">
                Assigned Group / Team
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: getTeamColor(latestAllocation.assignedTeam) }}
                />
                <span className="text-xl font-black text-slateVoid dark:text-slateFrost tracking-tight">
                  {latestAllocation.assignedTeam}
                </span>
              </div>
            </div>

            {/* Assigned Room */}
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slateMidnight/90 border border-slateMuted/30 dark:border-slateElevated shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block mb-1">
                Room Designation
              </span>
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-xl font-black text-slateVoid dark:text-slateFrost tracking-tight">
                  {latestAllocation.assignedRoom || 'Day Scholar'}
                </span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slateMidnight/90 border border-slateMuted/30 dark:border-slateElevated shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slateSteel dark:text-slateMuted block mb-1">
                Payment Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    latestAllocation.paymentStatus === 'Paid Cash' || latestAllocation.paymentStatus === 'Paid Online'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : latestAllocation.paymentStatus === 'Waiting Payment'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {latestAllocation.paymentStatus || 'Waiting Payment'}
                </span>
                <span className="text-xs font-semibold text-slateSteel dark:text-slateMuted">
                  ₹{latestAllocation.amountPaid || 0}
                </span>
              </div>
              {Number(latestAllocation.balanceDue) > 0 && (
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block mt-1">
                  Due: ₹{latestAllocation.balanceDue}
                </span>
              )}
            </div>
          </div>

          {/* Direct Verbal Instruction for Desk Operator to Call Out */}
          <div className="mt-3.5 px-3 py-2 rounded-lg bg-slateElevated/10 dark:bg-slateElevated/30 text-xs text-slateSteel dark:text-slateMuted flex items-center gap-2">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">Tell Camper:</span>
            <span>
              "You are in <strong>{latestAllocation.assignedTeam}</strong>, Room:{' '}
              <strong>{latestAllocation.assignedRoom || 'Day Scholar'}</strong>, Badge #{latestAllocation.serialNo}."
            </span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* INSTANT GROUP REGISTRATION SUCCESS RESULT BANNER     */}
      {/* ==================================================== */}
      {latestGroupAllocation && (
        <div className="p-6 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-sky-500/20">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Group Registered Successfully
              </span>
              <h3 className="text-lg font-bold text-slateVoid dark:text-slateFrost">
                Leader: {latestGroupAllocation.registeredBy}{' '}
                <span className="text-xs font-mono font-medium text-slateSteel dark:text-slateMuted">
                  ({latestGroupAllocation.count} Attendees)
                </span>
              </h3>
              <p className="text-xs text-slateSteel dark:text-slateMuted mt-0.5">
                {latestGroupAllocation.keepTogether
                  ? `All members assigned together to ${latestGroupAllocation.commonTeam}`
                  : 'Members dispersed across different groups for fair diversity'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextGroup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost border border-slateMuted/30 dark:border-slateElevated hover:bg-slateElevated/20 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Register Next Group
            </button>
          </div>

          {/* Members Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slateSteel dark:text-slateMuted border-b border-sky-500/20 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2 px-3">Camper</th>
                  <th className="py-2 px-3">Gender / Age</th>
                  <th className="py-2 px-3">Assigned Group</th>
                  <th className="py-2 px-3">Assigned Room</th>
                  <th className="py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateMuted/20 dark:divide-slateElevated/40">
                {(latestGroupAllocation.members || []).map((m) => (
                  <tr key={m._id || m.serialNo} className="hover:bg-sky-500/5">
                    <td className="py-2.5 px-3 font-bold text-slateVoid dark:text-slateFrost">
                      {m.name} <span className="font-mono text-slateSteel dark:text-slateMuted font-normal">#{m.serialNo}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${
                          m.gender === 'Male'
                            ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                            : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {m.gender}
                      </span>
                      <span className="text-slateSteel dark:text-slateMuted">{m.age}y</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold text-slateVoid border border-black/10 shadow-2xs"
                        style={{ backgroundColor: getTeamColor(m.assignedTeam) }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-black/20" />
                        {m.assignedTeam}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slateVoid dark:text-slateFrost">
                      {m.assignedRoom || 'Day Scholar'}
                    </td>
                    <td className="py-2.5 px-3 text-slateSteel dark:text-slateMuted truncate max-w-[150px]">
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MAIN CHECK-IN DESK CARD                             */}
      {/* ==================================================== */}
      <div className="bg-white/90 dark:bg-slateMidnight/90 backdrop-blur-md rounded-2xl border border-slateMuted/30 dark:border-slateElevated shadow-card-light dark:shadow-card-dark p-5 sm:p-7 md:p-8 transition-all">
        {/* Counter Mode Switch: Single Camper vs Group / Pastor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slateMuted/20 dark:border-slateElevated mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slateVoid dark:text-slateFrost tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slateSteel dark:text-slateMuted" />
              Camper Check-in Counter
            </h2>
            <p className="text-xs text-slateSteel dark:text-slateMuted mt-0.5">
              Instant on-the-spot team diversity & gender-segregated dorm allocation
            </p>
          </div>

          {/* Mode Pill Toggle */}
          <div className="flex p-1 bg-slateElevated/15 dark:bg-slateElevated/50 rounded-xl border border-slateMuted/30 dark:border-slateElevated self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`btn-press flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost shadow-subtle border border-slateMuted/20 dark:border-slateElevated'
                  : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Single Camper
            </button>
            <button
              type="button"
              onClick={() => setMode('group')}
              className={`btn-press flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'group'
                  ? 'bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost shadow-subtle border border-slateMuted/20 dark:border-slateElevated'
                  : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Group / Family (Pastor)
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* MODE 1: SINGLE CAMPER REGISTRATION FORM              */}
        {/* ==================================================== */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4 page-enter">
            {/* Full Name & Age */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={singleNameRef}
                  type="text"
                  name="name"
                  value={singleForm.name}
                  onChange={handleSingleChange}
                  placeholder="e.g. Samuel George"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  Age <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={singleForm.age}
                  onChange={handleSingleChange}
                  placeholder="18"
                  min="5"
                  max="99"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                />
              </div>
            </div>

            {/* Gender Switch (Strict Segregation) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                Gender (Dorm Segregation) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slateElevated/15 dark:bg-slateElevated/50/80 rounded-xl border border-slateMuted/20 dark:border-slateElevated/50">
                <button
                  type="button"
                  onClick={() => setSingleForm((p) => ({ ...p, gender: 'Male' }))}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    singleForm.gender === 'Male'
                      ? 'bg-white/90 dark:bg-slateMidnight/90 text-sky-700 dark:text-sky-400 shadow-xs'
                      : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
                  }`}
                >
                  Male (Boys Dorm)
                </button>
                <button
                  type="button"
                  onClick={() => setSingleForm((p) => ({ ...p, gender: 'Female' }))}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    singleForm.gender === 'Female'
                      ? 'bg-white/90 dark:bg-slateMidnight/90 text-rose-700 dark:text-rose-400 shadow-xs'
                      : 'text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost'
                  }`}
                >
                  Female (Girls Dorm)
                </button>
              </div>
            </div>

            {/* Church & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  Church / Parish
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slateSteel dark:text-slateMuted absolute left-3 top-3" />
                  <input
                    type="text"
                    name="church"
                    value={singleForm.church}
                    onChange={handleSingleChange}
                    placeholder="e.g. IPC Ebenezer"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  City / Region
                </label>
                <input
                  type="text"
                  name="location"
                  value={singleForm.location}
                  onChange={handleSingleChange}
                  placeholder="e.g. Kottayam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                />
              </div>
            </div>

            {/* Phone & Staying */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slateSteel dark:text-slateMuted absolute left-3 top-3" />
                  <input
                    type="tel"
                    name="phone"
                    value={singleForm.phone}
                    onChange={handleSingleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>
              </div>

              <div className="pt-5">
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/30 cursor-pointer hover:bg-slateElevated/15 dark:hover:bg-slateElevated/40 transition-colors">
                  <input
                    type="checkbox"
                    name="staying"
                    checked={singleForm.staying}
                    onChange={handleSingleChange}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slateMuted dark:border-slateSteel bg-white dark:bg-slateMidnight"
                  />
                  <span className="text-xs font-semibold text-slateVoid dark:text-slateFrost">
                    Residential Attendee (Requires Dorm Bed)
                  </span>
                </label>
              </div>
            </div>

            {/* Notes / Requests */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                Notes / Medical / Dietary (Optional)
              </label>
              <input
                type="text"
                name="notes"
                value={singleForm.notes}
                onChange={handleSingleChange}
                placeholder="e.g. Vegetarian, Asthma, Early Departure"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost text-sm focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
              />
            </div>

            {/* ==================================================== */}
            {/* PAYMENT LOGGING BOX                                  */}
            {/* ==================================================== */}
            <div className="p-4 rounded-xl bg-slateElevated/5 dark:bg-slateElevated/30 border border-slateMuted/20 dark:border-slateElevated space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Fee & Payment Logging
                </span>
                <span className="text-[11px] text-slateSteel dark:text-slateMuted">
                  Standard Camp Fee: ₹{DEFAULT_FEE_PER_PERSON}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Payment Status */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Payment Method / Status
                  </label>
                  <select
                    name="paymentStatus"
                    value={singleForm.paymentStatus}
                    onChange={handleSingleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Paid Cash">Paid Cash (at counter)</option>
                    <option value="Paid Online">Paid Online / UPI (GPay/PhonePe)</option>
                    <option value="Waiting Payment">Waiting Payment (Pending)</option>
                    <option value="Partial / Balance Due">Partial / Balance Due</option>
                    <option value="Exempt">Exempt / Volunteer / Guest</option>
                  </select>
                </div>

                {/* Fee Rate Options Dropdown (500, 400, custom, 0) */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Fee Rate Dropdown
                  </label>
                  <select
                    value={singleFeeOption}
                    onChange={(e) => handleSingleFeeOptionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="500">₹500 (Standard Camp Fee)</option>
                    <option value="400">₹400 (Concession / Early)</option>
                    <option value="custom">Custom Fee Amount...</option>
                    <option value="0">₹0 (Exempt / Sponsored)</option>
                  </select>
                </div>

                {/* Amount Paid (or Custom Fee + Paid) */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    {singleFeeOption === 'custom' ? 'Custom Fee / Paid (₹)' : 'Amount Paid (₹)'}
                  </label>
                  <div className="flex gap-2">
                    {singleFeeOption === 'custom' && (
                      <input
                        type="number"
                        name="feeTotal"
                        value={singleForm.feeTotal}
                        onChange={handleSingleChange}
                        placeholder="Fee"
                        min="0"
                        title="Custom Total Fee"
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs focus:ring-2 focus:ring-sky-500"
                      />
                    )}
                    <input
                      type="number"
                      name="amountPaid"
                      value={singleForm.amountPaid}
                      onChange={handleSingleChange}
                      placeholder="Paid"
                      min="0"
                      title="Amount Paid"
                      className={`${singleFeeOption === 'custom' ? 'w-1/2' : 'w-full'} px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>
              </div>

              {/* Balances and Reference note */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Balance Due by Camper
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/50 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ₹{singleForm.balanceDue || 0}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Change to Return
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/50 text-xs font-bold text-amber-600 dark:text-amber-400">
                    ₹{singleForm.balanceToReturn || 0}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Payment Notes / UTR #
                  </label>
                  <input
                    type="text"
                    name="paymentNotes"
                    value={singleForm.paymentNotes}
                    onChange={handleSingleChange}
                    placeholder="e.g. UPI Ref #4928"
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-bold text-sm shadow-xs shadow-sky-600/20 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Allocating Fair Team & Room...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    Register Camper & Assign Group
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* MODE 2: GROUP / FAMILY REGISTRATION FORM            */}
        {/* ==================================================== */}
        {mode === 'group' && (
          <form onSubmit={handleGroupSubmit} className="space-y-5 page-enter">
            {/* Responsible Person / Pastor Card */}
            <div className="p-4 rounded-xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 space-y-3">
              <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                Responsible Leader / Parent / Pastor Information
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Registered By (Pastor / Parent Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={groupLeaderRef}
                    type="text"
                    name="registeredBy"
                    value={groupParent.registeredBy}
                    onChange={handleGroupParentChange}
                    placeholder="e.g. Pastor Joseph / Mathew (Parent)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-sm focus:ring-2 focus:ring-sky-500 placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Leader Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={groupParent.phone}
                    onChange={handleGroupParentChange}
                    placeholder="+91 98470 12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-sm focus:ring-2 focus:ring-sky-500 placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    Home Church / Parish
                  </label>
                  <input
                    type="text"
                    name="church"
                    value={groupParent.church}
                    onChange={handleGroupParentChange}
                    placeholder="e.g. IPC Ebenezer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-sm focus:ring-2 focus:ring-sky-500 placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block">
                    City / Locality
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={groupParent.location}
                    onChange={handleGroupParentChange}
                    placeholder="e.g. Kottayam"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-sm focus:ring-2 focus:ring-sky-500 placeholder:text-slateSteel/50 dark:placeholder:text-slateMuted/50"
                  />
                </div>
              </div>

              {/* Group Team Strategy Toggle */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slateVoid dark:text-slateFrost block mb-2">
                  Group Team Allocation Strategy
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      !groupParent.keepTogether
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200'
                        : 'border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost'
                    }`}
                  >
                    <input
                      type="radio"
                      name="keepTogether"
                      checked={!groupParent.keepTogether}
                      onChange={() => setGroupParent((p) => ({ ...p, keepTogether: false }))}
                      className="mt-0.5 text-sky-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        Disperse Fairly (Recommended)
                      </div>
                      <div className="text-[11px] text-slateSteel dark:text-slateMuted mt-0.5">
                        Spreads attendees across diverse teams to maximize friendships and balance.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      groupParent.keepTogether
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200'
                        : 'border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost'
                    }`}
                  >
                    <input
                      type="radio"
                      name="keepTogether"
                      checked={groupParent.keepTogether}
                      onChange={() => setGroupParent((p) => ({ ...p, keepTogether: true }))}
                      className="mt-0.5 text-sky-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Keep in Same Group
                      </div>
                      <div className="text-[11px] text-slateSteel dark:text-slateMuted mt-0.5">
                        Assigns all members to the same team. (Dorm rooms stay strictly gender separated).
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Group Payment Details */}
            <div className="p-4 rounded-xl bg-slateElevated/5 dark:bg-slateElevated/30 border border-slateMuted/20 dark:border-slateElevated space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Combined Group Payment ({members.length} Attendees)
                </span>
                <span className="text-[11px] text-slateSteel dark:text-slateMuted">
                  Total: {members.length} × ₹{DEFAULT_FEE_PER_PERSON} = ₹{members.length * DEFAULT_FEE_PER_PERSON}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Payment Method
                  </label>
                  <select
                    name="paymentStatus"
                    value={groupParent.paymentStatus}
                    onChange={handleGroupParentChange}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium"
                  >
                    <option value="Paid Cash">Paid Cash (at counter)</option>
                    <option value="Paid Online">Paid Online / UPI (GPay/PhonePe)</option>
                    <option value="Waiting Payment">Waiting Payment (Pending)</option>
                    <option value="Partial / Balance Due">Partial / Balance Due</option>
                    <option value="Exempt">Exempt / Sponsoring Church</option>
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Rate / Attendee
                  </label>
                  <select
                    value={groupFeeOption}
                    onChange={(e) => handleGroupFeeOptionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium"
                  >
                    <option value="500">₹500 / attendee ({members.length * 500})</option>
                    <option value="400">₹400 / attendee ({members.length * 400})</option>
                    <option value="custom">Custom Group Total...</option>
                    <option value="0">₹0 (Free / Exempt)</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    {groupFeeOption === 'custom' ? 'Custom Fee / Paid (₹)' : 'Amount Paid (₹)'}
                  </label>
                  <div className="flex gap-2">
                    {groupFeeOption === 'custom' && (
                      <input
                        type="number"
                        name="feeTotal"
                        value={groupParent.feeTotal}
                        onChange={handleGroupParentChange}
                        placeholder="Fee"
                        min="0"
                        title="Group Total Fee"
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                      />
                    )}
                    <input
                      type="number"
                      name="amountPaid"
                      value={groupParent.amountPaid}
                      onChange={handleGroupParentChange}
                      placeholder="Paid"
                      min="0"
                      title="Amount Paid"
                      className={`${groupFeeOption === 'custom' ? 'w-1/2' : 'w-full'} px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Group Balance Due
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/50 text-xs font-bold text-rose-600 dark:text-rose-400">
                    ₹{groupParent.balanceDue || 0}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Change to Return
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/50 text-xs font-bold text-amber-600 dark:text-amber-400">
                    ₹{groupParent.balanceToReturn || 0}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                    Payment Note / UTR #
                  </label>
                  <input
                    type="text"
                    name="paymentNotes"
                    value={groupParent.paymentNotes}
                    onChange={handleGroupParentChange}
                    placeholder="e.g. Paid in full by Pastor"
                    className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Attendees List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slateVoid dark:text-slateFrost uppercase tracking-wider">
                  Campers in this Group ({members.length})
                </span>
                <button
                  type="button"
                  onClick={addMember}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Camper
                </button>
              </div>

              {members.map((member, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-slateElevated/5 dark:bg-slateElevated/30 space-y-3 relative"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slateMuted/20 dark:border-slateElevated/50">
                    <span className="text-xs font-bold text-slateVoid dark:text-slateFrost">
                      Camper #{index + 1}
                    </span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="text-slateSteel dark:text-slateMuted hover:text-rose-500 transition-colors p-2"
                        title="Remove Camper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        placeholder="e.g. Joshua Mathew"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={member.age}
                        onChange={(e) => handleMemberChange(index, 'age', e.target.value)}
                        placeholder="16"
                        min="5"
                        max="99"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                        Gender (Dorm)
                      </label>
                      <div className="flex rounded-lg overflow-hidden border border-slateMuted/30 dark:border-slateElevated">
                        <button
                          type="button"
                          onClick={() => handleMemberChange(index, 'gender', 'Male')}
                          className={`flex-1 py-2.5 text-xs font-semibold ${
                            member.gender === 'Male'
                              ? 'bg-sky-600 text-white'
                              : 'bg-white/80 dark:bg-slateMidnight/80 text-slateSteel dark:text-slateMuted'
                          }`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMemberChange(index, 'gender', 'Female')}
                          className={`flex-1 py-2.5 text-xs font-semibold ${
                            member.gender === 'Female'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white/80 dark:bg-slateMidnight/80 text-slateSteel dark:text-slateMuted'
                          }`}
                        >
                          Female
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.staying}
                          onChange={(e) => handleMemberChange(index, 'staying', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-sky-600"
                        />
                        <span className="text-[11px] font-semibold text-slateVoid dark:text-slateFrost">
                          Staying
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                      Individual Notes / Requests
                    </label>
                    <input
                      type="text"
                      value={member.notes}
                      onChange={(e) => handleMemberChange(index, 'notes', e.target.value)}
                      placeholder="e.g. Younger sibling, allergic to dust"
                      className="w-full px-3 py-1.5 rounded-lg border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-bold text-sm shadow-xs shadow-sky-600/20 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Allocating {members.length} Campers...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    Register Group ({members.length} Campers) & Allocate
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
