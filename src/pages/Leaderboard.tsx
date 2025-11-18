import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Trophy, Medal, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Celebrity {
  id: string;
  name: string;
  image_path: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  losses: number;
}

const Leaderboard = () => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'celebrities'
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getWinRate = (wins: number, gamesPlayed: number) => {
    if (gamesPlayed === 0) return 0;
    return ((wins / gamesPlayed) * 100).toFixed(1);
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
              <Trophy className="inline-block h-8 w-8 mr-2 text-primary" />
              Leaderboard
            </h2>
            <p className="text-muted-foreground">
              Top-rated celebrities based on community votes
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
                        {getRankIcon(index + 1) || (index + 1)}
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
                          {celebrity.games_played} games played
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-8 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-primary text-xl">
                            {Math.round(celebrity.elo_rating)}
                          </div>
                          <div className="text-muted-foreground text-xs">Elo</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {celebrity.wins}-{celebrity.losses}
                          </div>
                          <div className="text-muted-foreground text-xs">W-L</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {getWinRate(celebrity.wins, celebrity.games_played)}%
                          </div>
                          <div className="text-muted-foreground text-xs">Win Rate</div>
                        </div>
                      </div>

                      {/* Mobile Stats */}
                      <div className="md:hidden text-right">
                        <div className="font-semibold text-primary text-xl">
                          {Math.round(celebrity.elo_rating)}
                        </div>
                        <div className="text-muted-foreground text-xs">Elo</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No celebrities in the database yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;