# Personal Gemini Journal

A production-grade, user-authenticated personal journaling and brainstorming web application powered by **Google Gemini API** (`@google/genai`), **Firebase Authentication**, and strictly isolated **Cloud Firestore** databases.

---

## Architecture Overview

1. **Authentication Layer**: Federated Google Sign-In via Firebase Auth. No passwords stored or handled directly in application code.
2. **Data Isolation Layer**: Each user's reflections, conversation history, mood tags, and embeddings are isolated strictly under `/users/{userId}/entries/{entryId}`. Firestore security rules guarantee that no user can read or alter another user's records.
3. **Conversational AI Partner**: Multi-turn dialogue with Gemini with empathetic system instructions to untangle thoughts, brainstorm ideas, and explore emotions.
4. **Structured Synthesis**: Automatic summarization of multi-turn chat sessions into concise entries, generating a one-word mood tag (e.g. *Grateful*, *Reflective*, *Energized*, *Anxious*, *Peaceful*), up to 5 topic themes, and high-dimensional vector embeddings (`text-embedding-004`).
5. **Ask Your Journal**: Natural-language semantic search across historical entries using cosine similarity over embeddings, grounded with citations of referenced entry dates.
6. **This Week in Review**: 7-day mood activity timeline and Gemini AI reflection summarizing the user's emotional arc, breakthroughs, and a suggested weekly intention.
7. **Secret Security**: The Gemini API key is retained strictly on the server-side (`server.ts`) and is never exposed to the client or browser network inspection.

---

## 1. Prerequisites & GCP API Setup

Ensure the Google Cloud SDK (`gcloud`) is installed and authenticated:

```bash
# Authenticate gcloud CLI
gcloud auth login

# Set your target Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 2. Secret Manager Configuration

Store the server-side Gemini API key securely in Secret Manager and grant access to the Cloud Run service account:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Cloud Firestore Security Rules

Deploy the owner-bound security rules to ensure zero-leakage user isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile and strictly isolated user journal entries
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Fallback reject all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

To deploy via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the containerized application to Google Cloud Run:

```bash
# Build and deploy service with Secret Manager environment injection
gcloud run deploy personal-gemini-journal \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production
```

### Mandatory Verification Resource Labeling
Apply the campaign challenge label to register your deployed service:

```bash
gcloud run services update personal-gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 5. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables in .env
# GEMINI_API_KEY="AIzaSy..."

# 3. Start development server (Express + Vite on http://localhost:3000)
npm run dev

# 4. Compile and verify production build
npm run build
```

---

## 6. End-to-End Test Walkthrough Matrix

The following test cases validate every user interaction and system process:

| Case ID | Feature / Component | Action / Input Trigger | Expected System Behavior & UI Assertion |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Google Authentication** | Click "Continue with Google" on landing page. | Firebase popup opens; upon success, transitions from Landing Page to Dashboard, renders user avatar & email in header. |
| **TC-02** | **Starter Prompts** | Click any starter prompt card (e.g. "Daily Reflection"). | The prompt text populates into the conversation; triggers Gemini AI response with typing animation. |
| **TC-03** | **Multi-turn Chat** | Type a message and press Enter or click the Send button. | User message appears right-aligned; Gemini response streams/loads on the left with timestamp. |
| **TC-04** | **Save Journal Entry** | Click "Save to Journal" button with active chat. | Button enters loading state; `/api/gemini/summarize` generates title, summary, 1-word mood, themes, and embedding; saves to `/users/{uid}/entries`; opens success modal. |
| **TC-05** | **Entry History View** | Click "History" tab in top navigation. | Shows list of user's saved entries with dates, mood tags, themes, and summary. Does not show other users' entries. |
| **TC-06** | **History Search & Filters** | Type keywords in the search bar or click mood filter pills. | Entries list dynamically filters by matching title, summary, mood, or themes in real-time. |
| **TC-07** | **Expand Dialogue Transcript** | Click "View Full Conversation" toggle on an entry card. | Expands the full multi-turn conversation that produced this entry. |
| **TC-08** | **Entry Deletion** | Click the trash icon on an entry and confirm prompt. | Document is deleted from Firestore `/users/{uid}/entries/{id}` and removed from the UI list instantly. |
| **TC-09** | **Ask Your Journal** | Click "Ask Your Journal" tab, enter question, click "Ask". | Embeds query, computes cosine similarity over entries, sends grounded context to `/api/gemini/ask`, outputs synthesized answer citing exact entry dates with referenced source cards below. |
| **TC-10** | **This Week in Review** | Click "This Week" tab in navigation. | Displays 7-day mood timeline, entries count this week, dominant mood, top themes, AI emotional arc reflection, and weekly intention. |
| **TC-11** | **Sign Out** | Click "Sign out" button in navbar. | Clears auth state; redirects back to landing page; unmounts active journal session. |
