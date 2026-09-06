import React from "react";
import { User } from "firebase/auth";
import {
  BookOpen,
  MessageSquareText,
  History,
  SearchCode,
  TrendingUp,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { TabType } from "../types";

interface NavbarProps {
  user: User;
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  entriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentTab,
  onSelectTab,
  onLogout,
  entriesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#08080a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-base sm:text-lg">
                Gemini Journal
              </span>
              <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-2.5 w-2.5" />
                Isolated
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Desktop */}
        <nav className="hidden items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/5 md:flex">
          <button
            id="tab-btn-chat"
            onClick={() => onSelectTab("chat")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              currentTab === "chat"
                ? "bg-white/10 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5 opacity-80" />
            <span>Journal Chat</span>
          </button>

          <button
            id="tab-btn-history"
            onClick={() => onSelectTab("history")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              currentTab === "history"
                ? "bg-white/10 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <History className="h-3.5 w-3.5 opacity-80" />
            <span>History</span>
            {entriesCount > 0 && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-300">
                {entriesCount}
              </span>
            )}
          </button>

          <button
            id="tab-btn-ask"
            onClick={() => onSelectTab("ask")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              currentTab === "ask"
                ? "bg-white/10 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <SearchCode className="h-3.5 w-3.5 opacity-80" />
            <span>Ask Your Journal</span>
          </button>

          <button
            id="tab-btn-week"
            onClick={() => onSelectTab("week")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              currentTab === "week"
                ? "bg-white/10 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 opacity-80" />
            <span>This Week</span>
          </button>
        </nav>

        {/* User Account & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 rounded-2xl bg-white/[0.04] border border-white/5 px-2.5 py-1.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="h-7 w-7 rounded-full border border-indigo-400/30 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-950 border border-indigo-400/30 text-xs font-semibold text-indigo-300">
                {user.displayName?.[0] || user.email?.[0] || "U"}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight text-white">
                {user.displayName || "Journaler"}
              </p>
              <p className="text-[10px] leading-tight text-zinc-500 font-mono truncate max-w-[120px]">
                {user.email}
              </p>
            </div>
          </div>

          <button
            id="nav-logout-btn"
            onClick={onLogout}
            title="Sign out of your journal"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="flex border-t border-white/5 bg-[#08080a]/95 backdrop-blur-md px-2 py-1.5 md:hidden justify-around">
        <button
          onClick={() => onSelectTab("chat")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
            currentTab === "chat" ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <MessageSquareText className="h-4 w-4" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => onSelectTab("history")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
            currentTab === "history" ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <History className="h-4 w-4" />
          <span>History ({entriesCount})</span>
        </button>
        <button
          onClick={() => onSelectTab("ask")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
            currentTab === "ask" ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <SearchCode className="h-4 w-4" />
          <span>Ask</span>
        </button>
        <button
          onClick={() => onSelectTab("week")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
            currentTab === "week" ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Week</span>
        </button>
      </div>
    </header>
  );
};
