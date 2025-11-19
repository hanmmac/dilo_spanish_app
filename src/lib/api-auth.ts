import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Get the authenticated user from the request
 * Checks Authorization header first, then cookies
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    // Method 1: Check Authorization header (if client sends it)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return { id: user.id, email: user.email };
      }
    }

    // Method 2: Check cookies for Supabase session
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      // Parse cookies
      const cookies: Record<string, string> = {};
      cookieHeader.split(";").forEach(cookie => {
        const [key, ...valueParts] = cookie.trim().split("=");
        if (key && valueParts.length > 0) {
          cookies[key] = decodeURIComponent(valueParts.join("="));
        }
      });

      // Find Supabase auth token cookie (format: sb-<project-ref>-auth-token)
      const authCookieKey = Object.keys(cookies).find(key => 
        key.includes("sb-") && key.includes("-auth-token")
      );

      if (authCookieKey) {
        try {
          const sessionData = JSON.parse(cookies[authCookieKey]);
          const accessToken = sessionData?.access_token;
          
          if (accessToken) {
            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            });
            
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);
            if (!error && user) {
              return { id: user.id, email: user.email };
            }
          }
        } catch {
          // Invalid cookie format, continue to return null
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

/**
 * Check rate limit for a user
 * Returns true if within limit, false if exceeded
 * Limits: 100 requests per user per day
 */
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_HOURS = 24;

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const cutoffTime = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    // Count recent API requests from the dedicated api_usage table
    const { data, error } = await supabase
      .from("api_usage")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", cutoffTime)
      .limit(RATE_LIMIT_REQUESTS + 1);

    if (error) {
      // If table doesn't exist or error, allow the request (fail open for now)
      console.warn("Rate limit check error:", error);
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
    }

    const requestCount = data?.length || 0;
    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - requestCount);
    const allowed = requestCount < RATE_LIMIT_REQUESTS;

    return { allowed, remaining };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    // Fail open - allow the request if rate limit check fails
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
  }
}

/**
 * Log an API call to the api_usage table
 * This should be called after authentication and rate limit check pass
 */
export async function logApiCall(userId: string, endpoint: string): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { error } = await supabase
      .from("api_usage")
      .insert({
        user_id: userId,
        endpoint: endpoint,
      });

    if (error) {
      // Log error but don't throw - API call logging failure shouldn't break the request
      console.error("Error logging API call:", error);
    }
  } catch (error) {
    // Log error but don't throw - API call logging failure shouldn't break the request
    console.error("Error in logApiCall:", error);
  }
}

