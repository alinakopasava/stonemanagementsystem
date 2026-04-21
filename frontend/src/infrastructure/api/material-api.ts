import type { Material } from '@domain/entities/material';
import { apiFetch } from '@infrastructure/api/api-client';

interface MaterialRowDto {
  id: string;
  name: string;
  category: string | null;
  price_per_m2: number | string | null;
  stock_status: boolean | null;
  image_url: string | null;
}

const materialImageByName: Record<string, string> = {
  'Black Granite': '/images/black%20granite.png',
  Marble: '/images/marble.png',
  'Grey Granite': '/images/grey%20granite.png',
  'Labradorite Blue': '/images/premium.png'
};

const toMaterial = (row: MaterialRowDto): Material => ({
  id: row.id,
  name: row.name,
  category: row.category ?? 'Stone',
  pricePerM2: Number(row.price_per_m2 ?? 0),
  stockStatus: row.stock_status ?? true,
  imageUrl: row.image_url ?? materialImageByName[row.name] ?? '/images/premium.png'
});

export const fetchMaterials = async (): Promise<Material[]> => {
  const payload = await apiFetch<{ data: MaterialRowDto[] }>('/api/materials', { auth: false });
  return payload.data.map(toMaterial);
};
