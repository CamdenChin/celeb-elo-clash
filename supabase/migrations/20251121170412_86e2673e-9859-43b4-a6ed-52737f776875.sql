-- Create storage bucket for celebrity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('celebrity-images', 'celebrity-images', true);

-- Create policies for celebrity images bucket
CREATE POLICY "Celebrity images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'celebrity-images');

CREATE POLICY "Anyone can upload celebrity images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'celebrity-images');

CREATE POLICY "Anyone can update celebrity images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'celebrity-images');

CREATE POLICY "Anyone can delete celebrity images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'celebrity-images');