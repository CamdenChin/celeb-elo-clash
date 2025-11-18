import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, TrendingUp } from "lucide-react";
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
  created_at: string;
}

interface Matchup {
  id: string;
  winner_id: string;
  loser_id: string;
  winner_previous_elo: number;
  loser_previous_elo: number;
  winner_new_elo: number;
  loser_new_elo: number;
  created_at: string;
}

const CelebrityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCelebrityData();
  }, [id]);

  const fetchCelebrityData = async () => {
    if (!id) return;

    try {
      // Fetch celebrity details
      const { data: celebData, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', id)
        .single();

      if (celebError) throw celebError;
      setCelebrity(celebData);

      // Fetch matchup history
      const { data: matchupData, error: matchupError } = await supabase
        .from('matchups')
        .select('*')
        .or(`winner_id.eq.${id},loser_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (matchupError) throw matchupError;
      setMatchups(matchupData || []);
    } catch (error) {
      console.error('Error fetching celebrity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = () => {
    if (!celebrity || celebrity.games_played === 0) return 0;
    return ((celebrity.wins / celebrity.games_played) * 100).toFixed(1);
  };

  const getEloChange = (matchup: Matchup) => {
    const isWinner = matchup.winner_id === id;
    if (isWinner) {
      return matchup.winner_new_elo - matchup.winner_previous_elo;
    } else {
      return matchup.loser_new_elo - matchup.loser_previous_elo;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Celebrity Not Found</h2>
          <Link to="/leaderboard">
            <Button>Back to Leaderboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden shadow-elegant border border-border/50">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="aspect-square bg-muted">
                <img
                  src={celebrity.image_path}
                  alt={celebrity.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stats */}
              <div className="p-8 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{celebrity.name}</h1>
                  <p className="text-muted-foreground">Celebrity Profile</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-primary rounded-lg text-primary-foreground">
                    <div>
                      <div className="text-sm opacity-90">Elo Rating</div>
                      <div className="text-3xl font-bold">
                        {Math.round(celebrity.elo_rating)}
                      </div>
                    </div>
                    <Trophy className="h-8 w-8 opacity-80" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{celebrity.wins}</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-destructive">{celebrity.losses}</div>
                      <div className="text-sm text-muted-foreground">Losses</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{getWinRate()}%</div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Games</div>
                    <div className="text-2xl font-bold">{celebrity.games_played}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Matchups */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Recent Matchups
            </h2>
            {matchups.length > 0 ? (
              <div className="space-y-2">
                {matchups.map((matchup) => {
                  const isWinner = matchup.winner_id === id;
                  const eloChange = getEloChange(matchup);
                  return (
                    <Card key={matchup.id} className="p-4 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              isWinner
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive'
                            }`}
                          >
                            {isWinner ? 'Win' : 'Loss'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(matchup.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            eloChange >= 0 ? 'text-primary' : 'text-destructive'
                          }`}
                        >
                          {eloChange >= 0 ? '+' : ''}
                          {eloChange.toFixed(1)}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground border border-border/50">
                No matchups yet
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CelebrityDetail;