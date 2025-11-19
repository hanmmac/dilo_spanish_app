import { NextRequest, NextResponse } from "next/server";
import { generatePhrases, translatePhrasesToRegion } from "@/lib/ai/phrases";
import { PhraseGenerationParams } from "@/types/phrase";
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
    await logApiCall(user.id, "/api/phrases");

    const searchParams = request.nextUrl.searchParams;
    const region = searchParams.get("region") || "costa-rica";
    const formality = (searchParams.get("formality") as "formal" | "informal" | "neutral") || "neutral";
    const count = parseInt(searchParams.get("count") || "10", 10);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    
    // Get recent phrases history to avoid duplicates
    const recentPhrasesParam = searchParams.get("recentPhrases");
    const recentPhrases = recentPhrasesParam ? JSON.parse(recentPhrasesParam) : [];
    
    // Check if this is a translation request (has englishPhrases param)
    const englishPhrasesParam = searchParams.get("englishPhrases");
    
    if (englishPhrasesParam) {
      // Translation mode: translate existing English phrases to new region
      try {
        const englishPhrases = JSON.parse(englishPhrasesParam);
        const translatedPhrases = await translatePhrasesToRegion(
          englishPhrases,
          region,
          formality
        );
        
        return NextResponse.json(
          {
            phrases: translatedPhrases,
            date,
            region,
            formality,
          },
          {
            headers: {
              "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
              "X-RateLimit-Remaining": String(rateLimit.remaining - 1),
            },
          }
        );
      } catch (parseError) {
        return NextResponse.json(
          {
            error: "Invalid englishPhrases parameter",
            message: parseError instanceof Error ? parseError.message : "Unknown error",
          },
          { status: 400 }
        );
      }
    }

    // Normal generation mode
    const params: PhraseGenerationParams = {
      region,
      formality,
      count: Math.min(Math.max(count, 1), 20), // Clamp between 1-20
      date,
      recentPhrases: Array.isArray(recentPhrases) ? recentPhrases : [],
    };

    const phrases = await generatePhrases(params);

    return NextResponse.json(
      {
        phrases,
        date,
        region,
        formality,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining - 1),
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/phrases:", error);
    return NextResponse.json(
      {
        error: "Failed to generate phrases",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


