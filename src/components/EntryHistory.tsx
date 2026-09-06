import React, { useState, useMemo } from "react";
import { User } from "firebase/auth";
import {
  History,
  Search,
  Calendar,
  Smile,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  Plus,
  MessageSquare
} from "lucide-react";
import { UserJournalEntry, TabType } from "../types";
import { deleteJournalEntry } from "../lib/firebase";

interface EntryHistoryProps {
  user: User;
  entries: UserJournalEntry[];
  onSelectTab: (tab: TabType) => void;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  user,
  entries,
  onSelectTab,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("All");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Derive unique moods from entries
  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) moods.add(e.mood);
    });
    return ["All", ...Array.from(moods)];
  }, [entries]);

  // Filter entries based on query and mood
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesMood = selectedMood === "All" || entry.mood === selectedMood;
      if (!matchesMood) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = entry.title.toLowerCase().includes(q);
      const inSummary = entry.summary.toLowerCase().includes(q);
      const inMood = entry.mood.toLowerCase().includes(q);
      const inThemes = entry.themes.some((t) => t.toLowerCase().includes(q));

      return inTitle || inSummary || inMood || inThemes;
    });
  }, [entries, searchQuery, selectedMood]);

  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this journal entry from Firestore? This action is permanent.")) {
      return;
    }

    setDeletingId(entryId);
    setDeleteError(null);

    try {
      await deleteJournalEntry(user.uid, entryId);
      if (expandedEntryId === entryId) {
        setExpandedEntryId(null);
      }
    } catch (err: any) {
      console.error("Delete entry error:", err);
      setDeleteError(err.message || "Failed to delete entry from Firestore.");
    } finally {
      setDeletingId(null);
    }
  };

  const getMoodBadgeColor = (mood: string) => {
    const m = mood.toLowerCase();
    if (m.includes("great") || m.includes("grat") || m.includes("joy") || m.includes("clarity")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (m.includes("ener") || m.includes("excite") || m.includes("curiosity") || m.includes("inspire")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (m.includes("anx") || m.includes("stress") || m.includes("sad") || m.includes("overwhelm")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 font-sans">
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Past Entries</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Your private historical records, synchronized with Firestore.
          </p>
        </div>

        <button
          id="history-new-chat-btn"
          onClick={() => onSelectTab("chat")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Delete error notification */}
      {deleteError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Search & Mood Filter Controls */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries by topic, mood, reflection keywords..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
        </div>

        {/* Mood filter pills */}
        {availableMoods.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-500 mr-1">Mood:</span>
            {availableMoods.map((mood) => {
              const isSelected = selectedMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors border cursor-pointer ${
                    isSelected
                      ? "bg-white/15 text-white border-white/30"
                      : "bg-white/[0.03] text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center backdrop-blur-md">
          <History className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-white">
            {entries.length === 0 ? "No journal entries yet" : "No matching entries found"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">
            {entries.length === 0
              ? "Start your first journaling session with Gemini to generate and persist entries."
              : "Try clearing your search query or selecting a different mood filter."}
          </p>

          {entries.length === 0 && (
            <button
              onClick={() => onSelectTab("chat")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors shadow-lg cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start Journaling</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            return (
              <article
                key={entry.id}
                id={`journal-entry-card-${entry.id}`}
                className="group rounded-3xl border border-white/5 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-md shadow-xl hover:border-white/10 transition-all"
              >
                {/* Top metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px]">
                    <Calendar className="h-3 w-3" />
                    <span>{entry.dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${getMoodBadgeColor(
                        entry.mood
                      )}`}
                    >
                      <Smile className="h-2.5 w-2.5" />
                      {entry.mood}
                    </span>

                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={deletingId === entry.id}
                      title="Delete this entry"
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {entry.title}
                </h3>

                {/* Summary */}
                <p className="mt-2 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {entry.summary}
                </p>

                {/* Topic themes */}
                {entry.themes && entry.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-400"
                      >
                        <Tag className="h-2 w-2" />
                        #{theme}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand dialogue toggle */}
                {entry.conversation && entry.conversation.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <button
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        {isExpanded ? "Hide Conversation" : `View Full Conversation (${entry.conversation.length} messages)`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {/* Expandable Conversation Transcript */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3 rounded-2xl bg-black/30 p-4 border border-white/5">
                        {entry.conversation.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`rounded-xl p-3 text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-indigo-950/40 border border-indigo-500/20 text-indigo-100 ml-4"
                                : "bg-zinc-900/80 border border-white/5 text-zinc-300 mr-4"
                            }`}
                          >
                            <span className="font-semibold text-[10px] block mb-1 uppercase tracking-wider text-zinc-500">
                              {msg.role === "user" ? "You" : "Gemini"}
                            </span>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
