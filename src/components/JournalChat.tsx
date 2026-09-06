import React, { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import {
  Send,
  Sparkles,
  BookmarkCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Tag,
  Smile,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { ChatMessage, UserJournalEntry } from "../types";
import { saveJournalEntry } from "../lib/firebase";

interface JournalChatProps {
  user: User;
  onEntrySaved: (entry: UserJournalEntry) => void;
  onNavigateToHistory: () => void;
}

const STARTER_PROMPTS = [
  {
    title: "Daily Reflection",
    prompt: "I'd like to reflect on my day. Help me unpack what went well, what felt stressful, and what I learned."
  },
  {
    title: "Brainstorm a Goal",
    prompt: "I have a project idea I've been hesitating on. Can we brainstorm the next 3 concrete steps and overcome mental roadblocks?"
  },
  {
    title: "Gratitude & Calm",
    prompt: "I want to ground myself. Let's do a quick gratitude check-in and explore 3 things that brought me peace recently."
  },
  {
    title: "Untangle Anxiety",
    prompt: "I'm feeling a bit anxious and overwhelmed today. Help me break down the sources of stress and gain clarity."
  }
];

export const JournalChat: React.FC<JournalChatProps> = ({
  user,
  onEntrySaved,
  onNavigateToHistory,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessModal, setSavedSuccessModal] = useState<UserJournalEntry | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || sending || saving) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: messageContent,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setSending(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: "msg-gemini-" + Date.now(),
        role: "model",
        content: data.reply || "Thank you for sharing that reflection.",
        timestamp: Date.now(),
      };

      setMessages([...newMessages, modelMsg]);
    } catch (err: any) {
      console.error("Chat failure:", err);
      setError(err.message || "Failed to communicate with Gemini. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleSaveEntry = async () => {
    if (messages.length === 0 || saving) return;

    setSaving(true);
    setError(null);

    try {
      const summarizeRes = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!summarizeRes.ok) {
        const errData = await summarizeRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate entry summary.");
      }

      const summaryData = await summarizeRes.json();
      const now = Date.now();
      const dateFormatted = new Date(now).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const entryPayload: Omit<UserJournalEntry, "id"> = {
        userId: user.uid,
        createdAt: now,
        dateFormatted,
        title: summaryData.title || "Reflective Journal Entry",
        summary: summaryData.summary || "",
        mood: summaryData.mood || "Reflective",
        themes: Array.isArray(summaryData.themes) ? summaryData.themes : [],
        conversation: messages,
        embedding: summaryData.embedding,
      };

      const docId = await saveJournalEntry(user.uid, entryPayload);

      const savedEntry: UserJournalEntry = {
        ...entryPayload,
        id: docId,
      };

      setSavedSuccessModal(savedEntry);
      onEntrySaved(savedEntry);
    } catch (err: any) {
      console.error("Save entry error:", err);
      setError(err.message || "Failed to save entry to Firestore. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0) {
      if (window.confirm("Are you sure you want to clear this conversation? Any unsaved thoughts will be cleared.")) {
        setMessages([]);
        setError(null);
      }
    }
  };

  const handleStartFreshAfterSave = () => {
    setSavedSuccessModal(null);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-4xl flex-col p-3 sm:p-6 font-sans">
      {/* Top Action Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#08080a]/80 px-4 py-3 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Current Session
            </h2>
            <p className="text-[11px] text-zinc-500">
              Multi-turn dialogue with Gemini. Save anytime to record in Firestore.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              id="clear-chat-btn"
              onClick={handleClearChat}
              disabled={saving || sending}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}

          <button
            id="save-journal-entry-btn"
            onClick={handleSaveEntry}
            disabled={messages.length === 0 || saving || sending}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-zinc-200 disabled:opacity-40 shadow-xl cursor-pointer"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Synthesizing & Saving...</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Save to Journal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-300 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              What's on your mind today?
            </h3>
            <p className="mt-2 max-w-md text-xs text-zinc-400 leading-relaxed">
              Start free-form journaling, unpack a complicated thought, or pick an inspiration prompt below. Gemini will listen, ask helpful questions, and synthesize your thoughts.
            </p>

            <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-2 text-left">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  id={`starter-prompt-${i}`}
                  onClick={() => handleSendMessage(starter.prompt)}
                  className="group rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.07] hover:border-indigo-500/30 hover:shadow-lg cursor-pointer"
                >
                  <p className="font-semibold text-xs text-white group-hover:text-indigo-300 transition-colors">
                    {starter.title}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {starter.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-tr-none bg-indigo-600/20 border border-indigo-500/20 text-indigo-50 shadow-md"
                        : "rounded-tl-none bg-zinc-900/80 border border-white/5 text-zinc-200 shadow-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span
                      className={`mt-2 block text-[10px] ${
                        isUser ? "text-indigo-300/60" : "text-zinc-500"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 border border-white/5 text-xs font-semibold">
                      {user.displayName?.[0] || user.email?.[0] || "U"}
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                  AI
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-none border border-white/5 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-400 shadow-md">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.4s]" />
                  </div>
                  <span className="text-zinc-400 italic text-[11px]">Gemini is reflecting...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-inner focus-within:ring-1 focus-within:ring-indigo-500/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            id="chat-textarea-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts with Gemini (Press Enter to send)..."
            disabled={sending || saving}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none sm:text-sm max-h-36"
          />

          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || sending || saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-all hover:bg-indigo-400 disabled:opacity-30 shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Saved Entry Preview Modal */}
      {savedSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#08080a] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Persisted to Isolated Firestore
              </span>
            </div>

            <h3 className="mt-3 text-xl font-bold text-white tracking-tight">
              {savedSuccessModal.title}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                <Smile className="h-3 w-3" />
                Mood: {savedSuccessModal.mood}
              </span>

              {savedSuccessModal.themes.map((theme, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                >
                  <Tag className="h-2.5 w-2.5" />
                  #{theme}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white/[0.02] p-4 text-xs text-zinc-300 leading-relaxed max-h-48 overflow-y-auto border border-white/5">
              <p className="font-semibold text-white mb-1">Generated Summary:</p>
              <p className="whitespace-pre-wrap">{savedSuccessModal.summary}</p>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500">
              Stored under: <code className="font-mono text-zinc-400">/users/{user.uid}/entries</code>
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                id="modal-fresh-chat-btn"
                onClick={handleStartFreshAfterSave}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Start New Session
              </button>

              <button
                id="modal-view-history-btn"
                onClick={() => {
                  setSavedSuccessModal(null);
                  onNavigateToHistory();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 cursor-pointer shadow-lg"
              >
                <span>View in History</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
