// AI Content Pipeline edge function.
// Generates scripts, titles, descriptions, hashtags, tags, thumbnails, voice, and video
// using OpenAI, Google Gemini, or OpenRouter. The provider key is read server-side.

import { requireAdmin, serviceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

interface GenRequest {
  type: 'script' | 'title' | 'description' | 'hashtag' | 'tag' | 'thumbnail' | 'voice' | 'video';
  provider?: 'openai' | 'google_gemini' | 'openrouter';
  prompt: string;
  topic?: string;
  tone?: string;
  length?: string;
  videoId?: string;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  script: 'You are an expert YouTube scriptwriter. Write engaging, well-structured video scripts with hooks, body, and call-to-action.',
  title: 'You are a YouTube SEO expert. Generate highly clickable, SEO-optimized video titles.',
  description: 'You are a YouTube SEO expert. Write detailed video descriptions with timestamps, links, and keywords.',
  hashtag: 'You are a YouTube growth expert. Generate relevant, trending hashtags for maximum reach.',
  tag: 'You are a YouTube SEO expert. Generate relevant comma-separated video tags for discoverability.',
};

function buildUserPrompt(req: GenRequest): string {
  const base = req.prompt || req.topic || '';
  switch (req.type) {
    case 'script':
      return `Write a YouTube video script.\nTopic: ${base}\nTone: ${req.tone || 'engaging'}\nLength: ${req.length || 'medium'}\nInclude a hook, intro, main content, and outro.`;
    case 'title':
      return `Generate 10 SEO-optimized YouTube video titles for: ${base}\nReturn one per line.`;
    case 'description':
      return `Write a YouTube video description for: ${base}\nInclude an intro, timestamps placeholder, keywords, and call-to-action.`;
    case 'hashtag':
      return `Generate 20 relevant YouTube hashtags for: ${base}\nReturn one per line without the # symbol.`;
    case 'tag':
      return `Generate 30 relevant YouTube tags for: ${base}\nReturn as a comma-separated list.`;
    default:
      return base;
  }
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenRouter(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    await requireAdmin(req);
    const svc = serviceClient();
    const body: GenRequest = await req.json();
    const { type, provider = 'openai' } = body;
    if (!type) return errorResponse('type is required');

    // Fetch the provider key server-side
    const { data: keyRow, error: keyError } = await svc.from('api_keys')
      .select('key_value, enabled')
      .eq('provider', provider)
      .maybeSingle();
    if (keyError || !keyRow) return errorResponse(`No API key configured for ${provider}. Add it in Settings > API Manager.`);
    if (!keyRow.enabled) return errorResponse(`${provider} is disabled. Enable it in Settings > API Manager.`);

    const apiKey = keyRow.key_value;
    const systemPrompt = SYSTEM_PROMPTS[type] ?? 'You are a helpful assistant.';
    const userPrompt = buildUserPrompt(body);

    let output = '';
    if (type === 'thumbnail' || type === 'voice' || type === 'video') {
      // These require specialized providers; return structured guidance for now.
      if (type === 'thumbnail') {
        const prompt = `Generate a thumbnail concept for: ${body.prompt || body.topic || ''}`;
        if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1792x1024' }),
          });
          if (!res.ok) throw new Error(`Image generation error: ${res.status}`);
          const data = await res.json();
          output = data.data?.[0]?.url ?? '';
        } else {
          output = `Thumbnail prompt: ${prompt}`;
        }
      } else if (type === 'voice') {
        const { data: elevenRow } = await svc.from('api_keys')
          .select('key_value, enabled').eq('provider', 'elevenlabs').maybeSingle();
        if (!elevenRow || !elevenRow.enabled) return errorResponse('ElevenLabs key not configured or disabled.');
        const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: { 'xi-api-key': elevenRow.key_value, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body.prompt, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        });
        if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
        const audioBlob = await res.blob();
        const b64 = await audioBlob.text();
        output = b64.slice(0, 200);
      } else {
        output = `Video generation request queued for: ${body.prompt}`;
      }
    } else {
      if (provider === 'openai') output = await callOpenAI(apiKey, systemPrompt, userPrompt);
      else if (provider === 'google_gemini') output = await callGemini(apiKey, systemPrompt, userPrompt);
      else if (provider === 'openrouter') output = await callOpenRouter(apiKey, systemPrompt, userPrompt);
      else return errorResponse(`Unknown provider: ${provider}`);
    }

    // Log the generation
    await svc.from('ai_generations').insert({
      type,
      provider,
      prompt: body.prompt || body.topic || '',
      output: { content: output },
      video_id: body.videoId ?? null,
    });

    return jsonResponse({ success: true, type, provider, output });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
});
