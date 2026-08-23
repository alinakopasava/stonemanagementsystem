import { supabaseAdmin } from '../config/supabase.js';

export const writeAuditLog = async ({
  actorId = null,
  action,
  entity = null,
  entityId = null,
  ip = null,
  userAgent = null,
  metadata = {}
}) => {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      ip,
      user_agent: userAgent,
      metadata
    });
    if (error) {
      console.error('[audit] Failed to write log:', error.message);
    }
  } catch (error) {
    console.error('[audit] Failed to write log:', error);
  }
};
