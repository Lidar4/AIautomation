// API Manager edge function — CRUD + test-connection for all provider API keys.
// Keys are stored in the api_keys table and never returned in plaintext to the client.

import { requireAdmin, serviceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

const PROVIDERS = [
  'openai', 'google_gemini', 'openrouter',
  'elevenlabs', 'video_generation', 'image_generation',
  'youtube_data_api', 'youtube_oauth_client_id', 'youtube_oauth_client_secret',
  'facebook_api', 'instagram_api',
  'cloudinary', 'supabase_config',
];

interface TestResult { ok: boolean; message: string; }

async function testProvider(provider: string, keyValue: string): Promise<TestResult> {
  try {
    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${keyValue}` },
        });
        return { ok: res.ok, message: res.ok ? 'Connected to OpenAI' : `OpenAI error: ${res.status}` };
      }
      case 'google_gemini': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${keyValue}`);
        return { ok: res.ok, message: res.ok ? 'Connected to Google Gemini' : `Gemini error: ${res.status}` };
      }
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${keyValue}` },
        });
        return { ok: res.ok, message: res.ok ? 'Connected to OpenRouter' : `OpenRouter error: ${res.status}` };
      }
      case 'elevenlabs': {
        const res = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': keyValue },
        });
        return { ok: res.ok, message: res.ok ? 'Connected to ElevenLabs' : `ElevenLabs error: ${res.status}` };
      }
      case 'image_generation': {
        // Generic image-gen key check (assumes OpenAI DALL-E compatible endpoint)
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${keyValue}` },
        });
        return { ok: res.ok, message: res.ok ? 'Image generation key valid' : `Image API error: ${res.status}` };
      }
      case 'video_generation': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${keyValue}` },
        });
        return { ok: res.ok, message: res.ok ? 'Video generation key valid' : `Video API error: ${res.status}` };
      }
      case 'youtube_data_api': {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id&id=test&key=${keyValue}`);
        return { ok: res.ok, message: res.ok ? 'YouTube Data API key valid' : `YouTube API error: ${res.status}` };
      }
      case 'cloudinary': {
        // Cloudinary keys are "api_key:api_secret:cloud_name"; we do a lightweight check
        return { ok: keyValue.length > 10, message: 'Cloudinary key stored (verify manually)' };
      }
      case 'supabase_config': {
        return { ok: keyValue.length > 10, message: 'Supabase config stored' };
      }
      case 'facebook_api':
      case 'instagram_api': {
        return { ok: keyValue.length > 10, message: `${provider} key stored (verify via OAuth flow)` };
      }
      case 'youtube_oauth_client_id':
      case 'youtube_oauth_client_secret': {
        return { ok: keyValue.length > 5, message: `${provider} stored` };
      }
      default:
        return { ok: false, message: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    return { ok: false, message: `Connection test failed: ${(err as Error).message}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { supabase, adminEmail } = await requireAdmin(req);
    const svc = serviceClient();
    const url = new URL(req.url);
    const path = url.pathname.replace('/api-manager', '');
    const method = req.method;

    // GET /api-manager — list all keys (masked)
    if (method === 'GET' && (path === '' || path === '/')) {
      const { data, error } = await supabase.from('api_keys_masked').select('*');
      if (error) return errorResponse('Failed to load API keys', 500);
      return jsonResponse({ keys: data });
    }

    // POST /api-manager — add or update a key
    if (method === 'POST' && (path === '' || path === '/')) {
      const body = await req.json();
      const { provider, key_value, enabled, metadata } = body ?? {};
      if (!provider || !key_value) return errorResponse('provider and key_value are required');
      if (!PROVIDERS.includes(provider)) return errorResponse(`Unknown provider: ${provider}`);

      const { error } = await svc.from('api_keys').upsert({
        provider,
        key_value,
        enabled: enabled ?? false,
        status: 'not_connected',
        metadata: metadata ?? {},
      }, { onConflict: 'provider' });
      if (error) return errorResponse(`Failed to save key: ${error.message}`, 500);

      return jsonResponse({ success: true, message: `Key for ${provider} saved` });
    }

    // PUT /api-manager/:provider — toggle enable/disable
    if (method === 'PUT') {
      const provider = path.replace('/', '');
      if (!PROVIDERS.includes(provider)) return errorResponse(`Unknown provider: ${provider}`);
      const body = await req.json();
      const { enabled } = body ?? {};

      const { error } = await svc.from('api_keys')
        .update({ enabled: !!enabled })
        .eq('provider', provider);
      if (error) return errorResponse(`Failed to update key: ${error.message}`, 500);

      return jsonResponse({ success: true, message: `${provider} ${enabled ? 'enabled' : 'disabled'}` });
    }

    // DELETE /api-manager/:provider — remove a key
    if (method === 'DELETE') {
      const provider = path.replace('/', '');
      if (!PROVIDERS.includes(provider)) return errorResponse(`Unknown provider: ${provider}`);

      const { error } = await svc.from('api_keys').delete().eq('provider', provider);
      if (error) return errorResponse(`Failed to delete key: ${error.message}`, 500);

      return jsonResponse({ success: true, message: `${provider} key deleted` });
    }

    // POST /api-manager/test — test a connection
    if (method === 'POST' && path === '/test') {
      const body = await req.json();
      const { provider } = body ?? {};
      if (!PROVIDERS.includes(provider)) return errorResponse(`Unknown provider: ${provider}`);

      const { data: keyRow, error: keyError } = await svc.from('api_keys')
        .select('key_value')
        .eq('provider', provider)
        .maybeSingle();
      if (keyError || !keyRow) return errorResponse(`No key stored for ${provider}`);

      const result = await testProvider(provider, keyRow.key_value);
      await svc.from('api_keys').update({
        last_tested_at: new Date().toISOString(),
        last_test_ok: result.ok,
        status: result.ok ? 'connected' : 'not_connected',
      }).eq('provider', provider);

      return jsonResponse({ ...result, provider });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    return errorResponse((err as Error).message, 401);
  }
});
