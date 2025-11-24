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
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight leading-tight">
              Discover Beauty
              <br />
              <span className="font-semibold text-primary italic">
                Reimagined
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Curate your favorites. Compare stunning portraits. Build an intelligent beauty dataset 
              powered by your unique perspective.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/rate">
              <Button 
                size="lg" 
                className="text-base font-medium px-10 py-6 shadow-elegant hover:shadow-glow transition-all rounded-full"
              >
                Begin Your Journey
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base font-medium px-10 py-6 rounded-full border-2"
              >
                <Trophy className="mr-2 h-5 w-5" />
                View Rankings
              </Button>
            </Link>
          </div>

          {/* How it Works */}
          <div className="pt-20 grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-card transition-shadow">
              <div className="h-14 w-14 rounded-full bg-gradient-rose-gold flex items-center justify-center mb-5">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Compare</h3>
              <p className="text-muted-foreground leading-relaxed">
                Elegantly choose between two portraits, guided by your aesthetic intuition.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-card transition-shadow">
              <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center mb-5">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Refine</h3>
              <p className="text-muted-foreground leading-relaxed">
                Watch as intelligent ratings evolve with each thoughtful selection you make.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-border/30 hover:shadow-card transition-shadow">
              <div className="h-14 w-14 rounded-full bg-gradient-secondary flex items-center justify-center mb-5">
                <Trophy className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Discover</h3>
              <p className="text-muted-foreground leading-relaxed">
                Explore curated rankings that reflect collective beauty standards.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-12 max-w-2xl mx-auto">
            <div className="bg-accent/30 border border-primary/20 rounded-2xl p-6 text-sm">
              <p className="font-serif font-semibold text-foreground mb-2">A Note on Beauty</p>
              <p className="text-muted-foreground leading-relaxed">
                This experience celebrates diverse perspectives on attractiveness. 
                Rankings reflect collective taste, not absolute truth. Created for entertainment 
                and research—beauty remains wonderfully subjective.
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