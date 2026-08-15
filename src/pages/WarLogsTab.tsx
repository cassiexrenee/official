import React, { useState, useEffect } from "react";
import { 
  Scroll, 
  Sword, 
  Skull, 
  ShieldAlert, 
  Award, 
  Search, 
  X, 
  MapPin, 
  Trash2, 
  Clock, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  Layers
} from "lucide-react";
import { WarLogEntry, Player, MobilizationParticipantEntry } from "@/types";
import WarLogStatsSummary from "@/components/WarLogs/WarLogStatsSummary";
import WarLogModal from "@/components/WarLogs/WarLogModal";
import MobilizationTrackerCard from "@/components/mobilization/MobilizationTrackerCard";

interface WarLogsTabProps {
  players: Player[];
  onSelectPlayer?: (characterId: string) => void;
  onNavigateToTab?: (tab: string) => void;
  defaultSubView?: "WAR_LOGS" | "MOBILIZATION";
}

export const initialWarLogs: WarLogEntry[] = [];

export default function WarLogsTab({ players, onSelectPlayer, onNavigateToTab, defaultSubView = "WAR_LOGS" }: WarLogsTabProps) {
  const [activeSubView, setActiveSubView] = useState<"WAR_LOGS" | "MOBILIZATION">(defaultSubView);

  const [logs, setLogs] = useState<WarLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("dragon_council_war_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return initialWarLogs;
  });

  const [mobilizationEntries, setMobilizationEntries] = useState<MobilizationParticipantEntry[]>(() => {
    try {
      const saved = localStorage.getItem("dragon_council_mobilization");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("dragon_council_war_logs", JSON.stringify(logs));
    } catch (_) {}
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem("dragon_council_mobilization", JSON.stringify(mobilizationEntries));
    } catch (_) {}
  }, [mobilizationEntries]);

  const handleAddMobilizationEntry = (entry: MobilizationParticipantEntry) => {
    setMobilizationEntries(prev => [entry, ...prev]);
  };

  const handleDeleteMobilizationEntry = (id: string) => {
    if (confirm("Remove this participant mobilization score record?")) {
      setMobilizationEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleBulkPopulateFromRoster = () => {
    if (players.length === 0) return;
    const newEntries: MobilizationParticipantEntry[] = players.map(p => ({
      id: `mob_${p.characterId}_${Date.now()}`,
      playerId: p.characterId,
      playerName: p.currentName,
      personalScore: 0,
      tasksSubmitted: 0,
      recordedAt: new Date().toISOString()
    }));
    setMobilizationEntries(newEntries);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newActor, setNewActor] = useState("");
  const [newSeverity, setNewSeverity] = useState<"DIPLOMATIC" | "VANGUARD" | "CRITICAL" | "SYSTEM">("VANGUARD");
  const [newZone, setNewZone] = useState("");
  const [newCoords, setNewCoords] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newActor.trim() || !newDescription.trim()) {
      alert("Please provide Title, Commander/Actor, and Description.");
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleString('default', { month: 'short' })} ${now.getDate()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newLog: WarLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: formattedDate,
      title: newTitle.trim(),
      actor: newActor.trim(),
      severity: newSeverity,
      zone: newZone.trim() || "Frontline Zone",
      locationCoordinates: newCoords.trim() || undefined,
      description: newDescription.trim(),
      recordedBy: "Command Officer"
    };

    setLogs((prev) => [newLog, ...prev]);

    setNewTitle("");
    setNewActor("");
    setNewSeverity("VANGUARD");
    setNewZone("");
    setNewCoords("");
    setNewDescription("");
    setIsAddModalOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm("Are you sure you want to remove this campaign war log entry?")) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.zone && log.zone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  }).sort((a, b) => {
    if (sortOrder === "NEWEST") {
      return b.id.localeCompare(a.id);
    } else {
      return a.id.localeCompare(b.id);
    }
  });

  const totalCount = logs.length;
  const vanguardCount = logs.filter((l) => l.severity === "VANGUARD").length;
  const criticalCount = logs.filter((l) => l.severity === "CRITICAL").length;
  const diplomaticCount = logs.filter((l) => l.severity === "DIPLOMATIC").length;

  const findMatchingPlayer = (actorName: string) => {
    if (!actorName || !players) return null;
    return players.find((p) => p.currentName.toLowerCase() === actorName.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Sub-view Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gothic-silver/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4B26A] uppercase tracking-wider mb-1">
            <Scroll size={14} /> Alliance War Room & Events
          </div>
          <h1 className="text-2xl font-display font-bold text-gothic-silver tracking-tight">
            {activeSubView === "WAR_LOGS" ? "Alliance Chronicle & War Ledger" : "Alliance Mobilization Tracker"}
          </h1>
          <p className="text-xs text-gothic-rose/70 font-mono mt-0.5">
            {activeSubView === "WAR_LOGS" 
              ? "Battle dispatches, diplomatic treaties, officer awards, and strategic war chronicles." 
              : "Track individual Lord contribution scores, task completion rates, and alliance mobilization milestones."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#16181D] p-1 rounded-xl border border-gothic-silver/20 font-mono text-xs">
          <button
            id="subview-warlogs-btn"
            onClick={() => setActiveSubView("WAR_LOGS")}
            className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubView === "WAR_LOGS"
                ? "bg-[#D4B26A] text-[#16181D] shadow-md font-bold"
                : "text-gothic-silver hover:text-white"
            }`}
          >
            <Sword size={14} />
            War Chronicles
          </button>
          <button
            id="subview-mobilization-btn"
            onClick={() => setActiveSubView("MOBILIZATION")}
            className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubView === "MOBILIZATION"
                ? "bg-[#D4B26A] text-[#16181D] shadow-md font-bold"
                : "text-gothic-silver hover:text-white"
            }`}
          >
            <Award size={14} />
            Mobilization Tracker
          </button>
        </div>
      </div>

      {/* View Content */}
      {activeSubView === "MOBILIZATION" ? (
        <MobilizationTrackerCard
          entries={mobilizationEntries}
          players={players}
          onAddEntry={handleAddMobilizationEntry}
          onDeleteEntry={handleDeleteMobilizationEntry}
          onBulkPopulateFromRoster={handleBulkPopulateFromRoster}
        />
      ) : (
        <>
          <WarLogStatsSummary
            totalCount={totalCount}
            vanguardCount={vanguardCount}
            criticalCount={criticalCount}
            diplomaticCount={diplomaticCount}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

          <div className="bg-[#222831] border border-[#4B5563]/30 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B96A5]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search log title, commander name, or tactical details..."
                className="w-full bg-[#16181D] border border-[#4B5563]/40 rounded-md pl-9 pr-4 py-2 text-xs text-[#F2F0E8] placeholder-[#8B96A5] focus:outline-none focus:border-[#D4B26A]"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B96A5] hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {[
                { id: "ALL", label: "All Logs" },
                { id: "VANGUARD", label: "Vanguard Honors" },
                { id: "CRITICAL", label: "Hazards" },
                { id: "DIPLOMATIC", label: "Pacts" },
                { id: "SYSTEM", label: "System Ledger" }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedSeverity(type.id)}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    selectedSeverity === type.id
                      ? "bg-[#D4B26A] text-[#16181D] border border-[#D4B26A] shadow-[0_0_10px_rgba(212,178,106,0.3)]"
                      : "bg-[#16181D] text-[#C8CCD2]/70 border border-[#4B5563]/30 hover:text-white hover:bg-[#2F3743]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === "NEWEST" ? "OLDEST" : "NEWEST")}
              className="flex items-center gap-1.5 bg-[#16181D] border border-[#4B5563]/30 px-3 py-2 rounded text-xs font-mono text-[#C8CCD2] hover:text-white cursor-pointer"
            >
              <Clock size={14} />
              <span>{sortOrder === "NEWEST" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>

          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="bg-[#222831] border border-[#4B5563]/30 rounded-lg p-12 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#16181D] border border-[#4B5563]/40 flex items-center justify-center mx-auto text-[#8B96A5]">
                    <Scroll size={24} />
                  </div>
                  <h3 className="text-sm font-bold font-mono text-[#F2F0E8] uppercase tracking-wider">
                    {searchTerm || selectedSeverity !== "ALL" ? "No Matching Chronicles Found" : "Alliance War Chronicle is Clear"}
                  </h3>
                  <p className="text-xs text-[#8B96A5]">
                    {searchTerm || selectedSeverity !== "ALL"
                      ? "Adjust search parameters or severity filter to view historical records."
                      : "Record frontline battle reports, cross-realm diplomacy treaties, or honor rolls."}
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#16181D] rounded font-mono font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sword size={14} />
                    Record First War Log
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredLogs.map((log) => {
                  const matchedPlayer = findMatchingPlayer(log.actor);

                  return (
                    <div
                      key={log.id}
                      className="bg-[#222831] border border-[#4B5563]/30 hover:border-[#D4B26A]/50 rounded-lg p-4 transition-all shadow-sm space-y-3 relative group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#4B5563]/20 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              log.severity === "VANGUARD"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : log.severity === "CRITICAL"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                : log.severity === "DIPLOMATIC"
                                ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                : "bg-slate-500/10 text-slate-300 border-slate-500/30"
                            }`}
                          >
                            {log.severity}
                          </span>
                          <h4 className="text-sm font-bold font-mono text-[#F2F0E8]">{log.title}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-[#8B96A5] flex items-center gap-1">
                            <Clock size={12} />
                            {log.timestamp}
                          </span>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-[#8B96A5] hover:text-rose-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                            title="Purge Log Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#C8CCD2]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8B96A5]">Commander / Party:</span>
                          <span className="font-bold text-[#F2F0E8]">{log.actor}</span>
                          {matchedPlayer && onSelectPlayer && (
                            <button
                              onClick={() => {
                                onSelectPlayer(matchedPlayer.characterId);
                                if (onNavigateToTab) onNavigateToTab("players");
                              }}
                              className="text-[10px] text-[#D4B26A] hover:underline flex items-center gap-0.5 ml-1"
                              title="View dossier in Member Registry"
                            >
                              <UserCheck size={11} />
                              Dossier
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#C8CCD2]/90 leading-relaxed font-sans bg-[#16181D]/60 p-3 rounded border border-[#4B5563]/20">
                        "{log.description}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-[#8B96A5] pt-1">
                        <div className="flex items-center gap-3">
                          {log.zone && (
                            <span className="flex items-center gap-1 text-[#7FA8C9]">
                              <MapPin size={12} />
                              {log.zone}
                            </span>
                          )}
                          {log.locationCoordinates && (
                            <span className="text-[#8B96A5] border-l border-[#4B5563]/30 pl-3">
                              Grid: {log.locationCoordinates}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <WarLogModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleAddLog}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newActor={newActor}
            setNewActor={setNewActor}
            newSeverity={newSeverity}
            setNewSeverity={setNewSeverity}
            newZone={newZone}
            setNewZone={setNewZone}
            newCoords={newCoords}
            setNewCoords={setNewCoords}
            newDescription={newDescription}
            setNewDescription={setNewDescription}
          />
        </>
      )}
    </div>
  );
}

