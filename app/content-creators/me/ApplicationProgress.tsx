'use client';

import { CheckIcon } from '@heroicons/react/24/solid';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Where an application actually is, and what happens next.
//
// The status page used to say "Submitted" and nothing else: no sense of what
// stage you were at, what was expected of you, or when you would hear back. That
// silence is the same problem as the missing failure email — a person with no
// information assumes something is broken.
//
// Deliberately does NOT expose the two-admin approval mechanic. How many
// reviewers we use is our business; what the applicant needs is "a person is
// looking, here is roughly how long, we will email you".

export type StageState = 'done' | 'active' | 'attention' | 'upcoming';

export interface Stage {
  title: string;
  detail: string;
  state: StageState;
  meta?: string;
}

interface Props {
  stages: Stage[];
}

const DOT: Record<StageState, { ring: string; fill: string; text: string }> = {
  done: { ring: 'rgba(34,197,94,0.35)', fill: 'rgba(34,197,94,0.16)', text: '#4ade80' },
  active: { ring: 'rgba(251,191,36,0.45)', fill: 'rgba(251,191,36,0.16)', text: '#fbbf24' },
  attention: { ring: 'rgba(239,68,68,0.45)', fill: 'rgba(239,68,68,0.14)', text: '#f87171' },
  upcoming: { ring: 'rgba(255,255,255,0.12)', fill: 'rgba(255,255,255,0.03)', text: 'rgba(255,255,255,0.35)' },
};

export default function ApplicationProgress({ stages }: Props) {
  return (
    <div className="ap-root">
      <style>{`
        .ap-root {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .ap-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
          margin: 0 0 18px;
        }
        .ap-stage { display: flex; gap: 14px; position: relative; padding-bottom: 20px; }
        .ap-stage:last-child { padding-bottom: 0; }
        /* The connector is drawn on the stage, not between them, so it cannot
           desync from the dots when copy wraps to different heights. */
        .ap-stage:not(:last-child)::before {
          content: '';
          position: absolute; left: 13px; top: 30px; bottom: 4px;
          width: 2px; border-radius: 2px;
          background: rgba(255,255,255,0.07);
        }
        .ap-stage.is-done:not(:last-child)::before { background: rgba(34,197,94,0.28); }
        .ap-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative; z-index: 1;
          border: 2px solid; font-size: 12px; font-weight: 700;
        }
        .ap-body { min-width: 0; padding-top: 2px; }
        .ap-stage-title { font-size: 15px; font-weight: 700; line-height: 1.35; }
        .ap-stage-detail {
          font-size: 13.5px; color: rgba(255,255,255,0.6);
          line-height: 1.6; margin-top: 3px;
        }
        .ap-stage-meta {
          font-size: 12px; color: rgba(255,255,255,0.35);
          margin-top: 5px; font-variant-numeric: tabular-nums;
        }
        /* A soft pulse marks where you are without shouting. Removed for anyone
           who has asked for less motion. */
        .ap-dot.is-active::after {
          content: '';
          position: absolute; inset: -5px;
          border-radius: 50%;
          border: 2px solid rgba(251,191,36,0.4);
          animation: ap-pulse 2.4s ease-out infinite;
        }
        @keyframes ap-pulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ap-dot.is-active::after { animation: none; opacity: 0.5; }
        }
        @media (max-width: 560px) {
          .ap-root { padding: 18px 16px; border-radius: 14px; }
          .ap-stage { gap: 12px; padding-bottom: 18px; }
          .ap-stage-title { font-size: 14.5px; }
          .ap-stage-detail { font-size: 13px; }
        }
      `}</style>

      <p className="ap-title">Your application</p>

      {stages.map((s, i) => {
        const c = DOT[s.state];
        return (
          <div key={i} className={`ap-stage${s.state === 'done' ? ' is-done' : ''}`}>
            <div
              className={`ap-dot${s.state === 'active' ? ' is-active' : ''}`}
              style={{ borderColor: c.ring, background: c.fill, color: c.text }}
            >
              {s.state === 'done' ? (
                <CheckIcon style={{ width: 15, height: 15 }} />
              ) : s.state === 'attention' ? (
                <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
              ) : s.state === 'active' ? (
                <ClockIcon style={{ width: 15, height: 15 }} />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>

            <div className="ap-body">
              <div
                className="ap-stage-title"
                style={{ color: s.state === 'upcoming' ? 'rgba(255,255,255,0.45)' : '#fff' }}
              >
                {s.title}
              </div>
              <div
                className="ap-stage-detail"
                style={{ color: s.state === 'attention' ? '#fca5a5' : undefined }}
              >
                {s.detail}
              </div>
              {s.meta && <div className="ap-stage-meta">{s.meta}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
