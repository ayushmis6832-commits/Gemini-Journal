import React, { useState } from "react";
import { User } from "firebase/auth";
import {
  SearchCode,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle,
  Smile,
  Compass,
  CheckCircle2
} from "lucide-react";
import { UserJournalEntry, TabType } from "../types";
import { findTopKSimilar } from "../lib/vector";

interface AskJournalProps {
  user: User;
  entries: UserJournalEntry[];
  onSelectTab: (tab: TabType) => void;
}

const SAMPLE_QUESTIONS = [
  "When did I last feel truly motivated, and what caused it?",
  "What recurring themes or challenges have I faced recently?",
  "What strategies have helped me manage anxiety or stress?",
  "What lessons did I write about regarding my personal goals?"
];

export const AskJournal: React.FC<AskJournalProps> = ({
  user,
  entries,
  onSelectTab,
}) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citedDates, setCitedDates] = useState<string[]>([]);
  const [matchedEntries, setMatchedEntries] = useState<UserJournalEntry[]>([]);

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q || loading) return;

    if (entries.length === 0) {
      setError("You don't have any saved journal entries yet. Save at least one entry before asking questions.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);
    setCitedDates([]);
    setMatchedEntries([]);

    try {
      // Step 1: Generate embedding for the user's question via server proxy
      const embedRes = await fetch("/api/gemini/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });

      if (!embedRes.ok) {
        const errData = await embedRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate query embedding.");
      }

      const { embedding: queryEmbedding } = await embedRes.json();

      if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error("Received invalid vector embedding for the query.");
      }

      // Step 2: Perform local cosine similarity search against user's entries
      const topSimilar = findTopKSimilar<UserJournalEntry>(queryEmbedding, entries, 5);
      const topEntries = topSimilar.map((item) => item.entry);
      setMatchedEntries(topEntries);

      // Step 3: Call Gemini grounded Q&A endpoint
      const askRes = await fetch("/api/gemini/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          relevantEntries: topEntries.map((e) => ({
            id: e.id,
            dateFormatted: e.dateFormatted,
            title: e.title,
            summary: e.summary,
            mood: e.mood,
            themes: e.themes,
          })),
        }),
      });

      if (!askRes.ok) {
        const errData = await askRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to synthesize grounded answer.");
      }

      const askData = await askRes.json();
      setAnswer(askData.answer || "No synthesis could be produced.");
      setCitedDates(Array.isArray(askData.citedDates) ? askData.citedDates : []);
    } catch (err: any) {
      console.error("Ask journal error:", err);
      setError(err.message || "An error occurred while answering your question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <SearchCode className="h-5 w-5 text-indigo-400" />
            <span>Ask Your Journal</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Semantic search across your past entries using Gemini embeddings. Gemini cites exact dates as grounding.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-mono text-zinc-400 border border-white/5 self-start sm:self-auto">
          <span>{entries.length} Entries Indexed</span>
        </div>
      </div>

      {/* Query Input Card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-xl shadow-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              id="ask-journal-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your past reflections..."
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
            />
            <Compass className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>Grounded strictly in your historical entries</span>
            </div>

            <button
              id="ask-journal-submit-btn"
              type="submit"
              disabled={!question.trim() || loading || entries.length === 0}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition-all hover:bg-zinc-200 disabled:opacity-40 shadow-xl cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Searching & Synthesizing...</span>
                </>
              ) : (
                <>
                  <SearchCode className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Ask Gemini</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sample queries */}
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="text-[11px] font-medium text-zinc-500 mb-2 flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3" />
            <span>Try asking:</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(q);
                  handleAsk(q);
                }}
                disabled={loading || entries.length === 0}
                className="text-left rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 hover:border-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-300 backdrop-blur-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grounded AI Answer Box */}
      {answer && (
        <div className="mt-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-violet-950/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Grounded Answer
              </span>
            </div>

            {citedDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Cited Dates:</span>
                {citedDates.map((date, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-medium text-indigo-300 border border-indigo-500/20"
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {date}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-500 border-t border-white/5 pt-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>This answer was generated exclusively from your saved entries with no external extrapolation.</span>
          </div>
        </div>
      )}

      {/* Referenced Grounding Entries */}
      {matchedEntries.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Top Relevant Entries Used as Grounding Context ({matchedEntries.length})
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {matchedEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left backdrop-blur-md hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 text-zinc-500 font-mono text-[10px]">
                  <span>{entry.dateFormatted}</span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.2 text-[9px] text-indigo-400 border border-indigo-500/20">
                    {entry.mood}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white truncate">
                  {entry.title}
                </h4>
                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {entry.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
