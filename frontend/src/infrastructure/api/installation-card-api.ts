import { apiFetch } from '@infrastructure/api/api-client';

export interface InstallationOrderDetail {
  id: string;
  dimensions: string | null;
  inscription_text: string | null;
  finish_type: string | null;
  materials: {
    id: string;
    name: string;
    category: string | null;
  } | null;
}

export interface InstallationCard {
  id: string;
  orderId: string;
  status: string;
  installationAddress: string | null;
  deadline: string | null;
  clientFullName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orderDetails: InstallationOrderDetail[];
}

export const fetchInstallationCards = () =>
  apiFetch<{ data: InstallationCard[] }>('/api/installation-cards').then(
    (response) => response.data
  );
