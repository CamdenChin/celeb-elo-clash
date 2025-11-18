-- Create celebrities table with Elo ratings
CREATE TABLE public.celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  elo_rating DECIMAL(10, 2) NOT NULL DEFAULT 1200.00,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matchups table to track all comparisons
CREATE TABLE public.matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  loser_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  winner_previous_elo DECIMAL(10, 2) NOT NULL,
  loser_previous_elo DECIMAL(10, 2) NOT NULL,
  winner_new_elo DECIMAL(10, 2) NOT NULL,
  loser_new_elo DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster leaderboard queries
CREATE INDEX idx_celebrities_elo ON public.celebrities(elo_rating DESC);
CREATE INDEX idx_celebrities_games ON public.celebrities(games_played DESC);
CREATE INDEX idx_matchups_created ON public.matchups(created_at DESC);

-- Enable RLS (public read access for this use case)
ALTER TABLE public.celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read celebrities
CREATE POLICY "Anyone can view celebrities"
  ON public.celebrities
  FOR SELECT
  USING (true);

-- Allow everyone to read matchups
CREATE POLICY "Anyone can view matchups"
  ON public.matchups
  FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_celebrities_updated_at
  BEFORE UPDATE ON public.celebrities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live leaderboard updates
ALTER TABLE public.celebrities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.celebrities;