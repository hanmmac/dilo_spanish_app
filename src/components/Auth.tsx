"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) throw signUpError;

        setMessage("Check your email to confirm your account!");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        onAuthSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-950">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,_rgba(255,255,255,0.12),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,_rgba(120,180,255,0.08),_transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 py-10">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] shadow-[0_40px_120px_rgba(0,0,0,0.45)] overflow-hidden backdrop-blur-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left brand panel */}
            <div className="relative p-10 sm:p-12 flex flex-col gap-8 bg-gradient-to-b from-white via-white to-slate-50 text-slate-900">
              <div>
                <p className="uppercase tracking-[0.4em] text-xs font-semibold text-slate-600">
                  Daily Spanish Ritual
                </p>
                <h1 className="mt-4 text-4xl sm:text-5xl font-serif font-bold leading-tight">
                  Dilo
                </h1>
                <p className="mt-3 text-base text-slate-700">
                  Swap rote drills for one meaningful phrase a day.
                  Learn the nuance, see regions, and actually use it IRL.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-slate-900/10 flex items-center justify-center font-semibold text-slate-900">
                    01
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Curated Phrases</p>
                    <p className="text-sm text-slate-600">
                      Ten region-specific lines with formality context.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-slate-900/10 flex items-center justify-center font-semibold">
                    02
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">One Tap Review</p>
                    <p className="text-sm text-slate-600">
                      Mark phrases you&apos;ve used and revisit alternatives.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-slate-900/10 flex items-center justify-center font-semibold">
                    03
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Speech Ready</p>
                    <p className="text-sm text-slate-600">
                      Built-in pronunciation & formal/informal swaps.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200/70 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    New phrases every
                  </p>
                  <p className="text-lg font-semibold text-slate-900">morning at 7am</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    In beta for
                  </p>
                  <p className="text-lg font-semibold text-slate-900">Costa Rica</p>
                </div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="p-8 sm:p-10 bg-slate-950/85 text-white flex flex-col justify-center">
              <div className="space-y-8">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                    {isSignUp ? "Create account" : "Welcome back"}
                  </p>
                  <h2 className="text-3xl font-semibold text-white">
                    {isSignUp ? "Join the daily ritual" : "Sign in to continue"}
                  </h2>
                  <p className="text-sm text-white/70">
                    {isSignUp
                      ? "We’ll send you a confirmation email. No spam, promise."
                      : "Enter your account credentials to load today’s phrases."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 h-11 focus:bg-white/10"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/90">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 h-11 focus:bg-white/10"
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  {message && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
                      <p className="text-emerald-200 text-sm">{message}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-white text-slate-900 font-semibold hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isSignUp ? "Signing up..." : "Signing in..."}
                      </>
                    ) : (
                      <>{isSignUp ? "Create account" : "Sign in"}</>
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-white/70">
                  <span>{isSignUp ? "Already registered?" : "Need an account?"}</span>{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-white font-semibold hover:underline focus:outline-none"
                  >
                    {isSignUp ? "Sign in instead" : "Create one"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

