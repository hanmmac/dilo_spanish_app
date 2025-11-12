"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { PhraseListItem } from "@/components/PhraseListItem";
import { ProgressBar } from "@/components/ProgressBar";
import { SettingsModal } from "@/components/SettingsModal";
import { AlternativesModal } from "@/components/AlternativesModal";
import { MapPin, Flame, Calendar, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const initialPhrases = [
  { id: 1, spanish: "Buenos días", english: "Good morning", difficulty: "Easy" as const, used: false },
  { id: 2, spanish: "¿Cómo estás?", english: "How are you?", difficulty: "Easy" as const, used: false },
  { id: 3, spanish: "Mucho gusto", english: "Nice to meet you", difficulty: "Easy" as const, used: false },
  { id: 4, spanish: "¿Dónde está el baño?", english: "Where is the bathroom?", difficulty: "Medium" as const, used: false },
  { id: 5, spanish: "Me gustaría pedir la cuenta", english: "I would like the check", difficulty: "Medium" as const, used: false },
  { id: 6, spanish: "¿Podría ayudarme?", english: "Could you help me?", difficulty: "Medium" as const, used: false },
  { id: 7, spanish: "No entiendo", english: "I don't understand", difficulty: "Easy" as const, used: false },
  { id: 8, spanish: "¿Cuánto cuesta?", english: "How much does it cost?", difficulty: "Easy" as const, used: false },
  { id: 9, spanish: "Disculpe la molestia", english: "Sorry for the trouble", difficulty: "Hard" as const, used: false },
  { id: 10, spanish: "¿Me podrías recomendar algo?", english: "Could you recommend something?", difficulty: "Hard" as const, used: false },
];

const cityImages = [
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/wide-cinematic-photograph-of-barcelona-s-29178f56-20251111204420.jpg",
    city: "Barcelona",
    country: "Spain"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/cinematic-aerial-photograph-of-mexico-ci-7d2177c6-20251111204418.jpg",
    city: "Mexico City",
    country: "Mexico"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/beautiful-wide-photograph-of-buenos-aire-1cae73d1-20251111204419.jpg",
    city: "Buenos Aires",
    country: "Argentina"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/stunning-cinematic-photograph-of-old-hav-1c7bf7b6-20251111204419.jpg",
    city: "Havana",
    country: "Cuba"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/wide-cinematic-photograph-of-cartagena-c-ef007ee8-20251111204416.jpg",
    city: "Cartagena",
    country: "Colombia"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/breathtaking-photograph-of-madrid-s-plaz-070fddc4-20251111204420.jpg",
    city: "Madrid",
    country: "Spain"
  },
  { 
    url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/9d609461-ef9a-442e-821d-706773263f56/generated_images/stunning-wide-photograph-of-lima-peru-s--0a31adf4-20251111204418.jpg",
    city: "Lima",
    country: "Peru"
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "settings">("home");
  const [phrases, setPhrases] = useState(initialPhrases);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<{ spanish: string; english: string } | null>(null);
  const [region, setRegion] = useState("general");
  const [formalOnly, setFormalOnly] = useState(false);

  const completedCount = phrases.filter((p) => p.used).length;

  // Get today's city image (rotates daily)
  const todayImage = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return cityImages[dayOfYear % cityImages.length];
  }, []);

  const handleToggleUsed = (id: number) => {
    setPhrases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, used: !p.used } : p))
    );
  };

  const handleOpenAlternatives = (phrase: { spanish: string; english: string }) => {
    setSelectedPhrase(phrase);
    setAlternativesOpen(true);
  };

  const handleTabChange = (tab: "home" | "saved" | "settings") => {
    setActiveTab(tab);
  };

  const handleSettingsClose = (open: boolean) => {
    setSettingsOpen(open);
    if (!open) {
      setActiveTab("home");
    }
  };

  // Get today's date
  const today = new Date().toLocaleDateString("en-US", { 
    weekday: "long", 
    month: "long", 
    day: "numeric" 
  });

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
        {/* Glass Header */}
        <header className="glass sticky top-0 z-50 border-b border-white/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white font-serif text-shadow-strong">Dilo</h1>
                <p className="text-sm text-white/90 flex items-center gap-1.5 mt-0.5 text-shadow">
                  <MapPin className="h-3.5 w-3.5 drop-shadow-md" />
                  {todayImage.city}, {todayImage.country}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-white/80 flex items-center gap-1.5 justify-end text-shadow-subtle">
                    <Calendar className="h-3.5 w-3.5 drop-shadow-md" />
                    {today}
                  </p>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5 justify-end mt-1 text-shadow">
                    <Flame className="h-4 w-4 text-orange-400 drop-shadow-md" />
                    7 day streak
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />

        {activeTab === "home" && (
          <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
            {/* Main glass container */}
            <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Header inside glass */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif text-shadow-strong">
                    Today's 10
                  </h2>
                  <p className="text-white/90 text-sm text-shadow-subtle">
                    Say each phrase aloud and check it off
                  </p>
                </div>

                {/* Region Filter */}
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-white drop-shadow-md flex-shrink-0" />
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="w-full sm:w-[280px] bg-white/20 border-white/30 text-white backdrop-blur-md text-shadow h-11">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="glass-dark border-white/20 bg-black/70">
                      <SelectItem value="general" className="text-white">General/Neutral Spanish</SelectItem>
                      <SelectItem value="spain" className="text-white">Spain (Castilian)</SelectItem>
                      <SelectItem value="mexico" className="text-white">Mexico</SelectItem>
                      <SelectItem value="argentina" className="text-white">Argentina</SelectItem>
                      <SelectItem value="colombia" className="text-white">Colombia</SelectItem>
                      <SelectItem value="caribbean" className="text-white">Caribbean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ProgressBar completed={completedCount} total={phrases.length} />

              {/* Phrases List */}
              <div className="space-y-2.5">
                {phrases.map((phrase) => (
                  <PhraseListItem
                    key={phrase.id}
                    {...phrase}
                    onToggleUsed={handleToggleUsed}
                    onOpenAlternatives={handleOpenAlternatives}
                  />
                ))}
              </div>

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
            </div>

            {/* Next pack card */}
            {completedCount < phrases.length && (
              <div className="mt-6 glass rounded-2xl p-6 text-center">
                <p className="text-white text-sm text-shadow">
                  🔒 Next pack unlocks tomorrow at midnight
                </p>
              </div>
            )}
          </main>
        )}

        {activeTab === "saved" && (
          <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="glass rounded-3xl p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔖</span>
              </div>
              <h2 className="text-2xl font-bold text-white font-serif mb-2 text-shadow-strong">Saved Phrases</h2>
              <p className="text-white/80 text-shadow-subtle">
                Your bookmarked phrases will appear here
              </p>
            </div>
          </main>
        )}

        {activeTab === "settings" && (
          <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="glass rounded-3xl p-8 sm:p-12">
              <div className="max-w-md mx-auto space-y-8">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white font-serif mb-2 text-shadow-strong">Settings</h2>
                  <p className="text-white/80 text-shadow-subtle">
                    Customize your learning experience
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-white text-shadow">Spanish Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger id="region" className="bg-white/20 border-white/30 text-white backdrop-blur-md text-shadow h-11">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="glass-dark border-white/20 bg-black/70">
                        <SelectItem value="general" className="text-white">General/Neutral Spanish</SelectItem>
                        <SelectItem value="spain" className="text-white">Spain (Castilian)</SelectItem>
                        <SelectItem value="mexico" className="text-white">Mexico</SelectItem>
                        <SelectItem value="argentina" className="text-white">Argentina</SelectItem>
                        <SelectItem value="colombia" className="text-white">Colombia</SelectItem>
                        <SelectItem value="caribbean" className="text-white">Caribbean</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/80 text-shadow-subtle">
                      Learn phrases specific to your region
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="formal-mode" className="text-white text-shadow">Formal Mode</Label>
                      <p className="text-xs text-white/80 text-shadow-subtle">
                        Show only formal (usted) forms
                      </p>
                    </div>
                    <Switch
                      id="formal-mode"
                      checked={formalOnly}
                      onCheckedChange={setFormalOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
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