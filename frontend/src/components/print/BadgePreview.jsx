import React from 'react';
import { Printer, Sparkles, Building2, User, Home, Hash } from 'lucide-react';

export default function BadgePreview({ participant, teamColor = '#93C5FD', onPrint }) {
  if (!participant) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slateMuted/30 dark:border-slateElevated rounded-2xl text-center bg-white/40 dark:bg-slateMidnight/40">
        <div className="w-12 h-12 rounded-xl bg-slateElevated/15 text-slateSteel dark:text-slateMuted flex items-center justify-center mb-3">
          <Printer className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-semibold text-slateVoid dark:text-slateFrost">No Badge to Display</h4>
        <p className="text-xs text-slateSteel dark:text-slateMuted mt-1 max-w-[220px]">
          Submit a camper registration to generate their 85×54mm physical badge preview.
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Visual Badge Card - 85mm x 54mm ratio preview on screen */}
      <div
        className="badge-card-print relative w-full max-w-[360px] aspect-[85/54] rounded-2xl p-5 shadow-sm border border-zinc-900/10 flex flex-col justify-between overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: teamColor,
        }}
      >
        {/* Subtle Watermark Texture */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/20 pointer-events-none blur-lg" />
        
        {/* Top Header Bar */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-900/80">
              <span className="text-[10px] tracking-wider uppercase font-extrabold">ICPF CAMP 2026</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-900/40" />
              <span className="text-[10px] font-semibold">ATTENDEE</span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 leading-tight mt-0.5 break-words line-clamp-1">
              {participant.name || 'Participant Name'}
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-xs border border-black/5">
            <Hash className="w-3 h-3 text-zinc-500" />
            <span className="font-mono text-xs font-bold text-zinc-900">
              {participant.serialNo || 101}
            </span>
          </div>
        </div>

        {/* Middle Demographics Block */}
        <div className="grid grid-cols-2 gap-2 relative z-10 my-auto text-zinc-900">
          <div className="bg-white/70 backdrop-blur-xs rounded-lg p-2 border border-black/5">
            <span className="text-[9px] uppercase font-bold text-zinc-500 block">Assigned Team</span>
            <div className="text-xs font-extrabold text-zinc-900 truncate">
              {participant.assignedTeam || 'Unassigned'}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xs rounded-lg p-2 border border-black/5">
            <span className="text-[9px] uppercase font-bold text-zinc-500 block">Room Allocation</span>
            <div className="text-xs font-extrabold text-zinc-900 truncate">
              {participant.assignedRoom || (participant.staying === false ? 'Day Scholar' : 'Pending')}
            </div>
          </div>
        </div>

        {/* Footer Info: Church / Location & Details */}
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-800 relative z-10 pt-1 border-t border-black/10">
          <div className="truncate max-w-[200px] flex items-center gap-1">
            <Building2 className="w-3 h-3 text-zinc-700 shrink-0" />
            <span className="truncate">{participant.church || participant.location || 'General Attendee'}</span>
          </div>
          <div className="text-zinc-600 text-[10px] font-mono shrink-0">
            {participant.gender} • {participant.age}y
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden during @media print) */}
      <div className="no-print flex items-center gap-2 w-full max-w-[360px]">
        <button
          type="button"
          onClick={handlePrint}
          className="btn-press flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slateElevated text-slateFrost font-semibold text-xs tracking-wide shadow-subtle hover:bg-slateSteel transition-all duration-150"
        >
          <Printer className="w-4 h-4 stroke-[2]" />
          Print Badge (85×54mm)
        </button>
      </div>
    </div>
  );
}
