import type { ReactNode } from 'react';

export interface DataField {
  label: string;
  /** `null` and `undefined` render as the placeholder — an empty field is data too. */
  value: ReactNode;
  /** Spans both columns; for long text such as contract notes or an inscription. */
  wide?: boolean;
  /** Rendered in the monospace face used elsewhere for identifiers. */
  mono?: boolean;
}

const isEmpty = (value: ReactNode) =>
  value === null || value === undefined || value === '' || value === '-' || value === '—';

/**
 * A definition list of everything known about one thing.
 *
 * Fields with no value are kept and marked rather than dropped: on an order,
 * "no deadline agreed yet" is what the office needs to see, and a row that
 * silently disappears reads as if the field did not exist.
 */
export const DataFields = ({
  fields,
  placeholder,
  className = ''
}: {
  fields: DataField[];
  placeholder: string;
  className?: string;
}) => (
  <dl className={`grid grid-cols-[minmax(88px,auto)_1fr] gap-x-3 gap-y-1 text-xs ${className}`}>
    {fields.map((field) => (
      <div key={field.label} className={field.wide ? 'col-span-2' : 'contents'}>
        {field.wide ? (
          <>
            <dt className="text-ink-3">{field.label}</dt>
            <dd
              className={`mt-0.5 whitespace-pre-wrap ${
                isEmpty(field.value) ? 'italic text-ink-3' : 'text-ink-2'
              }`}
            >
              {isEmpty(field.value) ? placeholder : field.value}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-ink-3">{field.label}</dt>
            <dd
              className={`${field.mono ? 'font-mono ' : ''}${
                isEmpty(field.value) ? 'italic text-ink-3' : 'text-ink-2'
              }`}
            >
              {isEmpty(field.value) ? placeholder : field.value}
            </dd>
          </>
        )}
      </div>
    ))}
  </dl>
);

/** Titled panel grouping one set of fields inside a card. */
export const DataSection = ({
  title,
  children,
  className = ''
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`border border-line bg-canvas p-3 ${className}`}>
    <h3 className="mb-2 text-[10px] uppercase tracking-wider text-ink-3">{title}</h3>
    {children}
  </section>
);
