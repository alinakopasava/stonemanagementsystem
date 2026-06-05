import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const supabasePublic = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const getProducts = async () => {
  const { data, error } = await supabasePublic
    .from('products')
    .select('id, name, description, base_price, image_url')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data ?? [];
};
