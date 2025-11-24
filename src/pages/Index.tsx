import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userVotes, setUserVotes] = useState(0);
  const [bearImage, setBearImage] = useState<string>("");
  const [currentBearName, setCurrentBearName] = useState("Brown Bear");

  const bears = [
    { type: "brown", name: "Brown Bear" },
    { type: "polar", name: "Polar Bear" },
    { type: "panda", name: "Panda" },
    { type: "koala", name: "Koala" },
    { type: "teddy", name: "Teddy Bear" },
    { type: "fancy", name: "Fancy Bear" },
    { type: "grizzly", name: "Grizzly Bear" },
    { type: "sun", name: "Sun Bear" },
    { type: "spectacled", name: "Spectacled Bear" },
    { type: "sloth", name: "Sloth Bear" },
    { type: "black", name: "Black Bear" },
    { type: "spirit", name: "Spirit Bear" },
    { type: "red-panda", name: "Red Panda" },
    { type: "gummy", name: "Gummy Bear" },
    { type: "care", name: "Care Bear" },
    { type: "cosmic", name: "Cosmic Bear" },
    { type: "galaxy", name: "Galaxy Bear" },
    { type: "rainbow", name: "Rainbow Bear" },
    { type: "ice", name: "Ice Bear" },
    { type: "fire", name: "Fire Bear" },
    { type: "shadow", name: "Shadow Bear" },
    { type: "crystal", name: "Crystal Bear" },
    { type: "electric", name: "Electric Bear" },
    { type: "cyber", name: "Cyber Bear" },
    { type: "neon", name: "Neon Bear" },
    { type: "steampunk", name: "Steampunk Bear" },
    { type: "ninja", name: "Ninja Bear" },
    { type: "pirate", name: "Pirate Bear" },
    { type: "knight", name: "Knight Bear" },
    { type: "wizard", name: "Wizard Bear" },
    { type: "samurai", name: "Samurai Bear" },
    { type: "astronaut", name: "Astronaut Bear" },
    { type: "detective", name: "Detective Bear" },
    { type: "chef", name: "Chef Bear" },
    { type: "artist", name: "Artist Bear" },
    { type: "scientist", name: "Scientist Bear" },
    { type: "athlete", name: "Athlete Bear" },
    { type: "musician", name: "Musician Bear" },
    { type: "dancer", name: "Dancer Bear" },
    { type: "superhero", name: "Superhero Bear" },
    { type: "vampire", name: "Vampire Bear" },
    { type: "zombie", name: "Zombie Bear" },
    { type: "ghost", name: "Ghost Bear" },
    { type: "alien", name: "Alien Bear" },
    { type: "robot", name: "Robot Bear" },
    { type: "mecha", name: "Mecha Bear" },
  ];

  const getBearThresholds = () => {
    const thresholds = [10];
    for (let i = 1; i < bears.length; i++) {
      thresholds.push(thresholds[i - 1] + (i + 1) * 10);
    }
    return thresholds;
  };

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // Load user votes
      let votes = 0;
      if (session?.user) {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('total_votes')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (stats) {
          votes = stats.total_votes;
        }
      } else {
        const savedVotes = localStorage.getItem('userVotes');
        if (savedVotes) {
          votes = parseInt(savedVotes);
        }
      }
      
      setUserVotes(votes);

      // Load bear image based on votes
      const bearThresholds = getBearThresholds();
      let currentBearIndex = 0;

      for (let i = 0; i < bearThresholds.length; i++) {
        if (votes >= bearThresholds[i]) {
          currentBearIndex = i + 1;
        } else {
          break;
        }
      }

      if (currentBearIndex >= bears.length) {
        currentBearIndex = bears.length - 1;
      }

      const currentBear = bears[currentBearIndex];
      setCurrentBearName(currentBear.name);

      // Try to load from cache
      const CACHE_KEY = 'bear_images_cache';
      const CACHE_VERSION = '2'; // Incremented to force reload with emoji support
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { version, images } = JSON.parse(cached);
          if (version === CACHE_VERSION && images[currentBear.type]) {
            setBearImage(images[currentBear.type]);
            return;
          }
        } catch (e) {
          console.error('Error loading cached bear:', e);
        }
      }

      // Generate if not cached
      try {
        const { data, error } = await supabase.functions.invoke('generate-bear', {
          body: { bearType: currentBear.type }
        });

        if (error) throw error;
        // Handle both AI-generated images and emoji fallback
        if (data?.imageUrl) {
          setBearImage(data.imageUrl);
        } else if (data?.emoji) {
          setBearImage(data.emoji);
        }
      } catch (error) {
        console.error('Error loading bear image:', error);
      }
    };

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
                CelebRate
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/export">
                <Button variant="ghost" size="sm" className="font-sans">
                  Export Dataset
                </Button>
              </Link>
              <Link to="/bears">
                <Button variant="ghost" size="sm" className="font-sans flex items-center gap-1">
                  {bearImage ? (
                    // Check if it's an emoji (short string, no URL prefix)
                    bearImage.length <= 10 && !bearImage.startsWith('data:') && !bearImage.startsWith('http') ? (
                      <span className="text-xl" role="img" aria-label={currentBearName}>
                        {bearImage}
                      </span>
                    ) : (
                      <img 
                        src={bearImage} 
                        alt={currentBearName}
                        className="w-5 h-5 object-contain rounded-full"
                      />
                    )
                  ) : (
                    <span className="text-xl">🐻</span>
                  )}
                  Bears
                </Button>
              </Link>
              {user && (
                <Link to="/my-rankings">
                  <Button variant="ghost" size="sm" className="font-sans">
                    My Favorites
                  </Button>
                </Link>
              )}
              {!user && (
                <Link to="/auth">
                  <Button size="sm" className="font-sans">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-5xl md:text-7xl font-serif font-bold tracking-tight leading-tight">
              Who's
              <br />
              <span className="text-primary italic animate-pulse">
                Hotter?
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Vote on celebrity matchups. Watch the drama unfold. 
              See who really has the looks that kill.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/rate">
              <Button 
                size="lg" 
                className="text-base font-semibold px-12 py-7 shadow-glow hover:shadow-elegant transition-all rounded-full hover:scale-105 animate-fade-in"
              >
                Start Judging
              </Button>
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="pt-12 max-w-2xl mx-auto">
            <div className="bg-accent/30 border border-primary/20 rounded-2xl p-6 text-sm backdrop-blur-sm">
              <p className="font-serif font-semibold text-foreground mb-2">Real Talk</p>
              <p className="text-muted-foreground leading-relaxed">
                This is pure entertainment. Beauty is subjective and these rankings are just for fun. 
                We're building a dataset for AI research. Vote with your gut, not your heart.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-center text-sm text-muted-foreground font-light">
            Powered by intelligent rating systems • Built with care
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;