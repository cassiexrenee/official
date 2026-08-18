import React from "react";
import { LayoutDashboard } from "lucide-react";
import { Player, Snapshot, PerformanceEvaluation, AllianceSettings } from "../types";
import OverviewMetricsGrid from "../components/overview/OverviewMetricsGrid";

interface OverviewTabProps {
  players: Player[];
  snapshots: Snapshot[];
  evaluations: PerformanceEvaluation[];
  settings: AllianceSettings;
  onSelectPlayer: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function OverviewTab({
  players,
  snapshots,
  evaluations,
  settings,
  onSelectPlayer,
  onNavigateToTab
}: OverviewTabProps) {
  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gothic-silver/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#89A6B8] uppercase tracking-widest">
            <LayoutDashboard size={14} /> Leadership Command Hub
          </div>
          <h1 className="text-2xl font-display font-bold text-gothic-silver tracking-tight">
            Alliance Overview & Intelligence
          </h1>
          <p className="text-xs text-gothic-rose/70 font-mono mt-0.5">
            Real-time telemetry overview and automated performance metrics.
          </p>
        </div>
      </div>

      <OverviewMetricsGrid
        playersCount={players.length}
        snapshots={snapshots}
        evaluations={evaluations}
      />
    </div>
  );
}