import { apiFetch } from '@infrastructure/api/api-client';

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  base_price: number | string | null;
  image_url: string | null;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
}

const toProductItem = (row: ProductDto): ProductItem => ({
  id: row.id,
  name: row.name,
  description: row.description,
  basePrice: Number(row.base_price ?? 0),
  imageUrl: row.image_url ?? ''
});

export const fetchProducts = async (): Promise<ProductItem[]> => {
  const payload = await apiFetch<{ data: ProductDto[] }>('/api/products');
  return payload.data.map(toProductItem);
};
