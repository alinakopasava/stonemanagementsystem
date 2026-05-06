import { supabaseAdmin } from '../config/supabase.js';

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 200;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 4000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimOrEmpty = (value) => (typeof value === 'string' ? value.trim() : '');

const requireField = (value, fieldName) => {
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
};

const enforceMaxLength = (value, fieldName, maxLength) => {
  if (value.length > maxLength) {
    throw new Error(`Field "${fieldName}" exceeds max length of ${maxLength}.`);
  }
};

export const submitContactMessage = async ({ payload }) => {
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
    throw new Error('Invalid email address.');
  }

  // Service-role insert: bypasses RLS so anonymous visitors can submit
  // without needing a permissive anon INSERT policy. The endpoint is the
  // only public ingress point, validated above.
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
    throw new Error(`Failed to save contact message: ${error.message}`);
  }

  return { id: data.id, receivedAt: data.created_at };
};

export const listContactMessages = async ({ status } = {}) => {
  let query = supabaseAdmin
    .from('contact_messages')
    .select('id, name, email, phone, message, status, created_at, read_at, read_by')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list contact messages: ${error.message}`);
  }

  return data ?? [];
};

const ALLOWED_STATUSES = new Set(['new', 'read', 'archived']);

export const updateContactMessageStatus = async ({ id, status, actorUserId }) => {
  if (!id) {
    throw new Error('Missing contact message id.');
  }
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const isMarkingRead = status === 'read';

  const { data, error } = await supabaseAdmin
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
    throw new Error(`Failed to update contact message: ${error.message}`);
  }

  return data;
};

export const deleteContactMessage = async ({ id }) => {
  if (!id) {
    throw new Error('Missing contact message id.');
  }

  const { error } = await supabaseAdmin
    .from('contact_messages')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete contact message: ${error.message}`);
  }

  return { id };
};
