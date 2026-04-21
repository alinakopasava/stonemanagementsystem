import type { FinishType, OrderCardDraft } from '@domain/entities/order-card';
import type { Material } from '@domain/entities/material';
import type { Product } from '@domain/entities/product';

interface BuildOrderCardPayloadInput {
  userId: string;
  product: Product;
  material: Material;
  inscriptionText: string;
  finishType: FinishType;
  dimensions: string;
}

export const buildOrderCardPayload = (
  input: BuildOrderCardPayloadInput
): OrderCardDraft => {
  const [lengthCm, widthCm] = input.dimensions
    .toLowerCase()
    .split('x')
    .map((value) => Number(value.trim()));

  const hasValidDimensions = Number.isFinite(lengthCm) && Number.isFinite(widthCm);
  const areaM2 = hasValidDimensions ? Number(((lengthCm / 100) * (widthCm / 100)).toFixed(3)) : 0;
  const estimatedPrice = Number((areaM2 * input.material.pricePerM2 + input.product.basePrice).toFixed(2));

  return {
    userId: input.userId,
    status: 'oczekujące',
    rawConfigData: {
      productId: input.product.id,
      materialId: input.material.id,
      inscriptionText: input.inscriptionText,
      finishType: input.finishType,
      dimensions: input.dimensions,
      estimatedAreaM2: areaM2,
      estimatedPrice,
      createdAt: new Date().toISOString()
    }
  };
};
