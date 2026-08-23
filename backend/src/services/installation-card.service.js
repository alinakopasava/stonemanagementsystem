const INSTALLATION_ORDER_SELECT = `
  id,
  status,
  installation_address,
  deadline,
  client_full_name,
  created_at,
  updated_at,
  order_cards (
    order_details (
      id,
      dimensions,
      inscription_text,
      finish_type,
      materials ( id, name, category )
    )
  )
`;

/**
 * Read-only installation worklist backed by existing orders.
 * No installation-card rows are created or modified in this phase.
 */
export const listInstallationCards = async ({ supabase }) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(INSTALLATION_ORDER_SELECT)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to load installation cards.');
  }

  return (orders ?? []).map((order) => ({
    id: order.id,
    orderId: order.id,
    status: order.status ?? 'oczekujące',
    installationAddress: order.installation_address ?? null,
    deadline: order.deadline ?? null,
    clientFullName: order.client_full_name ?? null,
    createdAt: order.created_at ?? null,
    updatedAt: order.updated_at ?? null,
    orderDetails: order.order_cards?.order_details ?? []
  }));
};
