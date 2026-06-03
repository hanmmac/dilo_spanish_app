import { NextRequest, NextResponse } from "next/server";
import { generatePhrases, translatePhrasesToRegion } from "@/lib/ai/phrases";
import { PhraseGenerationParams, Phrase } from "@/types/phrase";
import { getAuthenticatedUser, checkRateLimit, logApiCall } from "@/lib/api-auth";

const RATE_LIMIT_REQUESTS = 100;

export async function GET(request: NextRequest) {
  try {
    // Extract auth token from request
    const authHeader = request.headers.get("authorization");
    let authToken: string | undefined = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : undefined;

    // If no token in header, try to get from cookies
    if (!authToken) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies: Record<string, string> = {};
        cookieHeader.split(";").forEach(cookie => {
          const [key, ...valueParts] = cookie.trim().split("=");
          if (key && valueParts.length > 0) {
            cookies[key] = decodeURIComponent(valueParts.join("="));
          }
        });

        const authCookieKey = Object.keys(cookies).find(key => 
          key.includes("sb-") && key.includes("-auth-token")
        );

        if (authCookieKey) {
          try {
            const sessionData = JSON.parse(cookies[authCookieKey]);
            authToken = sessionData?.access_token;
          } catch {
            // Invalid cookie format, continue without token
          }
        }
      }
    }

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

    // Check rate limit (pass auth token)
    const rateLimit = await checkRateLimit(user.id, authToken);
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

    // Log the API call (after auth and rate limit check pass, pass auth token)
    await logApiCall(user.id, "/api/phrases", authToken);

    const searchParams = request.nextUrl.searchParams;
    const region = searchParams.get("region") || "costa-rica";
    const formality = (searchParams.get("formality") as "formal" | "informal" | "neutral") || "neutral";
    const count = parseInt(searchParams.get("count") || "5", 10);
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
    // First check if shared phrases already exist
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      },
    });

    // Check if shared phrases exist
    const { data: existingPhrases } = await supabaseClient
      .from("daily_phrases")
      .select("phrases")
      .eq("date", date)
      .eq("region", region)
      .eq("formality", formality)
      .single();

    let phrases: Phrase[];
    
    if (existingPhrases?.phrases) {
      // Use existing shared phrases
      phrases = existingPhrases.phrases;
    } else {
      // Generate new phrases
      const params: PhraseGenerationParams = {
        region,
        formality,
        count: Math.min(Math.max(count, 1), 20), // Clamp between 1-20
        date,
        recentPhrases: Array.isArray(recentPhrases) ? recentPhrases : [],
      };

      phrases = await generatePhrases(params);
      
      // Save to shared daily_phrases (will handle race condition with unique constraint)
      try {
        await supabaseClient
          .from("daily_phrases")
          .insert({
            date,
            region,
            formality,
            phrases,
          });
      } catch (insertError: any) {
        // If phrases were inserted by another request (race condition), fetch them
        if (insertError.code === "23505") {
          const { data: fetchedPhrases } = await supabaseClient
            .from("daily_phrases")
            .select("phrases")
            .eq("date", date)
            .eq("region", region)
            .eq("formality", formality)
            .single();
          
          if (fetchedPhrases?.phrases) {
            phrases = fetchedPhrases.phrases;
          }
        } else {
          console.error("Error saving shared phrases:", insertError);
        }
      }
    }

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


