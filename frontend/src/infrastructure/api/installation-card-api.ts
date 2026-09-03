import { apiFetch } from '@infrastructure/api/api-client';

export interface InstallationOrderDetail {
  id: string;
  material_id: string | null;
  dimensions: string | null;
  inscription_text: string | null;
  finish_type: string | null;
  materials: {
    id: string;
    name: string;
    category: string | null;
    price_per_m2: number | string | null;
  } | null;
}

/** What the crew recorded on site — one row per order, absent until first saved. */
export interface InstallationReport {
  id: string;
  status: string | null;
  /** Object path in the private bucket — stable, but not fetchable on its own. */
  photoPath: string | null;
  /** Signed link to that object, good for an hour. Regenerated on every read. */
  photoUrl: string | null;
  workerComments: string | null;
  completionTimestamp: string | null;
}

export interface InstallationReportInput {
  status: string;
  workerComments?: string;
}

export interface InstallationCard {
  id: string;
  orderId: string;
  orderCardId: string | null;
  status: string;

  installationAddress: string | null;
  contractDetails: string | null;
  deadline: string | null;
  clientFullName: string | null;
  createdAt: string | null;
  /** When the customer submitted the configuration. */
  submittedAt: string | null;
  updatedAt: string | null;
  /** Registration details, so the crew can reach the customer. No documents. */
  client: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    email: string | null;
  };
  report: InstallationReport | null;
  orderDetails: InstallationOrderDetail[];
}

export const fetchInstallationCards = () =>
  apiFetch<{ data: InstallationCard[] }>('/api/installation-cards').then(
    (response) => response.data
  );

export const saveInstallationReport = (orderId: string, input: InstallationReportInput) =>
  apiFetch<{ data: InstallationReport }>(`/api/installation-cards/${orderId}/report`, {
    method: 'PUT',
    body: input
  }).then((response) => response.data);

/**
 * Sends the photograph itself, as raw bytes with its own media type.
 *
 * `apiFetch` serialises everything as JSON, so the upload goes through `fetch`
 * directly — a base64 detour would inflate the file by a third and run into
 * the API's 100 kB JSON limit.
 */
export const uploadInstallationPhoto = async (orderId: string, file: File) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL ?? ''}/api/installation-cards/${orderId}/photo`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': file.type },
      body: file
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | { data?: InstallationReport; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Upload failed (${response.status})`);
  }
  return payload!.data as InstallationReport;
};
