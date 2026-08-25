import { supabasePublic } from '../config/supabase.js';

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
