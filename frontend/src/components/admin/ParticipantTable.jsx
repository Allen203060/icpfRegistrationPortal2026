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
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-zinc-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, church, city, or #serial..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-700 focus:bg-white focus:outline-hidden"
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
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-700 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <span className="text-xs font-mono font-semibold text-zinc-400 px-2">
            Showing {filteredParticipants.length} of {participants.length}
          </span>
        </div>
      </div>

      {/* Attendee Roster Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 border-b border-zinc-200/60 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="py-3 px-4"># S.No</th>
              <th className="py-3 px-4">Camper Name</th>
              <th className="py-3 px-4">Gender & Age</th>
              <th className="py-3 px-4">Church / Region</th>
              <th className="py-3 px-4">Assigned Team</th>
              <th className="py-3 px-4">Room Allocation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="w-8 h-8 stroke-[1.5]" />
                    <span className="font-semibold text-zinc-600">No matching campers found</span>
                    <span className="text-[11px] text-zinc-400">Try adjusting your search terms or filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredParticipants.map((p) => {
                const teamColor = getTeamColor(p.assignedTeam);
                return (
                  <tr key={p._id || p.serialNo} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                      #{p.serialNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900">{p.name}</div>
                      {p.notes && (
                        <div className="text-[10px] text-zinc-400 italic truncate max-w-[200px]">
                          Note: {p.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.gender === 'Male'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {p.gender} • {p.age}y
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      <div>{p.church || '—'}</div>
                      <div className="text-[10px] text-zinc-400">{p.location || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 border border-black/10 shadow-2xs"
                        style={{ backgroundColor: teamColor }}
                      >
                        {p.assignedTeam || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-zinc-800 block">
                        {p.assignedRoom || (p.staying === false ? 'Day Scholar' : 'Pending')}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {p.staying !== false ? 'Residential' : 'Non-Residential'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectBadge && onSelectBadge(p)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Preview & Print Badge"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateParticipant && onUpdateParticipant(p)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Manual Team/Room Override"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
