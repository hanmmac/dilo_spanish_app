import { Phrase, Difficulty } from "@/types/phrase";
import { supabase } from "./supabase";

interface StoredPhrases {
  date: string; // ISO date string in user's timezone (YYYY-MM-DD)
  phrases: Phrase[];
  region: string;
  formality: string;
  timestamp: number;
  englishPhrases?: Array<{ english: string; difficulty: Difficulty; id: number; used: boolean }>;
}

const HISTORY_DAYS = 14; // Track history for 14 days to prevent duplicates

type UserPhraseRecord = {
  phrases: Phrase[];
  region: string;
  formality: string;
};

/**
 * Get today's date in user's local timezone as YYYY-MM-DD
 */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the current user ID from Supabase auth
 */
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get shared phrases from daily_phrases table
 */
async function getSharedPhrases(
  date: string,
  region: string,
  formality: string
): Promise<Phrase[] | null> {
  try {
    const { data, error } = await supabase
      .from("daily_phrases")
      .select("phrases")
      .eq("date", date)
      .eq("region", region)
      .eq("formality", formality)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching shared phrases:", error);
      return null;
    }

    return data?.phrases || null;
  } catch (error) {
    console.error("Error in getSharedPhrases:", error);
    return null;
  }
}

/**
 * Save shared phrases to daily_phrases table
 */
async function saveSharedPhrases(
  phrases: Phrase[],
  date: string,
  region: string,
  formality: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("daily_phrases")
      .insert({
        date,
        region,
        formality,
        phrases,
      })
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, phrases already exist (race condition handled)
      if (error.code === "23505") {
        console.log("Phrases already exist for this date/region/formality");
        return;
      }
      console.error("Error saving shared phrases:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in saveSharedPhrases:", error);
    throw error;
  }
}

/**
 * Get user's completion status for phrases
 */
async function getUserCompletions(
  date: string,
  region: string,
  formality: string
): Promise<Record<number, boolean> | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("user_phrases")
      .select("phrases")
      .eq("user_id", userId)
      .eq("date", date)
      .eq("region", region)
      .eq("formality", formality)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching user completions:", error);
      return null;
    }

    if (data?.phrases && Array.isArray(data.phrases)) {
      const completions: Record<number, boolean> = {};
      data.phrases.forEach((p: Phrase) => {
        completions[p.id] = p.used || false;
      });
      return completions;
    }

    return null;
  } catch (error) {
    console.error("Error in getUserCompletions:", error);
    return null;
  }
}

/**
 * Retrieve stored phrases from Supabase for a specific date, region, and formality
 * Now checks shared daily_phrases first, then merges with user completion status
 */
export async function getStoredPhrases(region?: string, formality?: string): Promise<StoredPhrases | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const today = getTodayKey();
  const finalRegion = region || "costa-rica";
  const finalFormality = formality || "neutral";

  try {
    // Get shared phrases
    const sharedPhrases = await getSharedPhrases(today, finalRegion, finalFormality);
    if (!sharedPhrases) {
      return null;
    }

    // Get user's completion status
    const completions = await getUserCompletions(today, finalRegion, finalFormality);

    // Merge shared phrases with user completion status
    const phrasesWithCompletions: Phrase[] = sharedPhrases.map((phrase: Phrase) => ({
      ...phrase,
      used: completions?.[phrase.id] ?? false,
    }));

    return {
      date: today,
      phrases: phrasesWithCompletions,
      region: finalRegion,
      formality: finalFormality,
      timestamp: Date.now(),
      englishPhrases: phrasesWithCompletions.map((p: Phrase) => ({
        english: p.english,
        difficulty: p.difficulty,
        id: p.id,
        used: p.used,
      })),
    };
  } catch (error) {
    console.error("Error in getStoredPhrases:", error);
    return null;
  }
}

/**
 * Save phrases to Supabase
 * Now saves to daily_phrases (shared) and user_phrases (completion status only)
 */
export async function savePhrases(
  phrases: Phrase[],
  region: string,
  formality: string
): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn("Cannot save phrases: user not authenticated");
    return;
  }

  const today = getTodayKey();

  try {
    // Save to shared daily_phrases (if not already exists)
    await saveSharedPhrases(phrases, today, region, formality);

    // Save completion status to user_phrases
    // Store phrases with completion status for this user
    const userPhrasesData = {
      user_id: userId,
      date: today,
      region,
      formality,
      phrases: phrases.map(p => ({ ...p, used: p.used || false })),
    };

    const { error: userError } = await supabase
      .from("user_phrases")
      .upsert(userPhrasesData, {
        onConflict: "user_id,date,region,formality",
      });

    if (userError) {
      console.error("Error saving user phrases:", userError);
      throw userError;
    }
  } catch (error) {
    console.error("Error in savePhrases:", error);
    throw error;
  }
}

/**
 * Get English phrases base from shared daily_phrases
 */
export async function getEnglishPhrasesBase(): Promise<Array<{ english: string; difficulty: Difficulty; id: number; used: boolean }> | null> {
  const today = getTodayKey();

  try {
    // Get any region/formality combination for today to extract English phrases
    const { data, error } = await supabase
      .from("daily_phrases")
      .select("phrases")
      .eq("date", today)
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching English phrases base:", error);
      return null;
    }

    if (data?.phrases && Array.isArray(data.phrases)) {
      return data.phrases.map((p: Phrase) => ({
        english: p.english,
        difficulty: p.difficulty,
        id: p.id,
        used: false, // Base phrases don't have completion status
      }));
    }

    return null;
  } catch (error) {
    console.error("Error in getEnglishPhrasesBase:", error);
    return null;
  }
}

/**
 * Update a single phrase's completion status in user_phrases
 */
export async function updatePhraseCompletion(
  phraseId: number,
  used: boolean,
  region?: string,
  formality?: string
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const today = getTodayKey();
  const finalRegion = region || "costa-rica";
  const finalFormality = formality || "neutral";

  try {
    // Get shared phrases to get the full phrase list
    const sharedPhrases = await getSharedPhrases(today, finalRegion, finalFormality);
    if (!sharedPhrases) {
      console.error("Shared phrases not found for update");
      return;
    }

    // Get current user completions
    const currentCompletions = await getUserCompletions(today, finalRegion, finalFormality);

    // Update user's completion status
    const updatedPhrases = sharedPhrases.map((p: Phrase) => ({
      ...p,
      used: p.id === phraseId ? used : (currentCompletions?.[p.id] ?? false),
    }));

    const { error: updateError } = await supabase
      .from("user_phrases")
      .upsert({
        user_id: userId,
        date: today,
        region: finalRegion,
        formality: finalFormality,
        phrases: updatedPhrases,
      }, {
        onConflict: "user_id,date,region,formality",
      });

    if (updateError) {
      console.error("Error updating phrase completion:", updateError);
    }
  } catch (error) {
    console.error("Error in updatePhraseCompletion:", error);
  }
}

/**
 * Get all English phrases from the last HISTORY_DAYS days from shared daily_phrases
 */
export async function getRecentEnglishPhrases(): Promise<string[]> {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  const recentPhrases = new Set<string>();

  try {
    const { data, error } = await supabase
      .from("daily_phrases")
      .select("phrases, date")
      .gte("date", cutoffDateStr);

    if (error) {
      console.error("Error fetching recent phrases:", error);
      return [];
    }

    if (data) {
      data.forEach((record) => {
        if (record.phrases && Array.isArray(record.phrases)) {
          record.phrases.forEach((p: Phrase) => {
            if (p.english) {
              recentPhrases.add(p.english.trim().toLowerCase());
            }
          });
        }
      });
    }

    return Array.from(recentPhrases);
  } catch (error) {
    console.error("Error in getRecentEnglishPhrases:", error);
    return [];
  }
}
