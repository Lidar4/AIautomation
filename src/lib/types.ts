export interface ApiKey {
  id: string;
  provider: string;
  enabled: boolean;
  status: string;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  metadata: Record<string, unknown>;
  key_preview: string;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  type: 'video' | 'image' | 'audio' | 'thumbnail';
  title: string;
  file_path: string;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  hashtags: string[];
  status: 'draft' | 'ready' | 'queued' | 'uploading' | 'uploaded' | 'failed' | 'scheduled';
  media_id: string | null;
  thumbnail_media_id: string | null;
  privacy_status: 'public' | 'unlisted' | 'private';
  youtube_video_id: string | null;
  scheduled_at: string | null;
  uploaded_at: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTask {
  id: string;
  type: 'upload' | 'ai_generate' | 'trending_fetch' | 'youtube_connect' | 'test_connection';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  video_id: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AiGeneration {
  id: string;
  type: 'script' | 'title' | 'description' | 'hashtag' | 'tag' | 'thumbnail' | 'voice' | 'video';
  provider: string | null;
  prompt: string | null;
  output: Record<string, unknown>;
  video_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TrendingSearch {
  id: string;
  query: string | null;
  country: string;
  language: string;
  audience: string | null;
  results: { topicIdeas: string[]; trendingVideos: unknown[] };
  created_at: string;
}

export interface AppConfig {
  id: string;
  admin_created: boolean;
  admin_email: string | null;
  youtube_connected: boolean;
  youtube_channel_id: string | null;
  youtube_channel_title: string | null;
}

export const API_PROVIDER_GROUPS = [
  {
    label: 'AI APIs',
    providers: [
      { id: 'openai', label: 'OpenAI API Key', description: 'GPT-4, DALL-E, and text generation' },
      { id: 'google_gemini', label: 'Google Gemini API Key', description: 'Gemini Pro text and multimodal' },
      { id: 'openrouter', label: 'OpenRouter API Key', description: 'Access multiple AI models' },
    ],
  },
  {
    label: 'Video / Voice APIs',
    providers: [
      { id: 'elevenlabs', label: 'ElevenLabs API Key', description: 'AI voice generation' },
      { id: 'video_generation', label: 'Video Generation API', description: 'AI video generation service' },
      { id: 'image_generation', label: 'Image Generation API', description: 'AI thumbnail and image generation' },
    ],
  },
  {
    label: 'YouTube',
    providers: [
      { id: 'youtube_data_api', label: 'YouTube Data API v3', description: 'Video metadata and trending data' },
      { id: 'youtube_oauth_client_id', label: 'YouTube OAuth Client ID', description: 'For channel connection' },
      { id: 'youtube_oauth_client_secret', label: 'YouTube OAuth Client Secret', description: 'For channel connection' },
    ],
  },
  {
    label: 'Social',
    providers: [
      { id: 'facebook_api', label: 'Facebook API', description: 'Facebook page integration' },
      { id: 'instagram_api', label: 'Instagram API', description: 'Instagram account integration' },
    ],
  },
  {
    label: 'Storage',
    providers: [
      { id: 'cloudinary', label: 'Cloudinary', description: 'Media storage and CDN' },
      { id: 'supabase_config', label: 'Supabase Configuration', description: 'Additional Supabase project config' },
    ],
  },
] as const;
