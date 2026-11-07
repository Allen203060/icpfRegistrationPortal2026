import React, { useState, useMemo } from 'react';
import { Search, Filter, Printer, Edit2, Trash2, UserX, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ParticipantTable({
  participants = [],
  campConfig = null,
  onSelectBadge,
  onUpdateParticipant,
  onDeleteParticipant
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');

  // Filtered List
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.church?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.serialNo).includes(searchTerm);

      const matchTeam =
        selectedTeam === 'ALL' ||
        p.assignedTeam?.toLowerCase() === selectedTeam.toLowerCase();

      const matchGender =
        selectedGender === 'ALL' ||
        p.gender?.toLowerCase() === selectedGender.toLowerCase();

      return matchSearch && matchTeam && matchGender;
    });
  }, [participants, searchTerm, selectedTeam, selectedGender]);

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove attendee "${name}"?`)) {
      if (onDeleteParticipant) {
        onDeleteParticipant(id);
      }
      toast.success(`Removed "${name}"`);
    }
  };

  const getTeamColor = (teamName) => {
    return (
      campConfig?.teams?.find(
        (t) => t.name?.toLowerCase() === teamName?.toLowerCase()
      )?.themeColor || '#E2E8F0'
    );
  };

  return (
    <div className="bg-white dark:bg-slateMidnight rounded-2xl border border-zinc-200/80 dark:border-slateElevated shadow-xs overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-zinc-100 dark:border-slateElevated flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 md:max-w-md w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, church, city, or #serial..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slateElevated bg-zinc-50/50 dark:bg-slateMidnight/60 text-xs text-zinc-900 dark:text-slateFrost focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-slateElevated bg-zinc-50 dark:bg-slateMidnight/60 text-xs font-medium text-zinc-700 dark:text-slateFrost focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden"
          >
            <option value="ALL">All Teams ({campConfig?.teams?.length || 0})</option>
            {(campConfig?.teams || []).map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-slateElevated bg-zinc-50 dark:bg-slateMidnight/60 text-xs font-medium text-zinc-700 dark:text-slateFrost focus:bg-white dark:focus:bg-slateMidnight focus:outline-hidden"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-slateMuted px-2">
            Showing {filteredParticipants.length} of {participants.length}
          </span>
        </div>
      </div>

      {/* Mobile Card List (Screens < 768px) — the 7-column table is
          unusable on a phone, so each camper becomes a thumb-friendly card */}
      <div className="block md:hidden divide-y divide-zinc-100 dark:divide-slateElevated/50">
        {filteredParticipants.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 dark:text-slateMuted">
            <div className="flex flex-col items-center justify-center gap-2">
              <UserX className="w-8 h-8 stroke-[1.5]" />
              <span className="font-semibold text-zinc-600 dark:text-slateFrost">No matching campers found</span>
              <span className="text-[11px] text-zinc-400 dark:text-slateMuted">Try adjusting your search terms or filters</span>
            </div>
          </div>
        ) : (
          filteredParticipants.map((p) => {
            const teamColor = getTeamColor(p.assignedTeam);
            return (
              <div key={p._id || p.serialNo} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-slateFrost truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-slateMuted shrink-0">#{p.serialNo}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-slateMuted mt-0.5">
                      {p.church || '—'} • {p.location || '—'}
                    </div>
                    {p.notes && (
                      <div className="text-[11px] text-zinc-400 dark:text-slateMuted italic truncate">Note: {p.notes}</div>
                    )}
                  </div>
                  {p.assignedTeam ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 border border-black/10 shadow-2xs shrink-0"
                      style={{ backgroundColor: teamColor }}
                    >
                      {p.assignedTeam}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      Pending Payment
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-slateElevated/50 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.gender === 'Male'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {p.gender} • {p.age}y
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-slateFrost">
                    {p.assignedRoom || (p.staying === false ? 'Day Scholar' : 'Pending')}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectBadge && onSelectBadge(p)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slateElevated transition-colors"
                    title="Preview & Print Badge"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateParticipant && onUpdateParticipant(p)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slateElevated transition-colors"
                    title="Manual Team/Room Override"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p._id, p.name)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slateElevated transition-colors"
                    title="Delete Attendee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attendee Roster Table (Screens >= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 dark:bg-slateElevated/30 border-b border-zinc-200/60 dark:border-slateElevated text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slateMuted">
              <th className="py-3 px-4"># S.No</th>
              <th className="py-3 px-4">Camper Name</th>
              <th className="py-3 px-4">Gender & Age</th>
              <th className="py-3 px-4">Church / Region</th>
              <th className="py-3 px-4">Assigned Team</th>
              <th className="py-3 px-4">Room Allocation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-slateElevated/50 text-xs">
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-zinc-400 dark:text-slateMuted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="w-8 h-8 stroke-[1.5]" />
                    <span className="font-semibold text-zinc-600 dark:text-slateFrost">No matching campers found</span>
                    <span className="text-[11px] text-zinc-400 dark:text-slateMuted">Try adjusting your search terms or filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredParticipants.map((p) => {
                const teamColor = getTeamColor(p.assignedTeam);
                return (
                  <tr key={p._id || p.serialNo} className="hover:bg-zinc-50/80 dark:hover:bg-slateElevated/25 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-800 dark:text-slateFrost">
                      #{p.serialNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 dark:text-slateFrost">{p.name}</div>
                      {p.notes && (
                        <div className="text-[10px] text-zinc-400 dark:text-slateMuted italic truncate max-w-[200px]">
                          Note: {p.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.gender === 'Male'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {p.gender} • {p.age}y
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-slateMuted">
                      <div>{p.church || '—'}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-slateMuted">{p.location || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {p.assignedTeam ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 border border-black/10 shadow-2xs"
                          style={{ backgroundColor: teamColor }}
                        >
                          {p.assignedTeam}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Pending Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-zinc-800 dark:text-slateFrost block">
                        {p.assignedRoom || (p.staying === false ? 'Day Scholar' : 'Pending')}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-slateMuted">
                        {p.staying !== false ? 'Residential' : 'Non-Residential'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectBadge && onSelectBadge(p)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slateElevated transition-colors"
                          title="Preview & Print Badge"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateParticipant && onUpdateParticipant(p)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slateElevated transition-colors"
                          title="Manual Team/Room Override"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slateElevated transition-colors"
                          title="Delete Attendee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
