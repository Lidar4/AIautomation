import { supabase, FUNCTIONS_URL } from './supabase';
import type { ApiKey, AppConfig } from './types';

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

async function adminHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabase.from('api_keys_masked').select('*').order('provider');
  if (error) throw error;
  return data ?? [];
}

export async function saveApiKey(provider: string, keyValue: string, enabled = false): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/api-manager`, {
    method: 'POST',
    headers: await adminHeaders(),
    body: JSON.stringify({ provider, key_value: keyValue, enabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save key' }));
    throw new Error(err.error);
  }
}

export async function toggleApiKey(provider: string, enabled: boolean): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/api-manager/${provider}`, {
    method: 'PUT',
    headers: await adminHeaders(),
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update key' }));
    throw new Error(err.error);
  }
}

export async function deleteApiKey(provider: string): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/api-manager/${provider}`, {
    method: 'DELETE',
    headers: await adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete key' }));
    throw new Error(err.error);
  }
}

export async function testApiKey(provider: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/api-manager/test`, {
    method: 'POST',
    headers: await adminHeaders(),
    body: JSON.stringify({ provider }),
  });
  const data = await res.json().catch(() => ({ ok: false, message: 'Test failed' }));
  return { ok: data.ok ?? false, message: data.message ?? 'Unknown result' };
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase.from('app_config').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function generateAiContent(params: {
  type: string;
  provider?: string;
  prompt: string;
  topic?: string;
  tone?: string;
  length?: string;
  videoId?: string;
}): Promise<{ output: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/ai-generate`, {
    method: 'POST',
    headers: await adminHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({ error: 'Generation failed' }));
  if (!res.ok) throw new Error(data.error ?? 'Generation failed');
  return { output: data.output ?? '' };
}

export async function fetchTrending(params: {
  country?: string;
  language?: string;
  audience?: string;
  niche?: string;
}): Promise<{ topicIdeas: string[]; trendingVideos: unknown[] }> {
  const res = await fetch(`${FUNCTIONS_URL}/trending`, {
    method: 'POST',
    headers: await adminHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({ error: 'Trending fetch failed' }));
  if (!res.ok) throw new Error(data.error ?? 'Trending fetch failed');
  return { topicIdeas: data.topicIdeas ?? [], trendingVideos: data.trendingVideos ?? [] };
}

export async function getYouTubeStatus(): Promise<{
  connected: boolean;
  channelId: string | null;
  channelTitle: string | null;
}> {
  const res = await fetch(`${FUNCTIONS_URL}/youtube-proxy/status`, {
    headers: await adminHeaders(),
  });
  const data = await res.json().catch(() => ({ connected: false }));
  return { connected: data.connected ?? false, channelId: data.channelId ?? null, channelTitle: data.channelTitle ?? null };
}

export async function getYouTubeOAuthUrl(redirectUri: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/youtube-proxy/oauth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
    headers: await adminHeaders(),
  });
  const data = await res.json().catch(() => ({ error: 'Failed to build OAuth URL' }));
  if (!res.ok) throw new Error(data.error);
  return data.url;
}

export async function connectYouTube(code: string, redirectUri: string): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/youtube-proxy/connect`, {
    method: 'POST',
    headers: await adminHeaders(),
    body: JSON.stringify({ code, redirectUri }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Connection failed' }));
    throw new Error(err.error);
  }
}

export async function disconnectYouTube(): Promise<void> {
  await fetch(`${FUNCTIONS_URL}/youtube-proxy/disconnect`, {
    method: 'POST',
    headers: await adminHeaders(),
  });
}

export async function processSchedulerQueue(): Promise<{ processed: number }> {
  const res = await fetch(`${FUNCTIONS_URL}/scheduler`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({ processed: 0 }));
  return { processed: data.processed ?? 0 };
}
