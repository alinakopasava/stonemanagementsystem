export type FinishType = 'Polished' | 'Matte' | 'Honed';

export interface RawConfigData {
  productId: string;
  materialId: string;
  inscriptionText: string;
  finishType: FinishType;
  dimensions: string;
  estimatedAreaM2: number;
  estimatedPrice: number;
  createdAt: string;
}

export interface OrderCardDraft {
  userId: string;
  rawConfigData: RawConfigData;
  status: 'oczekujące';
}
