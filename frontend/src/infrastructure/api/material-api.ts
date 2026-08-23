import type { Material } from '@domain/entities/material';
import { apiFetch } from '@infrastructure/api/api-client';
import {
  DEFAULT_MATERIAL_IMAGE,
  MATERIAL_IMAGE_BY_NAME
} from '@presentation/three/stone-catalog';

interface MaterialRowDto {
  id: string;
  name: string;
  category: string | null;
  price_per_m2: number | string | null;
  stock_status: boolean | null;
  image_url: string | null;
}

const toMaterial = (row: MaterialRowDto): Material => ({
  id: row.id,
  name: row.name,
  category: row.category ?? 'Stone',
  pricePerM2: Number(row.price_per_m2 ?? 0),
  stockStatus: row.stock_status ?? true,
  imageUrl: row.image_url ?? MATERIAL_IMAGE_BY_NAME[row.name] ?? DEFAULT_MATERIAL_IMAGE
});

export const fetchMaterials = async (): Promise<Material[]> => {
  const payload = await apiFetch<{ data: MaterialRowDto[] }>('/api/materials');
  return payload.data.map(toMaterial);
};
