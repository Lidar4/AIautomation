// Trending topic finder edge function.
// Uses the configured AI provider to generate trending topic ideas for a given
// country, language, and audience. Falls back to a structured prompt if no
// YouTube Data API key is available.

import { requireAdmin, serviceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

const COUNTRY_MAP: Record<string, string> = {
  USA: 'US', UK: 'GB', Canada: 'CA', Australia: 'AU', Global: '',
};

interface TrendRequest {
  country?: 'USA' | 'UK' | 'Canada' | 'Australia' | 'Global';
  language?: string;
  audience?: string;
  niche?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    await requireAdmin(req);
    const svc = serviceClient();
    const body: TrendRequest = await req.json();
    const country = body.country ?? 'Global';
    const language = body.language ?? 'en';
    const audience = body.audience ?? 'general';
    const niche = body.niche ?? '';

    // Try YouTube Data API for trending videos
    const { data: ytKey } = await svc.from('api_keys')
      .select('key_value, enabled').eq('provider', 'youtube_data_api').maybeSingle();

    let trendingVideos: unknown[] = [];
    if (ytKey?.enabled && ytKey.key_value) {
      const regionCode = COUNTRY_MAP[country] ?? '';
      const params = new URLSearchParams({
        part: 'snippet,statistics',
        chart: 'mostPopular',
        maxResults: '10',
        regionCode: regionCode || 'US',
        videoCategoryId: '0',
        key: ytKey.key_value,
      });
      if (language) params.set('hl', language);
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
      if (res.ok) {
        const data = await res.json();
        trendingVideos = (data.items ?? []).map((item: any) => ({
          title: item.snippet?.title,
          channel: item.snippet?.channelTitle,
          views: item.statistics?.viewCount,
          likes: item.statistics?.likeCount,
          thumbnail: item.snippet?.thumbnails?.high?.url,
          publishedAt: item.snippet?.publishedAt,
        }));
      }
    }

    // Use AI to generate topic ideas
    const { data: aiKey } = await svc.from('api_keys')
      .select('key_value, enabled, provider')
      .or('provider.eq.openai,provider.eq.google_gemini,provider.eq.openrouter')
      .eq('enabled', true)
      .limit(1)
      .maybeSingle();

    let topicIdeas: string[] = [];
    if (aiKey?.enabled && aiKey.key_value) {
      const prompt = `Generate 15 trending YouTube video topic ideas${niche ? ` in the ${niche} niche` : ''} for a ${audience} audience in ${country} (${language}). Return only the topic titles, one per line.`;
      let aiOutput = '';
      if (aiKey.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiKey.key_value}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiOutput = data.choices?.[0]?.message?.content ?? '';
        }
      } else if (aiKey.provider === 'google_gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKey.key_value}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (res.ok) {
          const data = await res.json();
          aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        }
      }
      topicIdeas = aiOutput.split('\n').map((s: string) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
    }

    // Save the search
    await svc.from('trending_searches').insert({
      query: niche || null,
      country,
      language,
      audience,
      results: { topicIdeas, trendingVideos },
    });

    return jsonResponse({ success: true, country, language, audience, topicIdeas, trendingVideos });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
});
