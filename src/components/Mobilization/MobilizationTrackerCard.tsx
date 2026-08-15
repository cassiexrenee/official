import React from "react";
import { Award, CheckCircle, Users } from "lucide-react";
import { MobilizationParticipantEntry } from "../../types";

interface MobilizationTrackerCardProps {
  entries: MobilizationParticipantEntry[];
  onExportCSV: () => void;
}

export default function MobilizationTrackerCard({ entries, onExportCSV }: MobilizationTrackerCardProps) {
  const totalScore = entries.reduce((acc, curr) => acc + curr.personalScore, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gothic-velvet p-4 rounded-xl border border-gothic-silver/20">
        <div>
          <h2 className="text-lg font-bold font-display text-gothic-silver flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Alliance Mobilization Tracker
          </h2>
          <p className="text-xs font-mono text-gothic-rose/60">Total Alliance Mobilization Score: <strong className="text-amber-300">{totalScore.toLocaleString()}</strong></p>
        </div>
        <button
          onClick={onExportCSV}
          className="px-4 py-2 bg-gothic-ink hover:bg-gothic-ink/80 text-gothic-silver border border-gothic-silver/20 rounded-lg text-xs font-mono font-semibold"
        >
          Export Participation CSV
        </button>
      </div>

      <div className="bg-gothic-velvet rounded-xl border border-gothic-silver/20 overflow-hidden shadow-xl">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-gothic-ink text-gothic-rose/60 border-b border-gothic-silver/20 uppercase text-[10px]">
            <tr>
              <th className="p-3">Lord Name</th>
              <th className="p-3">Character ID</th>
              <th className="p-3 text-right">Personal Score</th>
              <th className="p-3 text-right">Tasks Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gothic-silver/10 text-gothic-silver">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gothic-ink/40 transition-colors">
                <td className="p-3 font-bold">{entry.playerName}</td>
                <td className="p-3 text-gothic-rose/50">{entry.playerId}</td>
                <td className="p-3 text-right font-bold text-amber-300">{entry.personalScore.toLocaleString()}</td>
                <td className="p-3 text-right font-bold text-emerald-400">{entry.tasksSubmitted}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gothic-rose/50">
                  No mobilization records scanned yet. Import data or upload a summary screenshot/text.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}