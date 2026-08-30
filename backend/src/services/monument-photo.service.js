import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { assertUuid } from '../http/ids.js';
import { assertUploadedImage, signStoredImage, storeImageWithRollback } from './image-upload.js';

export const MONUMENT_PHOTO_BUCKET = 'monument-photos';

/** Signs one stored portrait for reading. */
export const signMonumentPhoto = (path) => signStoredImage(MONUMENT_PHOTO_BUCKET, path);

/**
 * Attaches the portrait a customer configured to their own order card.
 *
 * The photograph is the one part of a portrait monument that
 * cannot be described in words, and until now it never left the browser: the
 * configurator read it into memory, cut the background out and projected it
 * onto the model, then dropped it on submit. The workshop was told "portrait"
 * and nothing else.
 *
 * Ownership is settled by reading the card through the caller's own client:
 * `order_cards_select_own_or_staff` returns nothing for somebody else's card,
 * so a stranger's id fails here rather than in the bucket. The upload itself
 * goes out with the service role, because no browser is allowed to write to
 * Storage directly.
 */
export const saveMonumentPhoto = async ({ supabase, orderCardId, body, contentType }) => {
  assertUuid(orderCardId, 'Invalid order card id.');

  // Checked before the upload, so a refused request leaves nothing behind in
  // the bucket.
  const type = assertUploadedImage({ body, contentType });

  const { data: card, error: cardError } = await supabase
    .from('order_cards')
    .select('id')
    .eq('id', orderCardId)
    .maybeSingle();
  if (cardError) {
    throw new Error('Failed to load the order card.');
  }
  if (!card) {
    throw new PublicError('Order card not found.');
  }

  const { data: detail, error: detailError } = await supabase
    .from('order_details')
    .select('id, photo_path')
    .eq('order_card_id', orderCardId)
    .maybeSingle();
  if (detailError) {
    throw new Error('Failed to load the configuration.');
  }
  if (!detail) {
    throw new PublicError('This order card has no configuration to attach a photo to.');
  }

  const path = await storeImageWithRollback({
    bucket: MONUMENT_PHOTO_BUCKET,
    path: `${orderCardId}/${randomUUID()}.${type.ext}`,
    body,
    type,
    previousPath: detail.photo_path,
    /*
     * Written with the service role, deliberately.
     *
     * `order_details_update_staff` lets only an admin or an installer update
     * this table, so the customer's own client would match no rows — and an
     * UPDATE that changes nothing is not an error in PostgREST, so the upload
     * would "succeed" while the path silently failed to land. Loosening that
     * policy is the wrong fix: a customer able to update their own details
     * could rewrite dimensions or inscription after the office had priced the
     * job.
     *
     * Ownership was already settled above, through the caller's own client,
     * and this write touches exactly one column of exactly one row.
     */
    save: async (uploaded) => {
      const { error: saveError } = await supabaseAdmin
        .from('order_details')
        .update({ photo_path: uploaded })
        .eq('id', detail.id);
      if (saveError) {
        throw new Error('Failed to store the photo.');
      }
      return uploaded;
    }
  });

  return { photoPath: path, photoUrl: await signMonumentPhoto(path) };
};
