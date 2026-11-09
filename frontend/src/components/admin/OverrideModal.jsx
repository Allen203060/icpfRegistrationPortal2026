import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  AlertTriangle,
  Wallet,
  FileText,
  BedDouble,
  Users,
  User,
  Phone,
  Building2,
  MapPin,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function OverrideModal({ isOpen, participant, campConfig, onClose, onSave }) {
  // Attendee Form Fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [church, setChurch] = useState('');
  const [churchLocation, setChurchLocation] = useState('');
  const [location, setLocation] = useState('');
  const [isFirstTimer, setIsFirstTimer] = useState(false);

  // Allocation & Room Fields
  const [assignedTeam, setAssignedTeam] = useState('');
  const [assignedRoom, setAssignedRoom] = useState('');
  const [staying, setStaying] = useState(true);
  const [notes, setNotes] = useState('');

  // Payment Fields
  const [paymentStatus, setPaymentStatus] = useState('Waiting Payment');
  const [feeOption, setFeeOption] = useState('500');
  const [feeTotal, setFeeTotal] = useState(500);
  const [amountPaid, setAmountPaid] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [balanceToReturn, setBalanceToReturn] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Synchronize state when participant changes
  useEffect(() => {
    if (!participant) return;

    setName(participant.name || '');
    setAge(participant.age !== undefined && participant.age !== null ? String(participant.age) : '');
    setGender(participant.gender || 'Male');
    setPhone(participant.phone || '');
    setChurch(participant.church || '');
    setChurchLocation(participant.churchLocation || '');
    setLocation(participant.location || '');

    const firstTimerFlag =
      participant.isFirstTimer === true ||
      participant.isFirstTimer === 'true' ||
      participant.isFirstTimer === 'Yes' ||
      /first\s*timer?:\s*yes/i.test(participant.notes || '') ||
      /first\s*time\s*attending:\s*yes/i.test(participant.notes || '');
    setIsFirstTimer(firstTimerFlag);

    setAssignedTeam(participant.assignedTeam || '');
    setAssignedRoom(participant.assignedRoom || '');
    setStaying(participant.staying !== false);
    setNotes(participant.notes || '');

    setPaymentStatus(participant.paymentStatus || 'Waiting Payment');
    const defaultByAge = (participant.age && Number(participant.age) >= 25) ? 500 : 400;
    const fee = participant.feeTotal !== undefined && participant.feeTotal !== null ? participant.feeTotal : defaultByAge;
    setFeeTotal(fee);
    setFeeOption(fee === 400 ? '400' : fee === 500 ? '500' : fee === 0 ? '0' : 'custom');
    setAmountPaid(participant.amountPaid ?? 0);
    setBalanceDue(participant.balanceDue ?? Math.max(0, fee - (participant.amountPaid ?? 0)));
    setBalanceToReturn(participant.balanceToReturn ?? 0);
    setPaymentNotes(participant.paymentNotes || '');
  }, [participant]);

  const handleAmountChange = (newFee, newPaid) => {
    const fee = Number(newFee) || 0;
    const paid = Number(newPaid) || 0;
    setFeeTotal(fee);
    setAmountPaid(paid);
    setBalanceDue(Math.max(0, fee - paid));
    setBalanceToReturn(Math.max(0, paid - fee));
  };

  const handleFeeOptionChange = (option) => {
    setFeeOption(option);
    let fee = feeTotal;
    if (option === '500') fee = 500;
    else if (option === '400') fee = 400;
    else if (option === '0') fee = 0;

    const isPaid = paymentStatus === 'Paid Cash' || paymentStatus === 'Paid Online';
    const paid = isPaid ? fee : (option === '0' ? 0 : amountPaid);
    handleAmountChange(fee, paid);
  };

  const handleStatusChange = (status) => {
    setPaymentStatus(status);
    if (status === 'Paid Cash' || status === 'Paid Online') {
      handleAmountChange(feeTotal, feeTotal);
    } else if (status === 'Waiting Payment') {
      handleAmountChange(feeTotal, 0);
    } else if (status === 'Exempt') {
      setFeeOption('0');
      handleAmountChange(0, 0);
    }
  };

  const handleGenderChange = (newGender) => {
    setGender(newGender);
    // If staying, adjust room if current room is incompatible
    const roomsForNewGender = (campConfig?.rooms || []).filter(
      (r) => r.gender?.toLowerCase() === newGender?.toLowerCase()
    );
    if (staying && roomsForNewGender.length > 0) {
      if (!roomsForNewGender.some((r) => r.name === assignedRoom)) {
        setAssignedRoom(roomsForNewGender[0].name);
      }
    }
  };

  const handleAgeChange = (newAge) => {
    setAge(newAge);
    const num = Number(newAge);
    if (num > 0 && (feeOption === '400' || feeOption === '500')) {
      const recommendedFee = num >= 25 ? 500 : 400;
      setFeeOption(String(recommendedFee));
      handleAmountChange(recommendedFee, paymentStatus.startsWith('Paid') ? recommendedFee : amountPaid);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Participant name is required.');
      return;
    }

    onSave({
      ...participant,
      name: name.trim(),
      age: Number(age) || 0,
      gender,
      phone: phone.trim(),
      church: church.trim(),
      churchLocation: churchLocation.trim(),
      location: location.trim(),
      isFirstTimer,
      assignedTeam,
      assignedRoom: staying ? assignedRoom : 'Day Scholar',
      staying,
      notes: notes.trim(),
      paymentStatus,
      feeTotal: Number(feeTotal) || 0,
      amountPaid: Number(amountPaid) || 0,
      balanceDue: Number(balanceDue) || 0,
      balanceToReturn: Number(balanceToReturn) || 0,
      paymentNotes: paymentNotes.trim()
    });
    onClose();
  };

  if (!isOpen || !participant) return null;

  // Filter eligible rooms by selected gender
  const eligibleRooms = (campConfig?.rooms || []).filter(
    (r) => r.gender?.toLowerCase() === gender?.toLowerCase()
  );

  // Teams list guaranteed to include 'Leader' and Groups
  const configuredTeams = [...(campConfig?.teams || [])];
  if (!configuredTeams.some((t) => t.name?.toLowerCase() === 'leader')) {
    configuredTeams.push({ name: 'Leader', themeColor: '#F59E0B' });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slateVoid/80 backdrop-blur-sm modal-backdrop-enter">
      <div className="bg-white dark:bg-slateMidnight rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slateMuted/30 dark:border-slateElevated relative modal-dialog-enter">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn-press absolute top-5 right-5 p-2 rounded-lg text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
          <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Edit Attendee Details & Supervisor Override
          </span>
          <h3 className="text-base font-bold text-slateVoid dark:text-slateFrost mt-0.5">
            {name || participant.name}{' '}
            <span className="text-xs text-slateSteel dark:text-slateMuted font-mono font-normal">
              #{participant.serialNo}
            </span>
          </h3>
          <p className="text-xs text-slateSteel dark:text-slateMuted">
            Edit all registration fields, church locations, group assignments, or payment records.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Personal Details */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slateMidnight/60 border border-slateMuted/30 dark:border-slateElevated space-y-3">
            <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              Personal Demographics
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Attendee Name"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="Age"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => handleGenderChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* First Timer Flag */}
            <div>
              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slateMuted/20 dark:border-slateElevated/60 bg-white/80 dark:bg-slateMidnight/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFirstTimer}
                  onChange={(e) => setIsFirstTimer(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs font-medium text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  First-Time Camp Attendee
                </span>
              </label>
            </div>
          </div>

          {/* Section 2: Church & Location Details */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slateMidnight/60 border border-slateMuted/30 dark:border-slateElevated space-y-3">
            <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Church & Residence Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Home Church / Parish
                </label>
                <input
                  type="text"
                  value={church}
                  onChange={(e) => setChurch(e.target.value)}
                  placeholder="e.g. IPC Ebenezer"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Church Location / City
                </label>
                <input
                  type="text"
                  value={churchLocation}
                  onChange={(e) => setChurchLocation(e.target.value)}
                  placeholder="e.g. Kumbanad / Parish Area"
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                Personal Town / Residence
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slateSteel dark:text-slateMuted absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kottayam"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Camp Allocation & Housing */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slateMidnight/60 border border-slateMuted/30 dark:border-slateElevated space-y-3">
            <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Camp Allocation & Housing
            </span>

            {/* Team Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block flex items-center justify-between">
                <span>Assigned Team / Group</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                  Select "Leader" for volunteers/staff
                </span>
              </label>
              <select
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- No Team (Pending Payment) --</option>
                {configuredTeams.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} {t.name === 'Leader' ? '⭐ (Event Leaders & Volunteers)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Staying Toggle */}
            <div>
              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slateMuted/20 dark:border-slateElevated/60 bg-white/80 dark:bg-slateMidnight/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staying}
                  onChange={(e) => setStaying(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs font-semibold text-slateVoid dark:text-slateFrost">
                  Residential Staying (Requires Bed)
                </span>
              </label>
            </div>

            {/* Room Selection */}
            {staying && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-sky-600" />
                  Assigned Room ({gender} Dorm Only)
                </label>
                <select
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Select Dorm Room --</option>
                  {eligibleRooms.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name} (Capacity: {r.capacity})
                    </option>
                  ))}
                  {assignedRoom && !eligibleRooms.some((r) => r.name === assignedRoom) && (
                    <option value={assignedRoom}>{assignedRoom} (Custom/Overflow)</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Section 4: Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              Special Candidate Notes / Medical / Dietary
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Vegetarian, Asthma, Roommate request"
              className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-xs bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Section 5: Payment & Dues Information */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slateMidnight/90 border border-slateMuted/30 dark:border-slateElevated space-y-3">
            <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Payment & Dues Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Paid Cash">Paid Cash</option>
                  <option value="Paid Online">Paid Online</option>
                  <option value="Waiting Payment">Waiting Payment</option>
                  <option value="Partial / Balance Due">Partial / Balance Due</option>
                  <option value="Exempt">Exempt</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Fee Rate Option
                </label>
                <select
                  value={feeOption}
                  onChange={(e) => handleFeeOptionChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="400">₹400 (Student: 13–24 yrs)</option>
                  <option value="500">₹500 (Senior: 25+ yrs)</option>
                  <option value="custom">Custom Fee Amount...</option>
                  <option value="0">₹0 (Exempt)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  {feeOption === 'custom' ? 'Custom Fee / Paid (₹)' : 'Amount Paid (₹)'}
                </label>
                <div className="flex gap-2">
                  {feeOption === 'custom' && (
                    <input
                      type="number"
                      value={feeTotal}
                      onChange={(e) => handleAmountChange(e.target.value, amountPaid)}
                      placeholder="Fee"
                      min="0"
                      title="Custom Fee Total"
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs"
                    />
                  )}
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => handleAmountChange(feeTotal, e.target.value)}
                    placeholder="Paid"
                    min="0"
                    title="Amount Paid"
                    className={`${feeOption === 'custom' ? 'w-1/2' : 'w-full'} px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white dark:bg-slateMidnight text-slateVoid dark:text-slateFrost text-xs`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Balance Due (₹)
                </label>
                <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/60 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                  ₹{balanceDue}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateFrost/80 block">
                  Payment Reference / Note
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #..."
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slateMuted/20 dark:border-slateElevated">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-xs font-semibold text-slateSteel dark:text-slateMuted hover:bg-slateElevated/15 dark:hover:bg-slateElevated/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Attendee Details
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
