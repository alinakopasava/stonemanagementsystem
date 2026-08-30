import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';

/**
 * What counts as an image, shared by both upload paths.
 *
 * The installer's site photograph and the customer's portrait arrive the same
 * way — raw bytes with a caller-supplied Content-Type — so they get the same
 * answer to the same question. Keeping one copy means a format accepted in one
 * bucket cannot quietly be refused in the other.
 */

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Accepted image types and how each one starts on disk.
 *
 * The declared Content-Type is caller-supplied, so it decides nothing on its
 * own: the first bytes have to agree with it, or a script renamed to .jpg
 * would land in the bucket wearing an image label.
 */
const IMAGE_TYPES = [
  { mime: 'image/jpeg', ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }
];

const startsWith = (buffer, magic) =>
  buffer.length >= magic.length && magic.every((byte, i) => buffer[i] === byte);

/**
 * Checks an uploaded body and returns the type it really is.
 *
 * Throws rather than returning null: every caller would otherwise write the
 * same three rejections, and one of them would eventually word it differently.
 */
export const assertUploadedImage = ({ body, contentType }) => {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new PublicError('No photo was uploaded.');
  }
  if (body.length > MAX_PHOTO_BYTES) {
    throw new PublicError('Photo is too large.', 413);
  }

  const declared = String(contentType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const type = IMAGE_TYPES.find((candidate) => candidate.mime === declared);
  if (!type || !startsWith(body, type.magic)) {
    throw new PublicError('Only JPEG, PNG and WebP photos are accepted.');
  }

  return type;
};

/**
 * A short-lived link to one stored image.
 *
 * Both buckets are private, so a path is not fetchable on its own: a link is
 * minted per read and dies within the hour. Storing the link in the table
 * instead would fill it with strings that stop working before the day is out,
 * and one pasted into a chat would be a permanent public window onto a
 * customer's grave.
 */
export const signStoredImage = async (bucket, path) => {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
};

/**
 * Uploads an image, records it, and leaves nothing behind if that fails.
 *
 * A bucket write and a table write cannot be one transaction, so the order
 * matters and so does the cleanup. `save` runs after the object is in the
 * bucket and returns whatever the caller wants back; if it throws, the object
 * just uploaded is an orphan nothing points at, and it goes back out rather
 * than paying for storage forever. Only once the row is safely updated does
 * the file it used to point at get removed.
 *
 * The uploads themselves go out with the service role because no browser may
 * write to Storage directly. Whether the caller is entitled to touch this row
 * at all is settled before we get here, through their own RLS-bound client.
 */
export const storeImageWithRollback = async ({ bucket, path, body, type, previousPath, save }) => {
  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, body, { contentType: type.mime, upsert: false });
  if (uploadError) {
    throw new Error('Failed to store the photo.');
  }

  let saved;
  try {
    saved = await save(path);
  } catch (error) {
    await supabaseAdmin.storage.from(bucket).remove([path]);
    throw error;
  }

  if (previousPath && previousPath !== path) {
    await supabaseAdmin.storage.from(bucket).remove([previousPath]);
  }

  return saved;
};
