import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { SwipeableCard } from "@/components/SwipeableCard";
import { User, Session } from "@supabase/supabase-js";

export interface Celebrity {
  id: string;
  name: string;
  image_path: string;
  elo_rating: number;
  games_played: number;
}

const Rate = () => {
  const [celebrities, setCelebrities] = useState<[Celebrity, Celebrity] | null>(null);
  const [nextPair, setNextPair] = useState<[Celebrity, Celebrity] | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pairDisplayTime, setPairDisplayTime] = useState<number>(Date.now());
  const navigate = useNavigate();

  const fetchRandomPair = async (prefetch = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-random-pair');
      
      if (error) throw error;
      
      if (data?.celebrities && data.celebrities.length === 2) {
        if (prefetch) {
          setNextPair([data.celebrities[0], data.celebrities[1]]);
        } else {
          setCelebrities([data.celebrities[0], data.celebrities[1]]);
          setPairDisplayTime(Date.now());
          // Prefetch next pair immediately
          fetchRandomPair(true);
        }
      } else if (!prefetch) {
        toast.error("Not enough celebrities in the database");
      }
    } catch (error) {
      if (!prefetch) {
        console.error('Error fetching pair:', error);
        toast.error("Failed to load celebrities");
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Load initial pair regardless of auth status
    fetchRandomPair();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (voting || !celebrities || loading) return;
      
      if (e.key === '1') {
        const other = celebrities.find(c => c.id !== celebrities[0].id)!;
        handleVote(celebrities[0].id, other.id);
      } else if (e.key === '2') {
        const other = celebrities.find(c => c.id !== celebrities[1].id)!;
        handleVote(celebrities[1].id, other.id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [celebrities, voting, loading]);

  const handleVote = async (winnerId: string, loserId: string) => {
    setVoting(true);
    
    const clickTimeMs = Date.now() - pairDisplayTime;
    const clickTimeSec = (clickTimeMs / 1000).toFixed(2);
    
    // Calculate multiplier for user feedback
    let multiplier = 1.0;
    let speedMessage = "";
    if (clickTimeMs < 1000) {
      multiplier = 1.5;
      speedMessage = "⚡ Lightning Fast! 1.5x rating impact";
    } else if (clickTimeMs > 5000) {
      multiplier = 0.5;
      speedMessage = "🐌 Slow decision. 0.5x rating impact";
    } else {
      const t = (clickTimeMs - 1000) / 4000;
      multiplier = 1.5 - (t * 1.0);
      speedMessage = `${multiplier.toFixed(1)}x rating impact`;
    }
    
    try {
      // Check if user already voted on this exact matchup (only if authenticated)
      if (user) {
        const { data: existingVote } = await supabase
          .from('matchups')
          .select('id')
          .eq('user_id', user.id)
          .eq('winner_id', winnerId)
          .eq('loser_id', loserId)
          .maybeSingle();

        if (existingVote) {
          toast.info("You've already voted on this matchup. Loading a new pair...");
          // Use cached pair or fetch new one
          if (nextPair) {
            setCelebrities(nextPair);
            setNextPair(null);
            fetchRandomPair(true);
          } else {
            await fetchRandomPair();
          }
          setVoting(false);
          return;
        }
      }

      // Submit vote in background while showing next pair
      const votePromise = supabase.functions.invoke('submit-vote', {
        body: { winnerId, loserId, userId: user?.id || null, clickTimeMs }
      });

      // Immediately show next pair if cached
      if (nextPair) {
        setCelebrities(nextPair);
        setPairDisplayTime(Date.now());
        setNextPair(null);
        setVoting(false);
        toast.success(
          <div className="space-y-1">
            <div>Vote recorded!</div>
            <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
          </div>
        );
        // Prefetch next pair
        fetchRandomPair(true);
      }

      const { error } = await votePromise;
      
      if (error) throw error;

      // If we didn't have a cached pair, fetch one now
      if (!nextPair) {
        toast.success(
          <div className="space-y-1">
            <div>Vote recorded!</div>
            <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
          </div>
        );
        await fetchRandomPair();
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };


  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
                CelebRate
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Link to="/my-rankings">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    My Favorites
                  </Button>
                </Link>
              )}
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">
              Choose Your Favorite
            </h2>
            <p className="text-muted-foreground font-light text-lg mb-2">
              Trust your instinct
            </p>
            <p className="text-sm text-muted-foreground/60">
              ⚡ Quick decisions have bigger impact on ratings
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : celebrities ? (
            <>
              {/* Mobile: Swipeable Cards */}
              <div className="md:hidden space-y-6">
                {celebrities.map((celebrity) => {
                  const other = celebrities.find(c => c.id !== celebrity.id)!;
                  return (
                    <SwipeableCard
                      key={celebrity.id}
                      celebrity={celebrity}
                      onSwipeRight={() => !voting && handleVote(celebrity.id, other.id)}
                      onSwipeLeft={() => !voting && handleVote(other.id, celebrity.id)}
                      disabled={voting}
                    />
                  );
                })}
              </div>

              {/* Desktop: Side-by-side Grid */}
              <div className="hidden md:grid md:grid-cols-2 gap-8 md:gap-12">
                {celebrities.map((celebrity) => (
                  <Card
                    key={celebrity.id}
                    className="group cursor-pointer overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-elegant transition-all duration-500 rounded-3xl"
                    onClick={() => {
                      if (!voting) {
                        const other = celebrities.find(c => c.id !== celebrity.id)!;
                        handleVote(celebrity.id, other.id);
                      }
                    }}
                  >
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      <img
                        src={celebrity.image_path}
                        alt={celebrity.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                        <p className="font-serif text-lg font-medium">Select</p>
                      </div>
                    </div>
                    <div className="p-6 bg-card">
                      <h3 className="text-xl font-serif font-semibold mb-3">{celebrity.name}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-light">Rating: {Math.round(celebrity.elo_rating)}</span>
                        <span className="font-light">{celebrity.games_played} votes</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No celebrities available</p>
            </div>
          )}

          {voting && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Rate;
