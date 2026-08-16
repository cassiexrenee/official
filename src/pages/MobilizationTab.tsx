import React, { useState, useMemo, useRef } from "react";
import { Upload, ScanText, Users, History, Trash2, CheckCircle2, AlertTriangle, X, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Player, MobilizationEvent, MobilizationEntry } from "@/types";
import { parseMobilizationText, matchPlayerByName, ParsedMobilizationRow } from "@/utils/mobilizationParsers";

interface MobilizationTabProps {
  players: Player[];
  mobilizationEvents: MobilizationEvent[];
  mobilizationEntries: MobilizationEntry[];
  onSaveMobilization: (event: MobilizationEvent, entries: MobilizationEntry[]) => void;
  onDeleteMobilizationEvent: (eventId: string) => void;
}

interface DraftRow extends ParsedMobilizationRow {
  draftId: string;
  playerId: string | null;
}

export default function MobilizationTab({
  players,
  mobilizationEvents,
  mobilizationEntries,
  onSaveMobilization,
  onDeleteMobilizationEvent
}: MobilizationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "history">("upload");

  // --- Upload / OCR state ---
  const [rawText, setRawText] = useState("");
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- History state ---
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [trendPlayerId, setTrendPlayerId] = useState<string>("");

  const getPlayerName = (id: string | null) => {
    if (!id) return null;
    return players.find((p) => p.characterId === id)?.currentName || null;
  };

  const handleFileUpload = async (file: File) => {
    setIsOcrRunning(true);
    setOcrError(null);
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(file, "eng");
      setRawText((prev) => (prev ? `${prev}\n${data.text}` : data.text));
    } catch (err) {
      console.error("OCR error:", err);
      setOcrError("Failed to scan the image. You can still paste the data manually below.");
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleParseRows = () => {
    const parsed = parseMobilizationText(rawText);
    const withMatches: DraftRow[] = parsed.map((row, idx) => ({
      ...row,
      draftId: `draft_${Date.now()}_${idx}`,
      playerId: matchPlayerByName(row.rawName, players)
    }));
    setDraftRows(withMatches);
  };

  const handleAddManualRow = () => {
    setDraftRows((prev) => [
      ...prev,
      { draftId: `draft_${Date.now()}_manual`, rawName: "", score: 0, questsSubmitted: 0, questsAccepted: 0, playerId: null }
    ]);
  };

  const updateDraftRow = (draftId: string, field: keyof DraftRow, value: any) => {
    setDraftRows((prev) => prev.map((r) => (r.draftId === draftId ? { ...r, [field]: value } : r)));
  };

  const removeDraftRow = (draftId: string) => {
    setDraftRows((prev) => prev.filter((r) => r.draftId !== draftId));
  };

  const handleSave = () => {
    if (draftRows.length === 0) return alert("No rows to save. Parse or add at least one row first.");
    if (!eventName.trim()) return alert("Please name this mobilization event (e.g. 'Week 32 Mobilization').");

    const eventId = `mob_event_${Date.now()}`;
    const newEvent: MobilizationEvent = {
      id: eventId,
      name: eventName.trim(),
      eventDate,
      source: rawText.trim() ? "OCR" : "Manual",
      createdAt: new Date().toISOString()
    };

    const newEntries: MobilizationEntry[] = draftRows
      .filter((r) => r.rawName.trim())
      .map((r) => ({
        id: `mob_entry_${eventId}_${r.draftId}`,
        eventId,
        playerId: r.playerId,
        rawName: r.rawName.trim(),
        score: r.score,
        questsSubmitted: r.questsSubmitted,
        questsAccepted: r.questsAccepted,
        rank: r.rank,
        createdAt: new Date().toISOString()
      }));

    onSaveMobilization(newEvent, newEntries);

    setRawText("");
    setDraftRows([]);
    setEventName("");
    setOcrError(null);
    setActiveSubTab("history");
    setSelectedEventId(eventId);
  };

  const matchedCount = draftRows.filter((r) => r.playerId).length;

  // --- History / trend derived data ---
  const sortedEvents = useMemo(
    () => [...mobilizationEvents].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
    [mobilizationEvents]
  );

  const selectedEventEntries = useMemo(
    () => mobilizationEntries.filter((e) => e.eventId === selectedEventId),
    [mobilizationEntries, selectedEventId]
  );

  const trendData = useMemo(() => {
    if (!trendPlayerId) return [];
    return mobilizationEntries
      .filter((e) => e.playerId === trendPlayerId)
      .map((e) => {
        const event = mobilizationEvents.find((ev) => ev.id === e.eventId);
        return {
          date: event?.eventDate || "",
          label: event?.name || "",
          score: e.score,
          submitted: e.questsSubmitted,
          accepted: e.questsAccepted
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [mobilizationEntries, mobilizationEvents, trendPlayerId]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="border-b border-gothic-silver/25 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[#89A6B8] uppercase tracking-widest">
          <ScanText size={14} /> Alliance Mobilization Track
        </div>
        <h1 className="text-2xl font-display font-bold text-gothic-silver tracking-tight">
          Mobilization Score & Quest Tracker
        </h1>
        <p className="text-xs text-gothic-rose/70 font-mono mt-0.5">
          Scan or paste mobilization leaderboard results, link to your roster, and track personal score and quest completion over time.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gothic-silver/20 pb-px">
        <button
          onClick={() => setActiveSubTab("upload")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${activeSubTab === "upload" ? "border-gothic-silver text-gothic-silver" : "border-transparent text-gothic-rose/50"}`}
        >
          Upload New Event
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === "history" ? "border-gothic-silver text-gothic-silver" : "border-transparent text-gothic-rose/50"}`}
        >
          <History size={14} /> History & Trends ({mobilizationEvents.length})
        </button>
      </div>

      {activeSubTab === "upload" && (
        <div className="space-y-6">
          {/* Event metadata */}
          <div className="p-4 rounded-xl bg-gothic-velvet border border-gothic-silver/20 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gothic-rose/50 block">Event Name</label>
              <input
                type="text"
                placeholder="e.g. Week 32 Mobilization"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-gothic-ink border border-gothic-silver/20 text-gothic-silver p-2 rounded-lg outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gothic-rose/50 block">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-gothic-ink border border-gothic-silver/20 text-gothic-silver p-2 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Image upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gothic-silver/20 bg-gothic-velvet hover:bg-gothic-ink/40 rounded-2xl p-8 text-center cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <Upload size={28} className="mx-auto text-gothic-silver mb-3" />
            <h3 className="text-sm font-bold text-gothic-silver uppercase">Upload Mobilization Screenshot</h3>
            <p className="text-xs text-gothic-rose/60 mt-1">Click to select an image. Scanned text will appear below for review.</p>
            {isOcrRunning && <p className="text-xs text-amber-300 font-mono mt-3 animate-pulse">Scanning image, this can take a few seconds...</p>}
            {ocrError && <p className="text-xs text-red-300 font-mono mt-3">{ocrError}</p>}
          </div>

          {/* Raw text review/paste */}
          <div className="p-4 rounded-xl bg-gothic-velvet border border-gothic-silver/20 space-y-2">
            <label className="text-[10px] uppercase font-bold text-gothic-rose/50 block font-mono">
              Scanned / Pasted Text (edit as needed before parsing)
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Paste rows here, one per line, e.g.:\n1 Malischka 2,472 11/11\n2 ЭтоНеШутка 2,412 11/11"}
              className="w-full bg-gothic-ink border border-gothic-silver/20 text-xs font-mono text-gothic-silver p-3 rounded-lg outline-none"
            />
            <button
              onClick={handleParseRows}
              disabled={!rawText.trim()}
              className="px-4 py-2 bg-gothic-silver hover:bg-white disabled:opacity-40 text-[#111113] font-bold text-xs rounded-lg font-mono cursor-pointer"
            >
              Parse Rows
            </button>
          </div>

          {/* Draft rows table */}
          {draftRows.length > 0 && (
            <div className="rounded-xl border border-gothic-silver/20 bg-gothic-velvet overflow-hidden">
              <div className="p-3 bg-gothic-void border-b border-gothic-silver/20 flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-gothic-silver">{draftRows.length} rows parsed — {matchedCount} matched to roster</span>
                <button onClick={handleAddManualRow} className="text-gothic-silver hover:text-white underline cursor-pointer">+ Add row manually</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-gothic-void border-b border-gothic-silver/20 text-[10px] uppercase text-gothic-rose/50">
                      <th className="p-2 pl-3">Name (scanned)</th>
                      <th className="p-2">Matched Player</th>
                      <th className="p-2 text-right">Score</th>
                      <th className="p-2 text-right">Submitted</th>
                      <th className="p-2 text-right">Accepted</th>
                      <th className="p-2 text-center w-10">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232328]">
                    {draftRows.map((row) => (
                      <tr key={row.draftId} className={!row.playerId ? "bg-amber-950/10" : ""}>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.rawName}
                            onChange={(e) => updateDraftRow(row.draftId, "rawName", e.target.value)}
                            className="bg-transparent border-0 hover:bg-gothic-ink/60 focus:bg-gothic-ink text-xs w-full px-1.5 py-1 rounded outline-none text-gothic-silver"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            value={row.playerId || ""}
                            onChange={(e) => updateDraftRow(row.draftId, "playerId", e.target.value || null)}
                            className={`bg-gothic-ink border text-xs px-1.5 py-1 rounded outline-none cursor-pointer w-full ${!row.playerId ? "border-amber-500/50 text-amber-300" : "border-gothic-silver/20 text-gothic-silver"}`}
                          >
                            <option value="">-- Unmatched --</option>
                            {players.map((p) => (
                              <option key={p.characterId} value={p.characterId}>{p.currentName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.score}
                            onChange={(e) => updateDraftRow(row.draftId, "score", Number(e.target.value) || 0)}
                            className="bg-transparent border-0 hover:bg-gothic-ink/60 focus:bg-gothic-ink text-xs w-full px-1.5 py-1 rounded outline-none text-right text-amber-300 font-bold"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.questsSubmitted}
                            onChange={(e) => updateDraftRow(row.draftId, "questsSubmitted", Number(e.target.value) || 0)}
                            className="bg-transparent border-0 hover:bg-gothic-ink/60 focus:bg-gothic-ink text-xs w-full px-1.5 py-1 rounded outline-none text-right text-gothic-silver"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.questsAccepted}
                            onChange={(e) => updateDraftRow(row.draftId, "questsAccepted", Number(e.target.value) || 0)}
                            className="bg-transparent border-0 hover:bg-gothic-ink/60 focus:bg-gothic-ink text-xs w-full px-1.5 py-1 rounded outline-none text-right text-emerald-400"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={() => removeDraftRow(row.draftId)} className="p-1 text-red-400 hover:text-red-300 cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gothic-void border-t border-gothic-silver/20 flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Save Mobilization Event
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "history" && (
        <div className="space-y-6">
          {/* Player trend lookup */}
          <div className="p-4 rounded-xl bg-gothic-velvet border border-gothic-silver/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-gothic-silver uppercase">
              <TrendingUp size={14} className="text-[#89A6B8]" /> Player Trend Lookup
            </div>
            <select
              value={trendPlayerId}
              onChange={(e) => setTrendPlayerId(e.target.value)}
              className="w-full sm:w-80 bg-gothic-ink border border-gothic-silver/20 text-xs text-gothic-silver p-2 rounded-lg outline-none cursor-pointer font-mono"
            >
              <option value="">-- Select a player --</option>
              {players.map((p) => (
                <option key={p.characterId} value={p.characterId}>{p.currentName}</option>
              ))}
            </select>

            {trendPlayerId && trendData.length === 0 && (
              <p className="text-xs text-gothic-rose/50 font-mono">No mobilization history recorded for this player yet.</p>
            )}

            {trendPlayerId && trendData.length > 0 && (
              <div className="space-y-3">
                <div className="bg-gothic-ink p-4 rounded-xl border border-gothic-silver/10" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8B96A5" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#8B96A5" }} />
                      <Tooltip contentStyle={{ background: "#16181D", border: "1px solid #4B5563", fontSize: 11 }} />
                      <Line type="monotone" dataKey="score" stroke="#D4B26A" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gothic-rose/50">
                  {trendData.map((d, i) => (
                    <div key={i} className="p-2 bg-gothic-ink rounded border border-gothic-silver/10">
                      <p className="text-gothic-silver font-bold truncate">{d.label}</p>
                      <p>Score: {d.score.toLocaleString()}</p>
                      <p>Quests: {d.accepted}/{d.submitted}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Event list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2">
              {sortedEvents.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-gothic-velvet border border-gothic-silver/20 text-gothic-rose/50 text-xs font-mono">
                  No mobilization events recorded yet.
                </div>
              ) : (
                sortedEvents.map((ev) => {
                  const count = mobilizationEntries.filter((e) => e.eventId === ev.id).length;
                  const isSelected = selectedEventId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs font-mono ${
                        isSelected ? "bg-gothic-ink border-gothic-silver" : "bg-gothic-velvet border-gothic-silver/20 hover:border-[#89A6B8]/40"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gothic-silver">{ev.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${ev.name}"?`)) onDeleteMobilizationEvent(ev.id); }}
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-gothic-rose/50 mt-1">{ev.eventDate} • {count} entries • {ev.source}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedEventId ? (
                <div className="rounded-xl border border-gothic-silver/20 bg-gothic-velvet overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-gothic-void border-b border-gothic-silver/20 text-[10px] uppercase text-gothic-rose/50">
                        <th className="p-2 pl-3">Name</th>
                        <th className="p-2">Roster Match</th>
                        <th className="p-2 text-right">Score</th>
                        <th className="p-2 text-right">Submitted</th>
                        <th className="p-2 text-right">Accepted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232328]">
                      {selectedEventEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="p-2 pl-3 text-gothic-silver font-semibold">{entry.rawName}</td>
                          <td className="p-2">
                            {entry.playerId ? (
                              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> {getPlayerName(entry.playerId)}</span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={11} /> Unmatched</span>
                            )}
                          </td>
                          <td className="p-2 text-right text-amber-300 font-bold">{entry.score.toLocaleString()}</td>
                          <td className="p-2 text-right">{entry.questsSubmitted}</td>
                          <td className="p-2 text-right text-emerald-400">{entry.questsAccepted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl bg-gothic-velvet border border-gothic-silver/20 text-gothic-rose/50 text-xs font-mono">
                  Select an event on the left to view its entries.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}