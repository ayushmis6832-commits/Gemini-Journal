import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Firestore
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { UserJournalEntry } from "../types";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Initialize Firestore with configured database ID
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication Functions
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Payload sanitizer: strictly strip undefined fields prior to Firestore operations
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = sanitizeForFirestore(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        item !== null && typeof item === "object" ? sanitizeForFirestore(item) : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

/**
 * Persist a journal entry in strictly user-isolated collection:
 * /users/{userId}/entries/{entryId}
 */
export async function saveJournalEntry(
  userId: string,
  entryData: Omit<UserJournalEntry, "id">,
  entryId?: string
): Promise<string> {
  if (!userId) {
    throw new Error("Cannot save entry without authenticated user ID.");
  }

  const entriesCollection = collection(db, "users", userId, "entries");
  const docRef = entryId ? doc(entriesCollection, entryId) : doc(entriesCollection);
  
  const payload = sanitizeForFirestore({
    ...entryData,
    userId,
    updatedAt: Date.now()
  });

  await setDoc(docRef, payload);
  return docRef.id;
}

/**
 * Delete a journal entry for the authenticated user
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("Missing userId or entryId for deletion.");
  }
  const entryDoc = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryDoc);
}

/**
 * Real-time subscription to the user's isolated journal entries, ordered by newest first
 */
export function subscribeUserEntries(
  userId: string,
  onUpdate: (entries: UserJournalEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = collection(db, "users", userId, "entries");
  const entriesQuery = query(entriesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      const entries: UserJournalEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || userId,
          createdAt: data.createdAt || Date.now(),
          dateFormatted: data.dateFormatted || new Date(data.createdAt || Date.now()).toLocaleDateString(),
          title: data.title || "Untitled Entry",
          summary: data.summary || "",
          mood: data.mood || "Reflective",
          themes: Array.isArray(data.themes) ? data.themes : [],
          conversation: Array.isArray(data.conversation) ? data.conversation : [],
          embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
        };
      });
      onUpdate(entries);
    },
    (err) => {
      console.error("Error subscribing to user journal entries:", err);
      if (onError) {
        onError(err);
      }
    }
  );
}
