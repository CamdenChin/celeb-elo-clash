import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const Bears = () => {
  const [userVotes, setUserVotes] = useState(0);
  const [bearImages, setBearImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
  ];

  // Calculate thresholds dynamically
  const getBearThresholds = () => {
    const thresholds = [10];
    for (let i = 1; i < bears.length; i++) {
      thresholds.push(thresholds[i - 1] + (i + 1) * 10);
    }
    return thresholds;
  };

  const bearThresholds = getBearThresholds();
  const bearsWithThresholds = bears.map((bear, index) => ({
    ...bear,
    threshold: index === 0 ? 0 : bearThresholds[index - 1]
  }));

  useEffect(() => {
    const loadData = async () => {
      // Load user-specific vote count
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('total_votes')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        setUserVotes(stats?.total_votes || 0);
      } else {
        // For anonymous users, use localStorage
        const anonymousVotes = parseInt(localStorage.getItem('anonymous_votes') || '0');
        setUserVotes(anonymousVotes);
      }

      // Load cached bear images
      const CACHE_KEY = 'bear_images_cache';
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { images } = JSON.parse(cached);
          setBearImages(images);
        } catch (e) {
          console.error('Error parsing cached bears:', e);
        }
      }

      setLoading(false);
    };

    loadData();

    // Refresh vote count when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between">
            <Link to="/rate">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Voting
              </Button>
            </Link>
            <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
              Bear Collection
            </h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-light mb-4">
              Unlock Bears by Voting
            </h2>
            <p className="text-muted-foreground text-lg">
              Your votes: <span className="font-semibold text-foreground">{userVotes}</span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {bearsWithThresholds.map((bear, index) => {
                const isUnlocked = userVotes >= bear.threshold;
                const nextBear = bearsWithThresholds[index + 1];
                const progressToNext = nextBear 
                  ? ((userVotes - bear.threshold) / (nextBear.threshold - bear.threshold)) * 100
                  : 100;

                return (
                  <div
                    key={bear.type}
                    className={`relative rounded-lg border ${
                      isUnlocked 
                        ? 'bg-card border-border' 
                        : 'bg-muted/50 border-border/50'
                    } p-6 transition-all hover:shadow-lg`}
                  >
                    {/* Lock overlay for locked bears */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                        <div className="text-center">
                          <Lock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Unlock at {bear.threshold} votes
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Bear Image */}
                      <div className="flex-shrink-0">
                        {bearImages[bear.type] ? (
                          <img
                            src={bearImages[bear.type]}
                            alt={bear.name}
                            className="w-24 h-24 object-contain bg-background rounded-full"
                          />
                        ) : (
                          <div className="w-24 h-24 flex items-center justify-center text-5xl">
                            🐻
                          </div>
                        )}
                      </div>

                      {/* Bear Info */}
                      <div className="flex-grow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold">{bear.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {bear.threshold === 0 ? 'Starting bear' : `Unlocks at ${bear.threshold} votes`}
                            </p>
                          </div>
                          {isUnlocked && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                              Unlocked
                            </span>
                          )}
                        </div>

                        {/* Progress to next bear */}
                        {isUnlocked && nextBear && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress to {nextBear.name}</span>
                              <span>{Math.min(100, Math.round(progressToNext))}%</span>
                            </div>
                            <Progress value={Math.min(100, progressToNext)} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Link to="/rate">
              <Button size="lg" className="font-semibold">
                Start Voting to Unlock Bears
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bears;
