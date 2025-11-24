-- Update RLS policy on matchups to allow anonymous inserts
-- First drop the existing policy
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.matchups;

-- Create new policy that allows both authenticated and anonymous votes
CREATE POLICY "Anyone can insert votes"
ON public.matchups
FOR INSERT
WITH CHECK (
  -- Allow if no user_id (anonymous) or if user_id matches authenticated user
  user_id IS NULL OR auth.uid() = user_id
);