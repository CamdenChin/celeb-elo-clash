import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";

interface CelebrityVote {
  id: string;
  name: string;
  image_path: string;
  vote_count: number;
  current_elo: number;
}

const MyRankings = () => {
  const [celebrities, setCelebrities] = useState<CelebrityVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchMyVotes(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchMyVotes = async (userId: string) => {
    try {
      // Get all matchups where this user voted
      const { data: matchups, error: matchupsError } = await supabase
        .from('matchups')
        .select('winner_id')
        .eq('user_id', userId);

      if (matchupsError) throw matchupsError;

      if (!matchups || matchups.length === 0) {
        setLoading(false);
        return;
      }

      // Count votes per celebrity
      const voteCounts = matchups.reduce((acc, matchup) => {
        acc[matchup.winner_id] = (acc[matchup.winner_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get celebrity details
      const celebrityIds = Object.keys(voteCounts);
      const { data: celebs, error: celebsError } = await supabase
        .from('celebrities')
        .select('id, name, image_path, elo_rating')
        .in('id', celebrityIds);

      if (celebsError) throw celebsError;

      // Combine data and sort by vote count
      const rankedCelebs = (celebs || [])
        .map(celeb => ({
          id: celeb.id,
          name: celeb.name,
          image_path: celeb.image_path,
          vote_count: voteCounts[celeb.id],
          current_elo: celeb.elo_rating
        }))
        .sort((a, b) => b.vote_count - a.vote_count);

      setCelebrities(rankedCelebs);
    } catch (error) {
      console.error('Error fetching my votes:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <Link to="/rate">
              <Button size="sm">
                Start Rating
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">
              <Heart className="inline-block h-8 w-8 mr-2 text-primary" />
              My Favorites
            </h2>
            <p className="text-muted-foreground">
              Celebrities you've voted for, ranked by how often you chose them
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : celebrities.length > 0 ? (
            <div className="space-y-4">
              {celebrities.map((celebrity, index) => (
                <Link key={celebrity.id} to={`/celebrity/${celebrity.id}`}>
                  <Card className="overflow-hidden hover:shadow-elegant transition-all cursor-pointer border border-border/50 hover:border-primary/50">
                    <div className="flex items-center gap-4 p-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold text-lg">
                        {index + 1}
                      </div>

                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={celebrity.image_path}
                          alt={celebrity.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{celebrity.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          You chose them {celebrity.vote_count} {celebrity.vote_count === 1 ? 'time' : 'times'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-8 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-primary text-xl">
                            {celebrity.vote_count}
                          </div>
                          <div className="text-muted-foreground text-xs">Your Votes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {Math.round(celebrity.current_elo)}
                          </div>
                          <div className="text-muted-foreground text-xs">Current Elo</div>
                        </div>
                      </div>

                      {/* Mobile Stats */}
                      <div className="md:hidden text-right">
                        <div className="font-semibold text-primary text-xl">
                          {celebrity.vote_count}
                        </div>
                        <div className="text-muted-foreground text-xs">Votes</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't voted yet</p>
              <Link to="/rate">
                <Button>Start Rating</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyRankings;
