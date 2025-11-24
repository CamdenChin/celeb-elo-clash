import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SwipeableContainer } from "@/components/SwipeableContainer";
import { StreakCelebration } from "@/components/StreakCelebration";
import { BearProgress } from "@/components/BearProgress";
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
  const [streak, setStreak] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [globalVotes, setGlobalVotes] = useState(0);
  const [bearImages, setBearImages] = useState<Record<string, string>>({});
  const [loadingBears, setLoadingBears] = useState(true);
  const navigate = useNavigate();

  const bears = [
    { type: "brown", name: "Brown Bear" },
    { type: "polar", name: "Polar Bear" },
    { type: "panda", name: "Panda" },
    { type: "koala", name: "Koala" },
    { type: "teddy", name: "Teddy Bear" },
    { type: "fancy", name: "Fancy Bear" },
  ];

  // Calculate which bear and progress with dynamic scaling
  const getBearThresholds = () => {
    const thresholds = [10];
    for (let i = 1; i < bears.length; i++) {
      thresholds.push(thresholds[i - 1] + (i + 1) * 10);
    }
    return thresholds;
  };

  const bearThresholds = getBearThresholds();
  let currentBearIndex = 0;
  let votesNeededForNext = bearThresholds[0];

  for (let i = 0; i < bearThresholds.length; i++) {
    if (globalVotes >= bearThresholds[i]) {
      currentBearIndex = i + 1;
      votesNeededForNext = bearThresholds[i + 1] || bearThresholds[i];
    } else {
      break;
    }
  }

  // Cap at last bear
  if (currentBearIndex >= bears.length) {
    currentBearIndex = bears.length - 1;
  }

  const currentBear = bears[currentBearIndex];
  const currentThreshold = bearThresholds[currentBearIndex - 1] || 0;
  const votesInCurrentTier = globalVotes - currentThreshold;
  const votesNeededInTier = votesNeededForNext - currentThreshold;

  // Load and cache bear images
  useEffect(() => {
    const loadBearImages = async () => {
      const CACHE_KEY = 'bear_images_cache';
      const CACHE_VERSION = '1';
      
      // Try to load from localStorage
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { version, images } = JSON.parse(cached);
          if (version === CACHE_VERSION) {
            setBearImages(images);
            setLoadingBears(false);
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
      setLoadingBears(false);
      
      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        images
      }));
    };

    loadBearImages();
  }, []);

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

    // Check for existing session and load global stats
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Load global vote count
      const { count } = await supabase
        .from('matchups')
        .select('*', { count: 'exact', head: true });
      
      if (count !== null) {
        setGlobalVotes(count);
      }
      
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
        
        // Increment streak and global votes
        const newStreak = streak + 1;
        setStreak(newStreak);
        const newGlobalVotes = globalVotes + 1;
        const previousBearIndex = currentBearIndex;
        
        // Calculate new bear index
        let newBearIndex = 0;
        for (let i = 0; i < bearThresholds.length; i++) {
          if (newGlobalVotes >= bearThresholds[i]) {
            newBearIndex = i;
          }
        }
        
        setGlobalVotes(newGlobalVotes);
        
        // Save to database if authenticated (track personal votes)
        if (user) {
          const { data: stats } = await supabase
            .from('user_stats')
            .select('total_votes')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const userVotes = (stats?.total_votes || 0) + 1;
          
          supabase
            .from('user_stats')
            .upsert({ 
              user_id: user.id, 
              total_votes: userVotes 
            })
            .then(({ error }) => {
              if (error) console.error('Error saving stats:', error);
            });
        }
        
        // Show celebration for streak milestones
        if (newStreak % 5 === 0) {
          setShowStreakCelebration(true);
          setTimeout(() => setShowStreakCelebration(false), 3000);
        }
        
        // Show special message when bear changes
        if (previousBearIndex !== newBearIndex) {
          const newBear = bears[newBearIndex];
          toast.success(
            <div className="space-y-1">
              <div className="text-lg">🎉 New Bear Unlocked!</div>
              <div className="text-xl font-semibold">{newBear.name}</div>
              <div className="text-xs opacity-80">Global votes: {newGlobalVotes}</div>
            </div>,
            { duration: 4000 }
          );
        } else {
          toast.success(
            <div className="space-y-1">
              <div>Vote recorded! {newStreak > 2 ? `🔥 ${newStreak} streak` : ''}</div>
              <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
            </div>
          );
        }
        // Prefetch next pair
        fetchRandomPair(true);
      }

      const { error } = await votePromise;
      
      if (error) throw error;

      // If we didn't have a cached pair, fetch one now
      if (!nextPair) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        const newGlobalVotes = globalVotes + 1;
        const previousBearIndex = currentBearIndex;
        
        let newBearIndex = 0;
        for (let i = 0; i < bearThresholds.length; i++) {
          if (newGlobalVotes >= bearThresholds[i]) {
            newBearIndex = i;
          }
        }
        
        setGlobalVotes(newGlobalVotes);
        
        if (user) {
          const { data: stats } = await supabase
            .from('user_stats')
            .select('total_votes')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const userVotes = (stats?.total_votes || 0) + 1;
          
          supabase
            .from('user_stats')
            .upsert({ 
              user_id: user.id, 
              total_votes: userVotes 
            })
            .then(({ error }) => {
              if (error) console.error('Error saving stats:', error);
            });
        }
        
        if (newStreak % 5 === 0) {
          setShowStreakCelebration(true);
          setTimeout(() => setShowStreakCelebration(false), 3000);
        }
        
        if (previousBearIndex !== newBearIndex) {
          const newBear = bears[newBearIndex];
          toast.success(
            <div className="space-y-1">
              <div className="text-lg">🎉 New Bear Unlocked!</div>
              <div className="text-xl font-semibold">{newBear.name}</div>
              <div className="text-xs opacity-80">Global votes: {newGlobalVotes}</div>
            </div>,
            { duration: 4000 }
          );
        } else {
          toast.success(
            <div className="space-y-1">
              <div>Vote recorded! {newStreak > 2 ? `🔥 ${newStreak} streak` : ''}</div>
              <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
            </div>
          );
        }
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
            <div className="flex items-center gap-6">
              <Link to="/bears">
                <Button variant="ghost" size="sm">
                  🐻 Bears
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Sparkles className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
                  CelebRate
                </h1>
              </div>
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
              
              {/* Bear Mascot with Progress */}
              <div className="ml-2 group relative flex items-center gap-3">
                <BearProgress 
                  currentVotes={votesInCurrentTier}
                  votesNeeded={votesNeededInTier}
                  bearName={currentBear.name}
                />
                {bearImages[currentBear.type] ? (
                  <img 
                    src={bearImages[currentBear.type]} 
                    alt={currentBear.name}
                    className="w-12 h-12 object-contain transition-transform hover:scale-110 cursor-pointer bg-background rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center text-3xl">
                    🐻
                  </div>
                )}
              </div>
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
              {/* Mobile: Swipeable Split Screen */}
              <div className="md:hidden">
                <SwipeableContainer
                  celebrities={celebrities}
                  onVote={handleVote}
                  disabled={voting}
                  isMobile={true}
                />
              </div>

              {/* Desktop: Swipeable Side-by-side */}
              <div className="hidden md:block">
                <SwipeableContainer
                  celebrities={celebrities}
                  onVote={handleVote}
                  disabled={voting}
                  isMobile={false}
                />
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
          
          <StreakCelebration streak={streak} show={showStreakCelebration} />
        </div>
      </main>
    </div>
  );
};

export default Rate;
