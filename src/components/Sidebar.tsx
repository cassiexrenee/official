import React from "react";
import { 
  Home, LayoutDashboard, UserSquare2, TableProperties, Scroll, 
  Sliders, Compass, Menu, X, ChevronLeft, ChevronRight, ShieldAlert, Target, Upload
} from "lucide-react";

interface CurrentUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

interface UserProfile {
  rank: "R5" | "R4";
  ingameName: string;
  memberId: string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: CurrentUser | null;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (isOpen: boolean) => void;
  handleLoginWithDiscord: () => void;
  handleLogout: () => void;
  notesCount: number;
}

export default function Sidebar({
  activeTab, setActiveTab,
  currentUser,
  profile, setProfile,
  isMobileSidebarOpen, setIsMobileSidebarOpen,
  isSidebarCollapsed, setIsSidebarCollapsed,
  isProfileOpen, setIsProfileOpen,
  handleLoginWithDiscord, handleLogout,
  notesCount
}: SidebarProps) {
  
  const navItems = [
    { id: "landing", label: "Council Hall", icon: <Home size={18} /> },
    { id: "overview", label: "Leadership Hub", icon: <LayoutDashboard size={18} /> },
    { id: "member", label: "Account Registry", icon: <UserSquare2 size={18} /> },
    { id: "roster", label: "Alliance Registry", icon: <TableProperties size={18} /> },
    { id: "review", label: "Officer Review", icon: <ShieldAlert size={18} /> },
    { id: "mobilization", label: "Mobilization Track", icon: <Target size={18} /> },
    { id: "import", label: "Import Manager", icon: <Upload size={18} /> },
    { id: "warlogs", label: "Alliance Chronicle", icon: <Scroll size={18} /> },
    { id: "settings", label: "Settings", icon: <Sliders size={18} /> }
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#222831] border-b border-[#4B5563]/30 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Compass size={20} className="text-[#06B6D4]" />
          <div className="font-display tracking-[0.15em] text-xs uppercase text-[#F2F0E8]">
            <span className="block font-bold">Dragon</span>
            <span className="block text-[10px] text-[#C8CCD2]/60 -mt-1">Council</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded bg-[#16181D] border border-[#4B5563]/40 text-[#F2F0E8] hover:text-white cursor-pointer"
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen bg-[#222831] border-r border-[#4B5563]/30 flex flex-col justify-between transition-all duration-300 ${
          isMobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        } ${isSidebarCollapsed ? "md:w-20" : "md:w-64"} flex-shrink-0`}
      >
        <div className="p-4 border-b border-[#4B5563]/30 flex items-center justify-between">
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? "md:justify-center md:w-full" : ""}`}>
            <div className="w-9 h-9 rounded-lg bg-[#2F3743] border border-[#06B6D4]/40 flex items-center justify-center flex-shrink-0 text-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <Compass size={20} />
            </div>
            {!isSidebarCollapsed && (
              <div className="font-display tracking-[0.15em] text-xs uppercase text-[#F2F0E8] leading-tight">
                <span className="block font-bold text-sm">Dragon</span>
                <span className="block text-[10px] text-[#C8CCD2]/60">Council Workspace</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center p-1.5 rounded-lg bg-[#16181D] border border-[#4B5563]/40 text-[#C8CCD2] hover:text-white hover:border-[#D4B26A]/50 transition-all cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#E5C8C7]/40">
              Command Ledger
            </div>
          )}

          {navItems.map((navItem) => {
            const isActive = activeTab === navItem.id;
            return (
              <button
                key={navItem.id}
                onClick={() => {
                  setActiveTab(navItem.id);
                  setIsMobileSidebarOpen(false);
                }}
                title={isSidebarCollapsed ? navItem.label : undefined}
                className={