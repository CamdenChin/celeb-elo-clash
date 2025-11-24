import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Trophy, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { User, Session } from "@supabase/supabase-js";

interface Celebrity {
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
      
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        fetchRandomPair();
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleVote = async (winnerId: string, loserId: string) => {
    if (!user) {
      toast.error("Please sign in to vote");
      navigate("/auth");
      return;
    }

    setVoting(true);
    
    try {
      // Check if user already voted on this exact matchup
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

      // Submit vote in background while showing next pair
      const votePromise = supabase.functions.invoke('submit-vote', {
        body: { winnerId, loserId, userId: user.id }
      });

      // Immediately show next pair if cached
      if (nextPair) {
        setCelebrities(nextPair);
        setNextPair(null);
        setVoting(false);
        toast.success("Vote recorded!");
        // Prefetch next pair
        fetchRandomPair(true);
      }

      const { error } = await votePromise;
      
      if (error) throw error;

      // If we didn't have a cached pair, fetch one now
      if (!nextPair) {
        toast.success("Vote recorded!");
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CelebRate
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/leaderboard">
                <Button variant="ghost" size="sm">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Who's More Attractive?
            </h2>
            <p className="text-muted-foreground">
              Click on your choice to vote
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : celebrities ? (
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {celebrities.map((celebrity) => (
                <Card
                  key={celebrity.id}
                  className="group cursor-pointer overflow-hidden border-2 hover:border-primary hover:shadow-glow transition-all duration-300"
                  onClick={() => {
                    if (!voting) {
                      const other = celebrities.find(c => c.id !== celebrity.id)!;
                      handleVote(celebrity.id, other.id);
                    }
                  }}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img
                      src={celebrity.image_path}
                      alt={celebrity.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{celebrity.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Elo: {Math.round(celebrity.elo_rating)}</span>
                      <span>{celebrity.games_played} games</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
