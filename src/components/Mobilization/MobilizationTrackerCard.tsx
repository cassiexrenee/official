import React, { useState, useRef } from "react";
import { 
  Award, Download, Plus, Search, Trash2, Users, CheckCircle2, 
  TrendingUp, Sparkles, X, FileText, Image as ImageIcon, 
  Check, RefreshCw, Layers, UploadCloud, AlertCircle, FileCheck
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { MobilizationParticipantEntry, Player } from "../../types";

interface MobilizationTrackerCardProps {
  entries: MobilizationParticipantEntry[];
  players?: Player[];
  onAddEntry?: (entry: MobilizationParticipantEntry) => void;
  onUpdateEntry?: (entry: MobilizationParticipantEntry) => void;
  onSetEntries?: (entries: MobilizationParticipantEntry[]) => void;
  onDeleteEntry?: (id: string) => void;
  onBulkPopulateFromRoster?: () => void;
  onExportCSV?: () => void;
}

interface BatchImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "success" | "error";
  statusText?: string;
  extractedCount?: number;
}

export default function MobilizationTrackerCard({ 
  entries, 
  players = [],
  onAddEntry,
  onUpdateEntry,
  onSetEntries,
  onDeleteEntry,
  onBulkPopulateFromRoster,
  onExportCSV 
}: MobilizationTrackerCardProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "score" | "tasks" | "name">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<"AI" | "OCR">("AI");
  const [scanStatus, setScanStatus] = useState("");
  const [scanPreviewImage, setScanPreviewImage] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<MobilizationParticipantEntry[]>([]);

  // Batch scan state
  const [batchItems, setBatchItems] = useState<BatchImageItem[]>([]);
  const [batchScanning, setBatchScanning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchExtractedRows, setBatchExtractedRows] = useState<MobilizationParticipantEntry[]>([]);

  // Paste text state
  const [pasteInputText, setPasteInputText] = useState("");

  // Form state
  const [formPlayerName, setFormPlayerName] = useState("");
  const [formPlayerId, setFormPlayerId] = useState("");
  const [formScore, setFormScore] = useState<number | "">("");
  const [formTasksCompleted, setFormTasksCompleted] = useState<number | "">(11);
  const [formTasksMax, setFormTasksMax] = useState<number | "">(11);
  const [formRank, setFormRank] = useState<number | "">("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const totalScore = entries.reduce((acc, curr) => acc + (curr.personalScore || 0), 0);
  const totalTasks = entries.reduce((acc, curr) => acc + (curr.tasksCompleted ?? curr.tasksSubmitted ?? 0), 0);
  const avgScore = entries.length > 0 ? Math.round(totalScore / entries.length) : 0;
  const fullCompletionCount = entries.filter(e => (e.tasksCompleted ?? e.tasksSubmitted ?? 0) >= (e.tasksMax || 11)).length;
  const fullCompletionPct = entries.length > 0 ? Math.round((fullCompletionCount / entries.length) * 100) : 0;

  const handleSelectFromRoster = (characterId: string) => {
    const found = players.find(p => p.characterId === characterId);
    if (found) {
      setFormPlayerName(found.currentName);
      setFormPlayerId(found.characterId);
    }
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlayerName.trim()) return;

    const newEntry: MobilizationParticipantEntry = {
      id: `mob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rank: formRank !== "" ? Number(formRank) : entries.length + 1,
      playerId: formPlayerId.trim() || `p_${Date.now()}`,
      playerName: formPlayerName.trim(),
      personalScore: Number(formScore) || 0,
      tasksCompleted: formTasksCompleted !== "" ? Number(formTasksCompleted) : 11,
      tasksMax: formTasksMax !== "" ? Number(formTasksMax) : 11,
      tasksSubmitted: formTasksCompleted !== "" ? Number(formTasksCompleted) : 11,
      recordedAt: new Date().toISOString()
    };

    if (onAddEntry) {
      onAddEntry(newEntry);
    }

    setFormPlayerName("");
    setFormPlayerId("");
    setFormScore("");
    setFormTasksCompleted(11);
    setFormTasksMax(11);
    setFormRank("");
    setIsAddModalOpen(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process single image
  const handleProcessImage = async (file: File) => {
    setScanning(true);
    setScanStatus("Uploading image for AI Vision analysis...");

    try {
      const base64Data = await fileToBase64(file);
      setScanPreviewImage(base64Data);

      try {
        setScanStatus("Analyzing leaderboard with Gemini AI Vision...");
        const response = await fetch("/api/mobilization/scan-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg"
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.rows && data.rows.length > 0) {
            const mappedRows: MobilizationParticipantEntry[] = data.rows.map((r: any, idx: number) => {
              const matched = players.find(p => p.currentName.toLowerCase() === (r.playerName || "").toLowerCase());
              return {
                id: `mob_ai_${Date.now()}_${idx}`,
                rank: r.rank || idx + 1,
                playerId: matched ? matched.characterId : `p_${Date.now()}_${idx}`,
                playerName: r.playerName || "Unknown Lord",
                personalScore: Number(r.personalScore) || 0,
                tasksCompleted: Number(r.tasksCompleted) || 11,
                tasksMax: Number(r.tasksMax) || 11,
                tasksSubmitted: Number(r.tasksCompleted) || 11,
                recordedAt: new Date().toISOString()
              };
            });
            setScanMethod("AI");
            setExtractedRows(mappedRows);
            setIsOCRModalOpen(true);
            setScanning(false);
            return;
          }
        }
      } catch (err) {
        console.warn("AI scanner request failed, falling back to local OCR engine:", err);
      }

      // Local Tesseract OCR fallback
      setScanMethod("OCR");
      setScanStatus("Using high-accuracy local OCR engine...");
      const worker = await createWorker(["eng", "rus", "jpn", "chi_sim"], undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setScanStatus(`Reading text: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const ret = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseLeaderboardText(ret.data.text);
      if (parsed.length > 0) {
        setExtractedRows(parsed);
        setIsOCRModalOpen(true);
      } else {
        alert("Could not automatically recognize rows from the image. You can try pasting the text or manually entering records.");
      }
    } catch (ocrErr) {
      console.error("Local OCR failed:", ocrErr);
      alert("Failed to extract data from image. You can use the 'Paste Text' button to paste leaderboard text directly.");
    } finally {
      setScanning(false);
    }
  };

  // Batch Image Selection
  const handleBatchFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: BatchImageItem[] = Array.from(files).map((file, i) => ({
      id: `batch_file_${Date.now()}_${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      statusText: "Ready to scan"
    }));
    setBatchItems(prev => [...prev, ...newItems]);
    setIsBatchModalOpen(true);
  };

  // Execute Batch Image Processing
  const handleRunBatchScan = async () => {
    if (batchItems.length === 0) return;
    setBatchScanning(true);
    setBatchProgress({ current: 0, total: batchItems.length });

    const updatedItems = [...batchItems];
    const extractedCumulative: MobilizationParticipantEntry[] = [];

    // Attempt Server-side batch endpoint first with all base64 data
    try {
      const preparedImages = await Promise.all(
        batchItems.map(async (item) => ({
          filename: item.file.name,
          imageBase64: await fileToBase64(item.file),
          mimeType: item.file.type || "image/jpeg"
        }))
      );

      const response = await fetch("/api/mobilization/scan-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: preparedImages })
      });

      if (response.ok) {
        const batchData = await response.json();
        if (batchData.rows && batchData.rows.length > 0) {
          const mappedRows: MobilizationParticipantEntry[] = batchData.rows.map((r: any, idx: number) => {
            const matched = players.find(p => p.currentName.toLowerCase() === (r.playerName || "").toLowerCase());
            return {
              id: `mob_batch_ai_${Date.now()}_${idx}`,
              rank: r.rank || idx + 1,
              playerId: matched ? matched.characterId : `p_${Date.now()}_${idx}`,
              playerName: r.playerName || "Unknown Lord",
              personalScore: Number(r.personalScore) || 0,
              tasksCompleted: Number(r.tasksCompleted) || 11,
              tasksMax: Number(r.tasksMax) || 11,
              tasksSubmitted: Number(r.tasksCompleted) || 11,
              recordedAt: new Date().toISOString()
            };
          });

          // Mark all items success
          setBatchItems(prev => prev.map(item => ({ ...item, status: "success", statusText: "Scanned with Gemini AI" })));
          setBatchExtractedRows(mappedRows);
          setBatchScanning(false);
          return;
        }
      }
    } catch (batchErr) {
      console.warn("Server batch scan endpoint failed, falling back to sequential client extraction:", batchErr);
    }

    // Fallback: Sequential OCR per image
    for (let i = 0; i < updatedItems.length; i++) {
      setBatchProgress({ current: i + 1, total: updatedItems.length });
      updatedItems[i].status = "processing";
      updatedItems[i].statusText = "Processing OCR...";
      setBatchItems([...updatedItems]);

      try {
        const worker = await createWorker(["eng", "rus", "jpn", "chi_sim"], undefined);
        const ret = await worker.recognize(updatedItems[i].file);
        await worker.terminate();

        const parsed = parseLeaderboardText(ret.data.text);
        extractedCumulative.push(...parsed);

        updatedItems[i].status = "success";
        updatedItems[i].statusText = `Extracted ${parsed.length} rows`;
        updatedItems[i].extractedCount = parsed.length;
      } catch (err: any) {
        updatedItems[i].status = "error";
        updatedItems[i].statusText = err?.message || "Failed";
      }
      setBatchItems([...updatedItems]);
    }

    // Deduplicate cumulative rows by player name
    const mergedMap = new Map<string, MobilizationParticipantEntry>();
    extractedCumulative.forEach(row => {
      const key = row.playerName.toLowerCase().trim();
      if (!key) return;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, row);
      } else {
        const existing = mergedMap.get(key)!;
        if (row.personalScore > existing.personalScore) {
          mergedMap.set(key, row);
        }
      }
    });

    const finalRanked = Array.from(mergedMap.values())
      .sort((a, b) => b.personalScore - a.personalScore)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    setBatchExtractedRows(finalRanked);
    setBatchScanning(false);
  };

  const handleApplyBatchRows = () => {
    if (batchExtractedRows.length === 0) return;
    const sorted = [...batchExtractedRows].sort((a, b) => (b.personalScore || 0) - (a.personalScore || 0));
    const ranked = sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));

    if (onSetEntries) {
      onSetEntries(ranked);
    } else if (onAddEntry) {
      ranked.forEach(row => onAddEntry(row));
    }
    setIsBatchModalOpen(false);
    setBatchItems([]);
    setBatchExtractedRows([]);
  };

  const parseLeaderboardText = (rawText: string): MobilizationParticipantEntry[] => {
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    const results: MobilizationParticipantEntry[] = [];

    lines.forEach((line, index) => {
      const taskMatch = line.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
      const tasksDone = taskMatch ? parseInt(taskMatch[1], 10) : 11;
      const tasksMax = taskMatch ? parseInt(taskMatch[2], 10) : 11;

      let lineWithoutTask = taskMatch ? line.replace(taskMatch[0], "").trim() : line;

      const scoreMatch = lineWithoutTask.match(/(\d{1,3}(?:[,\.\s]\d{3})|\d{3,6})/);
      let score = 0;
      if (scoreMatch) {
        score = parseInt(scoreMatch[1].replace(/[,\.\s]/g, ""), 10);
        lineWithoutTask = lineWithoutTask.replace(scoreMatch[0], "").trim();
      }

      // Discard rank prefixes (e.g. "1.", "1 ", "#1", "[1]", "(1)") and avatar text artifacts
      let cleanedName = lineWithoutTask.replace(/^#?\d+[\.\s\)\:\-_\/]+/, "").trim();
      cleanedName = cleanedName.replace(/^[①②③④⑤⑥⑦⑧⑨⑩\(\)\[\]#\.\-:\s]+/, "").trim();

      if (cleanedName && (score > 0 || taskMatch)) {
        const matched = players.find(p => p.currentName.toLowerCase() === cleanedName.toLowerCase());
        results.push({
          id: `mob_ocr_${Date.now()}_${index}`,
          rank: index + 1,
          playerId: matched ? matched.characterId : `p_${Date.now()}_${index}`,
          playerName: matched ? matched.currentName : cleanedName,
          personalScore: score,
          tasksCompleted: tasksDone,
          tasksMax: tasksMax,
          tasksSubmitted: tasksDone,
          recordedAt: new Date().toISOString()
        });
      }
    });

    return results
      .sort((a, b) => (b.personalScore || 0) - (a.personalScore || 0))
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  };

  const handleApplyExtractedRows = () => {
    if (extractedRows.length === 0) return;
    const sorted = [...extractedRows].sort((a, b) => (b.personalScore || 0) - (a.personalScore || 0));
    const ranked = sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));

    if (onSetEntries) {
      onSetEntries(ranked);
    } else if (onAddEntry) {
      ranked.forEach(row => onAddEntry(row));
    }
    setIsOCRModalOpen(false);
    setExtractedRows([]);
  };

  const handlePasteSubmit = () => {
    if (!pasteInputText.trim()) return;
    const parsed = parseLeaderboardText(pasteInputText);
    if (parsed.length > 0) {
      const sorted = [...parsed].sort((a, b) => b.personalScore - a.personalScore);
      const ranked = sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
      if (onSetEntries) {
        onSetEntries(ranked);
      } else if (onAddEntry) {
        ranked.forEach(row => onAddEntry(row));
      }
      setPasteInputText("");
      setIsPasteModalOpen(false);
    } else {
      alert("Could not parse text. Format example:\n1 Malischka 2,472 11/11\n2 ARGUS01 2,405 11/11");
    }
  };

  const sortedEntries = [...entries]
    .filter(entry => 
      entry.playerName.toLowerCase().includes(search.toLowerCase()) ||
      entry.playerId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === "rank") comp = (a.rank || 9999) - (b.rank || 9999);
      else if (sortBy === "score") comp = (b.personalScore || 0) - (a.personalScore || 0);
      else if (sortBy === "tasks") {
        const aT = a.tasksCompleted ?? a.tasksSubmitted ?? 0;
        const bT = b.tasksCompleted ?? b.tasksSubmitted ?? 0;
        comp = bT - aT;
      }
      else if (sortBy === "name") comp = a.playerName.localeCompare(b.playerName);
      return sortDir === "desc" ? -comp : comp;
    });

  const getRankBadge = (rankNum: number | undefined, index: number) => {
    const r = rankNum || index + 1;
    if (r === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#FFE259] to-[#FFA751] text-[#4A2600] font-black text-sm flex items-center justify-center shadow-[0_0_12px_rgba(255,215,0,0.5)] border-2 border-[#FFF0A0]">
          1
        </div>
      );
    }
    if (r === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E0EAFC] to-[#CFDEF3] text-[#2C3E50] font-black text-sm flex items-center justify-center shadow-[0_0_10px_rgba(224,234,252,0.4)] border-2 border-white">
          2
        </div>
      );
    }
    if (r === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#E29B63] to-[#A75328] text-white font-black text-sm flex items-center justify-center shadow-[0_0_10px_rgba(226,155,99,0.4)] border-2 border-[#FFD0B0]">
          3
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-[#1F242D] text-[#C8CCD2] font-bold text-sm flex items-center justify-center border border-gothic-silver/20">
        {r}
      </div>
    );
  };

  const handleDefaultExportCSV = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }
    const headers = ["Rank", "Lord Name", "Character ID", "Personal Score", "Tasks Completed", "Tasks Max", "Progress", "Recorded At"];
    const rows = entries.map(e => [
      e.rank || "",
      `"${e.playerName.replace(/"/g, '""')}"`,
      `"${e.playerId}"`,
      e.personalScore,
      e.tasksCompleted ?? e.tasksSubmitted ?? 0,
      e.tasksMax || 11,
      `"${(e.tasksCompleted ?? e.tasksSubmitted ?? 0)}/${e.tasksMax || 11}"`,
      `"${e.recordedAt || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `alliance_mobilization_leaderboard_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Visual Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2A1D13] via-[#3D2817] to-[#1F1710] border-2 border-[#D4B26A]/40 p-6 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D4B26A]/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4B26A]/20 border border-[#D4B26A]/50 text-[#F5DF9E] text-xs font-mono font-bold tracking-wider">
              <Award size={14} className="text-[#D4B26A]" /> OFFICIAL ALLIANCE MOBILIZATION LEADERBOARD
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[#FFF2D4] tracking-wide drop-shadow-md">
              Alliance Mobilization Tracker
            </h2>
            <p className="text-xs sm:text-sm text-[#D7C4A5] max-w-2xl font-sans leading-relaxed">
              Upload single or batch in-game screenshots to automatically extract Lord ranks, exact scores, and 11/11 task progress using AI Vision and OCR.
            </p>
          </div>

          {/* Upload / Batch Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessImage(file);
                e.target.value = "";
              }}
            />

            <input
              type="file"
              ref={batchFileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleBatchFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Batch Upload Option */}
            <button
              id="btn-batch-upload-mob"
              onClick={() => batchFileInputRef.current?.click()}
              className="px-4 py-2.5 bg-gradient-to-b from-[#E5C37B] to-[#C4A057] hover:from-[#F0D597] hover:to-[#D4B26A] text-[#1E140A] font-bold text-xs font-mono rounded-xl shadow-[0_0_20px_rgba(212,178,106,0.45)] flex items-center gap-2 border border-[#FFF0B8] transition-all cursor-pointer"
            >
              <Layers size={15} />
              <span>Batch Upload Screenshots</span>
            </button>

            {/* Single Screenshot Upload */}
            <button
              id="btn-scan-screenshot"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="px-3.5 py-2.5 bg-[#1F242D] hover:bg-[#2A303C] text-[#F2F0E8] border border-[#D4B26A]/40 hover:border-[#D4B26A]/80 font-semibold text-xs font-mono rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-[#D4B26A]" />
                  <span>{scanStatus || "Scanning..."}</span>
                </>
              ) : (
                <>
                  <ImageIcon size={14} className="text-[#D4B26A]" />
                  <span>Single Image</span>
                </>
              )}
            </button>

            <button
              id="btn-paste-leaderboard"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3.5 py-2.5 bg-[#1F242D] hover:bg-[#2A303C] text-[#F2F0E8] border border-gothic-silver/30 hover:border-gothic-silver/60 font-semibold text-xs font-mono rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <FileText size={14} className="text-[#8B96A5]" />
              <span>Paste Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#1A1D24] border border-[#D4B26A]/40 rounded-xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-[#D4B26A]/10 border border-[#D4B26A]/40 flex items-center justify-center text-[#D4B26A] shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#9BA3AF]">Total Alliance Score</p>
            <p className="text-xl font-bold font-mono text-[#D4B26A] mt-0.5">{totalScore.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#9BA3AF]">11/11 Full Tasks</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {fullCompletionCount} <span className="text-xs text-[#9BA3AF]">({fullCompletionPct}%)</span>
            </p>
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#9BA3AF]">Ranked Participants</p>
            <p className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{entries.length}</p>
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-purple-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#9BA3AF]">Average Score</p>
            <p className="text-xl font-bold font-mono text-purple-300 mt-0.5">{avgScore.toLocaleString()} <span className="text-xs text-[#9BA3AF]">pts</span></p>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Search */}
      <div className="bg-[#16181D] border border-gothic-silver/20 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B96A5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Lord name, character ID, or rank..."
            className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg pl-9 pr-4 py-2 text-xs text-[#F2F0E8] placeholder-[#8B96A5] focus:outline-none focus:border-[#D4B26A]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B96A5] hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {entries.length === 0 && players.length > 0 && onBulkPopulateFromRoster && (
            <button
              id="btn-sync-roster-mob"
              onClick={onBulkPopulateFromRoster}
              className="px-3.5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} />
              Populate Roster
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#16181D] rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,178,106,0.25)] cursor-pointer"
          >
            <Plus size={14} />
            Add Lord Entry
          </button>

          <button
            onClick={handleDefaultExportCSV}
            className="px-3.5 py-2 bg-[#1F242D] hover:bg-[#2A303C] text-gothic-silver border border-gothic-silver/20 hover:border-gothic-silver/50 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Mobilization Leaderboard Cards List */}
      <div className="space-y-2.5">
        {sortedEntries.map((entry, idx) => {
          const tasksDone = entry.tasksCompleted ?? entry.tasksSubmitted ?? 0;
          const maxTasks = entry.tasksMax || 11;
          const isFullTasks = tasksDone >= maxTasks;
          const effectiveRank = entry.rank || idx + 1;

          return (
            <div
              key={entry.id}
              className={`relative overflow-hidden rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-4 ${
                effectiveRank === 1
                  ? "bg-gradient-to-r from-[#2F2113] via-[#241A11] to-[#1A1D24] border-[#FFE259]/50 shadow-[0_0_15px_rgba(255,226,89,0.15)]"
                  : effectiveRank === 2
                  ? "bg-gradient-to-r from-[#202733] via-[#1A1F29] to-[#16181D] border-[#E0EAFC]/40 shadow-[0_0_12px_rgba(224,234,252,0.1)]"
                  : effectiveRank === 3
                  ? "bg-gradient-to-r from-[#2B1F17] via-[#201812] to-[#16181D] border-[#E29B63]/40 shadow-[0_0_12px_rgba(226,155,99,0.1)]"
                  : "bg-[#1A1D24] border-gothic-silver/20 hover:border-gothic-silver/40"
              }`}
            >
              {/* Left Column: Rank Badge + Lord Name & Info */}
              <div className="flex items-center gap-3.5 min-w-[240px]">
                {getRankBadge(entry.rank, idx)}

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-wide font-sans">
                      {entry.playerName}
                    </h4>
                    {isFullTasks && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                        <CheckCircle2 size={10} /> 11/11
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[#8B96A5]">
                    ID: {entry.playerId}
                  </p>
                </div>
              </div>

              {/* Exact Score & Tasks Ratio */}
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-gothic-silver/10">
                <div className="text-left sm:text-right min-w-[100px]">
                  <span className="text-[10px] font-mono uppercase text-[#9BA3AF] block sm:hidden">Score</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-[#F3C56C] tracking-tight">
                    {(entry.personalScore || 0).toLocaleString()}
                  </span>
                </div>

                <div className="text-right min-w-[90px]">
                  <span className="text-[10px] font-mono uppercase text-[#9BA3AF] block sm:hidden">Tasks</span>
                  <span className={`text-base sm:text-lg font-mono font-black ${isFullTasks ? "text-emerald-400" : "text-amber-400"}`}>
                    {tasksDone}/{maxTasks}
                  </span>
                </div>

                {onDeleteEntry && (
                  <div className="flex items-center gap-1.5 pl-2">
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="text-[#8B96A5] hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      title="Remove Entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sortedEntries.length === 0 && (
          <div className="bg-[#1A1D24] border border-dashed border-gothic-silver/20 rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#D4B26A]/10 border border-[#D4B26A]/30 flex items-center justify-center mx-auto text-[#D4B26A]">
                <Award size={32} />
              </div>
              <h3 className="text-lg font-bold font-display text-white">No Mobilization Records Yet</h3>
              <p className="text-xs text-[#9BA3AF] leading-relaxed">
                Upload batch or single leaderboard screenshots to track and aggregate full alliance rankings and task ratios.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-gradient-to-b from-[#D4B26A] to-[#B38F46] hover:from-[#E5C37B] hover:to-[#C4A057] text-[#1E140A] font-mono font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Layers size={15} />
                  Batch Upload Screenshots
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#1F242D] hover:bg-[#2A303C] text-white border border-gothic-silver/20 font-mono font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon size={14} className="text-[#D4B26A]" />
                  Single Screenshot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Upload Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#16181D] border-2 border-[#D4B26A]/50 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gothic-silver/20 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Layers size={20} className="text-[#D4B26A]" />
                <h3 className="text-lg font-bold font-display text-white">
                  Batch Screenshot Ingestion & Multi-Page Scanning
                </h3>
              </div>
              <button 
                onClick={() => {
                  if (!batchScanning) setIsBatchModalOpen(false);
                }} 
                className="text-[#8B96A5] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Upload Zone / Drop Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => batchFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D4B26A]/40 hover:border-[#D4B26A] rounded-xl p-5 text-center cursor-pointer bg-[#1A1D24]/60 hover:bg-[#1A1D24] transition-all flex flex-col items-center justify-center space-y-2"
              >
                <UploadCloud size={30} className="text-[#D4B26A]" />
                <p className="text-xs font-bold text-white">Add More Screenshots</p>
                <p className="text-[11px] text-[#8B96A5]">Click to select additional images (PNG, JPG)</p>
              </div>

              <div className="bg-[#111317] rounded-xl p-4 border border-gothic-silver/20 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-[#9BA3AF] font-mono">Batch Queue</p>
                  <p className="text-base font-bold text-white font-mono">
                    {batchItems.length} Images Queued
                  </p>
                  {batchExtractedRows.length > 0 && (
                    <p className="text-xs text-emerald-400 font-mono">
                      ✓ {batchExtractedRows.length} Unique Lords Recognized
                    </p>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleRunBatchScan}
                    disabled={batchScanning || batchItems.length === 0}
                    className="w-full py-2.5 bg-gradient-to-r from-[#D4B26A] to-[#B38F46] hover:from-[#E5C37B] hover:to-[#C4A057] text-[#1E140A] font-bold text-xs font-mono rounded-lg shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {batchScanning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-[#1E140A]" />
                        <span>Processing ({batchProgress.current}/{batchProgress.total})...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Start Batch AI Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Carousel & Status */}
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#9BA3AF]">Uploaded Screenshots</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto p-1">
                {batchItems.map((item, idx) => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden border border-gothic-silver/20 bg-black aspect-video flex items-center justify-center">
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                    
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[9px] font-mono text-white truncate flex items-center justify-between">
                      <span className="truncate">{item.file.name}</span>
                      {item.status === "success" && <FileCheck size={10} className="text-emerald-400 shrink-0" />}
                      {item.status === "processing" && <RefreshCw size={10} className="animate-spin text-[#D4B26A] shrink-0" />}
                    </div>

                    {!batchScanning && (
                      <button
                        onClick={() => setBatchItems(prev => prev.filter(p => p.id !== item.id))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Rows Table Preview */}
            {batchExtractedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#9BA3AF]">
                    Combined Alliance Leaderboard ({batchExtractedRows.length} Lords)
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400">Deduplicated & Ranked</span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-gothic-silver/20 bg-[#111317] p-2 space-y-1.5 font-mono text-xs">
                  {batchExtractedRows.map((row, idx) => (
                    <div key={row.id} className="flex items-center justify-between bg-[#1A1D24] p-2 rounded-lg border border-gothic-silver/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#2F3743] flex items-center justify-center text-[10px] font-bold text-[#D4B26A]">
                          {row.rank || idx + 1}
                        </span>
                        <span className="font-bold text-white">{row.playerName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[#F3C56C]">{(row.personalScore || 0).toLocaleString()} pts</span>
                        <span className="text-emerald-400">{row.tasksCompleted}/{row.tasksMax || 11}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gothic-silver/20">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                disabled={batchScanning}
                className="px-4 py-2 bg-[#1F242D] text-[#9BA3AF] hover:text-white rounded-lg text-xs font-mono"
              >
                Close
              </button>
              <button
                onClick={handleApplyBatchRows}
                disabled={batchExtractedRows.length === 0 || batchScanning}
                className="px-5 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#1E140A] font-bold rounded-lg text-xs font-mono shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                Apply All {batchExtractedRows.length} Lords to Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Leaderboard Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16181D] border border-[#D4B26A]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gothic-silver/20 pb-3">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <FileText size={18} className="text-[#D4B26A]" /> Paste Leaderboard Text
              </h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-[#8B96A5] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <p className="text-[#9BA3AF]">
                Paste leaderboard rows from game screenshots, OCR tools, or spreadsheets. Format example:
              </p>
              <div className="bg-[#111317] p-3 rounded-lg border border-gothic-silver/10 text-[11px] text-[#D4B26A]">
                1 Malischka 2,472 11/11<br />
                2 ЭтоНеШутка 2,412 11/11<br />
                3 ARGUS01 2,405 11/11<br />
                4 Mr Poison 2,366 11/11<br />
                5 私は Yukii です 2,231 11/11
              </div>

              <textarea
                rows={7}
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
                placeholder="Paste lines here..."
                className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-xl p-3 text-white focus:outline-none focus:border-[#D4B26A] font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gothic-silver/20">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 bg-[#1F242D] text-[#9BA3AF] hover:text-white rounded-lg text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                className="px-4 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#16181D] font-bold rounded-lg text-xs font-mono shadow-md"
              >
                Import Parsed Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Scan Vision / OCR Preview & Verification Modal */}
      {isOCRModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#16181D] border border-[#D4B26A]/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gothic-silver/20 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#D4B26A]" />
                <h3 className="text-base font-bold font-display text-white">
                  Leaderboard Extraction Preview ({scanMethod === "AI" ? "AI Vision" : "OCR Engine"})
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D4B26A]/20 text-[#D4B26A] border border-[#D4B26A]/40 font-bold">
                  {extractedRows.length} Rows Extracted
                </span>
              </div>
              <button onClick={() => setIsOCRModalOpen(false)} className="text-[#8B96A5] hover:text-white">
                <X size={16} />
              </button>
            </div>

            {scanPreviewImage && (
              <div className="max-h-40 overflow-hidden rounded-xl border border-gothic-silver/20 bg-black flex items-center justify-center">
                <img src={scanPreviewImage} alt="Leaderboard Scan" className="max-h-40 w-auto object-contain opacity-90" />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-xl border border-gothic-silver/20 bg-[#111317] p-2 space-y-2 font-mono text-xs">
              {extractedRows.map((row, idx) => (
                <div key={row.id} className="flex items-center justify-between bg-[#1A1D24] p-2.5 rounded-lg border border-gothic-silver/10 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2F3743] flex items-center justify-center text-[11px] font-bold text-[#D4B26A]">
                      {row.rank || idx + 1}
                    </span>
                    <input
                      type="text"
                      value={row.playerName}
                      onChange={(e) => {
                        const updated = [...extractedRows];
                        updated[idx].playerName = e.target.value;
                        setExtractedRows(updated);
                      }}
                      className="bg-[#111317] border border-gothic-silver/20 rounded px-2 py-1 text-white text-xs w-36 font-sans font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#8B96A5]">Score:</span>
                      <input
                        type="number"
                        value={row.personalScore}
                        onChange={(e) => {
                          const updated = [...extractedRows];
                          updated[idx].personalScore = Number(e.target.value);
                          setExtractedRows(updated);
                        }}
                        className="bg-[#111317] border border-gothic-silver/20 rounded px-2 py-1 text-[#D4B26A] font-mono text-xs w-20 text-right font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#8B96A5]">Tasks:</span>
                      <input
                        type="number"
                        value={row.tasksCompleted}
                        onChange={(e) => {
                          const updated = [...extractedRows];
                          updated[idx].tasksCompleted = Number(e.target.value);
                          setExtractedRows(updated);
                        }}
                        className="bg-[#111317] border border-gothic-silver/20 rounded px-1.5 py-1 text-emerald-400 font-mono text-xs w-12 text-center font-bold"
                      />
                      <span className="text-white">/</span>
                      <input
                        type="number"
                        value={row.tasksMax || 11}
                        onChange={(e) => {
                          const updated = [...extractedRows];
                          updated[idx].tasksMax = Number(e.target.value);
                          setExtractedRows(updated);
                        }}
                        className="bg-[#111317] border border-gothic-silver/20 rounded px-1.5 py-1 text-emerald-400 font-mono text-xs w-12 text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gothic-silver/20">
              <button
                onClick={() => setIsOCRModalOpen(false)}
                className="px-4 py-2 bg-[#1F242D] text-[#9BA3AF] hover:text-white rounded-lg text-xs font-mono"
              >
                Discard
              </button>
              <button
                onClick={handleApplyExtractedRows}
                className="px-4 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#1E140A] font-bold rounded-lg text-xs font-mono shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                Apply to Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16181D] border border-[#D4B26A]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gothic-silver/20 pb-3">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Award size={18} className="text-[#D4B26A]" /> Log Mobilization Record
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#8B96A5] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 font-mono text-xs">
              {players.length > 0 && (
                <div>
                  <label className="block text-[#9BA3AF] mb-1">Quick Select from Roster (Optional)</label>
                  <select
                    onChange={(e) => handleSelectFromRoster(e.target.value)}
                    defaultValue=""
                    className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2 text-white focus:outline-none focus:border-[#D4B26A]"
                  >
                    <option value="" disabled>-- Select a registered Lord --</option>
                    {players.map(p => (
                      <option key={p.characterId} value={p.characterId}>
                        {p.currentName} ({p.characterId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[#9BA3AF] mb-1">Rank</label>
                  <input
                    type="number"
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="1"
                    className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[#9BA3AF] mb-1">Lord / Player Name *</label>
                  <input
                    type="text"
                    required
                    value={formPlayerName}
                    onChange={(e) => setFormPlayerName(e.target.value)}
                    placeholder="e.g. Malischka"
                    className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9BA3AF] mb-1">Character ID</label>
                <input
                  type="text"
                  value={formPlayerId}
                  onChange={(e) => setFormPlayerId(e.target.value)}
                  placeholder="e.g. 10928374"
                  className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9BA3AF] mb-1">Score (e.g. 2,472)</label>
                  <input
                    type="number"
                    min="0"
                    value={formScore}
                    onChange={(e) => setFormScore(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="2472"
                    className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A]"
                  />
                </div>
                <div>
                  <label className="block text-[#9BA3AF] mb-1">Tasks Completed</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={formTasksCompleted}
                      onChange={(e) => setFormTasksCompleted(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="11"
                      className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A] text-center"
                    />
                    <span className="text-[#8B96A5]">/</span>
                    <input
                      type="number"
                      min="1"
                      value={formTasksMax}
                      onChange={(e) => setFormTasksMax(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="11"
                      className="w-full bg-[#1F242D] border border-gothic-silver/20 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#D4B26A] text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gothic-silver/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#1F242D] text-[#9BA3AF] hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4B26A] hover:bg-[#c4a159] text-[#16181D] font-bold rounded-lg shadow-md"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
