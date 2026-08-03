// YouTube proxy edge function — handles OAuth token exchange and channel connection.
// Stores the YouTube OAuth tokens server-side and fetches channel info.

import { requireAdmin, serviceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    await requireAdmin(req);
    const svc = serviceClient();
    const url = new URL(req.url);
    const path = url.pathname.replace('/youtube-proxy', '');
    const method = req.method;

    // GET /youtube-proxy/status — channel connection status
    if (method === 'GET' && (path === '/status' || path === '' || path === '/')) {
      const { data: config } = await svc.from('app_config')
        .select('youtube_connected, youtube_channel_id, youtube_channel_title')
        .limit(1).maybeSingle();
      return jsonResponse({
        connected: config?.youtube_connected ?? false,
        channelId: config?.youtube_channel_id ?? null,
        channelTitle: config?.youtube_channel_title ?? null,
      });
    }

    // POST /youtube-proxy/connect — exchange auth code for tokens + fetch channel
    if (method === 'POST' && path === '/connect') {
      const body = await req.json();
      const { code, redirectUri } = body ?? {};
      if (!code) return errorResponse('Authorization code is required');

      const { data: clientIdRow } = await svc.from('api_keys')
        .select('key_value').eq('provider', 'youtube_oauth_client_id').maybeSingle();
      const { data: clientSecretRow } = await svc.from('api_keys')
        .select('key_value').eq('provider', 'youtube_oauth_client_secret').maybeSingle();

      if (!clientIdRow?.key_value || !clientSecretRow?.key_value) {
        return errorResponse('YouTube OAuth client ID and secret are required. Add them in API Manager.');
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientIdRow.key_value,
          client_secret: clientSecretRow.key_value,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        return errorResponse(`Token exchange failed: ${errBody}`, 400);
      }
      const tokens = await tokenRes.json();

      // Fetch channel info
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      let channelId = null;
      let channelTitle = null;
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        channelId = channel?.id ?? null;
        channelTitle = channel?.snippet?.title ?? null;
      }

      // Store tokens securely in api_keys metadata
      await svc.from('api_keys').upsert({
        provider: 'youtube_oauth_tokens',
        key_value: JSON.stringify(tokens),
        enabled: true,
        status: 'connected',
        metadata: { channelId, channelTitle },
      }, { onConflict: 'provider' });

      await svc.from('app_config').update({
        youtube_connected: true,
        youtube_channel_id: channelId,
        youtube_channel_title: channelTitle,
      }).neq('id', '00000000-0000-0000-0000-000000000000');

      return jsonResponse({ success: true, channelId, channelTitle });
    }

    // POST /youtube-proxy/disconnect
    if (method === 'POST' && path === '/disconnect') {
      await svc.from('api_keys').delete().eq('provider', 'youtube_oauth_tokens');
      await svc.from('app_config').update({
        youtube_connected: false,
        youtube_channel_id: null,
        youtube_channel_title: null,
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      return jsonResponse({ success: true });
    }

    // GET /youtube-proxy/oauth-url — build the OAuth URL for the frontend
    if (method === 'GET' && path === '/oauth-url') {
      const { data: clientIdRow } = await svc.from('api_keys')
        .select('key_value').eq('provider', 'youtube_oauth_client_id').maybeSingle();
      if (!clientIdRow?.key_value) return errorResponse('YouTube OAuth client ID not configured');

      const redirectUri = url.searchParams.get('redirect_uri') ?? `${url.origin}/youtube-proxy/callback`;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientIdRow.key_value,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        access_type: 'offline',
        prompt: 'consent',
      })}`;
      return jsonResponse({ url: oauthUrl });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
});
