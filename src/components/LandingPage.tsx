import React, { useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  SearchCode,
  TrendingUp,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { signInWithGoogle } from "../lib/firebase";

interface LandingPageProps {
  onSignInSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (onSignInSuccess) {
        onSignInSuccess();
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setError(err?.message || "Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050507] text-zinc-300 font-sans selection:bg-indigo-500/30 selection:text-white overflow-hidden">
      {/* Immersive ambient gradient blur orbs */}
      <div className="pointer-events-none absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-50px] left-[-50px] w-72 h-72 bg-violet-500/10 rounded-full blur-[100px]" />

      {/* Top minimal header */}
      <header className="relative z-10 border-b border-white/5 bg-[#08080a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white text-base sm:text-lg">
                Gemini Journal
              </span>
              <span className="block text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                Private • Intelligent • Grounded
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 border border-white/5">
              <Lock className="h-3 w-3 text-indigo-400" />
              Isolated Firestore
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-zinc-300 shadow-inner mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Multi-turn AI Reflection & Semantic Retrieval</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
            A private conversational sanctuary <br className="hidden sm:inline" />
            for your thoughts and growth.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed sm:text-lg">
            Brainstorm and unpack your daily experiences with Gemini AI. When you're ready,
            synthesize your dialogue into structured journal records with mood tags, topic themes,
            and semantic memory.
          </p>

          {/* Authentication Action Box */}
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-left text-xs font-medium text-rose-300 border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="landing-google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-60 shadow-xl cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Connecting with Google...</span>
                </div>
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="h-4 w-4 ml-1 opacity-70" />
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-zinc-500">
              No passwords stored. Isolated per user with strict Firebase security rules.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md shadow-lg hover:border-white/10 transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Brainstorming Partner
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Have continuous multi-turn conversations with Gemini to explore ideas, untangle emotional knots, and think out loud.
            </p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md shadow-lg hover:border-white/10 transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 mb-4 border border-violet-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Instant Synthesis
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Save any chat into a polished journal entry with a one-word mood tag and up to 5 topic themes automatically extracted.
            </p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md shadow-lg hover:border-white/10 transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 mb-4 border border-teal-500/20">
              <SearchCode className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Ask Your Journal
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Ask natural-language questions across your entire history. Gemini finds relevant entries via embeddings and cites exact dates.
            </p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md shadow-lg hover:border-white/10 transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Weekly Reflection
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Review your 7-day mood trend and receive a weekly reflection synthesizing your emotional arc and recurring subjects.
            </p>
          </div>
        </div>

        {/* Security & Data Privacy Card */}
        <div className="mt-12 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-violet-950/20 p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  Strict Firestore User Data Isolation
                </h4>
                <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                  Your journal entries are stored strictly under <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-zinc-200">/users/{'{userId}'}/entries</code>.
                  Firestore security rules strictly forbid cross-user reading or writing. The Gemini API key remains safely on the server.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>OWASP Top 10 Compliant</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
