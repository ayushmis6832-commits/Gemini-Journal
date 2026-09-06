import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Ordering Guarantee: Mount body parsers before defining any routes
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Lazy GoogleGenAI client accessor
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment.");
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

// Resilient Model Fallback Ladder
const MODEL_LADDER = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

interface GenerateOptions {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

async function generateContentWithFallback(options: GenerateOptions): Promise<string> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_LADDER) {
    try {
      const config: any = {};
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const msg = err?.message || "";
      console.warn(`Model ${model} failed (status: ${status}, message: ${msg}). Attempting next fallback...`);
      // Continue to next model in ladder
    }
  }

  throw new Error(`All models in fallback ladder exhausted. Last error: ${lastError?.message || "Unknown error"}`);
}

// Helper to generate text embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  try {
    const response: any = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    const values = response?.embedding?.values || response?.embeddings?.[0]?.values || [];
    return values;
  } catch (err: any) {
    console.warn("Embedding generation failed, returning empty vector:", err?.message);
    return [];
  }
}

// ==========================================
// API Routes
// ==========================================

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString()
  });
});

// Multi-turn Journaling & Brainstorming Chat
app.post("/api/gemini/chat", async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    
    if (messages.length === 0) {
      return res.status(400).json({ error: "Messages array cannot be empty." });
    }

    const systemInstruction = `You are a thoughtful, compassionate, and observant personal journaling companion.
Your purpose is to help the user unpack their thoughts, explore emotions, brainstorm ideas, and gain clarity.
- Keep responses engaging, warm, reflective, and conversational.
- Ask one gentle, thought-provoking follow-up question when natural to help deepen their reflection.
- Be supportive and non-judgmental. Keep responses reasonably concise (2-4 paragraphs max) so the conversation feels dialogic.`;

    // Convert messages into Google GenAI format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || "").slice(0, 8000) }]
    }));

    const reply = await generateContentWithFallback({
      contents,
      systemInstruction,
    });

    res.json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response." });
  }
});

// Summarize conversation into title, summary, 1-word mood, themes, and compute embedding
app.post("/api/gemini/summarize", async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({ error: "Cannot summarize an empty conversation." });
    }

    const transcript = messages
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
      .join("\n\n");

    const prompt = `Analyze this personal journaling conversation transcript and synthesize it into a structured journal entry record.

Transcript:
${transcript.slice(0, 15000)}

Return a valid JSON object with the following exact keys:
1. "title": A meaningful, poetic or reflective title (4-8 words).
2. "summary": A well-written, introspective 2-3 paragraph first-person or empathetic summary capturing key insights, reflections, decisions, or feelings.
3. "mood": Exactly ONE capitalized word describing the overarching emotional tone (e.g. "Grateful", "Reflective", "Energized", "Anxious", "Peaceful", "Determined", "Vulnerable", "Optimistic", "Melancholy", "Creative", "Overwhelmed", "Hopeful").
4. "themes": An array of 2 to 5 short lowercase topic themes or tags (e.g. ["work", "mindfulness", "burnout"]).`;

    const rawResult = await generateContentWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
      systemInstruction: "You are an expert personal reflection synthesizer and emotional analyst. Output only strict JSON.",
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawResult);
    } catch (e) {
      // Fallback regex extraction if parsing failed
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON response from Gemini.");
      }
    }

    const title = String(parsed.title || "Reflective Journal Entry");
    const summary = String(parsed.summary || transcript.slice(0, 300));
    const mood = String(parsed.mood || "Reflective").split(/\s+/)[0];
    const themes = Array.isArray(parsed.themes)
      ? parsed.themes.slice(0, 5).map((t: any) => String(t).toLowerCase().trim())
      : ["reflection"];

    // Compute embedding for vector similarity search
    const textToEmbed = `${title}\nMood: ${mood}\nThemes: ${themes.join(", ")}\n${summary}`;
    const embedding = await generateEmbedding(textToEmbed);

    res.json({
      title,
      summary,
      mood,
      themes,
      embedding,
    });
  } catch (error: any) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: error.message || "Failed to summarize conversation." });
  }
});

// Embed single text
app.post("/api/gemini/embed", async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const text = String(body.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Text is required to generate embedding." });
    }
    const embedding = await generateEmbedding(text);
    res.json({ embedding });
  } catch (error: any) {
    console.error("Embed error:", error);
    res.status(500).json({ error: error.message || "Failed to create embedding." });
  }
});

// "Ask your journal" - Synthesizes answers based strictly on top matching past entries
app.post("/api/gemini/ask", async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const query = String(body.query || "").trim();
    const relevantEntries = Array.isArray(body.entries) ? body.entries : [];

    if (!query) {
      return res.status(400).json({ error: "Query cannot be empty." });
    }

    if (relevantEntries.length === 0) {
      return res.json({
        answer: "I couldn't find any saved journal entries matching your question yet. Try saving a few journal entries first or asking a different question!",
        citedDates: [],
        citedEntryIds: []
      });
    }

    // Build grounding context from candidate entries
    const contextEntriesText = relevantEntries.map((e: any, idx: number) => {
      const dateStr = e.dateFormatted || e.date || "Unknown Date";
      return `--- [ENTRY ${idx + 1}] ---
Date: ${dateStr}
Title: ${e.title || "Untitled"}
Mood: ${e.mood || "Unknown"}
Themes: ${Array.isArray(e.themes) ? e.themes.join(", ") : ""}
Summary & Content:
${e.summary || ""}
`;
    }).join("\n\n");

    const prompt = `The user is asking a personal question about their life, thoughts, patterns, or history based exclusively on their past journal entries.

User Question: "${query}"

Here are the retrieved journal entries from the user's private database:
${contextEntriesText}

Instructions:
1. Answer the question using ONLY the provided journal entries as grounding. Do not hallucinate or extrapolate beyond what is documented in these entries.
2. Explicitly cite the specific dates of the entries you drew from (e.g. "On [Date], you noted...", or "[Month Day, Year]").
3. Address the user directly in a warm, insightful, personal tone (e.g. "Looking back across your entries...", "You reflected on...").
4. If the entries do not contain sufficient information to answer the question completely, honestly state what is present and acknowledge what hasn't been mentioned in these entries.
5. Provide a synthesis that connects themes, moods, or growth if apparent.`;

    const answer = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are the personal AI archivist of the user's journal. You provide honest, empathetic, and grounded answers strictly citing the entry dates provided in context.",
    });

    // Extract dates cited in the response or provide the dates from relevantEntries
    const citedDates = relevantEntries.map((e: any) => e.dateFormatted || e.date).filter(Boolean);
    const citedEntryIds = relevantEntries.map((e: any) => e.id).filter(Boolean);

    res.json({
      answer,
      citedDates,
      citedEntryIds,
    });
  } catch (error: any) {
    console.error("Ask journal error:", error);
    res.status(500).json({ error: error.message || "Failed to query journal entries." });
  }
});

// "This Week" Reflection & Mood Trend synthesis
app.post("/api/gemini/reflect-week", async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      return res.json({
        weeklyReflection: "You haven't logged any entries in the last 7 days yet. Take a moment today to start a conversation and record your first reflection of the week!",
        keyHighlights: ["No entries recorded in the past 7 days"],
        suggestedIntention: "Pause for five minutes today to write about how you are feeling right now."
      });
    }

    const entriesSummary = entries.map((e: any) => {
      return `Date: ${e.dateFormatted || e.date}
Title: ${e.title}
Mood: ${e.mood}
Themes: ${Array.isArray(e.themes) ? e.themes.join(", ") : ""}
Summary: ${e.summary}`;
    }).join("\n\n");

    const prompt = `Review the user's journal entries from the past 7 days and generate a weekly synthesis.

User's entries this week:
${entriesSummary}

Output a JSON object with:
1. "weeklyReflection": A supportive, insightful 2-paragraph reflection summarizing the emotional arc, mental shifts, and recurring subjects over this past week.
2. "keyHighlights": An array of 3-4 bullet points noting meaningful breakthroughs, habits, or topics discussed.
3. "suggestedIntention": A gentle, grounding intention or prompt for the upcoming week based on their entries.`;

    const rawResult = await generateContentWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
      systemInstruction: "You are an empathetic, insightful mindfulness and reflection mentor. Produce structured JSON.",
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawResult);
    } catch (e) {
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    res.json({
      weeklyReflection: parsed.weeklyReflection || "Here is your weekly journal reflection based on your recent entries.",
      keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : ["Consistent journaling and self-awareness"],
      suggestedIntention: parsed.suggestedIntention || "Stay mindful of your energy and take time to rest when needed."
    });
  } catch (error: any) {
    console.error("Weekly reflection error:", error);
    res.status(500).json({ error: error.message || "Failed to generate weekly reflection." });
  }
});

// ==========================================
// Vite Middleware & Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Personal Gemini Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
