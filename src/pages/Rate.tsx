import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, LogOut, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SwipeableContainer } from "@/components/SwipeableContainer";
import { StreakCelebration } from "@/components/StreakCelebration";
import { BearProgress } from "@/components/BearProgress";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { KeyboardShortcutsGuide } from "@/components/KeyboardShortcutsGuide";
import { CelebrityCardSkeleton } from "@/components/CelebrityCardSkeleton";
import { offlineQueue } from "@/lib/offlineQueue";
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
  const [userVotes, setUserVotes] = useState(0);
  const [bearImages, setBearImages] = useState<Record<string, string>>({});
  const [loadingBears, setLoadingBears] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedVotes, setQueuedVotes] = useState(0);
  const [skipAnimating, setSkipAnimating] = useState(false);
  const navigate = useNavigate();

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
    if (userVotes >= bearThresholds[i]) {
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
  const votesInCurrentTier = userVotes - currentThreshold;
  const votesNeededInTier = votesNeededForNext - currentThreshold;

  // Load and cache bear images
  useEffect(() => {
    const loadBearImages = async () => {
      const CACHE_KEY = 'bear_images_cache';
      const CACHE_VERSION = '2'; // Incremented to force reload with emoji support
      
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
          // Handle both AI-generated images and emoji fallback
          if (data?.imageUrl) {
            images[bear.type] = data.imageUrl;
          } else if (data?.emoji) {
            images[bear.type] = data.emoji;
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
    // Track online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      // Sync queued votes
      offlineQueue.sync().then(result => {
        if (result.synced > 0) {
          toast.success(`Synced ${result.synced} offline votes!`);
          setQueuedVotes(offlineQueue.getSize());
        }
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.info("You're offline. Votes will be queued and synced when you reconnect.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue size on mount
    setQueuedVotes(offlineQueue.getSize());

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Check for existing session and load user vote count
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Load user-specific vote count
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
      
      setLoading(false);
    });

    // Load initial pair regardless of auth status
    fetchRandomPair();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVote = async (winnerId: string, loserId: string) => {
    // Prevent duplicate submissions
    if (voting) {
      return;
    }
    
    setVoting(true);
    
    const clickTimeMs = Date.now() - pairDisplayTime;
    const clickTimeSec = (clickTimeMs / 1000).toFixed(2);
    
    // Check if this is a controversial pick (voting for lower ELO)
    const winner = celebrities?.find(c => c.id === winnerId);
    const loser = celebrities?.find(c => c.id === loserId);
    const isControversial = winner && loser && winner.elo_rating < loser.elo_rating;
    const eloDifference = winner && loser ? Math.abs(winner.elo_rating - loser.elo_rating) : 0;
    
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
      // If offline, queue the vote
      if (!isOnline) {
        offlineQueue.enqueue({
          winnerId,
          loserId,
          userId: user?.id || null,
          clickTimeMs
        });
        
        setQueuedVotes(offlineQueue.getSize());
        
        // Still show next pair and update UI
        if (nextPair) {
          setCelebrities(nextPair);
          setPairDisplayTime(Date.now());
          setNextPair(null);
          fetchRandomPair(true);
        }
        
        const newUserVotes = userVotes + 1;
        setUserVotes(newUserVotes);
        localStorage.setItem('anonymous_votes', newUserVotes.toString());
        
        toast.success(
          <div className="space-y-1">
            <div>Vote queued offline! (#{offlineQueue.getSize()})</div>
            <div className="text-xs opacity-80">Will sync when you're back online</div>
          </div>
        );
        
        setVoting(false);
        return;
      }

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
        
        // Increment streak and user votes
        const newStreak = streak + 1;
        setStreak(newStreak);
        const newUserVotes = userVotes + 1;
        const previousBearIndex = currentBearIndex;
        
        // Calculate new bear index
        let newBearIndex = 0;
        for (let i = 0; i < bearThresholds.length; i++) {
          if (newUserVotes >= bearThresholds[i]) {
            newBearIndex = i + 1;
          }
        }
        
        setUserVotes(newUserVotes);
        
        // Save to database if authenticated, otherwise localStorage
        if (user) {
          supabase
            .from('user_stats')
            .upsert({ 
              user_id: user.id, 
              total_votes: newUserVotes 
            }, {
              onConflict: 'user_id'
            })
            .then(({ error }) => {
              if (error) console.error('Error saving stats:', error);
            });
        } else {
          localStorage.setItem('anonymous_votes', newUserVotes.toString());
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
              <div className="text-xs opacity-80">Your votes: {newUserVotes}</div>
            </div>,
            { duration: 4000 }
          );
        } else if (isControversial && eloDifference > 50) {
          // Show controversial pick banner for significant upsets
          toast.success(
            <div className="space-y-1">
              <div className="text-lg">🎭 Controversial Pick!</div>
              <div className="text-sm">You went against the crowd (+{Math.round(eloDifference)} ELO upset)</div>
              <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
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
        const newUserVotes = userVotes + 1;
        const previousBearIndex = currentBearIndex;
        
        let newBearIndex = 0;
        for (let i = 0; i < bearThresholds.length; i++) {
          if (newUserVotes >= bearThresholds[i]) {
            newBearIndex = i + 1;
          }
        }
        
        setUserVotes(newUserVotes);
        
        if (user) {
          supabase
            .from('user_stats')
            .upsert({ 
              user_id: user.id, 
              total_votes: newUserVotes 
            }, {
              onConflict: 'user_id'
            })
            .then(({ error }) => {
              if (error) console.error('Error saving stats:', error);
            });
        } else {
          localStorage.setItem('anonymous_votes', newUserVotes.toString());
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
              <div className="text-xs opacity-80">Your votes: {newUserVotes}</div>
            </div>,
            { duration: 4000 }
          );
        } else if (isControversial && eloDifference > 50) {
          toast.success(
            <div className="space-y-1">
              <div className="text-lg">🎭 Controversial Pick!</div>
              <div className="text-sm">You went against the crowd (+{Math.round(eloDifference)} ELO upset)</div>
              <div className="text-xs opacity-80">{clickTimeSec}s • {speedMessage}</div>
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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (voting || !celebrities || loading) return;
      
      if (e.key === '1') {
        handleVote(celebrities[0].id, celebrities[1].id);
      } else if (e.key === '2') {
        handleVote(celebrities[1].id, celebrities[0].id);
      } else if (e.key === '0') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [celebrities, voting, loading]);

  const handleSkip = async () => {
    if (voting || !celebrities || skipAnimating) return;
    
    setSkipAnimating(true);
    setVoting(true);
    
    try {
      // If offline, queue the skip
      if (!isOnline) {
        offlineQueue.enqueue({
          winnerId: null,
          loserId: null,
          userId: user?.id || null,
          clickTimeMs: 0,
          isSkip: true,
          celebrity1Id: celebrities[0].id,
          celebrity2Id: celebrities[1].id,
        });
        
        setQueuedVotes(offlineQueue.getSize());
        
        // Show next pair after animation
        setTimeout(() => {
          if (nextPair) {
            setCelebrities(nextPair);
            setPairDisplayTime(Date.now());
            setNextPair(null);
            fetchRandomPair(true);
          }
          setSkipAnimating(false);
        }, 400);
        
        toast.info("Skip queued offline! Both celebrities will lose rating when you reconnect.");
        setVoting(false);
        return;
      }

      // Submit skip to backend
      const { error } = await supabase.functions.invoke('submit-vote', {
        body: { 
          winnerId: null,
          loserId: null, 
          userId: user?.id || null,
          clickTimeMs: 0,
          isSkip: true,
          celebrity1Id: celebrities[0].id,
          celebrity2Id: celebrities[1].id,
        }
      });

      if (error) throw error;

      // Show next pair after animation completes
      setTimeout(() => {
        if (nextPair) {
          setCelebrities(nextPair);
          setPairDisplayTime(Date.now());
          setNextPair(null);
          fetchRandomPair(true);
        }
        setSkipAnimating(false);
      }, 400);

      // Reset streak on skip
      setStreak(0);
      
      toast.info("⏭️ Skipped! Both celebrities lost rating");
    } catch (error) {
      console.error('Error skipping:', error);
      toast.error("Failed to skip");
      setSkipAnimating(false);
    } finally {
      setVoting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Onboarding & Keyboard Shortcuts */}
      <OnboardingTutorial />
      <KeyboardShortcutsGuide />
      
      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between gap-2">
            <Link to="/" className="flex-shrink-0">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Home</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2 md:gap-6">
              {/* Online/Offline Indicator */}
              {!isOnline && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <WifiOff className="h-4 w-4" />
                  {queuedVotes > 0 && (
                    <span className="text-xs">({queuedVotes} queued)</span>
                  )}
                </div>
              )}
              {isOnline && queuedVotes > 0 && (
                <div className="flex items-center gap-2 text-primary">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Syncing...</span>
                </div>
              )}
            <Link to="/bears" className="flex-shrink-0">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  {bearImages[currentBear.type] ? (
                    // Check if it's an emoji (short string, no URL prefix)
                    bearImages[currentBear.type].length <= 10 && 
                    !bearImages[currentBear.type].startsWith('data:') && 
                    !bearImages[currentBear.type].startsWith('http') ? (
                      <span className="text-xl" role="img" aria-label={currentBear.name}>
                        {bearImages[currentBear.type]}
                      </span>
                    ) : (
                      <img 
                        src={bearImages[currentBear.type]} 
                        alt={currentBear.name}
                        className="w-4 h-4 md:w-5 md:h-5 object-contain rounded-full"
                      />
                    )
                  ) : (
                    <span className="text-xl">🐻</span>
                  )}
                  <span className="hidden md:inline">Bears</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 md:gap-3">
                <Sparkles className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                <h1 className="text-lg md:text-2xl font-serif font-semibold tracking-wide text-foreground">
                  CelebRate
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {user && (
                <Link to="/my-rankings" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">My Favorites</span>
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
          
          {/* Bear Progress - Stacked below nav on mobile */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <BearProgress 
              currentVotes={votesInCurrentTier}
              votesNeeded={votesNeededInTier}
              bearName={currentBear.name}
              bearImage={bearImages[currentBear.type]}
            />
            {bearImages[currentBear.type] && (
              // Check if it's an emoji (short string, no URL prefix)
              bearImages[currentBear.type].length <= 10 && 
              !bearImages[currentBear.type].startsWith('data:') && 
              !bearImages[currentBear.type].startsWith('http') ? (
                <span className="text-5xl md:text-6xl transition-transform hover:scale-110 cursor-pointer" role="img" aria-label={currentBear.name}>
                  {bearImages[currentBear.type]}
                </span>
              ) : (
                <img 
                  src={bearImages[currentBear.type]} 
                  alt={currentBear.name}
                  className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform hover:scale-110 cursor-pointer bg-background rounded-full"
                />
              )
            )}
          </div>
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
            <CelebrityCardSkeleton />
          ) : celebrities ? (
            <>
              {/* Mobile: Swipeable Split Screen */}
              <div className="md:hidden">
                <SwipeableContainer
                  celebrities={celebrities}
                  onVote={handleVote}
                  onSkip={handleSkip}
                  disabled={voting}
                  isMobile={true}
                  skipAnimating={skipAnimating}
                />
              </div>

              {/* Desktop: Swipeable Side-by-side */}
              <div className="hidden md:block">
                <SwipeableContainer
                  celebrities={celebrities}
                  onVote={handleVote}
                  onSkip={handleSkip}
                  disabled={voting}
                  isMobile={false}
                  skipAnimating={skipAnimating}
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
