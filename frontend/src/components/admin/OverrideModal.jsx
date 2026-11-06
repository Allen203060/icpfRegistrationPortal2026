import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Wallet, FileText, BedDouble, Users } from 'lucide-react';

export default function OverrideModal({ isOpen, participant, campConfig, onClose, onSave }) {
  if (!isOpen || !participant) return null;

  const [assignedTeam, setAssignedTeam] = useState(participant.assignedTeam || '');
  const [assignedRoom, setAssignedRoom] = useState(participant.assignedRoom || '');
  const [staying, setStaying] = useState(participant.staying !== false);
  const [notes, setNotes] = useState(participant.notes || '');
  const [paymentStatus, setPaymentStatus] = useState(participant.paymentStatus || 'Waiting Payment');
  const [feeOption, setFeeOption] = useState('500');
  const [feeTotal, setFeeTotal] = useState(participant.feeTotal ?? 500);
  const [amountPaid, setAmountPaid] = useState(participant.amountPaid ?? 0);
  const [balanceDue, setBalanceDue] = useState(participant.balanceDue ?? 0);
  const [balanceToReturn, setBalanceToReturn] = useState(participant.balanceToReturn ?? 0);
  const [paymentNotes, setPaymentNotes] = useState(participant.paymentNotes || '');

  useEffect(() => {
    setAssignedTeam(participant.assignedTeam || '');
    setAssignedRoom(participant.assignedRoom || '');
    setStaying(participant.staying !== false);
    setNotes(participant.notes || '');
    setPaymentStatus(participant.paymentStatus || 'Waiting Payment');
    const fee = participant.feeTotal ?? 500;
    setFeeTotal(fee);
    setFeeOption(fee === 500 ? '500' : fee === 400 ? '400' : fee === 0 ? '0' : 'custom');
    setAmountPaid(participant.amountPaid ?? 0);
    setBalanceDue(participant.balanceDue ?? 0);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...participant,
      assignedTeam,
      assignedRoom: staying ? assignedRoom : 'Day Scholar',
      staying,
      notes,
      paymentStatus,
      feeTotal: Number(feeTotal) || 0,
      amountPaid: Number(amountPaid) || 0,
      balanceDue: Number(balanceDue) || 0,
      balanceToReturn: Number(balanceToReturn) || 0,
      paymentNotes
    });
    onClose();
  };

  const eligibleRooms = (campConfig?.rooms || []).filter(
    (r) => r.gender?.toLowerCase() === participant.gender?.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slateVoid/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slateMidnight rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slateMuted/30 dark:border-slateElevated relative animate-in zoom-in-95 duration-150 transition-all">
        <button
          type="button"
          onClick={onClose}
          className="btn-press absolute top-5 right-5 p-1 rounded-lg text-slateSteel dark:text-slateMuted hover:text-slateVoid dark:hover:text-slateFrost hover:bg-slateElevated/15 dark:hover:bg-slateElevated transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 pb-3 border-b border-slateMuted/20 dark:border-slateElevated">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Supervisor Allocation & Payment Override
          </span>
          <h3 className="text-base font-bold text-slateVoid dark:text-slateFrost mt-0.5">
            {participant.name}{' '}
            <span className="text-xs text-slateSteel dark:text-slateMuted font-mono font-normal">
              #{participant.serialNo}
            </span>
          </h3>
          <p className="text-xs text-slateSteel dark:text-slateMuted">
            {participant.gender} • {participant.age} yrs • {participant.church || participant.location || 'General'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Override Team */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Assigned Team
            </label>
            <select
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-sm bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              {(campConfig?.teams || []).map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staying Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/70 dark:bg-slateMidnight/70 cursor-pointer">
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

          {/* Override Room (Gender Restricted) */}
          {staying && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slateVoid dark:text-slateFrost block flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-sky-600" />
                Assigned Room ({participant.gender} Dorm Only)
              </label>
              <select
                value={assignedRoom}
                onChange={(e) => setAssignedRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-sm bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                {eligibleRooms.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name} (Capacity: {r.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
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
              className="w-full px-3.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-xs bg-white/70 dark:bg-slateMidnight/70 text-slateVoid dark:text-slateFrost focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Payment Section */}
          <div className="p-4 rounded-xl bg-white/70 dark:bg-slateMidnight/70/50 border border-slateMuted/30 dark:border-slateElevated/80 space-y-3">
            <span className="text-xs font-bold text-slateVoid dark:text-slateFrost flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Payment & Dues Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                  Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium"
                >
                  <option value="Paid Cash">Paid Cash</option>
                  <option value="Paid Online">Paid Online</option>
                  <option value="Waiting Payment">Waiting Payment</option>
                  <option value="Partial / Balance Due">Partial / Balance Due</option>
                  <option value="Exempt">Exempt</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                  Fee Rate Option
                </label>
                <select
                  value={feeOption}
                  onChange={(e) => handleFeeOptionChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs font-medium"
                >
                  <option value="500">₹500 (Standard)</option>
                  <option value="400">₹400 (Concession)</option>
                  <option value="custom">Custom Fee Amount...</option>
                  <option value="0">₹0 (Exempt)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
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
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs"
                    />
                  )}
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => handleAmountChange(feeTotal, e.target.value)}
                    placeholder="Paid"
                    min="0"
                    title="Amount Paid"
                    className={`${feeOption === 'custom' ? 'w-1/2' : 'w-full'} px-3 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated bg-white/80 dark:bg-slateMidnight/80 text-slateVoid dark:text-slateFrost text-xs`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
                  Balance Due (₹)
                </label>
                <div className="px-3 py-2 rounded-xl bg-slateElevated/15 dark:bg-slateElevated/50 text-xs font-bold text-rose-600 dark:text-rose-400">
                  ₹{balanceDue}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slateSteel dark:text-slateMuted block">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slateMuted/20 dark:border-slateElevated">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slateMuted/30 dark:border-slateElevated text-xs font-semibold text-slateSteel dark:text-slateMuted hover:bg-slateElevated/15 dark:hover:bg-slateElevated/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Override & Notes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
