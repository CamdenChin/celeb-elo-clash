-- Temporary policy to allow INSERT on celebrities table for data upload
-- This allows the admin page to insert celebrity records
-- TODO: Replace with proper authentication-based policy later

CREATE POLICY "Allow public insert on celebrities"
ON public.celebrities
FOR INSERT
TO anon, authenticated
WITH CHECK (true);