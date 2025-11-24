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
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
                CelebRate
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/leaderboard">
                <Button variant="ghost" size="sm" className="font-sans">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
              {!user && (
                <Link to="/auth">
                  <Button size="sm" className="font-sans">
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
      <main className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-5xl md:text-7xl font-serif font-bold tracking-tight leading-tight">
              Who's
              <br />
              <span className="text-primary italic animate-pulse">
                Hotter?
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Vote on celebrity matchups. Watch the drama unfold. 
              See who really has the looks that kill.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/rate">
              <Button 
                size="lg" 
                className="text-base font-semibold px-12 py-7 shadow-glow hover:shadow-elegant transition-all rounded-full hover:scale-105 animate-fade-in"
              >
                Start Judging
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base font-medium px-12 py-7 rounded-full border-2 hover:scale-105 animate-fade-in"
              >
                <Trophy className="mr-2 h-5 w-5" />
                See The Rankings
              </Button>
            </Link>
          </div>

          {/* How it Works */}
          <div className="pt-20 grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-glow hover:-translate-y-2 transition-all duration-500 hover:border-primary/50 group animate-fade-in">
              <div className="h-14 w-14 rounded-full bg-gradient-rose-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Pick Your Winner</h3>
              <p className="text-muted-foreground leading-relaxed">
                Two faces. One choice. Make your vote count in this high-stakes beauty battle.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-glow hover:-translate-y-2 transition-all duration-500 hover:border-primary/50 group animate-fade-in [animation-delay:150ms]">
              <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Ratings Shift</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every vote changes the game. Watch as favorites rise and fall with brutal honesty.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-glow hover:-translate-y-2 transition-all duration-500 hover:border-primary/50 group animate-fade-in [animation-delay:300ms]">
              <div className="h-14 w-14 rounded-full bg-gradient-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Crown The Hottest</h3>
              <p className="text-muted-foreground leading-relaxed">
                Check the leaderboard to see who's winning the ultimate popularity contest.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-12 max-w-2xl mx-auto">
            <div className="bg-accent/30 border border-primary/20 rounded-2xl p-6 text-sm backdrop-blur-sm">
              <p className="font-serif font-semibold text-foreground mb-2">Real Talk</p>
              <p className="text-muted-foreground leading-relaxed">
                This is pure entertainment. Beauty is subjective and these rankings are just for fun. 
                We're building a dataset for AI research. Vote with your gut, not your heart.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-20">
        <div className="container mx-auto px-4 py-10">
          <p className="text-center text-sm text-muted-foreground font-light">
            Powered by intelligent rating systems • Built with care
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;