import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const Bears = () => {
  const [globalVotes, setGlobalVotes] = useState(0);
  const [bearImages, setBearImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const bears = [
    { type: "brown", name: "Brown Bear", threshold: 0 },
    { type: "polar", name: "Polar Bear", threshold: 10 },
    { type: "panda", name: "Panda", threshold: 30 },
    { type: "koala", name: "Koala", threshold: 60 },
    { type: "teddy", name: "Teddy Bear", threshold: 100 },
    { type: "fancy", name: "Fancy Bear", threshold: 150 },
  ];

  useEffect(() => {
    const loadData = async () => {
      // Load global vote count
      const { count } = await supabase
        .from('matchups')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        setGlobalVotes(count);
      }

      // Load and generate bear images
      const CACHE_KEY = 'bear_images_cache';
      const CACHE_VERSION = '1';
      
      // Try to load from localStorage
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { version, images } = JSON.parse(cached);
          if (version === CACHE_VERSION) {
            setBearImages(images);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing cached bears:', e);
        }
      }

      // Generate if not cached
      const images: Record<string, string> = {};
      
      for (const bear of bears) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-bear', {
            body: { bearType: bear.type }
          });
          
          if (error) throw error;
          if (data?.imageUrl) {
            images[bear.type] = data.imageUrl;
          }
        } catch (error) {
          console.error(`Error generating ${bear.name}:`, error);
        }
      }
      
      setBearImages(images);
      setLoading(false);
      
      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        images
      }));
    };

    loadData();
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
              Global votes: <span className="font-semibold text-foreground">{globalVotes}</span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {bears.map((bear, index) => {
                const isUnlocked = globalVotes >= bear.threshold;
                const nextBear = bears[index + 1];
                const progressToNext = nextBear 
                  ? ((globalVotes - bear.threshold) / (nextBear.threshold - bear.threshold)) * 100
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
