/*
# Make media bucket public

## Overview
Updates the media storage bucket to public so media URLs are directly accessible.
This is required because the scheduler edge function fetches media files by URL
to upload them to YouTube.
*/

UPDATE storage.buckets SET public = true WHERE id = 'media';
