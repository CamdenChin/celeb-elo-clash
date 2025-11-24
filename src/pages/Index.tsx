import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CelebRate
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/leaderboard">
                <Button variant="ghost" size="sm">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
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
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Rate Celebrity{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Attractiveness
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare pairs of celebrities and help build an Elo-rated dataset. 
              Each choice refines the rankings using a chess-style rating system.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/rate">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-glow hover:shadow-elegant transition-all"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Rating
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6"
              >
                <Trophy className="mr-2 h-5 w-5" />
                View Rankings
              </Button>
            </Link>
          </div>

          {/* How it Works */}
          <div className="pt-16 grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-card p-6 rounded-xl shadow-card border border-border/50">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Compare Pairs</h3>
              <p className="text-muted-foreground text-sm">
                View two celebrities side-by-side and choose which one you find more attractive.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-card border border-border/50">
              <div className="h-12 w-12 rounded-lg bg-gradient-secondary flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Elo Ratings Update</h3>
              <p className="text-muted-foreground text-sm">
                After each vote, both celebrities' Elo scores adjust based on the outcome.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-card border border-border/50">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">See Rankings</h3>
              <p className="text-muted-foreground text-sm">
                Check the leaderboard to see which celebrities rank highest in the community.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-8 max-w-2xl mx-auto">
            <div className="bg-muted/50 border border-border/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">⚠️ For Fun Only</p>
              <p>
                This app is purely for entertainment and dataset generation purposes. 
                Attractiveness is subjective and rankings reflect community preferences, 
                not objective truth. The dataset may contain biases.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Built with CelebA dataset • Powered by Elo rating system
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;