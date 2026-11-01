'use client';

/**
 * Picking a community by name.
 *
 * It replaced a free-text "Community id" field, which asked people for
 * something they do not know and cannot look up from that page. The list is the
 * communities this person is actually in, grantable ones first, and a community
 * they cannot approve themselves says so before they commit rather than after.
 *
 * The server decides the grant regardless. Nothing here is trusted: this picker
 * is a convenience over a check that happens again on the API.
 */

import type { CommunityOption } from '@/lib/developer-api';

/**
 * The value that means "deliberately no community". Distinct from the empty
 * string, which means "has not chosen yet".
 *
 * They used to be the same value, so the create form opened already reading as
 * "no community" without the permission that makes that coherent — and then
 * refused to submit. Making the two states different values is what lets the
 * form tell "you have not picked" from "you picked none".
 */
export const NO_COMMUNITY = '__none__';

export default function CommunityPicker({
  communities,
  value,
  onChange,
  /** Whether "No community" is an option, and what it means here. */
  allowNone,
  noneLabel = 'No community — this key will create its own',
  id = 'dc-community',
  error,
  exclude = [],
  label = 'Community',
}: {
  communities: CommunityOption[] | null;
  value: string;
  onChange: (next: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  id?: string;
  error?: string;
  /** Communities the key already has, so they are not offered twice. */
  exclude?: string[];
  label?: string;
}) {
  const loading = communities === null;
  const offered = (communities || []).filter((c) => !exclude.includes(c.id));
  const chosen = offered.find((c) => c.id === value);

  if (loading) {
    return (
      <>
        <label className="dc-label" htmlFor={id}>
          {label}
        </label>
        <select className="dc-select" id={id} disabled aria-busy="true">
          <option>Loading your communities…</option>
        </select>
      </>
    );
  }

  if (offered.length === 0 && !allowNone) {
    return (
      <>
        <label className="dc-label" htmlFor={id}>
          {label}
        </label>
        <select className="dc-select" id={id} disabled>
          <option>No communities to add</option>
        </select>
        <p className="dc-hint">
          {exclude.length > 0
            ? 'This key already covers every community you are in.'
            : 'Join or create a community first, then come back and add it here.'}
        </p>
      </>
    );
  }

  return (
    <>
      <label className="dc-label" htmlFor={id}>
        {label}
      </label>
      <select
        className={`dc-select${error ? ' is-bad' : ''}`}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Pick a community…</option>
        {allowNone ? <option value={NO_COMMUNITY}>{noneLabel}</option> : null}
        {offered.map((community) => (
          <option key={community.id} value={community.id}>
            {community.name}
            {community.canGrant ? '' : ' — needs the owner to approve'}
          </option>
        ))}
      </select>
      {error ? <span className="dc-err">{error}</span> : null}
      {/* Said before they commit, not after. A key that silently waits on
          somebody else looks broken to the person who made it. */}
      {chosen && !chosen.canGrant ? (
        <p className="dc-hint">
          You are a member of <strong>{chosen.name}</strong> but cannot approve keys into it. The key
          works everywhere else straight away, and starts working there once an owner or admin
          approves it.
        </p>
      ) : null}
    </>
  );
}
