import React, { useState, useEffect } from "react";
import { Save, CheckCircle, TrendingUp, Users, Trash2, Plus, ShieldCheck } from "lucide-react";
import { AllianceSettings } from "@/types";
import { apiFetch } from "@/apiConfig";
import ThemeSettingsSection from "@/components/settings/ThemeSettingsSection";
import SeasonSettingsSection from "@/components/settings/SeasonSettingsSection";

export interface ThemeOption {
  id: "slate" | "obsidian" | "sepia" | string;
  name: string;
  shortName: string;
  tagline: string;
  badgeStyle: string;
  previewBg: string;
  previewAccent: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "slate",
    name: "Modern Slate (Light Theme)",
    shortName: "Modern Slate",
    tagline: "Background #F1F5F9, Surface #FFFFFF, Accent #1D4ED8 / #0F766E, Text #020617",
    badgeStyle: "bg-blue-500/20 text-blue-700 border-blue-500/40 font-bold",
    previewBg: "bg-[#F1F5F9]",
    previewAccent: "bg-[#1D4ED8]"
  },
  {
    id: "obsidian",
    name: "Deep Obsidian (Dark Theme)",
    shortName: "Deep Obsidian",
    tagline: "Background #0F172A, Surface #1E293B, Accent #38BDF8 / #818CF8, Text #F8FAFC",
    badgeStyle: "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold",
    previewBg: "bg-[#0F172A]",
    previewAccent: "bg-[#38BDF8]"
  },
  {
    id: "sepia",
    name: "Warm Sepia (High-Comfort Theme)",
    shortName: "Warm Sepia",
    tagline: "Background #F3EFE6, Surface #FCFBF7, Accent #8C3A00 / #2D5A44, Text #1A1815",
    badgeStyle: "bg-amber-800/20 text-amber-900 border-amber-800/40 font-bold",
    previewBg: "bg-[#F3EFE6]",
    previewAccent: "bg-[#8C3A00]"
  }
];

interface OfficerAccount {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface SettingsTabProps {
  settings: AllianceSettings;
  onUpdateSettings: (newSettings: AllianceSettings) => void;
  activeTheme?: string;
  onUpdateTheme?: (theme: string) => void;
  currentUser?: { id: string; email: string; role: string } | null;
}

export default function SettingsTab({
  settings,
  onUpdateSettings,
  activeTheme = "obsidian",
  onUpdateTheme,
  currentUser
}: SettingsTabProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(activeTheme);
  const [activeProfile, setActiveProfile] = useState(settings.activeProfile);
  const [activeSeason, setActiveSeason] = useState(settings.configuration.activeSeason);
  
  const [s1Baseline, setS1Baseline] = useState(settings.configuration.seasonalPowerBaselines.S1);
  const [s2Baseline, setS2Baseline] = useState(settings.configuration.seasonalPowerBaselines.S2);
  const [s3Baseline, setS3Baseline] = useState(settings.configuration.seasonalPowerBaselines.S3);
  const [sosBaseline, setSosBaseline] = useState(settings.configuration.seasonalPowerBaselines.SoS);

  const [meritRatioPct, setMeritRatioPct] = useState(settings.configuration.complianceTargets?.meritRatioPct ?? 10);
  const [deathsMin, setDeathsMin] = useState(settings.configuration.complianceTargets?.deathsMin ?? 50000);

  const [seasonStartDate, setSeasonStartDate] = useState(settings.configuration.seasonStartDate || "2026-06-19");
  const [finalZoneOpenDate, setFinalZoneOpenDate] = useState(settings.configuration.finalZoneOpenDate || "2026-07-17");
  const [seasonSummaryDate, setSeasonSummaryDate] = useState(settings.configuration.seasonSummaryDate || "2026-07-29");
  const [seasonEndDate, setSeasonEndDate] = useState(settings.configuration.seasonEndDate || "2026-07-31");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Officer account management (admin only) ---
  const [officers, setOfficers] = useState<OfficerAccount[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"officer" | "admin">("officer");
  const [officerError, setOfficerError] = useState<string | null>(null);
  const [officerFeedback, setOfficerFeedback] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const loadOfficers = () => {
    apiFetch("/api/users")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data.users)) setOfficers(data.users); })
      .catch(console.warn);
  };

  useEffect(() => {
    if (isAdmin) loadOfficers();
  }, [isAdmin]);

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfficerError(null);
    if (!newEmail.trim() || !newPassword) {
      setOfficerError("Email and password are required.");
      return;
    }
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        setOfficerError(data.error || "Failed to create account.");
        return;
      }
      setOfficerFeedback(`✓ Account created for ${data.user.email}.`);
      setTimeout(() => setOfficerFeedback(null), 6000);
      setNewEmail("");
      setNewPassword("");
      setNewRole("officer");
      loadOfficers();
    } catch (err) {
      setOfficerError("Network error while creating account.");
    }
  };

  const handleDeleteOfficer = async (id: string) => {
    if (!confirm("Remove this account? They will no longer be able to log in.")) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setOfficerError(data.error || "Failed to delete account.");
        return;
      }
      loadOfficers();
    } catch (err) {
      setOfficerError("Network error while deleting account.");
    }
  };

  const addDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  const handleStartDateChange = (val: string) => {
    setSeasonStartDate(val);
    setFinalZoneOpenDate(addDays(val, 28));
    setSeasonSummaryDate(addDays(val, 40));
    setSeasonEndDate(addDays(val, 42));
  };

  const handleSaveSettings = () => {
    const updated: AllianceSettings = {
      allianceId: settings.allianceId,
      activeProfile,
      configuration: {
        ...settings.configuration,
        seasonalPowerBaselines: {
          S1: s1Baseline,
          S2: s2Baseline,
          S3: s3Baseline,
          SoS: sosBaseline,
        },
        activeSeason,
        seasonStartDate,
        finalZoneOpenDate,
        seasonSummaryDate,
        seasonEndDate,
        complianceTargets: {
          meritRatioPct,
          deathsMin,
          activityRequired: true
        }
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 7500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Theme & Season Settings */}
      <div className="lg:col-span-1 space-y-6">
        <ThemeSettingsSection
          themeOptions={THEME_OPTIONS}
          activeTheme={currentTheme}
          onUpdateTheme={onUpdateTheme || (() => {})}
          setCurrentTheme={setCurrentTheme}
        />

        <SeasonSettingsSection
          activeSeason={activeSeason}
          setActiveSeason={setActiveSeason}
          seasonStartDate={seasonStartDate}
          handleStartDateChange={handleStartDateChange}
          finalZoneOpenDate={finalZoneOpenDate}
          setFinalZoneOpenDate={setFinalZoneOpenDate}
          seasonSummaryDate={seasonSummaryDate}
          setSeasonSummaryDate={setSeasonSummaryDate}
          seasonEndDate={seasonEndDate}
          setSeasonEndDate={setSeasonEndDate}
        />

        <div className="p-2">
          <button
            id="save-settings-btn"
            onClick={handleSaveSettings}
            className="w-full py-3 bg-gothic-silver hover:bg-opacity-90 text-[#111113] font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Save & Re-evaluate Roster
          </button>
          
          {saveSuccess && (
            <div className="mt-3 p-3 text-xs bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-center flex items-center justify-center gap-1.5 font-mono animate-pulse">
              <CheckCircle size={12} /> Analytics successfully re-evaluated!
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Baselines & Compliance Gates */}
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 rounded-xl bg-gothic-velvet border border-gothic-silver/20 space-y-6">
          <h2 className="text-base font-bold text-gothic-silver font-display flex items-center gap-2 border-b border-gothic-silver/20 pb-3">
            <TrendingUp size={18} className="text-[#89A6B8]" />
            Seasonal Power & Performance Gates
          </h2>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gothic-rose/50">Seasonal Character ID Power Baselines</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Season 1", val: s1Baseline, setter: setS1Baseline },
                { label: "Season 2", val: s2Baseline, setter: setS2Baseline },
                { label: "Season 3", val: s3Baseline, setter: setS3Baseline },
                { label: "Season of Strife", val: sosBaseline, setter: setSosBaseline }
              ].map((bs, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-gothic-ink/40 border border-gothic-silver/10">
                  <label className="text-[10px] uppercase font-bold text-gothic-rose/50 block">{bs.label}</label>
                  <input
                    type="number"
                    step="1000000"
                    min="0"
                    value={bs.val}
                    onChange={(e) => bs.setter(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-gothic-ink border border-gothic-silver/20 text-xs font-mono font-bold text-gothic-silver p-1.5 rounded-md outline-none"
                  />
                  <span className="text-[9px] text-[#89A6B8] font-mono block">{(bs.val / 1000000).toFixed(1)}M Baseline</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-gothic-silver/20 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gothic-rose/50">Compliance Target Criteria & Tiers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg bg-gothic-ink/40 border border-gothic-silver/10">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-gothic-rose/50">Merit-to-Power Target Ratio</label>
                  <span className="text-xs font-mono font-bold text-amber-400">{meritRatioPct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={meritRatioPct}
                  onChange={(e) => setMeritRatioPct(parseInt(e.target.value) || 10)}
                  className="w-full accent-amber-500 bg-gothic-ink rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                <p className="text-[10px] text-gothic-rose/50">Merits required as a percentage of current power for full compliance.</p>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-gothic-ink/40 border border-gothic-silver/10">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-gothic-rose/50">Minimum Casualties / Deaths</label>
                  <span className="text-xs font-mono font-bold text-red-400">{deathsMin.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  step="5000"
                  min="0"
                  max="500000"
                  value={deathsMin}
                  onChange={(e) => setDeathsMin(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-gothic-ink border border-gothic-silver/20 text-xs font-mono font-bold text-red-400 p-1.5 rounded-md outline-none"
                />
                <p className="text-[10px] text-gothic-rose/50">Minimum T4/T5 troop casualties expected during the season.</p>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="p-6 rounded-xl bg-gothic-velvet border border-gothic-silver/20 space-y-5">
            <h2 className="text-base font-bold text-gothic-silver font-display flex items-center gap-2 border-b border-gothic-silver/20 pb-3">
              <ShieldCheck size={18} className="text-[#D4B26A]" />
              Officer Account Management
            </h2>
            <p className="text-xs text-gothic-rose/70 font-mono -mt-2">
              Create and manage login credentials for alliance officers. Admin-only.
            </p>

            {officerFeedback && (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                {officerFeedback}
              </div>
            )}
            {officerError && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300 text-xs font-mono">
                {officerError}
              </div>
            )}

            <form onSubmit={handleCreateOfficer} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="email"
                required
                placeholder="officer@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="sm:col-span-2 bg-gothic-ink border border-gothic-silver/20 text-xs text-gothic-silver p-2.5 rounded-lg outline-none font-mono"
              />
              <input
                type="password"
                required
                placeholder="Password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-gothic-ink border border-gothic-silver/20 text-xs text-gothic-silver p-2.5 rounded-lg outline-none font-mono"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "officer" | "admin")}
                className="bg-gothic-ink border border-gothic-silver/20 text-xs text-gothic-silver p-2.5 rounded-lg outline-none cursor-pointer font-mono"
              >
                <option value="officer">Officer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-4 py-2.5 bg-gothic-silver hover:bg-white text-[#111113] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Create Account
              </button>
            </form>

            <div className="space-y-2">
              {officers.length === 0 ? (
                <p className="text-xs text-gothic-rose/50 font-mono text-center py-4">No accounts found.</p>
              ) : (
                officers.map((o) => (
                  <div key={o.id} className="p-3 rounded-lg bg-gothic-ink border border-gothic-silver/15 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-[#89A6B8]" />
                      <span className="text-gothic-silver font-semibold">{o.email}</span>
                      <span className="text-[9px] uppercase text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{o.role}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteOfficer(o.id)}
                      className="text-red-400 hover:text-red-300 cursor-pointer p-1"
                      title="Remove account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}