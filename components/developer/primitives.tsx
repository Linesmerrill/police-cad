'use client';

/**
 * The console's small parts, in one place so no page grows its own version.
 *
 * The styles all live in ConsoleShell; these components only decide structure
 * and behaviour. Anything with a rule attached to it, a notice that has to
 * clear itself, a dialog that has to lock the page behind it, a number that has
 * to be formatted the same way everywhere, is here rather than inline, because
 * a rule copied into six pages is a rule that holds in five of them.
 */

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ---- text and numbers ----

/** One formatter, so 100000 is never "100000" on one page and "100k" on another. */
export function num(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * A date in the reader's own timezone.
 *
 * The API reports in UTC, which is when the counters actually roll over. The
 * reader lives somewhere; "resets at 00:00 UTC" asked them to do the
 * arithmetic, and about half of them got it wrong.
 */
export function localTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function localDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3 days ago", or an empty string for never. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const seconds = Math.round((Date.now() - when.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? '' : 's'} ago`;
  return localDate(iso);
}

// ---- layout ----

export function PageHead({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="dc-head">
      <div style={{ minWidth: 0 }}>
        <h1 className="dc-h1">{title}</h1>
        {lede ? <p className="dc-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="dc-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  tight,
  danger,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
  danger?: boolean;
}) {
  const className = ['dc-card', tight ? 'dc-card-tight' : '', danger ? 'dc-danger' : '']
    .filter(Boolean)
    .join(' ');
  if (!title) return <section className={className}>{children}</section>;
  if (tight) {
    return (
      <section className={className}>
        <div className="dc-card-head">
          <h2 className="dc-h2">{title}</h2>
          {actions}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section className={className}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.9rem',
        }}
      >
        <h2 className="dc-h2" style={{ margin: 0 }}>
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone,
  percent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'accent' | 'warn';
  /** When given, a limit bar under the value. */
  percent?: number;
}) {
  const toneClass = tone === 'accent' ? ' dc-stat-accent' : tone === 'warn' ? ' dc-stat-warn' : '';
  const clamped = typeof percent === 'number' ? Math.max(0, Math.min(100, percent)) : null;
  const fillClass =
    clamped === null ? '' : clamped >= 100 ? ' is-full' : clamped >= 80 ? ' is-high' : '';
  return (
    <div className={`dc-stat${toneClass}`}>
      <p className="dc-stat-label">{label}</p>
      <div className="dc-stat-value">{value}</div>
      {sub ? <p className="dc-stat-sub">{sub}</p> : null}
      {clamped !== null ? (
        <div
          className="dc-meter"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${clamped}% of the limit`}
        >
          <div className={`dc-meter-fill${fillClass}`} style={{ width: `${clamped}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="dc-empty">
      <p className="dc-empty-title">{title}</p>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Loading({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="dc-card" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="dc-skeleton"
          style={{ width: `${100 - i * 14}%`, marginBottom: i === rows - 1 ? 0 : '0.7rem' }}
        />
      ))}
    </div>
  );
}

// ---- status ----

export function StatusDot({ status }: { status: string }) {
  const label =
    status === 'active'
      ? 'Active'
      : status === 'pending'
        ? 'Waiting for approval'
        : status === 'revoked'
          ? 'Revoked'
          : status;
  const dot =
    status === 'active'
      ? 'dc-dot-active'
      : status === 'pending'
        ? 'dc-dot-pending'
        : 'dc-dot-revoked';
  return (
    <span className="dc-status">
      <span className={`dc-dot ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * A permission, as a chip. Write and provisioning permissions are marked,
 * because "this key can change things" is the fact a reader is scanning for.
 */
export function ScopeChip({ scope }: { scope: string }) {
  const write = scope.endsWith(':write') || scope.endsWith(':provision');
  return <span className={`dc-chip${write ? ' dc-chip-write' : ''}`}>{scope}</span>;
}

// ---- notices ----

export type NoticeKind = 'good' | 'bad' | 'info' | 'warn';
export type NoticeState = { kind: NoticeKind; text: string } | null;

/**
 * A notice with a close button, and a success notice that clears itself.
 *
 * A success banner that never goes away stops being a notice and becomes part
 * of the page, the old developer page was still announcing a key created ten
 * minutes earlier, and reappeared on every reload. Errors stay until dismissed
 * or replaced by the next action, because the reader may still need to act.
 */
export function Notice({
  notice,
  onDismiss,
}: {
  notice: NoticeState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!notice || notice.kind !== 'good') return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;
  return (
    <div className={`dc-notice dc-notice-${notice.kind}`} role={notice.kind === 'bad' ? 'alert' : 'status'}>
      <div className="dc-notice-body">{notice.text}</div>
      <button type="button" className="dc-notice-x" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

/** The notice state plus the setters every page needs. */
export function useNotice() {
  const [notice, setNotice] = useState<NoticeState>(null);
  const dismiss = useCallback(() => setNotice(null), []);
  const say = useCallback((text: string) => setNotice({ kind: 'good', text }), []);
  const warn = useCallback((text: string) => setNotice({ kind: 'warn', text }), []);
  const inform = useCallback((text: string) => setNotice({ kind: 'info', text }), []);
  const fail = useCallback((text: string) => setNotice({ kind: 'bad', text }), []);
  return { notice, setNotice, dismiss, say, warn, inform, fail };
}

// ---- confirmation ----

export type Confirmation = {
  title: string;
  /** Rendered as elements, never as HTML from a string. */
  body: ReactNode;
  confirmText: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * The console's confirmation dialog.
 *
 * In-page rather than window.confirm, which we do not ship, and rather than
 * ddModal, which lives in an EJS partial a Next page never loads. Escape
 * closes it, focus moves into it, and the page behind it does not scroll, a
 * dialog you can scroll away from is one people answer by accident.
 */
export function ConfirmDialog({
  confirmation,
  onCancel,
  busy,
}: {
  confirmation: Confirmation | null;
  onCancel: () => void;
  busy?: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [confirmation, onCancel]);

  if (!confirmation) return null;
  return (
    <div className="dc-scrim" onClick={onCancel}>
      <div
        className="dc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={confirmation.title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{confirmation.title}</h3>
        <div className="dc-dialog-body">{confirmation.body}</div>
        <div className="dc-dialog-actions">
          <button type="button" className="dc-btn dc-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`dc-btn ${confirmation.danger ? 'dc-btn-danger' : 'dc-btn-primary'}`}
            onClick={() => void confirmation.onConfirm()}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmation.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- the one-time secret ----

/**
 * The new key, shown once.
 *
 * It is stored as a hash and nothing else, so this really is the only time it
 * exists outside the caller. The panel says which key it belongs to, because a
 * developer with several keys needs to know which integration to go and update.
 */
export function SecretReveal({
  secret,
  keyName,
  onDone,
}: {
  secret: string;
  keyName?: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be refused. The value is on screen and
      // selectable, so there is nothing to recover from.
      setCopied(false);
    }
  }

  return (
    <div className="dc-secret">
      <h2 className="dc-h2" style={{ marginBottom: '0.3rem' }}>
        {keyName ? `${keyName} is ready` : 'Your new key'}
      </h2>
      <p className="dc-note" style={{ marginTop: 0 }}>
        Copy it now. We store only a hash of it, so this is the one and only time it can be shown.
      </p>
      <div className="dc-secret-row">
        <code className="dc-secret-value">{secret}</code>
        <button type="button" className="dc-btn dc-btn-primary" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="dc-btn" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

// ---- search and paging ----

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div className="dc-search">
      <svg className="dc-search-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M6.5 1a5.5 5.5 0 1 0 3.4 9.8l3.4 3.4 1.1-1.1-3.4-3.4A5.5 5.5 0 0 0 6.5 1zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
      </svg>
      <input
        className="dc-input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

/**
 * Paging over a list this page already holds.
 *
 * The keys endpoint returns every key, and a plan allows at most ten, so
 * client-side paging is honest here rather than a pretence of pagination over a
 * truncated page. It exists because a developer can accumulate revoked keys
 * without limit, and thirty rows of history should not bury the live ones.
 */
export function usePaging<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));

  // A filter that shortens the list must not leave the reader on a page that
  // no longer exists, looking at nothing.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const visible = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  return {
    page,
    pageCount,
    visible,
    setPage,
    from: items.length === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(items.length, page * perPage),
    total: items.length,
  };
}

export function Pager({
  page,
  pageCount,
  from,
  to,
  total,
  unit,
  onPage,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  unit: string;
  onPage: (next: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="dc-pager">
      <span>
        {from}–{to} of {total} {unit}
      </span>
      <div className="dc-pager-btns">
        <button
          type="button"
          className="dc-btn dc-btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="dc-btn dc-btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/** A row of filter chips. Scrolls sideways rather than wrapping. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="dc-filters" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`dc-filter${value === option.id ? ' is-on' : ''}`}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
        >
          {option.label}
          {typeof option.count === 'number' ? ` (${option.count})` : ''}
        </button>
      ))}
    </div>
  );
}
