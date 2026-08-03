/*
# Create media storage bucket

## Overview
Creates a private storage bucket named `media` for uploading video, image, and thumbnail assets.
Adds storage policies so authenticated admin users can upload, read, and delete files.

## Security
- Bucket is private (not public).
- Only authenticated users can upload/read/delete.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "admin_upload_media" ON storage.objects;
CREATE POLICY "admin_upload_media" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to read files
DROP POLICY IF EXISTS "admin_read_media" ON storage.objects;
CREATE POLICY "admin_read_media" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'media');

-- Allow authenticated users to delete files
DROP POLICY IF EXISTS "admin_delete_media" ON storage.objects;
CREATE POLICY "admin_delete_media" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'media');

-- Allow authenticated users to update files
DROP POLICY IF EXISTS "admin_update_media" ON storage.objects;
CREATE POLICY "admin_update_media" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
