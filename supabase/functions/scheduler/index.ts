// Scheduler / process-queue edge function.
// Processes pending scheduled_tasks: uploads due videos to YouTube and marks them.
// Can be called manually or via a cron-like trigger.

import { serviceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const svc = serviceClient();

    // Find due pending upload tasks
    const now = new Date().toISOString();
    const { data: tasks, error } = await svc.from('scheduled_tasks')
      .select('*, videos(*)')
      .eq('type', 'upload')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10);

    if (error) return errorResponse('Failed to load tasks', 500);

    const results: unknown[] = [];
    for (const task of tasks ?? []) {
      // Mark running
      await svc.from('scheduled_tasks').update({
        status: 'running', started_at: now,
      }).eq('id', task.id);

      try {
        const video = task.videos;
        if (!video) throw new Error('Linked video not found');

        // Check YouTube connection
        const { data: config } = await svc.from('app_config')
          .select('youtube_connected').limit(1).maybeSingle();
        if (!config?.youtube_connected) throw new Error('YouTube channel not connected');

        const { data: tokenRow } = await svc.from('api_keys')
          .select('key_value').eq('provider', 'youtube_oauth_tokens').maybeSingle();
        if (!tokenRow?.key_value) throw new Error('YouTube OAuth tokens not found');

        const tokens = JSON.parse(tokenRow.key_value);

        // Fetch the media file URL
        const { data: media } = await svc.from('media')
          .select('file_url, title, mime_type').eq('id', video.media_id).maybeSingle();
        if (!media?.file_url) throw new Error('Video media file not found');

        // Initiate resumable upload to YouTube
        const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': media.mime_type ?? 'video/mp4',
          },
          body: JSON.stringify({
            snippet: {
              title: video.title,
              description: video.description ?? '',
              tags: video.tags ?? [],
              categoryId: '22',
            },
            status: { privacyStatus: video.privacy_status ?? 'private' },
          }),
        });

        if (!initRes.ok) {
          const errBody = await initRes.text();
          throw new Error(`YouTube upload init failed: ${errBody}`);
        }

        const uploadUrl = initRes.headers.get('location') ?? '';
        let youtubeVideoId: string | null = null;

        // Fetch the media and upload it
        const mediaRes = await fetch(media.file_url);
        if (mediaRes.ok) {
          const mediaBlob = await mediaRes.blob();
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': media.mime_type ?? 'video/mp4' },
            body: mediaBlob,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            youtubeVideoId = uploadData.id ?? null;
          }
        }

        // Mark video uploaded
        await svc.from('videos').update({
          status: 'uploaded',
          youtube_video_id: youtubeVideoId,
          uploaded_at: new Date().toISOString(),
          error_message: null,
        }).eq('id', video.id);

        await svc.from('scheduled_tasks').update({
          status: 'completed', completed_at: new Date().toISOString(),
          result: { youtube_video_id: youtubeVideoId },
        }).eq('id', task.id);

        results.push({ taskId: task.id, videoId: video.id, youtubeVideoId, status: 'completed' });
      } catch (err) {
        await svc.from('scheduled_tasks').update({
          status: 'failed', completed_at: new Date().toISOString(),
          error_message: (err as Error).message,
        }).eq('id', task.id);
        await svc.from('videos').update({
          status: 'failed', error_message: (err as Error).message,
        }).eq('id', task.video_id);
        results.push({ taskId: task.id, status: 'failed', error: (err as Error).message });
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
});
