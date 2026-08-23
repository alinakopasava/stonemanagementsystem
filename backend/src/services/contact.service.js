import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { writeAuditLog } from './audit.service.js';

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 200;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 4000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimOrEmpty = (value) => (typeof value === 'string' ? value.trim() : '');

const requireField = (value, fieldName) => {
  if (!value) {
    throw new PublicError(`Missing required field: ${fieldName}.`);
  }
};

const enforceMaxLength = (value, fieldName, maxLength) => {
  if (value.length > maxLength) {
    throw new PublicError(`Field "${fieldName}" is too long.`);
  }
};

export const submitContactMessage = async ({ payload, ip, userAgent }) => {
  const name = trimOrEmpty(payload?.name);
  const email = trimOrEmpty(payload?.email);
  const phone = trimOrEmpty(payload?.phone);
  const message = trimOrEmpty(payload?.message);

  requireField(name, 'name');
  requireField(email, 'email');
  requireField(message, 'message');

  enforceMaxLength(name, 'name', MAX_NAME_LENGTH);
  enforceMaxLength(email, 'email', MAX_EMAIL_LENGTH);
  enforceMaxLength(phone, 'phone', MAX_PHONE_LENGTH);
  enforceMaxLength(message, 'message', MAX_MESSAGE_LENGTH);

  if (!EMAIL_PATTERN.test(email)) {
    throw new PublicError('Invalid email address.');
  }

  const { data, error } = await supabaseAdmin
    .from('contact_messages')
    .insert({
      name,
      email,
      phone: phone || null,
      message
    })
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error('Failed to save contact message.');
  }

  await writeAuditLog({
    action: 'contact.created',
    entity: 'contact_messages',
    entityId: data.id,
    ip,
    userAgent
  });

  return { id: data.id, receivedAt: data.created_at };
};

export const listContactMessages = async ({ supabase, status } = {}) => {
  let query = supabase
    .from('contact_messages')
    .select('id, name, email, phone, message, status, created_at, read_at, read_by')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to list contact messages.');
  }

  return data ?? [];
};

const ALLOWED_STATUSES = new Set(['new', 'read', 'archived']);

export const updateContactMessageStatus = async ({ supabase, id, status, actorUserId }) => {
  if (!id) {
    throw new PublicError('Missing contact message id.');
  }
  if (!ALLOWED_STATUSES.has(status)) {
    throw new PublicError('Invalid status.');
  }

  const isMarkingRead = status === 'read';

  const { data, error } = await supabase
    .from('contact_messages')
    .update({
      status,
      read_at: isMarkingRead ? new Date().toISOString() : null,
      read_by: isMarkingRead ? actorUserId : null
    })
    .eq('id', id)
    .select('id, status, read_at, read_by')
    .single();

  if (error) {
    throw new Error('Failed to update contact message.');
  }

  return data;
};

export const deleteContactMessage = async ({ supabase, id, actorUserId, ip, userAgent }) => {
  if (!id) {
    throw new PublicError('Missing contact message id.');
  }

  const { error } = await supabase.from('contact_messages').delete().eq('id', id);

  if (error) {
    throw new Error('Failed to delete contact message.');
  }

  await writeAuditLog({
    actorId: actorUserId,
    action: 'contact.deleted',
    entity: 'contact_messages',
    entityId: id,
    ip,
    userAgent
  });

  return { id };
};
