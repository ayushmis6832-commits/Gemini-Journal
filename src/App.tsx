import React, { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, logOut, subscribeUserEntries } from "./lib/firebase";
import { UserJournalEntry, TabType } from "./types";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { JournalChat } from "./components/JournalChat";
import { EntryHistory } from "./components/EntryHistory";
import { AskJournal } from "./components/AskJournal";
import { ThisWeekView } from "./components/ThisWeekView";
import { BookOpen, AlertCircle } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>("chat");
  const [entries, setEntries] = useState<UserJournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to the authenticated user's isolated Firestore entries
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    setFirestoreError(null);

    const unsubscribe = subscribeUserEntries(
      user.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
        setEntriesLoading(false);
      },
      (error) => {
        console.error("Firestore sync error:", error);
        setFirestoreError("Unable to synchronize your journal entries with Firestore. Please check your network connection.");
        setEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logOut();
      setUser(null);
      setCurrentTab("chat");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleEntrySaved = (_newEntry: UserJournalEntry) => {
    // Real-time listener in Firestore automatically updates `entries` state.
  };

  // Initial Auth Loading Screen - Immersive Midnight Theme
  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#050507] text-zinc-300 overflow-hidden font-sans">
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/20 animate-pulse">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-white">
            Personal Gemini Journal
          </p>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10 border border-white/5">
            <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-indigo-500 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated: Landing Page with Google Sign-In
  if (!user) {
    return <LandingPage onSignInSuccess={() => setCurrentTab("chat")} />;
  }

  // Authenticated: Immersive UI Dashboard
  return (
    <div className="relative min-h-screen bg-[#050507] text-zinc-300 font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      {/* Immersive ambient background light glows */}
      <div className="pointer-events-none fixed top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] z-0" />
      <div className="pointer-events-none fixed bottom-[-50px] left-[-50px] w-80 h-80 bg-violet-500/5 rounded-full blur-[120px] z-0" />

      {/* Top Navigation */}
      <Navbar
        user={user}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        entriesCount={entries.length}
      />

      {/* Global Firestore Error Banner */}
      {firestoreError && (
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300 backdrop-blur-md">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{firestoreError}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 pb-16">
        {currentTab === "chat" && (
          <JournalChat
            user={user}
            onEntrySaved={handleEntrySaved}
            onNavigateToHistory={() => setCurrentTab("history")}
          />
        )}

        {currentTab === "history" && (
          <EntryHistory
            user={user}
            entries={entries}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === "ask" && (
          <AskJournal
            user={user}
            entries={entries}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === "week" && (
          <ThisWeekView
            user={user}
            entries={entries}
            onSelectTab={setCurrentTab}
          />
        )}
      </main>
    </div>
  );
}
