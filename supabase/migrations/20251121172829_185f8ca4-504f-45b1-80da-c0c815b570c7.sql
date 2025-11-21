-- Add explicit RLS policies to prevent client-side manipulation of matchups table
-- Only service role (backend/edge functions) can INSERT, UPDATE, or DELETE
-- Regular users (authenticated or anonymous) are explicitly denied

-- Policy to deny INSERT for all regular users
CREATE POLICY "Only backend can insert matchups"
ON public.matchups
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Policy to deny UPDATE for all regular users
CREATE POLICY "Only backend can update matchups"
ON public.matchups
FOR UPDATE
TO authenticated, anon
USING (false);

-- Policy to deny DELETE for all regular users
CREATE POLICY "Only backend can delete matchups"
ON public.matchups
FOR DELETE
TO authenticated, anon
USING (false);