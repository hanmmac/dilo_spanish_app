"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { PhraseListItem } from "@/components/PhraseListItem";
import { ProgressBar } from "@/components/ProgressBar";
import { SettingsModal } from "@/components/SettingsModal";
import { AlternativesModal } from "@/components/AlternativesModal";
import { Auth } from "@/components/Auth";
import { Globe, Loader2, LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Phrase } from "@/types/phrase";
import { supabase } from "@/lib/supabase";
import { getStoredPhrases, savePhrases, updatePhraseCompletion, getTodayKey, getEnglishPhrasesBase, getRecentEnglishPhrases } from "@/lib/supabase-storage";

// Region-specific background images
// All images should be placed in public/images/ directory
const regionImages: Record<string, { url: string; city: string; country: string }> = {
  "costa-rica": {
    url: "/images/costa-rica-beach.jpg",
    city: "Costa Rica",
    country: "Costa Rica"
  },
  spain: {
    url: "/images/spain-barcelona.jpg",
    city: "Barcelona",
    country: "Spain"
  },
  mexico: {
    url: "/images/mexico-city.jpg",
    city: "Mexico City",
    country: "Mexico"
  },
  argentina: {
    url: "/images/argentina-buenos-aires.jpg",
    city: "Buenos Aires",
    country: "Argentina"
  },
  colombia: {
    url: "/images/colombia-cartagena.jpg",
    city: "Cartagena",
    country: "Colombia"
  },
  caribbean: {
    url: "/images/caribbean-havana.jpg",
    city: "Havana",
    country: "Cuba"
  },
  general: {
    url: "/images/general-lima.jpg",
    city: "Lima",
    country: "Peru"
  },
};

const REGION_DISPLAY_NAMES: Record<string, string> = {
  general: "General Spanish",
  spain: "Spain",
  mexico: "Mexico",
  argentina: "Argentina",
  colombia: "Colombia",
  caribbean: "Caribbean",
  "costa-rica": "Costa Rica",
};

// Helper to get auth token for API requests
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<{ spanish: string; english: string; alternatives?: Phrase["alternatives"] } | null>(null);
  const [region, setRegion] = useState("costa-rica");
  const [formalOnly, setFormalOnly] = useState(false);
  const [isSwitchingFormality, setIsSwitchingFormality] = useState(false);

  const completedCount = phrases.filter((p) => p.used).length;

  // Check authentication status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch phrases from API or Supabase
  useEffect(() => {
    if (!user) return; // Don't load phrases if not authenticated

    const loadPhrases = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const formality = formalOnly ? "formal" : "neutral";
        const today = getTodayKey(); // Use user's local timezone
        
        // FIRST: Check if we already have this exact combination stored (instant, free)
        const stored = await getStoredPhrases(region, formality);
        if (stored && stored.date === today) {
          // We have it! Use it instantly (no API call, no loading)
          setPhrases(stored.phrases);
          setLoading(false);
          setIsSwitchingFormality(false);
          return;
        }
        
        // SECOND: If we don't have this formality, but we have English phrases base, translate
        // This makes 1 API call only the first time we switch to a new formality
        const englishPhrasesBase = await getEnglishPhrasesBase();
        if (englishPhrasesBase && englishPhrasesBase.length > 0) {
          // Check if we're switching formality (region is same but formality changed)
          const previousStored = await getStoredPhrases(); // Get any previous version
          const isFormalityChange = previousStored ? (previousStored.region === region && previousStored.formality !== formality) : false;
          setIsSwitchingFormality(isFormalityChange);
          
          // Translate existing English phrases to new region/formality (on-demand API call)
          const englishPhrasesParam = encodeURIComponent(JSON.stringify(englishPhrasesBase));
          const token = await getAuthToken();
          const response = await fetch(
            `/api/phrases?region=${region}&formality=${formality}&englishPhrases=${englishPhrasesParam}`,
            {
              credentials: "include",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          
          if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
              // User is not authenticated, sign them out
              await supabase.auth.signOut();
              setUser(null);
              throw new Error("Session expired. Please sign in again.");
            }
            if (response.status === 429) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || "Rate limit exceeded. Please try again later.");
            }
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || response.statusText;
            throw new Error(errorMessage);
          }
          
          const data = await response.json();
          const translatedPhrases = data.phrases || [];
          
          // Save translated phrases to Supabase (now stored for instant access next time)
          await savePhrases(translatedPhrases, region, formality);
          setPhrases(translatedPhrases);
          setLoading(false);
          setIsSwitchingFormality(false);
          return;
        }
        
        setIsSwitchingFormality(false);
        
        // THIRD: If no stored data at all, fetch new phrases from API
        // Get recent phrases history to avoid duplicates
        const recentPhrases = await getRecentEnglishPhrases();
        const recentPhrasesParam = recentPhrases.length > 0 
          ? `&recentPhrases=${encodeURIComponent(JSON.stringify(recentPhrases))}`
          : "";
        
        const token = await getAuthToken();
        const response = await fetch(
          `/api/phrases?region=${region}&formality=${formality}&count=10&date=${today}${recentPhrasesParam}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        
        if (!response.ok) {
          // Handle authentication errors
          if (response.status === 401) {
            // User is not authenticated, sign them out
            await supabase.auth.signOut();
            setUser(null);
            throw new Error("Session expired. Please sign in again.");
          }
          if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Rate limit exceeded. Please try again later.");
          }
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || response.statusText;
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        const fetchedPhrases = data.phrases || [];
        
        // Save to Supabase (first time generation)
        await savePhrases(fetchedPhrases, region, formality);
        setPhrases(fetchedPhrases);
      } catch (err) {
        console.error("Error loading phrases:", err);
        setError(err instanceof Error ? err.message : "Failed to load phrases");
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
  }, [user, region, formalOnly]);

  // Get region-specific background image
  const todayImage = useMemo(() => {
    return regionImages[region] || regionImages["costa-rica"];
  }, [region]);

  const handleToggleUsed = async (id: number) => {
    setPhrases((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const newUsed = !p.used;
          // Save to Supabase immediately (update current region/formality version)
          const formality = formalOnly ? "formal" : "neutral";
          updatePhraseCompletion(id, newUsed, region, formality);
          return { ...p, used: newUsed };
        }
        return p;
      });
      return updated;
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAuthSuccess = () => {
    // Auth state will be updated via the auth state listener
  };

  // Show auth screen if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-600/40 to-purple-800/40" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const handleOpenAlternatives = (phrase: { spanish: string; english: string; alternatives?: Phrase["alternatives"] }) => {
    setSelectedPhrase(phrase);
    setAlternativesOpen(true);
  };

  const handleSettingsClose = (open: boolean) => {
    setSettingsOpen(open);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full-screen background image */}
      <div className="fixed inset-0 z-0">
        <Image
          src={todayImage.url}
          alt={`${todayImage.city}, ${todayImage.country}`}
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
            {/* Main glass container */}
            <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Header inside glass */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif text-shadow-strong">
                      Dilo
                    </h2>
                    <span className="text-white/80 text-sm text-shadow-subtle">
                      Say it
                    </span>
                  </div>
                  <p className="text-white/80 text-sm text-shadow-subtle">
                    incorporate each spanish phrase today and check off when you got it
                  </p>
                </div>

                {/* Region Filter and Formal Toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Globe className="h-5 w-5 text-white drop-shadow-md flex-shrink-0" />
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="w-full sm:w-[280px] bg-white/20 border-white/30 text-white backdrop-blur-md text-shadow h-11">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="glass-dark border-white/20 bg-black/70">
                        {/* <SelectItem value="general" className="text-white">General/Neutral Spanish</SelectItem> */}
                        {/* <SelectItem value="spain" className="text-white">Spain (Castilian)</SelectItem> */}
                        {/* <SelectItem value="mexico" className="text-white">Mexico</SelectItem> */}
                        {/* <SelectItem value="argentina" className="text-white">Argentina</SelectItem> */}
                        {/* <SelectItem value="colombia" className="text-white">Colombia</SelectItem> */}
                        {/* <SelectItem value="caribbean" className="text-white">Caribbean</SelectItem> */}
                        <SelectItem value="costa-rica" className="text-white">Costa Rica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="formal-mode" className="text-xs text-white/80 text-shadow-subtle cursor-pointer">
                      Formal
                    </Label>
                    <Switch
                      id="formal-mode"
                      checked={formalOnly}
                      onCheckedChange={setFormalOnly}
                    />
                  </div>
                </div>
              </div>

              <ProgressBar completed={completedCount} total={phrases.length} />

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <span className="ml-3 text-white text-shadow">
                    {isSwitchingFormality 
                      ? "Switch today's phrases to formal translation"
                      : "Generating today's phrases..."}
                  </span>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="glass-dark rounded-2xl p-6 text-center">
                  <p className="text-red-300 mb-2 text-shadow">Error loading phrases</p>
                  <p className="text-white/70 text-sm text-shadow-subtle">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Phrases List */}
              {!loading && !error && (
                <div className="space-y-2">
                  {phrases.map((phrase) => (
                    <PhraseListItem
                      key={phrase.id}
                      {...phrase}
                      onToggleUsed={handleToggleUsed}
                      onOpenAlternatives={handleOpenAlternatives}
                    />
                  ))}
                </div>
              )}

              {/* Completion message */}
              {completedCount === phrases.length && (
                <div className="mt-6 glass-dark rounded-2xl p-6 text-center animate-in fade-in duration-500">
                  <h3 className="text-2xl font-bold text-white font-serif mb-2 text-shadow-strong">
                    ¡Muy bien!
                  </h3>
                  <p className="text-white/90 text-shadow">
                    You completed today's 10 phrases
                  </p>
                </div>
              )}

              {/* Next pack card */}
              {completedCount < phrases.length && (
                <div className="mt-6 glass rounded-2xl p-6 text-center">
                  <p className="text-white text-sm text-shadow">
                    🔒 Next pack unlocks tomorrow at midnight
                  </p>
                </div>
              )}

              {/* Sign Out Button */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={handleSettingsClose}
        region={region}
        onRegionChange={setRegion}
        formalOnly={formalOnly}
        onFormalOnlyChange={setFormalOnly}
      />

      <AlternativesModal
        open={alternativesOpen}
        onOpenChange={setAlternativesOpen}
        phrase={selectedPhrase}
        region={region}
      />
    </div>
  );
}