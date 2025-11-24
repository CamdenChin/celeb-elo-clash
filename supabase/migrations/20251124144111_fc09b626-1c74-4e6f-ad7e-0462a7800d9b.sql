-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Add user_id to matchups to track who voted
ALTER TABLE public.matchups
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Create index for faster duplicate vote checks
CREATE INDEX idx_matchups_user_participants ON public.matchups(user_id, winner_id, loser_id);

-- 6. Update RLS policies for matchups
DROP POLICY IF EXISTS "Only backend can insert matchups" ON public.matchups;
DROP POLICY IF EXISTS "Only backend can update matchups" ON public.matchups;
DROP POLICY IF EXISTS "Only backend can delete matchups" ON public.matchups;

-- Allow authenticated users to insert their own votes
CREATE POLICY "Users can insert their own votes"
ON public.matchups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Prevent updates and deletes
CREATE POLICY "No one can update matchups"
ON public.matchups
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No one can delete matchups"
ON public.matchups
FOR DELETE
TO authenticated
USING (false);

-- 7. Update celebrities table RLS - only admins can insert
DROP POLICY IF EXISTS "Allow public insert on celebrities" ON public.celebrities;

CREATE POLICY "Only admins can insert celebrities"
ON public.celebrities
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));