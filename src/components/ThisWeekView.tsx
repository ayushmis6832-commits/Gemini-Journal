import React, { useState, useEffect, useMemo } from "react";
import { User } from "firebase/auth";
import {
  TrendingUp,
  Sparkles,
  Smile,
  Tag,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Compass,
  RotateCw
} from "lucide-react";
import { UserJournalEntry, TabType } from "../types";

interface ThisWeekViewProps {
  user: User;
  entries: UserJournalEntry[];
  onSelectTab: (tab: TabType) => void;
}

export const ThisWeekView: React.FC<ThisWeekViewProps> = ({
  user,
  entries,
  onSelectTab,
}) => {
  const [reflection, setReflection] = useState<string | null>(null);
  const [dominantMood, setDominantMood] = useState<string>("Reflective");
  const [keyThemes, setKeyThemes] = useState<string[]>([]);
  const [suggestedIntention, setSuggestedIntention] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute 7-day window
  const weekData = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter((e) => e.createdAt >= sevenDaysAgo.getTime());

    // Generate 7 day slots
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;

      const dayEntries = weekEntries.filter(
        (e) => e.createdAt >= dayStart && e.createdAt < dayEnd
      );

      days.push({
        date: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateNumber: d.getDate(),
        entries: dayEntries,
      });
    }

    return {
      weekEntries,
      days,
    };
  }, [entries]);

  // Request weekly AI reflection from Gemini
  const fetchWeeklyReflection = async () => {
    if (weekData.weekEntries.length === 0) {
      setReflection("You don't have any journal entries from the past 7 days yet. Start a session in Journal Chat to generate entries for this week.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gemini/weekly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: weekData.weekEntries.map((e) => ({
            id: e.id,
            dateFormatted: e.dateFormatted,
            title: e.title,
            summary: e.summary,
            mood: e.mood,
            themes: e.themes,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate weekly reflection.");
      }

      const data = await res.json();
      setReflection(data.reflection || "");
      if (data.dominantMood) setDominantMood(data.dominantMood);
      if (Array.isArray(data.keyThemes)) setKeyThemes(data.keyThemes);
      if (data.suggestedIntention) setSuggestedIntention(data.suggestedIntention);
    } catch (err: any) {
      console.error("Weekly reflection error:", err);
      setError(err.message || "Could not generate weekly reflection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyReflection();
  }, [weekData.weekEntries.length]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span>This Week in Review</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            An AI-generated synthesis of your thoughts, emotional trajectory, and recurring themes over the past 7 days.
          </p>
        </div>

        <button
          onClick={fetchWeeklyReflection}
          disabled={loading || weekData.weekEntries.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Review</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-300 backdrop-blur-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 7-Day Activity Matrix */}
      <div className="mb-6 rounded-3xl border border-white/5 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            7-Day Activity Timeline
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {weekData.weekEntries.length} {weekData.weekEntries.length === 1 ? "entry" : "entries"} this week
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekData.days.map((day, i) => {
            const hasEntries = day.entries.length > 0;
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-between rounded-2xl p-2.5 sm:p-3 text-center border transition-all ${
                  hasEntries
                    ? "border-indigo-500/30 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/5"
                    : "border-white/5 bg-white/[0.02] text-zinc-500"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {day.dayName}
                </span>
                <span className="my-1.5 text-sm sm:text-base font-bold text-white">
                  {day.dateNumber}
                </span>

                {hasEntries ? (
                  <div className="flex flex-col items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mb-1" />
                    <span className="text-[9px] font-medium text-indigo-300 truncate max-w-full">
                      {day.entries[0].mood}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-zinc-600">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>Weekly Entries</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {weekData.weekEntries.length}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Isolated in personal Firestore collection
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Smile className="h-3.5 w-3.5 text-emerald-400" />
            <span>Dominant Mood</span>
          </div>
          <p className="text-2xl font-bold text-white capitalize">
            {dominantMood}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Detected across weekly conversations
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Tag className="h-3.5 w-3.5 text-violet-400" />
            <span>Key Themes</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {keyThemes.length > 0 ? (
              keyThemes.map((t, idx) => (
                <span
                  key={idx}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                >
                  #{t}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">None detected yet</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Synthesized Reflection Card */}
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Gemini Weekly Synthesis
            </h3>
          </div>
          <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2.5 py-1 rounded-full border border-indigo-500/20 font-medium">
            Mood: {dominantMood}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-6 text-xs text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span className="italic">Gemini is synthesizing your weekly journal reflections...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {reflection}
            </p>

            {suggestedIntention && (
              <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Suggested Intention for the Week Ahead</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  "{suggestedIntention}"
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-1.5 text-[11px] text-zinc-500 border-t border-white/5 pt-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Grounded on your actual saved journal entries from this week</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
