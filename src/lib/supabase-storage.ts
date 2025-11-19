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
 * Retrieve stored phrases from Supabase for a specific date, region, and formality
 */
export async function getStoredPhrases(region?: string, formality?: string): Promise<StoredPhrases | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const today = getTodayKey();

  try {
    let query = supabase
      .from("user_phrases")
      .select("phrases, date, region, formality")
      .eq("user_id", userId)
      .eq("date", today);

    if (region) {
      query = query.eq("region", region);
    }
    if (formality) {
      query = query.eq("formality", formality);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching phrases:", error);
      return null;
    }

    if (data && data.date === today) {
      return {
        date: data.date,
        phrases: data.phrases || [],
        region: data.region,
        formality: data.formality,
        timestamp: Date.now(),
        englishPhrases: data.phrases?.map((p: Phrase) => ({
          english: p.english,
          difficulty: p.difficulty,
          id: p.id,
          used: p.used,
        })),
      };
    }

    return null;
  } catch (error) {
    console.error("Error in getStoredPhrases:", error);
    return null;
  }
}

/**
 * Save phrases to Supabase for today, keyed by region and formality
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

  // Extract English phrases as base for region switching
  const englishPhrases = phrases.map(p => ({
    english: p.english,
    difficulty: p.difficulty,
    id: p.id,
    used: p.used,
  }));

  const data = {
    user_id: userId,
    date: today,
    region,
    formality,
    phrases,
  };

  try {
    const { error } = await supabase
      .from("user_phrases")
      .upsert(data, {
        onConflict: "user_id,date,region,formality",
      });

    if (error) {
      console.error("Error saving phrases to Supabase:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in savePhrases:", error);
    throw error;
  }
}

/**
 * Get English phrases base from stored data (for region/formality switching)
 */
export async function getEnglishPhrasesBase(): Promise<Array<{ english: string; difficulty: Difficulty; id: number; used: boolean }> | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const today = getTodayKey();

  try {
    const { data, error } = await supabase
      .from("user_phrases")
      .select("phrases")
      .eq("user_id", userId)
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
        used: p.used,
      }));
    }

    return null;
  } catch (error) {
    console.error("Error in getEnglishPhrasesBase:", error);
    return null;
  }
}

/**
 * Update a single phrase's completion status in Supabase
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

  try {
    // Update all matching records for today and region
    let query = supabase
      .from("user_phrases")
      .select("phrases")
      .eq("user_id", userId)
      .eq("date", today);

    if (region) {
      query = query.eq("region", region);
    }

    const { data: records, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching phrases for update:", fetchError);
      return;
    }

    if (!records || records.length === 0) return;

    // Update each record
    for (const record of records) {
      const updatedPhrases = (record.phrases as Phrase[]).map((p: Phrase) =>
        p.id === phraseId ? { ...p, used } : p
      );

      const { error: updateError } = await supabase
        .from("user_phrases")
        .update({ phrases: updatedPhrases })
        .eq("user_id", userId)
        .eq("date", today)
        .eq("region", record.region)
        .eq("formality", record.formality);

      if (updateError) {
        console.error("Error updating phrase completion:", updateError);
      }
    }
  } catch (error) {
    console.error("Error in updatePhraseCompletion:", error);
  }
}

/**
 * Get all English phrases from the last HISTORY_DAYS days
 */
export async function getRecentEnglishPhrases(): Promise<string[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  const recentPhrases = new Set<string>();

  try {
    const { data, error } = await supabase
      .from("user_phrases")
      .select("phrases, date")
      .eq("user_id", userId)
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

