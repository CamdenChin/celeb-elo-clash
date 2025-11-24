-- Add unique constraint to prevent duplicate image uploads
ALTER TABLE public.celebrities 
ADD CONSTRAINT celebrities_image_path_unique UNIQUE (image_path);