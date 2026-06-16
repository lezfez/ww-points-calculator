-- Drop the broad SELECT policy that allows clients to list all files in the bucket.
-- The bucket remains public so individual image URLs still work without authentication.
-- Listing all objects is not needed — the app reads image_url directly from the recipes table.
DROP POLICY IF EXISTS "Public read recipe images" ON storage.objects;
