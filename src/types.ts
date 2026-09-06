export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface UserJournalEntry {
  id: string;
  userId: string;
  createdAt: number;
  dateFormatted: string;
  title: string;
  summary: string;
  mood: string;
  themes: string[];
  conversation: ChatMessage[];
  embedding?: number[];
}

export interface AskResult {
  answer: string;
  citedDates: string[];
  citedEntryIds: string[];
  sourceEntries: UserJournalEntry[];
}

export interface WeeklyReflectionResult {
  weeklyReflection: string;
  keyHighlights: string[];
  suggestedIntention: string;
}

export type TabType = 'chat' | 'history' | 'ask' | 'week';
