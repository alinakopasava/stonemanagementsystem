import type { Product } from '@domain/entities/product';

export const products: Product[] = [
  {
    id: 'prod-countertop-premium',
    name: 'Premium Countertop',
    description: 'A custom kitchen or bathroom countertop made to exact dimensions.',
    basePrice: 1200,
    imageUrl:
      'https://images.unsplash.com/photo-1617098474202-0d0d7f60f6b7?auto=format&fit=crop&w=900&q=80'
  }
];
