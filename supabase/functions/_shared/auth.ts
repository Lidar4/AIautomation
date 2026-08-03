// Shared admin authorization helper for edge functions.
// Verifies the caller is an authenticated admin by checking app_config.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export interface AdminContext {
  supabase: ReturnType<typeof createClient>;
  adminEmail: string;
  adminUid: string;
}

/**
 * Creates a Supabase client scoped to the caller's auth token and verifies
 * the caller is the configured admin. Throws on failure.
 */
export async function requireAdmin(req: Request): Promise<AdminContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Invalid or expired session');

  const { data: config, error: configError } = await supabase
    .from('app_config')
    .select('admin_created, admin_email')
    .limit(1)
    .maybeSingle();

  if (configError) throw new Error('Unable to read platform configuration');
  if (!config || !config.admin_created) throw new Error('Admin account not configured');
  if (config.admin_email !== userData.user.email) throw new Error('Not authorized as admin');

  return { supabase, adminEmail: userData.user.email!, adminUid: userData.user.id };
}

/**
 * Creates a service-role client with full access (bypasses RLS). Use only for
 * operations that require reading encrypted API keys or privileged writes.
 */
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}
