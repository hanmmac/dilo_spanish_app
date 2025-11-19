import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai/client";
import { getAuthenticatedUser, checkRateLimit, logApiCall } from "@/lib/api-auth";

const RATE_LIMIT_REQUESTS = 100;

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required. Please sign in to use this API.",
        },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `You have exceeded the rate limit of ${RATE_LIMIT_REQUESTS} requests per day. Please try again later.`,
        },
        { 
          status: 429,
          headers: {
            "Retry-After": "3600", // Retry after 1 hour
            "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Log the API call (after auth and rate limit check pass)
    await logApiCall(user.id, "/api/conjugate");

    const searchParams = request.nextUrl.searchParams;
    const verb = searchParams.get("verb");

    if (!verb) {
      return NextResponse.json(
        { error: "Verb parameter is required" },
        { status: 400 }
      );
    }

    // Use AI to get verb conjugations
    const systemPrompt = `You are a Spanish language conjugation expert. Given a Spanish verb (which may be in any conjugated form), identify its infinitive form and provide all conjugations.

Return a JSON object in this exact format:
{
  "infinitive": "hablar",
  "meaning": "to speak",
  "type": "ar|er|ir",
  "conjugations": {
    "present": {
      "yo": "hablo",
      "tú": "hablas",
      "él/ella/usted": "habla",
      "nosotros/nosotras": "hablamos",
      "vosotros/vosotras": "habláis",
      "ellos/ellas/ustedes": "hablan"
    },
    "preterite": {
      "yo": "hablé",
      "tú": "hablaste",
      "él/ella/usted": "habló",
      "nosotros/nosotras": "hablamos",
      "vosotros/vosotras": "hablasteis",
      "ellos/ellas/ustedes": "hablaron"
    },
    "imperfect": {
      "yo": "hablaba",
      "tú": "hablabas",
      "él/ella/usted": "hablaba",
      "nosotros/nosotras": "hablábamos",
      "vosotros/vosotras": "hablabais",
      "ellos/ellas/ustedes": "hablaban"
    },
    "future": {
      "yo": "hablaré",
      "tú": "hablarás",
      "él/ella/usted": "hablará",
      "nosotros/nosotras": "hablaremos",
      "vosotros/vosotras": "hablaréis",
      "ellos/ellas/ustedes": "hablarán"
    },
    "conditional": {
      "yo": "hablaría",
      "tú": "hablarías",
      "él/ella/usted": "hablaría",
      "nosotros/nosotras": "hablaríamos",
      "vosotros/vosotras": "hablaríais",
      "ellos/ellas/ustedes": "hablarían"
    },
    "subjunctive_present": {
      "yo": "hable",
      "tú": "hables",
      "él/ella/usted": "hable",
      "nosotros/nosotras": "hablemos",
      "vosotros/vosotras": "habléis",
      "ellos/ellas/ustedes": "hablen"
    }
  }
}

If the verb is irregular, still provide all conjugations. 

If the word is not a verb or you cannot identify it as a verb, return a JSON object with an "error" field:
{
  "error": "This word is not a Spanish verb"
}

Otherwise, return the conjugations as specified above.`;

    const userPrompt = `Provide conjugations for the Spanish word: "${verb}". If this is not a verb, return an error.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const conjugations = JSON.parse(content);

    return NextResponse.json(
      conjugations,
      {
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining - 1),
        },
      }
    );
  } catch (error) {
    console.error("Error conjugating verb:", error);
    return NextResponse.json(
      {
        error: "Failed to conjugate verb",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

