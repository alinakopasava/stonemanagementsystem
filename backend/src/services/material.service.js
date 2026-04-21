import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Public, anonymous client. Materials/products have a public SELECT policy,
// so we deliberately do NOT use the service role here.
const supabasePublic = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const getMaterials = async () => {
  const { data, error } = await supabasePublic
    .from('materials')
    .select('id, name, category, price_per_m2, stock_status, image_url')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  return data ?? [];
};
