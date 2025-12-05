import { openai } from "./client";
import { Phrase, PhraseGenerationParams, Difficulty } from "@/types/phrase";

const REGION_DESCRIPTIONS: Record<string, string> = {
  general: "general/neutral Spanish that works across all regions",
  spain: "Spain (Castilian Spanish) - use 'vosotros' forms and Spain-specific vocabulary",
  mexico: "Mexico - use Mexican Spanish with local expressions and vocabulary",
  argentina: "Argentina - use Argentine Spanish with 'vos' forms and local expressions",
  colombia: "Colombia - use Colombian Spanish with local expressions",
  caribbean: "Caribbean Spanish - use expressions common in Cuba, Dominican Republic, Puerto Rico",
  "costa-rica": "Costa Rica - use Costa Rican Spanish with 'usted' for informal contexts and local expressions like 'tuanis', 'mae', 'pura vida'",
};

const DIFFICULTY_DESCRIPTIONS = {
  Easy: "Simple, common verbs (ser, estar, tener, hacer, ir) and basic vocabulary. Everyday phrases like greetings and simple questions.",
  Medium: "More complex verbs (poder, querer, necesitar, deber) and less common vocabulary. Includes subjunctive mood, reflexive verbs, and idiomatic expressions.",
  Hard: "Advanced verbs (conseguir, lograr, alcanzar, suponer) and sophisticated vocabulary. Complex grammar structures, uncommon idioms, and nuanced expressions.",
};

const normalizeAlternatives = (
  alternatives: any
): Array<{
  text: string;
  english?: string;
  region: string;
  formality: string;
}> => {
  if (!Array.isArray(alternatives)) return [];
  return alternatives.map((alt) => ({
    text: alt?.text || alt?.Text || "",
    english: alt?.english || alt?.English || "",
    region: alt?.region || alt?.Region || "",
    formality: alt?.formality || alt?.Formality || "",
  }));
};

export async function generatePhrases(
  params: PhraseGenerationParams
): Promise<Phrase[]> {
  const {
    region = "costa-rica",
    formality = "neutral",
    count = 10,
    date,
    recentPhrases = [],
  } = params;

  const regionDesc = REGION_DESCRIPTIONS[region] || REGION_DESCRIPTIONS.general;
  const formalityDesc =
    formality === "formal"
      ? "formal (use 'usted' forms exclusively - e.g., '¿Cómo está?' not '¿Cómo estás?')"
      : formality === "informal"
      ? "informal (ALWAYS use 'tú' or 'vos' forms depending on region - e.g., '¿Cómo estás?' not '¿Cómo está?', '¿Qué tal?' not '¿Qué tal está?'). For each phrase, also provide a 'formalWords' object mapping informal words to their formal equivalents (e.g., {'estás': 'está', 'tú': 'usted', 'te': 'le', 'tu': 'su'})"
      : "neutral (prefer informal 'tú' or 'vos' forms, but can include some formal if contextually appropriate). When informal forms are used, provide a 'formalWords' object mapping informal words to their formal equivalents";

  // Create a seed based on date for daily consistency
  const seed = date
    ? new Date(date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // Build history exclusion text if we have recent phrases
  const historyExclusion = recentPhrases.length > 0
    ? `\n\nIMPORTANT: Avoid generating phrases with the same English meaning as these recently used phrases (from the last 14 days):\n${recentPhrases.map((p, i) => `${i + 1}. "${p}"`).join("\n")}\n\nMake sure your generated phrases have DIFFERENT English meanings - use different topics, contexts, or phrasings.`
    : "";

  const systemPrompt = `You are a Spanish language learning assistant. Generate ${count} Spanish phrases with English translations.

Requirements:
- Region: ${regionDesc}
- Formality: ${formalityDesc}
- **CRITICAL: The main "spanish" phrase MUST be the MOST COMMON and WIDELY USED casual way of saying this in Latin American Spanish (not region-specific). Put region-specific variations and other common general variations in the "alternatives" array.**
${region === "costa-rica" ? "- For Costa Rica region: The main phrase should use the most common casual Latin American Spanish that works across all Latin American countries. Costa Rica-specific expressions (like 'tuanis', 'mae', 'pura vida', or Costa Rica-specific verb choices) should go in the alternatives array. This way users learn the most widely understood Spanish first, with regional variations as alternatives." : ""}
- Mix of difficulties: 3-4 Easy, 4-5 Medium, 2-3 Hard
- Difficulty is based on VERB COMPLEXITY and VOCABULARY SOPHISTICATION, NOT sentence length:
  * Easy: Simple verbs (ser, estar, tener, hacer, ir, venir, ver, decir) and basic vocabulary
  * Medium: More complex verbs (poder, querer, necesitar, deber, saber, conocer, entender) and less common vocabulary. May include subjunctive mood or reflexive verbs
  * Hard: Advanced verbs (conseguir, lograr, alcanzar, suponer, considerar, desarrollar) and sophisticated vocabulary. Complex grammar structures and nuanced expressions
- Focus on DIVERSITY of verbs and adjectives - use different verbs and descriptive words, but nothing too obscure or region-specific
- Include practical phrases for daily conversation covering:
  * Shopping: asking for prices, sizes, trying things on, paying, returns
  * Food & drinks: ordering at restaurants, cafes, bars, asking about ingredients, dietary restrictions
  * Weather: describing conditions, asking about forecasts, planning activities
  * Events & parties: invitations, discussing plans, describing celebrations
  * Pets: talking about animals, describing pets, asking about care
  * Houses & homes: describing living spaces, asking about amenities, discussing neighborhoods
  * Surf conditions: describing waves, weather for surfing, beach conditions
  * Food: describing dishes, cooking, asking about recipes, dietary preferences
  * Social interactions: making plans, asking about someone's day, casual conversations
- Ensure variety across all these topics while maintaining natural, conversational language
- Use proper Spanish punctuation (¿? ¡!)
- When formality is informal or neutral, include a "formalWords" object that maps informal words to their formal equivalents (e.g., {"tú": "usted", "te": "le", "tu": "su", "contigo": "con usted"})
- **IMPORTANT: For each phrase, identify which words in the Spanish text are verbs. Include a "verbs" array containing the exact verb words as they appear in the phrase (e.g., if the phrase is "¿Cómo estás?", the verbs array should be ["estás"]). Only include actual verbs, not nouns, adjectives, or other parts of speech.**

Return a JSON object with a "phrases" array in this exact format:
{
  "phrases": [
    {
      "spanish": "Buenos días",
      "english": "Good morning",
      "difficulty": "Easy",
      "formalWords": {},
      "verbs": [],
      "alternatives": [
        {"text": "Buen día", "english": "Good day", "region": "Argentina", "formality": "Neutral"},
        {"text": "Hola", "english": "Hello", "region": "General", "formality": "Neutral"}
      ]
    },
    {
      "spanish": "¿Cómo estás?",
      "english": "How are you?",
      "difficulty": "Easy",
      "formalWords": {"estás": "está", "tú": "usted"},
      "verbs": ["estás"],
      "alternatives": [
        {"text": "¿Qué tal?", "english": "How's it going?", "region": "General", "formality": "Informal"},
        {"text": "¿Cómo te va?", "english": "How's it going for you?", "region": "General", "formality": "Informal"}
      ]
    },
    ...
  ]
}

For each phrase, include 2-4 alternatives that are different ways to express the same meaning. For every alternative include an English translation string. **IMPORTANT: All alternatives must use the same formality level as the main phrase** (if formality is "formal", all alternatives must be formal; if formality is "informal" or "neutral", all alternatives must be informal/neutral). Alternatives should include:
- Costa Rica-specific variations (when region is Costa Rica)
- Other general common variations from Latin America (different vocabulary, phrasing, or idiomatic expressions that are widely used but not the most common)

IMPORTANT: When formality is "informal" or "neutral", ALWAYS use informal verb forms:
- Use "estás" not "está" (¿Cómo estás? not ¿Cómo está?)
- Use "tienes" not "tiene" (¿Tienes tiempo? not ¿Tiene tiempo?)
- Use "quieres" not "quiere" (¿Quieres ir? not ¿Quiere ir?)
- Use "puedes" not "puede" (¿Puedes ayudarme? not ¿Puede ayudarme?)
- Use "tú" not "usted"
- Use "te" not "le"
- Use "tu" not "su"
${historyExclusion}

Do not include any other text, explanations, or markdown formatting. Only the JSON object.`;

  const userPrompt = `Generate ${count} Spanish phrases for ${seed} (use this date as a seed for consistency).`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    // Extract phrases array from the response
    const phrasesArray = parsed.phrases;
    
    if (!Array.isArray(phrasesArray)) {
      throw new Error("Invalid response format from OpenAI - expected phrases array");
    }

    // Transform to Phrase format with IDs and used flag
    const phrases: Phrase[] = phrasesArray.map((p: any, index: number) => ({
      id: index + 1,
      spanish: p.spanish || p.Spanish || "",
      english: p.english || p.English || "",
      difficulty: (p.difficulty || p.Difficulty || "Medium") as Difficulty,
      used: false,
      formalWords: p.formalWords || {},
      verbs: Array.isArray(p.verbs) ? p.verbs : [],
      alternatives: normalizeAlternatives(p.alternatives),
    }));

    // Validate we got the right number
    if (phrases.length !== count) {
      console.warn(
        `Expected ${count} phrases, got ${phrases.length}. Using what we got.`
      );
    }

    return phrases.slice(0, count);
  } catch (error) {
    console.error("Error generating phrases:", error);
    throw new Error(
      `Failed to generate phrases: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Translate existing English phrases to Spanish for a new region
 * Keeps the same English meaning but adapts Spanish to the target region
 */
export async function translatePhrasesToRegion(
  englishPhrases: Array<{ english: string; difficulty: Difficulty; id: number; used: boolean }>,
  targetRegion: string,
  formality: "formal" | "informal" | "neutral"
): Promise<Phrase[]> {
  const regionDesc = REGION_DESCRIPTIONS[targetRegion] || REGION_DESCRIPTIONS.general;
  const formalityDesc =
    formality === "formal"
      ? "formal (use 'usted' forms exclusively)"
      : formality === "informal"
      ? "informal (ALWAYS use 'tú' or 'vos' forms depending on region). For each phrase, also provide a 'formalWords' object mapping informal words to their formal equivalents"
      : "neutral (prefer informal 'tú' or 'vos' forms, but can include some formal if contextually appropriate). When informal forms are used, provide a 'formalWords' object mapping informal words to their formal equivalents";

  const systemPrompt = `You are a Spanish language learning assistant. Translate the following English phrases to Spanish, adapting them for ${regionDesc} with ${formalityDesc}.

**CRITICAL: The main "spanish" translation MUST be the MOST COMMON and WIDELY USED casual way of saying this in Latin American Spanish (not region-specific). Put region-specific variations and other common general variations in the "alternatives" array.**
${targetRegion === "costa-rica" ? "For Costa Rica region: The main phrase should use the most common casual Latin American Spanish that works across all Latin American countries. Costa Rica-specific expressions should go in the alternatives array. This way users learn the most widely understood Spanish first, with regional variations as alternatives." : ""}

For each English phrase, provide:
1. A natural Spanish translation using the most common casual Latin American Spanish
2. The same difficulty level
3. A "formalWords" object if using informal forms
4. **A "verbs" array containing the exact verb words as they appear in the Spanish phrase (e.g., if the phrase is "¿Cómo estás?", the verbs array should be ["estás"]). Only include actual verbs, not nouns, adjectives, or other parts of speech.**
5. 2-4 alternatives that are different ways to express the same meaning in Spanish, and include an English translation for each alternative. **IMPORTANT: All alternatives must use the same formality level as the main phrase** (if formality is "formal", all alternatives must be formal; if formality is "informal" or "neutral", all alternatives must be informal/neutral). Alternatives should include:
   - Costa Rica-specific variations (when region is Costa Rica)
   - Other general common variations from Latin America (different vocabulary, phrasing, or idiomatic expressions that are widely used but not the most common)

Return a JSON object with a "phrases" array in this exact format:
{
  "phrases": [
    {
      "spanish": "Spanish translation here",
      "english": "Original English phrase",
      "difficulty": "Easy|Medium|Hard",
      "formalWords": {},
      "verbs": ["verb1", "verb2"],
      "alternatives": [
        {"text": "Alternative 1", "english": "English meaning", "region": "Region name", "formality": "Formality level"},
        {"text": "Alternative 2", "english": "Another meaning", "region": "Region name", "formality": "Formality level"}
      ]
    }
  ]
}`;

  const userPrompt = `Translate these English phrases to Spanish for ${targetRegion}:\n${englishPhrases.map((p, i) => `${i + 1}. "${p.english}" (${p.difficulty})`).join("\n")}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    const phrasesArray = parsed.phrases;

    if (!Array.isArray(phrasesArray)) {
      throw new Error("Invalid response format from OpenAI - expected phrases array");
    }

    // Map translated phrases back to original order and preserve used status
    const translatedPhrases: Phrase[] = englishPhrases.map((original, index) => {
      const translated = phrasesArray[index] || phrasesArray.find((p: any) => p.english === original.english);
      if (!translated) {
        throw new Error(`Missing translation for phrase: ${original.english}`);
      }
      return {
        id: original.id,
        spanish: translated.spanish || translated.Spanish || "",
        english: original.english,
        difficulty: original.difficulty,
        used: original.used,
        formalWords: translated.formalWords || {},
        verbs: Array.isArray(translated.verbs) ? translated.verbs : [],
        alternatives: normalizeAlternatives(translated.alternatives),
      };
    });

    return translatedPhrases;
  } catch (error) {
    console.error("Error translating phrases:", error);
    throw new Error(
      `Failed to translate phrases: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

