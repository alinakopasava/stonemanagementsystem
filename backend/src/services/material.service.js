import { supabasePublic } from '../config/supabase.js';

export const getMaterials = async () => {
  const { data, error } = await supabasePublic
    .from('materials')
    .select('id, name, category, price_per_m2, image_url')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  return data ?? [];
};
