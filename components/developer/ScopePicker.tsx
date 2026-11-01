'use client';

/**
 * Choosing what a key may do.
 *
 * Used by both the create page and the key page, so a permission list is
 * described the same way wherever it is edited. The presets exist because the
 * list is eighteen items long and almost every real key is one of three shapes;
 * picking one ticks its boxes and leaves everything editable.
 *
 * The checkbox sits on the permission's own line rather than centred against
 * the whole two-line block. Centred, it floated a few pixels above its label
 * and read as belonging to nothing.
 */

import { useMemo } from 'react';
import type { Scope } from '@/lib/developer-api';
import { groupScopes } from '@/lib/developer-api';

export type Preset = {
  id: string;
  label: string;
  hint: string;
  match: (scope: string) => boolean;
};

export const SCOPE_PRESETS: Preset[] = [
  {
    id: 'read',
    label: 'Read only',
    hint: 'Everything this key can see, nothing it can change.',
    match: (scope) => scope.endsWith(':read'),
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    hint: 'Run a CAD from a game server: calls, units and BOLOs.',
    match: (scope) =>
      scope.startsWith('calls:') ||
      scope.startsWith('units:') ||
      scope.startsWith('bolos:') ||
      scope === 'community:read',
  },
  {
    id: 'full',
    label: 'Everything',
    hint: 'Every permission your plan allows.',
    match: () => true,
  },
];

export default function ScopePicker({
  available,
  chosen,
  onChange,
  error,
  id = 'dc-scopes',
}: {
  available: Scope[];
  chosen: string[];
  onChange: (next: string[]) => void;
  error?: string;
  id?: string;
}) {
  const groups = useMemo(() => groupScopes(available), [available]);

  /** Which preset, if any, the current selection is exactly. */
  const activePreset = useMemo(() => {
    const names = available.map((s) => s.scope);
    const picked = [...chosen].sort().join(',');
    if (!picked) return null;
    const found = SCOPE_PRESETS.find(
      (preset) => names.filter(preset.match).sort().join(',') === picked
    );
    return found ? found.id : null;
  }, [available, chosen]);

  function applyPreset(presetId: string) {
    const preset = SCOPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange(available.map((s) => s.scope).filter(preset.match));
  }

  function toggle(scope: string) {
    onChange(chosen.includes(scope) ? chosen.filter((s) => s !== scope) : [...chosen, scope]);
  }

  return (
    <div id={id}>
      <style jsx>{`
        .presets {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 0.9rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          flex-grow: 0;
          flex-shrink: 0;
          max-width: 100%;
          scrollbar-width: none;
        }
        .presets::-webkit-scrollbar {
          display: none;
        }
        .preset {
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: #94a3b8;
          font-family: inherit;
          font-size: 0.82rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .preset:hover {
          color: #e2e8f0;
          border-color: rgba(255, 255, 255, 0.16);
        }
        .preset.is-on {
          background: rgba(56, 189, 248, 0.12);
          border-color: #38bdf8;
          color: #38bdf8;
          font-weight: 600;
        }
        .preset-hint {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0 0 1rem;
          line-height: 1.55;
          min-height: 1.3em;
        }
        .group {
          margin-bottom: 1rem;
        }
        .group:last-child {
          margin-bottom: 0;
        }
        .group-name {
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          margin: 0 0 0.45rem;
        }
        .row {
          display: block;
          padding: 0.4rem 0;
          cursor: pointer;
        }
        /* The box and the permission's name on one line; the explanation
           indented under them. */
        .head {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .head input {
          width: 15px;
          height: 15px;
          margin: 0;
          flex: none;
          accent-color: #38bdf8;
        }
        .name {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.84rem;
          color: #e2e8f0;
        }
        .name.is-write {
          color: #fbbf24;
        }
        .desc {
          margin: 0.15rem 0 0 1.6rem;
          font-size 0.8rem;
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.5;
        }
        .count {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0.9rem 0 0;
        }
        .bad {
          display: block;
          color: #f87171;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
      `}</style>

      <div className="presets" role="group" aria-label="Permission presets">
        {SCOPE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset${activePreset === preset.id ? ' is-on' : ''}`}
            onClick={() => applyPreset(preset.id)}
            aria-pressed={activePreset === preset.id}
          >
            {preset.label}
          </button>
        ))}
        {chosen.length > 0 ? (
          <button type="button" className="preset" onClick={() => onChange([])}>
            Clear
          </button>
        ) : null}
      </div>
      <p className="preset-hint">
        {activePreset
          ? SCOPE_PRESETS.find((p) => p.id === activePreset)?.hint
          : 'Start from a preset, or tick exactly what you need.'}
      </p>

      {groups.map(({ group, scopes }) => (
        <div className="group" key={group}>
          <p className="group-name">{group}</p>
          {scopes.map((scope) => {
            const write = scope.scope.endsWith(':write') || scope.scope.endsWith(':provision');
            return (
              <label className="row" key={scope.scope}>
                <span className="head">
                  <input
                    type="checkbox"
                    checked={chosen.includes(scope.scope)}
                    onChange={() => toggle(scope.scope)}
                  />
                  <span className={`name${write ? ' is-write' : ''}`}>{scope.scope}</span>
                </span>
                <span className="desc">{scope.description}</span>
              </label>
            );
          })}
        </div>
      ))}

      <p className="count">
        {chosen.length === 0
          ? 'Nothing picked yet.'
          : `${chosen.length} permission${chosen.length === 1 ? '' : 's'} picked.`}
      </p>
      {error ? <span className="bad">{error}</span> : null}
    </div>
  );
}
