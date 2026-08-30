import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { assertUuid } from '../http/ids.js';
import { MONUMENT_PHOTO_BUCKET } from './monument-photo.service.js';

/**
 * The work sheet the office sends to the workshop, as a PDF file.
 *
 * The stonemason has no account — by design, see the stakeholder card — so the
 * sheet is how the job reaches them: attached to an e-mail, or printed at the
 * bench. That is why this is a real file rather than a print dialog. A browser
 * cannot write a PDF to disk on its own, so the document is drawn here.
 *
 * It carries the parameters of the stone and nothing else. No customer, no
 * price, no deadline, no address — cutting granite needs none of them, and a
 * sheet that travels outside the office must not carry the customer with it.
 * The order number is the one identifier on it, which is enough to match the
 * finished stone back to its job. The name of the deceased appears only where
 * it belongs: inside the inscription that gets cut.
 */

/**
 * One face for the whole document.
 *
 * Literata carries Latin, Latin Extended-A and Cyrillic, so a Polish
 * inscription and a Russian one come out of the same file — which is the whole
 * reason the storefront picked these faces in the first place. Weight is
 * uniform; size and capitals carry the hierarchy instead.
 *
 * The file is copied into the backend rather than read out of the frontend's
 * public directory, so the API stays deployable on its own.
 */
const FONT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'literata-600.woff');

/**
 * Labels, in the language the office is working in.
 *
 * Every value in the right-hand column starts with a capital — the yes/no
 * answers included. Mixed case down a column of parameters reads as if some
 * rows were filled in by a different hand.
 *
 * They live here rather than in the frontend dictionary because the document is
 * drawn on the server: shipping translated strings up from the browser would
 * mean trusting the caller with what the sheet says.
 */
const LABELS = {
  pl: {
    title: 'Karta pracy — warsztat',
    order: 'Zamówienie',
    material: 'Materiał',
    shape: 'Kształt',
    dimensions: 'Wymiary (cm)',
    finish: 'Wykończenie',
    base: 'Cokół wys./szer./gł. (cm)',
    slab: 'Płyta',
    slabThickness: 'Grubość płyty (cm)',
    decoration: 'Dekoracja',
    cross: 'Krzyż na tablicy',
    flowerbed: 'Kwietnik',
    inscriptionStyle: 'Krój liter',
    inscription: 'Inskrypcja — wykuć dokładnie jak zapisano',
    photo: 'Portret do wygrawerowania',
    photoElsewhere: 'Portret dostępny w panelu — format nieobsługiwany w pliku PDF.',
    position: 'Pozycja',
    noDetails: 'To zamówienie nie ma zapisanej konfiguracji.',
    notProvided: 'Brak danych',
    printedAt: 'Wygenerowano',
    yes: 'Tak',
    no: 'Nie',
    values: {
      classic: 'Klasyczny',
      rounded: 'Zaokrąglony',
      stele: 'Stela nowoczesna',
      roman: 'Rzymski',
      elegant: 'Elegancki',
      script: 'Kaligraficzny',
      gothic: 'Gotycki',
      none: 'Brak',
      half: 'Połowa',
      full: 'Pełna',
      portrait: 'Portret',
      cross: 'Krzyż',
      Polished: 'Polerowane',
      Matte: 'Matowe',
      Honed: 'Szlifowane'
    }
  },
  en: {
    title: 'Work sheet — workshop',
    order: 'Order',
    material: 'Material',
    shape: 'Shape',
    dimensions: 'Dimensions (cm)',
    finish: 'Finish',
    base: 'Base h/w/d (cm)',
    slab: 'Slab',
    slabThickness: 'Slab thickness (cm)',
    decoration: 'Decoration',
    cross: 'Cross on the stela',
    flowerbed: 'Flowerbed',
    inscriptionStyle: 'Lettering',
    inscription: 'Inscription — cut exactly as written',
    photo: 'Portrait to engrave',
    photoElsewhere: 'Portrait available in the panel — format not supported in PDF.',
    position: 'Item',
    noDetails: 'This order carries no configuration details.',
    notProvided: 'Not provided',
    printedAt: 'Generated',
    yes: 'Yes',
    no: 'No',
    values: {
      classic: 'Classic',
      rounded: 'Rounded',
      stele: 'Modern stele',
      roman: 'Roman',
      elegant: 'Elegant',
      script: 'Script',
      gothic: 'Gothic',
      none: 'None',
      half: 'Half',
      full: 'Full',
      portrait: 'Portrait',
      cross: 'Cross',
      Polished: 'Polished',
      Matte: 'Matte',
      Honed: 'Honed'
    }
  },
  ru: {
    title: 'Рабочая карта — цех',
    order: 'Заказ',
    material: 'Материал',
    shape: 'Форма',
    dimensions: 'Размеры (см)',
    finish: 'Обработка',
    base: 'Цоколь в/ш/г (см)',
    slab: 'Плита',
    slabThickness: 'Толщина плиты (см)',
    decoration: 'Декор',
    cross: 'Крест на стеле',
    flowerbed: 'Цветник',
    inscriptionStyle: 'Начертание',
    inscription: 'Надпись — высечь точно как записано',
    photo: 'Портрет для гравировки',
    photoElsewhere: 'Портрет доступен в панели — формат не поддерживается в PDF.',
    position: 'Позиция',
    noDetails: 'У этого заказа нет сохранённой конфигурации.',
    notProvided: 'Нет данных',
    printedAt: 'Сформировано',
    yes: 'Да',
    no: 'Нет',
    values: {
      classic: 'Классическая',
      rounded: 'Скруглённая',
      stele: 'Современная стела',
      roman: 'Римский',
      elegant: 'Элегантный',
      script: 'Каллиграфический',
      gothic: 'Готический',
      none: 'Нет',
      half: 'Половина',
      full: 'Полная',
      portrait: 'Портрет',
      cross: 'Крест',
      Polished: 'Полированная',
      Matte: 'Матовая',
      Honed: 'Шлифованная'
    }
  }
};

const ORDER_SELECT = `
  id,
  order_cards (
    order_details (
      id,
      dimensions,
      inscription_text,
      finish_type,
      shape,
      inscription_style,
      slab_variant,
      slab_thickness_cm,
      base_height_cm,
      base_width_cm,
      base_depth_cm,
      decoration,
      has_cross,
      has_flowerbed,
      photo_path,
      materials ( name )
    )
  )
`;

/** pdfkit embeds JPEG and PNG. A WebP portrait is named rather than dropped. */
const EMBEDDABLE = /\.(png|jpe?g)$/i;

const loadPhoto = async (path) => {
  if (!path || !EMBEDDABLE.test(path)) return null;
  const { data, error } = await supabaseAdmin.storage.from(MONUMENT_PHOTO_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
};

/**
 * Draws the document and resolves with the finished bytes.
 *
 * Buffered rather than streamed to the response: the file is a few dozen
 * kilobytes, and holding it means a failure halfway through drawing can still
 * answer with an error status instead of a truncated download.
 */
const renderPdf = async ({ order, details, photos, labels }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: labels.title } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.font(FONT_PATH);
  doc.fontSize(16).text(labels.title.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.3);
  doc.fontSize(11).text(`${labels.order} #${order.id.slice(0, 8)}`);
  doc.moveDown(0.5);
  doc
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.8);

  if (details.length === 0) {
    doc.fontSize(11).text(labels.noDetails);
  }

  details.forEach((detail, index) => {
    if (details.length > 1) {
      doc.fontSize(11).text(`${labels.position} ${index + 1}`.toUpperCase());
      doc.moveDown(0.4);
    }

    for (const [label, value] of parameters(detail, labels)) {
      parameterRow(doc, label, value);
    }

    doc.moveDown(0.4);
    inscriptionBox(doc, labels.inscription, detail.inscription_text || labels.notProvided);

    const photo = photos.get(detail.id);
    let embedded = false;
    if (photo) {
      doc.moveDown(0.6);
      doc.fontSize(8).fillColor('#444').text(labels.photo.toUpperCase(), { characterSpacing: 0.6 });
      doc.moveDown(0.3);
      try {
        doc.image(photo, { fit: [170, 226] });
        embedded = true;
      } catch {
        // A file the encoder cannot read costs the portrait, not the sheet:
        // the workshop still gets every measurement and both inscriptions.
        doc.fontSize(9).fillColor('#444').text(labels.photoElsewhere);
        embedded = true;
      }
    }
    if (!embedded && detail.photo_path) {
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor('#444').text(labels.photoElsewhere);
    }

    doc.moveDown(0.8);
  });

  doc
    .fontSize(8)
    .fillColor('#666')
    .text(`${labels.printedAt} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, {
      align: 'left'
    });

  doc.end();
  return finished;
};

/**
 * One parameter, label and value side by side.
 *
 * Stacked rows ran the sheet onto a second page, and a second page is a page
 * that gets left behind at the bench. Two columns fit a full configuration —
 * fourteen parameters and two inscriptions — onto one sheet of A4.
 */
const parameterRow = (doc, label, value) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const labelWidth = 170;
  const top = doc.y;

  doc.fontSize(8).fillColor('#444');
  const labelHeight = doc.heightOfString(label.toUpperCase(), {
    width: labelWidth - 12,
    characterSpacing: 0.6
  });
  doc.text(label.toUpperCase(), left, top + 3, {
    width: labelWidth - 12,
    characterSpacing: 0.6
  });

  doc.fontSize(11).fillColor('#000');
  const valueHeight = doc.heightOfString(value, { width: width - labelWidth });
  doc.text(value, left + labelWidth, top, { width: width - labelWidth });

  doc.x = left;
  doc.y = top + Math.max(labelHeight + 3, valueHeight) + 5;
};

/**
 * The inscription, framed and reproduced verbatim.
 *
 * Line breaks are kept: the workshop cuts exactly what stands here, so
 * reflowing the text would be a defect rather than a layout choice.
 */
const inscriptionBox = (doc, heading, text) => {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const padding = 10;
  const inner = width - padding * 2;

  /*
   * Measured at the sizes the two parts are actually drawn at.
   *
   * Measuring the inscription while the heading's 8pt was still current gave a
   * box a third of the height it needed, and the words ran out through the
   * bottom of their own frame.
   */
  doc.fontSize(8);
  const headingHeight = doc.heightOfString(heading.toUpperCase(), {
    width,
    characterSpacing: 0.6
  });

  doc.fontSize(14);
  const textHeight = doc.heightOfString(text, { width: inner, lineGap: 4 });
  const boxHeight = textHeight + padding * 2;

  // The heading travels with its frame. A page ending on the word INSCRIPTION
  // with the words themselves overleaf is how a workshop cuts the wrong text.
  if (doc.y + headingHeight + boxHeight + 6 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  doc.fontSize(8).fillColor('#444').text(heading.toUpperCase(), left, doc.y, {
    width,
    characterSpacing: 0.6
  });
  doc.moveDown(0.3);

  const top = doc.y;
  doc.rect(left, top, width, boxHeight).lineWidth(0.8).strokeColor('#000').stroke();
  doc.fontSize(14).fillColor('#000').text(text, left + padding, top + padding, {
    width: inner,
    lineGap: 4
  });

  doc.x = left;
  doc.y = top + boxHeight;
  doc.moveDown(0.5);
};

/** Rows with nothing to say are dropped: a sheet of dashes reads as an error. */
const parameters = (detail, labels) => {
  const value = (raw) => (raw ? (labels.values[raw] ?? raw) : null);
  const measure = (raw) =>
    raw === null || raw === undefined || raw === '' ? null : String(raw);
  const flag = (raw) => (raw === null || raw === undefined ? null : raw ? labels.yes : labels.no);

  const base = [detail.base_height_cm, detail.base_width_cm, detail.base_depth_cm].map(measure);

  return [
    [labels.material, detail.materials?.name ?? null],
    [labels.shape, value(detail.shape)],
    [labels.dimensions, detail.dimensions],
    [labels.finish, value(detail.finish_type)],
    [labels.base, base.every(Boolean) ? base.join(' / ') : null],
    [labels.slab, value(detail.slab_variant)],
    [labels.slabThickness, measure(detail.slab_thickness_cm)],
    [labels.decoration, value(detail.decoration)],
    [labels.cross, flag(detail.has_cross)],
    [labels.flowerbed, flag(detail.has_flowerbed)],
    [labels.inscriptionStyle, value(detail.inscription_style)]
  ].filter(([, entry]) => Boolean(entry));
};

export const buildWorkSheetPdf = async ({ supabase, orderId, language }) => {
  assertUuid(orderId, 'Invalid order id.');

  const { data: order, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle();
  if (error) {
    throw new Error('Failed to load the order.');
  }
  if (!order) {
    throw new PublicError('Order not found.', 404);
  }

  const details = order.order_cards?.order_details ?? [];
  const photos = new Map();
  for (const detail of details) {
    const photo = await loadPhoto(detail.photo_path);
    if (photo) photos.set(detail.id, photo);
  }

  const labels = LABELS[language] ?? LABELS.pl;
  const bytes = await renderPdf({ order, details, photos, labels });

  return { bytes, filename: `karta-pracy-${order.id.slice(0, 8)}.pdf` };
};
